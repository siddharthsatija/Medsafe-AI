// api/chat.ts
// Serverless API route for Medsafe-AI
// - Handles BOTH "Medicine Information" and "Lifestyle Guidance" flows
// - Calls Gemini via REST (no extra npm client needed)
// - Returns a single string: { text: "..." }

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ---------- SYSTEM PROMPT ----------

const SYSTEM_PROMPT = `
You are Medsafe-AI, a friendly, empathetic health information assistant.

GOALS
- Talk to users in a warm, human way.
- Help them understand how their habits (food, water, rest, hydration, lifestyle) affect recovery.
- Provide general information on commonly used over-the-counter (OTC) medicines.
- Provide general lifestyle guidance when requested (exercise, sleep, stress, smoking, alcohol).
- Clearly explain when to see a doctor or seek urgent care.

SAFETY
- You are NOT a doctor and NOT a substitute for professional medical care.
- Do NOT give confirmed diagnoses. Use phrases like "could be related to" or "may be consistent with".
- Do NOT prescribe or adjust prescription medicines or set exact medical doses.
- For OTC medicines:
  - Speak in general terms like "often taken every X–Y hours as directed on the package".
  - Never override package instructions or local medical advice.
  - Always remind users not to exceed the maximum daily dose.
- If symptoms are serious, unclear, or worsening, advise seeing a doctor.
- If red-flag symptoms are present (difficulty breathing, chest pain, severe confusion, very stiff neck, signs of stroke, etc.), strongly advise urgent or emergency care.

STYLE
- Always use **bold headings** for each section.
- Be empathetic, supportive, and concise.
- Use short paragraphs and bullet points where helpful.
- Use simple language and briefly explain any medical term.

RESPONSE STRUCTURE FOR MEDICINE FOCUS
1. **What You’re Experiencing & How to Support Recovery**
2. **Common Over-the-Counter Options**
3. **How Each Option Helps & Typical Use**
4. **When to See a Doctor or Get Urgent Help**

RESPONSE STRUCTURE FOR LIFESTYLE FOCUS
1. **What You’re Experiencing & Current Lifestyle**
2. **How Lifestyle Changes Can Support Recovery**
3. **Specific Lifestyle Suggestions**
4. **When to See a Doctor or Get Urgent Help**
`.trim();

// ---------- HELPER TO CALL GEMINI REST API ----------

async function callGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    console.error("Missing GEMINI_API_KEY env var");
    throw new Error("Server misconfiguration: GEMINI_API_KEY not set.");
  }

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=" +
    GEMINI_API_KEY;

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: SYSTEM_PROMPT }],
      },
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API error:", response.status, errorText);
    throw new Error("Gemini API request failed.");
  }

  const data = await response.json();

  // Try to extract the first candidate's text
  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text ?? "")
      .join("")
      .trim() ?? "";

  if (!text) {
    console.error("Gemini API returned no text:", JSON.stringify(data, null, 2));
    throw new Error("No text returned from Gemini.");
  }

  return text;
}

// ---------- MAIN HANDLER ----------

// NOTE: This uses "any" types so it works in both JS/TS without extra imports
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Expecting this shape from the frontend:
    //
    // {
    //   age, sex,
    //   conditions, medications, allergies,
    //   symptoms, duration,
    //   foodIntake,          // e.g. "2 meals/day; last meal: Soup"
    //   waterIntake,         // e.g. "1.5 L/day"
    //   extraDetails,
    //   exerciseFrequency,   // lifestyle only
    //   sleepHours,          // lifestyle only
    //   stressLevel,         // lifestyle only
    //   smokingStatus,       // lifestyle only
    //   alcoholConsumption,  // lifestyle only
    //   focus: "medicine" | "lifestyle"
    // }

    const {
      age,
      sex,
      conditions,
      medications,
      allergies,
      symptoms,
      duration,
      foodIntake,
      waterIntake,
      extraDetails,
      exerciseFrequency,
      sleepHours,
      stressLevel,
      smokingStatus,
      alcoholConsumption,
      focus,
    } = req.body || {};

    const wordLimit = 220;
    let userPrompt: string;

    if (focus === "lifestyle") {
      // --------- LIFESTYLE GUIDANCE PROMPT ---------
      userPrompt = `
Here is the user’s information:

- Age: ${age || "not provided"}
- Sex: ${sex || "not provided"}
- Existing conditions: ${conditions || "none reported"}
- Current medications: ${medications || "none reported"}
- Allergies: ${allergies || "not reported"}
- Symptoms: ${symptoms || "not provided"}
- Symptom duration: ${duration || "not provided"}
- Food intake today: ${foodIntake || "not provided"}
- Water intake today: ${waterIntake || "not provided"}
- Exercise frequency: ${exerciseFrequency || "not provided"}
- Average sleep hours: ${sleepHours || "not provided"}
- Current stress level: ${stressLevel || "not provided"}
- Smoking status: ${smokingStatus || "not provided"}
- Alcohol consumption: ${alcoholConsumption || "not provided"}
- Other details: ${extraDetails || "none"}

TASK:
The user selected Lifestyle Guidance. Generate a response using bold section headings and follow this 4-step structure:

1) **What You’re Experiencing & Current Lifestyle**
   - Summarize their symptoms and lifestyle.
   - Be empathetic and explain how these habits affect recovery.

2) **How Lifestyle Changes Can Support Recovery**
   - Explain in simple terms how hydration, nutrition, movement, sleep, and stress management can help.

3) **Specific Lifestyle Suggestions**
   - Give practical, gentle suggestions for exercise, sleep, stress, smoking/alcohol if relevant.
   - Keep it realistic and non-judgmental.

4) **When to See a Doctor or Get Urgent Help**
   - When to see a doctor if symptoms or lifestyle concerns persist.
   - Red-flag symptoms requiring urgent or emergency care.
   - End by reminding them you’re an AI health information assistant, not a doctor.

WORD LIMIT:
Keep the entire response within ${wordLimit} words.

Use a warm, conversational tone.
      `.trim();
    } else {
      // --------- MEDICINE INFORMATION PROMPT (DEFAULT) ---------
      userPrompt = `
Here is the user’s information:

- Age: ${age || "not provided"}
- Sex: ${sex || "not provided"}
- Existing conditions: ${conditions || "none reported"}
- Current medications: ${medications || "none reported"}
- Allergies: ${allergies || "not reported"}
- Symptoms: ${symptoms || "not provided"}
- Symptom duration: ${duration || "not provided"}
- Food intake today: ${foodIntake || "not provided"}
- Water intake today: ${waterIntake || "not provided"}
- Other details: ${extraDetails || "none"}

TASK:
The user selected Medicine Information. Generate a response using bold section headings and follow this 4-step structure:

1) **What You’re Experiencing & How to Support Recovery**
   - Summarize their symptoms and current habits (meals, water, rest).
   - Be empathetic and explain how improving habits can support recovery.

2) **Common Over-the-Counter Options**
   - List common OTC categories (e.g., fever/pain relievers, cold/flu combinations, saline nasal spray, throat lozenges).
   - Do NOT prescribe; keep guidance general.

3) **How Each Option Helps & Typical Use**
   - For each option, say:
     - What it helps with
     - How often it is typically taken (e.g., "often taken every 4–6 hours as directed on the label")
     - Whether it is usually taken with food or after a meal
   - Always remind the user to follow the package instructions and not exceed the maximum daily dose.

4) **When to See a Doctor or Get Urgent Help**
   - When to see a doctor or urgent care if symptoms don’t improve or worsen.
   - Red-flag symptoms requiring urgent or emergency care.
   - End by reminding them you’re an AI health information assistant, not a doctor.

WORD LIMIT:
Keep the entire response within ${wordLimit} words.

Use a warm, conversational tone.
      `.trim();
    }

    const text = await callGemini(userPrompt);

    return res.status(200).json({ text });
  } catch (err: any) {
    console.error("Medsafe API error:", err);
    return res
      .status(500)
      .json({ error: "Something went wrong generating the response." });
  }
}
