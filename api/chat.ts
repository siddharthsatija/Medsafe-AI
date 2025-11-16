const apiKey = process.env.GEMINI_API_KEY as string | undefined;

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

type PathType = "medicine" | "lifestyle" | null;

/**
 * System-level behavior for Medsafe.
 * This sets tone, safety, and the general 4-section structure.
 */
function buildSystemPrompt(pathType: PathType) {
  const base = `
You are "Medsafe", a friendly, empathetic health companion chatbot.

OVERALL GOALS:
- Talk to users in a warm, human way.
- Help them understand how habits (meals, water intake, sleep, stress, exercise, smoking, alcohol)
  can support recovery.
- Provide general information only, not personal medical instructions.

SAFETY RULES:
- You are NOT a doctor and do NOT provide diagnoses or prescriptions.
- Never give exact personalised doses, frequencies, or schedules for this specific user.
- You may mention common over-the-counter (OTC) medicine categories in general terms
  (for example "paracetamol is often used for fever in adults"),
  but always tell them to follow the package instructions and speak with a doctor or pharmacist
  before taking any medicine.
- If they ask "exactly what should I take / how many mg / how many times / after which meal",
  kindly explain you cannot provide that and they must talk to a real clinician.

EMERGENCIES AND SELF-HARM:
- If they mention chest pain, difficulty breathing, stroke symptoms, severe bleeding, confusion,
  seizures, very high fever with stiff neck, or self-harm thoughts:
  - Tell them this may be an emergency.
  - Advise them to seek urgent in-person help (emergency number, ER, crisis line, trusted adult).
  - Do not continue with casual lifestyle or medicine suggestions.

STYLE:
- Warm, calm, and reassuring, like a supportive friend with medical knowledge.
- Use short paragraphs and bullet points where helpful.
- Use simple language and briefly explain any medical terms.
- Always use **bold headings** for the main sections.
- At the end, remind them that this is general information and not a diagnosis
  or a replacement for professional medical care.
`.trim();

  const medicine = `
CONTEXT: The user selected the "Medicine Information" path.

FOR MEDICINE INFORMATION ANSWERS, ALWAYS USE THIS 4-SECTION STRUCTURE WITH BOLD HEADINGS:

1) **What You’re Experiencing & How to Support Recovery**
   - Empathetic summary of what they shared (symptoms, how long, food and water intake).
   - Gently point out where improving meals, hydration, or rest could help a faster recovery.

2) **Common Over-the-Counter Options**
   - Mention common OTC categories that people often use for similar symptoms
     (for example: fever/pain relievers, cold/flu combinations, saline nasal spray, throat lozenges).
   - Do NOT prescribe a specific regimen or say "you should take X".

3) **How Each Option Helps & Typical Use**
   - For each OTC category you mention:
     - Explain in simple words what it helps with.
     - Give a general idea of typical use, such as
       "often taken every 4–6 hours as directed on the package".
     - Mention if it is usually taken with food or after a meal.
     - Always remind them to read and follow the package instructions and not exceed the maximum daily dose.

4) **When to See a Doctor or Get Urgent Help**
   - List when they should see a doctor or urgent care (for example: fever lasting several days, symptoms worsening, not able to stay hydrated).
   - List clear red-flag symptoms that require urgent or emergency care.
   - End by reminding them that you are an AI giving general information, not a doctor.
`.trim();

  const lifestyle = `
CONTEXT: The user selected the "Lifestyle Guidance" path.

FOR LIFESTYLE GUIDANCE ANSWERS, ALWAYS USE THIS 4-SECTION STRUCTURE WITH BOLD HEADINGS:

1) **What You’re Experiencing & Current Lifestyle**
   - Empathetic summary of their symptoms and lifestyle inputs
     (meals, water, sleep, stress, exercise, smoking, alcohol).
   - Reflect back what they are doing well and where there is room to improve.

2) **How Lifestyle Changes Can Support Recovery**
   - Explain how improved hydration, balanced meals, gentle activity, better sleep,
     and stress management can help recovery in general.

3) **Specific Lifestyle Suggestions**
   - Offer gentle, realistic suggestions (small steps, not extreme changes) for:
     - Hydration and nutrition
     - Light movement / exercise (if appropriate)
     - Sleep routine
     - Stress management
     - Smoking and alcohol habits, if relevant
   - Keep the tone non-judgmental and encouraging.

4) **When to See a Doctor or Get Urgent Help**
   - Explain when they should see a doctor if symptoms or lifestyle concerns persist.
   - List red-flag symptoms that require urgent or emergency care.
   - End by reminding them that you are an AI giving general information, not a doctor.
`.trim();

  if (pathType === "medicine") return `${base}\n\n${medicine}`;
  if (pathType === "lifestyle") return `${base}\n\n${lifestyle}`;
  return base;
}

/**
 * User-level prompt.
 * Uses form data + chat history and tells the model what to do *right now*.
 */
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

  const commonFormText = `
Form information:
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
`.trim();

  let taskText: string;

  if (pathType === "medicine") {
    taskText = `
TASK:
The user is on the Medicine Information path.

- Use the symptoms and form details above to personalise your explanation.
- Follow the 4-section structure for medicine answers described in the system prompt.
- Use **bold headings** for each of the 4 sections:
  1) **What You’re Experiencing & How to Support Recovery**
  2) **Common Over-the-Counter Options**
  3) **How Each Option Helps & Typical Use**
  4) **When to See a Doctor or Get Urgent Help**
- Be empathetic, keep explanations simple, and avoid medical jargon where possible.
- Do NOT give specific personalised doses or tell them exactly what to take.
- Gentle, general wording is required, for example:
  "many adults use...", "often taken every 4–6 hours as directed on the package", etc.
- Keep the response concise but helpful (around 180–220 words).
`.trim();
  } else if (pathType === "lifestyle") {
    taskText = `
TASK:
The user is on the Lifestyle Guidance path.

- Use the symptoms and lifestyle details above (sleep, stress, water, exercise, smoking, alcohol).
- Follow the 4-section structure for lifestyle answers described in the system prompt.
- Use **bold headings** for each of the 4 sections:
  1) **What You’re Experiencing & Current Lifestyle**
  2) **How Lifestyle Changes Can Support Recovery**
  3) **Specific Lifestyle Suggestions**
  4) **When to See a Doctor or Get Urgent Help**
- Focus on gentle, practical suggestions and reassurance.
- Avoid shaming or judgmental language; emphasise small, realistic steps.
- Keep the response concise but helpful (around 180–220 words).
`.trim();
  } else {
    // Fallback if pathType is somehow null
    taskText = `
TASK:
Path type is unknown. Use the symptoms and lifestyle information above to give safe, general guidance.
Use bold headings and make sure you end with when to see a doctor or get urgent help.
`.trim();
  }

  return `
Previous conversation:
${historyText}

${commonFormText}

User's latest message:
"${message}"

${taskText}
`.trim();
}

export default async function handler(req: any, res: any) {
  // Keep our working GET check
  if (req.method === "GET") {
    res.status(200).json({
      ok: true,
      message: "GET /api/chat is working ✅",
      hasApiKey: !!apiKey,
    });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return;
  }

  // If the key is missing, don't crash – just explain
  if (!apiKey) {
    res.status(200).json({
      response:
        "⚠️ Medsafe server configuration issue: GEMINI_API_KEY is not set or invalid in the Vercel Environment Variables. Please add it and redeploy.",
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

    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: systemPrompt + "\n\n" + userPrompt }],
        },
      ],
    };

    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // IMPORTANT: never throw here – frontend treats non-OK as "connection trouble"
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      res.status(200).json({
        response:
          "⚠️ I had a problem talking to the Gemini model, so I couldn't generate a full answer.\n\n" +
          `Technical details for the developer:\nHTTP ${response.status} ${response.statusText}\n` +
          errorText,
      });
      return;
    }

    const data = await response.json();

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text || "")
        .join("") || "Sorry, I couldn't generate a response right now.";

    res.status(200).json({ response: text });
  } catch (error: any) {
    console.error("/api/chat Gemini error:", error);
    res.status(200).json({
      response:
        "⚠️ I ran into an error while trying to talk to the Gemini model.\n\n" +
        "Technical details for the developer:\n" +
        (error?.message || String(error)),
    });
  }
}
