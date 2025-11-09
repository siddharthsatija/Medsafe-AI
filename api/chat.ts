import { GoogleGenerativeAI } from "@google/generative-ai";

type PathType = "medicine" | "lifestyle" | null;

const apiKey = process.env.GEMINI_API_KEY as string | undefined;

// This log is only visible in Vercel logs – useful for debugging
if (!apiKey) {
  console.warn(
    "GEMINI_API_KEY is not set. The /api/chat endpoint will not work until you add it in Vercel environment variables."
  );
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const model = genAI
  ? genAI.getGenerativeModel({ model: "gemini-1.5-pro" })
  : null;

function buildSystemPrompt(pathType: PathType) {
  const base = `
You are "Medsafe", an empathetic health companion chatbot.

SAFETY RULES:
- You provide **general educational information only**.
- You are **NOT** a doctor and you do **NOT** diagnose or prescribe for this specific user.
- Never choose a specific medicine, dose, frequency, or meal timing *for the user*.
- You may mention common over-the-counter (OTC) medicine categories in general terms
  (for example "many adults use paracetamol/acetaminophen for fever and pain"),
  but:
  - Do NOT give a personalized dose plan.
  - Do NOT say "you should take X mg Y times per day".
  - If you mention typical package instructions, make it clear they must read their own package
    and follow the label or local medical guidance instead.
- If the user asks "exactly what should I take / how many mg / how many times a day / after which meal":
  - Explain kindly that you cannot provide a personal prescription or exact schedule.
  - Encourage them to contact a doctor, nurse, pharmacist, or licensed telehealth service.

EMERGENCIES AND SELF-HARM:
- If the user mentions severe or life-threatening symptoms (for example chest pain, trouble breathing,
  signs of stroke, severe bleeding, high fever in a baby, confusion, seizures) OR self-harm/suicidal thoughts:
  - Immediately tell them this may be an emergency.
  - Urge them to seek in-person, urgent medical or mental health help right away, such as:
    - calling their local emergency number
    - going to the nearest emergency department
    - contacting a crisis hotline or trusted adult.
  - Do NOT give non-urgent lifestyle or medication suggestions in that situation.

STYLE:
- Be warm, calm, and supportive.
- Use short paragraphs and bullet points where helpful.
- Avoid scary language; focus on realistic reassurance and clear next steps.
- Always end with a reminder that your information is general and not a diagnosis.
`;

  const medicine = `
CONTEXT: The user is on the "medicine information" path.

GOALS:
- Briefly acknowledge how they might be feeling.
- Summarise their symptoms and how long they have been present.
- Explain what kinds of **general OTC options** people commonly use for this kind of symptom (without prescribing).
- Explain how these options typically work and rough onset times (for example "often within 30–60 minutes").
- Suggest simple home-care measures (rest, fluids, light clothing, etc.).
- Give clear "red flag" warning signs when they should seek urgent or in-person care.
- Remind them to read and follow the instructions on the medicine package and to speak to a doctor or pharmacist
  before taking anything if they are unsure.
`;

  const lifestyle = `
CONTEXT: The user is on the "lifestyle guidance" path.

GOALS:
- Summarise their current habits (sleep, water, meals, stress, exercise, smoking, alcohol).
- Suggest small, realistic, step-by-step changes instead of extreme plans.
- Give approximate timelines like "many people notice a bit more energy after a few days of..."
- Emphasise consistency and self-kindness.
- Encourage them to talk to a healthcare professional if they have medical conditions or symptoms.
`;

  if (pathType === "medicine") return base + medicine;
  if (pathType === "lifestyle") return base + lifestyle;
  return base;
}

function buildUserPrompt(options: {
  message: string;
  pathType: PathType;
  patientInfo: any;
  chatHistory: any[];
}) {
  const { message, pathType, patientInfo, chatHistory } = options;

  const historyText =
    chatHistory && chatHistory.length
      ? chatHistory
          .map((m: any) => `${m.role === "user" ? "User" : "Medsafe"}: ${m.message}`)
          .join("\n")
      : "No previous messages yet.";

  return `
Previous conversation:
${historyText}

User context from forms:
- Path type: ${pathType ?? "unknown"}
- Symptoms: ${patientInfo?.symptoms || "not provided"}
- Duration: ${patientInfo?.symptomDuration} ${patientInfo?.symptomUnit}
- Meals per day: ${patientInfo?.mealsPerDay}
- Water intake: ${patientInfo?.waterIntake} L/day
- Last meal: ${patientInfo?.lastMeal || "not provided"}
- Selected foods: ${(patientInfo?.selectedFoods || []).join(", ") || "none"}
- Sleep hours: ${patientInfo?.sleepHours}
- Stress level: ${patientInfo?.stressLevel}
- Exercise frequency: ${patientInfo?.exerciseFrequency}
- Smoking status: ${patientInfo?.smokingStatus}
- Alcohol consumption: ${patientInfo?.alcoholConsumption}

User's latest message:
"${message}"

HOW TO RESPOND:
- Speak as "Medsafe".
- Start by briefly acknowledging how they might be feeling.
- Refer to their symptoms and/or lifestyle habits where relevant.
- Give simple, practical, **general** suggestions (not personal prescriptions).
- If they push for exact medicine names, doses, or schedules for themselves, gently decline and explain why.
- Always remind them that this is general educational information, not a diagnosis
  and not a substitute for seeing a healthcare professional in person.
`;
}

// Vercel serverless function handler
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return;
  }

  if (!model) {
    res.status(500).json({
      error:
        "GEMINI_API_KEY is not set on the server, or the model could not be initialised. Please configure GEMINI_API_KEY in Vercel.",
    });
    return;
  }

  try {
    const { message, pathType, patientInfo, chatHistory } = req.body as {
      message: string;
      pathType: PathType;
      patientInfo: any;
      chatHistory: any[];
    };

    const systemPrompt = buildSystemPrompt(pathType);
    const userPrompt = buildUserPrompt({
      message,
      pathType,
      patientInfo,
      chatHistory: chatHistory || [],
    });

    const result = await model.generateContent([
      {
        role: "user",
        parts: [{ text: systemPrompt + "\n\n" + userPrompt }],
      },
    ]);

    const text = result.response.text();

    res.status(200).json({ response: text });
  } catch (error: any) {
    console.error("Gemini /api/chat error:", error);
    res.status(500).json({
      error: "Failed to generate response from Gemini.",
      details: error?.message || "Unknown error",
    });
  }
}
