const apiKey = process.env.GEMINI_API_KEY as string | undefined;
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

type PathType = "medicine" | "lifestyle" | null;

function buildSystemPrompt(pathType: PathType) {
  const base = `
You are "Medsafe", an empathetic health companion chatbot.

SAFETY RULES:
- Provide **general educational information only**.
- You are NOT a doctor, do NOT diagnose, and do NOT prescribe.
- Never give exact doses, frequencies, or schedules for this specific user.
- You may mention common OTC categories in general terms
  (for example "paracetamol is often used for fever in adults"),
  but always tell them to follow the package instructions and ask a doctor or pharmacist.
- If they ask "exactly what should I take / how many mg / how many times / after which meal",
  kindly explain you cannot provide that, and they must talk to a real clinician.

EMERGENCIES AND SELF-HARM:
- If they mention chest pain, difficulty breathing, stroke symptoms, severe bleeding,
  confusion, seizures, or self-harm thoughts:
  - Tell them this may be an emergency.
  - Advise them to seek urgent in-person help (emergency number, ER, crisis line, trusted adult).
  - Do not continue with casual lifestyle or medicine suggestions.

STYLE:
- Warm, calm, and reassuring.
- Use short paragraphs and bullet points where helpful.
- End by reminding them this is general information and not a diagnosis.
`;

  const medicine = `
CONTEXT: User selected "Medicine Information".

GOALS:
- Briefly acknowledge how they might be feeling.
- Summarise their symptoms and how long they've been present.
- Explain what kinds of general OTC options are commonly used for symptoms like theirs (without prescribing).
- Explain roughly how these options work and typical onset times.
- Suggest simple home-care steps (rest, fluids, light clothing, etc.).
- List warning signs when they should seek urgent or in-person care.
`;

  const lifestyle = `
CONTEXT: User selected "Lifestyle Guidance".

GOALS:
- Summarise their habits (sleep, water, exercise, stress, smoking, alcohol).
- Suggest small, achievable improvements (no extreme changes).
- Mention rough timelines like "many people notice better energy after a few days of...".
- Encourage them to see a professional if they have medical conditions or worrying symptoms.
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

User's latest message:
"${message}"

HOW TO RESPOND:
- Speak as "Medsafe".
- Use their symptoms/lifestyle context naturally.
- Give practical, **general** guidance (no personalised prescriptions).
- If they push for exact medicines or doses for themselves, gently decline and explain why.
- Remind them this is educational and not a diagnosis or a substitute for seeing a professional.
`;
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
