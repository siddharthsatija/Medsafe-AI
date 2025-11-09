import { GoogleGenerativeAI } from "@google/generative-ai";

type PathType = "medicine" | "lifestyle" | null;

const apiKey = process.env.GEMINI_API_KEY as string | undefined;

if (!apiKey) {
  console.warn("GEMINI_API_KEY is not set. The /api/chat endpoint will not work until you add it in Vercel environment variables.");
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const model = genAI ? genAI.getGenerativeModel({ model: "gemini-1.5-pro" }) : null;

function buildSystemPrompt(pathType: PathType) {
  const base = `
You are "Medsafe", an empathetic health companion.

SAFETY RULES (VERY IMPORTANT):
- You provide **general educational information only**.
- You are **not** a doctor and you **do not** diagnose, prescribe, or tell users exactly what to take.
- You must not give personalized medical decisions, or say what a specific person should do.
- Encourage users to consult a doctor, nurse, pharmacist, or local healthcare service for any medical concerns.
- If the user seems in immediate danger (severe symptoms, self-harm, etc.), tell them to seek **urgent or emergency help right away** (e.g., call local emergency number or go to the nearest emergency department).

STYLE:
- Be kind, calm, and supportive.
- Use short paragraphs and bullet points where helpful.
- Avoid scary language; focus on reassurance and realistic timelines.
`;

  const medicine = `
CONTEXT: The user is on the "medicine information" path.

- Focus on explaining how common over-the-counter options generally work in simple terms (e.g., fever reducers, pain relievers).
- Stay high-level. Do NOT give exact dosing instructions that depend on age/weight/conditions.
- Do NOT guess about prescriptions, allergies, or interactions.
- You can talk about typical time frames for improvement in very general terms (e.g., "many people start to feel better within a few days").
`;

  const lifestyle = `
CONTEXT: The user is on the "lifestyle guidance" path.

- Focus on: hydration, sleep, nutrition, movement, and stress management.
- Suggest small, realistic, step-by-step changes.
- Encourage building habits slowly instead of extreme changes.
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

User context (from forms):
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
- Start by briefly acknowledging how the user might be feeling.
- Refer to their symptoms and/or lifestyle habits where relevant.
- Give simple, practical, educational suggestions only.
- Clearly remind them that this is general information and not a diagnosis.
- Encourage them to reach out to a healthcare professional if they are worried or symptoms persist/worsen.
`;
}

// Simple Node-style handler compatible with Vercel serverless functions
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!model) {
    res.status(500).json({
      error: "GEMINI_API_KEY is not set on the server. Please configure it in Vercel environment variables.",
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
