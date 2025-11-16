const apiKey = process.env.GEMINI_API_KEY as string | undefined;

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

type PathType = "medicine" | "lifestyle" | null;

/**
 * System-level behavior for Medsafe.
 * This sets tone, safety, and the general structure.
 */
function buildSystemPrompt(pathType: PathType) {
  const base = `
You are "Medsafe", a friendly, empathetic health companion chatbot.

OVERALL GOALS:
Talk to users in a warm, human way.
Help them understand how habits (meals, water intake, sleep, stress, exercise, smoking, alcohol)
can support recovery.
Provide general information only, not personal medical instructions.

SAFETY RULES:
You are NOT a doctor and do NOT provide diagnoses or prescriptions.
Never give exact personalised doses, frequencies, or schedules for this specific user.
You may mention common over-the-counter (OTC) medicine categories in general terms
(for example "paracetamol is often used for fever in adults"),
but always tell them to follow the package instructions and speak with a doctor or pharmacist
before taking any medicine.
If they ask "exactly what should I take / how many mg / how many times / after which meal",
kindly explain you cannot provide that and they must talk to a real clinician.

EMERGENCIES AND SELF-HARM:
If they mention chest pain, difficulty breathing, stroke symptoms, severe bleeding, confusion,
seizures, very high fever with stiff neck, or self-harm thoughts:
Tell them this may be an emergency.
Advise them to seek urgent in-person help (emergency number, ER, crisis line, trusted adult).
Do not continue with casual lifestyle or medicine suggestions.

STYLE AND FORMATTING (VERY IMPORTANT):
Do NOT use Markdown headings such as #, ##, or ### in your answer.
Do NOT use Markdown bold like **this** in your answer.
Do NOT use asterisks (*), dashes (-), or numbered lists such as "1." or "2.".
Headings must use Unicode bold characters only, written exactly as shown below.
You may use bullet points, but ONLY with the bullet character "• " at the start of the line.
All other content must be plain sentences and short paragraphs, no Markdown symbols.
Use a warm, calm, and reassuring tone.
Always end by reminding them that this is general information and not a diagnosis
or a replacement for professional medical care.
`.trim();

  const medicine = `
CONTEXT: The user selected the "Medicine Information" path.

FOR MEDICINE INFORMATION ANSWERS, ALWAYS USE THESE FOUR SECTION HEADINGS,
IN THIS EXACT ORDER, USING UNICODE BOLD (NO MARKDOWN):

1) 𝗪𝗵𝗮𝘁 𝗬𝗼𝘂’𝗿𝗲 𝗘𝘅𝗽𝗲𝗿𝗶𝗲𝗻𝗰𝗶𝗻𝗴 & 𝗛𝗼𝘄 𝘁𝗼 𝗦𝘂𝗽𝗽𝗼𝗿𝘁 𝗥𝗲𝗰𝗼𝘃𝗲𝗿𝘆
2) 𝗖𝗼𝗺𝗺𝗼𝗻 𝗢𝘃𝗲𝗿-𝘁𝗵𝗲-𝗖𝗼𝘂𝗻𝘁𝗲𝗿 𝗢𝗽𝘁𝗶𝗼𝗻𝘀
3) 𝗛𝗼𝘄 𝗘𝗮𝗰𝗵 𝗢𝗽𝘁𝗶𝗼𝗻 𝗛𝗲𝗹𝗽𝘀 & 𝗧𝘆𝗽𝗶𝗰𝗮𝗹 𝗨𝘀𝗲
4) 𝗪𝗵𝗲𝗻 𝘁𝗼 𝗦𝗲𝗲 𝗮 𝗗𝗼𝗰𝘁𝗼𝗿 𝗼𝗿 𝗚𝗲𝘁 𝗨𝗿𝗴𝗲𝗻𝘁 𝗛𝗲𝗹𝗽

SECTION 1 – 𝗪𝗵𝗮𝘁 𝗬𝗼𝘂’𝗿𝗲 𝗘𝘅𝗽𝗲𝗿𝗶𝗲𝗻𝗰𝗶𝗻𝗴 & 𝗛𝗼𝘄 𝘁𝗼 𝗦𝘂𝗽𝗽𝗼𝗿𝘁 𝗥𝗲𝗰𝗼𝘃𝗲𝗿𝘆:
Immediately after this heading, output 3–5 concise bullet points.
Each bullet must start with "• ".
Summarise:
• their main symptoms and duration,
• what they are currently doing (for example water intake, meals, sleep, stress),
• and 1–2 short, practical suggestions on how improving meals, hydration, or rest
  can support faster recovery.

SECTION 2 – 𝗖𝗼𝗺𝗺𝗼𝗻 𝗢𝘃𝗲𝗿-𝘁𝗵𝗲-𝗖𝗼𝘂𝗻𝘁𝗲𝗿 𝗢𝗽𝘁𝗶𝗼𝗻𝘀:
After this heading, output a bullet list of the common OTC categories people use
for symptoms like theirs.
Each bullet must start with "• " and include the category plus 1–2 example medicines, for example:
• Pain and fever relievers (such as paracetamol/acetaminophen or ibuprofen)
• Cold and flu combinations
• Saline nasal spray
• Throat soothing lozenges
Do NOT tell them exactly which one to take; explain these are general examples.

SECTION 3 – 𝗛𝗼𝘄 𝗘𝗮𝗰𝗵 𝗢𝗽𝘁𝗶𝗼𝗻 𝗛𝗲𝗹𝗽𝘀 & 𝗧𝘆𝗽𝗶𝗰𝗮𝗹 𝗨𝘀𝗲:
After this heading, output a bullet list again.
The bullets here must correspond to the same categories listed in Section 2, in the same order.
For each bullet:
• briefly explain what that option helps with,
• give a general sense of typical use (for example "often used every 4–6 hours as directed"),
• mention if it is usually taken with food or after a meal when relevant,
• and remind them to read the package, follow the instructions, and not exceed the maximum dose.

SECTION 4 – 𝗪𝗵𝗲𝗻 𝘁𝗼 𝗦𝗲𝗲 𝗮 𝗗𝗼𝗰𝘁𝗼𝗿 𝗼𝗿 𝗚𝗲𝘁 𝗨𝗿𝗴𝗲𝗻𝘁 𝗛𝗲𝗹𝗽:
After this heading, you may use one short paragraph or a few bullet points (using "• ").
Explain when they should see a doctor if symptoms last or worsen.
Clearly describe red-flag symptoms that require urgent or emergency care.
Always finish by reminding them that you are an AI providing general information, not a doctor.
`.trim();

  const lifestyle = `
CONTEXT: The user selected the "Lifestyle Guidance" path.

FOR LIFESTYLE GUIDANCE ANSWERS, USE THESE FOUR SECTION HEADINGS
WITH UNICODE BOLD (NO MARKDOWN):

1) 𝗪𝗵𝗮𝘁 𝗬𝗼𝘂’𝗿𝗲 𝗘𝘅𝗽𝗲𝗿𝗶𝗲𝗻𝗰𝗶𝗻𝗴 & 𝗖𝘂𝗿𝗿𝗲𝗻𝘁 𝗟𝗶𝗳𝗲𝘀𝘁𝘆𝗹𝗲
2) 𝗛𝗼𝘄 𝗟𝗶𝗳𝗲𝘀𝘁𝘆𝗹𝗲 𝗖𝗵𝗮𝗻𝗴𝗲𝘀 𝗖𝗮𝗻 𝗦𝘂𝗽𝗽𝗼𝗿𝘁 𝗥𝗲𝗰𝗼𝘃𝗲𝗿𝘆
3) 𝗦𝗽𝗲𝗰𝗶𝗳𝗶𝗰 𝗟𝗶𝗳𝗲𝘀𝘁𝘆𝗹𝗲 𝗦𝘂𝗴𝗴𝗲𝘀𝘁𝗶𝗼𝗻𝘀
4) 𝗪𝗵𝗲𝗻 𝘁𝗼 𝗦𝗲𝗲 𝗮 𝗗𝗼𝗰𝘁𝗼𝗿 𝗼𝗿 𝗚𝗲𝘁 𝗨𝗿𝗴𝗲𝗻𝘁 𝗛𝗲𝗹𝗽

You may use short paragraphs and, where helpful, bullet points starting with "• ".
Keep suggestions gentle, realistic, and non-judgmental.
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
Path type: ${pathType ?? "unknown"}
Symptoms: ${patientInfo?.symptoms || "not provided"}
Duration: ${patientInfo?.symptomDuration} ${patientInfo?.symptomUnit}
Meals per day: ${patientInfo?.mealsPerDay}
Water intake: ${patientInfo?.waterIntake} L/day
Last meal: ${patientInfo?.lastMeal || "not provided"}
Selected foods: ${(patientInfo?.selectedFoods || []).join(", ") || "none"}
Sleep hours: ${patientInfo?.sleepHours}
Stress level: ${patientInfo?.stressLevel}
Exercise frequency: ${patientInfo?.exerciseFrequency}
Smoking status: ${patientInfo?.smokingStatus}
Alcohol consumption: ${patientInfo?.alcoholConsumption}
`.trim();

  let taskText: string;

  if (pathType === "medicine") {
    taskText = `
TASK:
The user is on the Medicine Information path.

Use the symptoms and form details above to personalise your explanation.
Follow the four-section structure and formatting rules for medicine answers
that are described in the system prompt.

FORMAT REQUIREMENTS FOR YOUR ANSWER:
Use exactly these four headings, each on its own line, written with Unicode bold:
𝗪𝗵𝗮𝘁 𝗬𝗼𝘂’𝗿𝗲 𝗘𝘅𝗽𝗲𝗿𝗶𝗲𝗻𝗰𝗶𝗻𝗴 & 𝗛𝗼𝘄 𝘁𝗼 𝗦𝘂𝗽𝗽𝗼𝗿𝘁 𝗥𝗲𝗰𝗼𝘃𝗲𝗿𝘆
𝗖𝗼𝗺𝗺𝗼𝗻 𝗢𝘃𝗲𝗿-𝘁𝗵𝗲-𝗖𝗼𝘂𝗻𝘁𝗲𝗿 𝗢𝗽𝘁𝗶𝗼𝗻𝘀
𝗛𝗼𝘄 𝗘𝗮𝗰𝗵 𝗢𝗽𝘁𝗶𝗼𝗻 𝗛𝗲𝗹𝗽𝘀 & 𝗧𝘆𝗽𝗶𝗰𝗮𝗹 𝗨𝘀𝗲
𝗪𝗵𝗲𝗻 𝘁𝗼 𝗦𝗲𝗲 𝗮 𝗗𝗼𝗰𝘁𝗼𝗿 𝗼𝗿 𝗚𝗲𝘁 𝗨𝗿𝗴𝗲𝗻𝘁 𝗛𝗲𝗹𝗽

Do NOT use Markdown or asterisks.
For Section 1, Section 2, and Section 3, use bullet points that start with "• ".
Section 4 can be a short paragraph or bullet points, using "• " if you choose bullets.
Keep the whole answer concise but helpful (around 180–220 words).

CONTENT REQUIREMENTS BY SECTION:

SECTION 1 – after the heading, output 3–5 short bullet points that:
• summarise their symptoms and duration,
• describe their current meals, water intake, and relevant lifestyle context,
• give 1–2 very short suggestions on how improving meals, water, or rest
  can support recovery.

SECTION 2 – after the heading, output a bullet list of common OTC categories
people often use for their kind of symptoms, with examples, such as:
• Pain and fever relievers (paracetamol/acetaminophen, ibuprofen)
• Cold and flu combination medicines
• Saline nasal spray
• Throat soothing lozenges
Use similar structure, adapted to their situation.

SECTION 3 – after the heading, output a bullet list where each bullet corresponds
to a category you listed in Section 2, in the same order.
For each:
• explain briefly what it helps with,
• describe typical use in general terms (for example "often used every 4–6 hours
  as directed on the package"),
• mention if it is usually taken with food or after a meal (if relevant),
• and remind them to read and follow the package instructions and not exceed
  the maximum daily dose.

SECTION 4 – explain when to see a doctor if symptoms persist or worsen,
and describe clear red-flag symptoms that require urgent or emergency help.
Always end by reminding them that you are an AI providing general information, not a doctor.
`.trim();
  } else if (pathType === "lifestyle") {
    taskText = `
TASK:
The user is on the Lifestyle Guidance path.

Use the symptoms and lifestyle details above (sleep, stress, water, exercise, smoking, alcohol).
Follow the four-section structure and formatting rules for lifestyle answers
that are described in the system prompt.

FORMAT REQUIREMENTS:
Use these four headings, each on its own line, in Unicode bold:
𝗪𝗵𝗮𝘁 𝗬𝗼𝘂’𝗿𝗲 𝗘𝘅𝗽𝗲𝗿𝗶𝗲𝗻𝗰𝗶𝗻𝗴 & 𝗖𝘂𝗿𝗿𝗲𝗻𝘁 𝗟𝗶𝗳𝗲𝘀𝘁𝘆𝗹𝗲
𝗛𝗼𝘄 𝗟𝗶𝗳𝗲𝘀𝘁𝘆𝗹𝗲 𝗖𝗵𝗮𝗻𝗴𝗲𝘀 𝗖𝗮𝗻 𝗦𝘂𝗽𝗽𝗼𝗿𝘁 𝗥𝗲𝗰𝗼𝘃𝗲𝗿𝘆
𝗦𝗽𝗲𝗰𝗶𝗳𝗶𝗰 𝗟𝗶𝗳𝗲𝘀𝘁𝘆𝗹𝗲 𝗦𝘂𝗴𝗴𝗲𝘀𝘁𝗶𝗼𝗻𝘀
𝗪𝗵𝗲𝗻 𝘁𝗼 𝗦𝗲𝗲 𝗮 𝗗𝗼𝗰𝘁𝗼𝗿 𝗼𝗿 𝗚𝗲𝘁 𝗨𝗿𝗴𝗲𝗻𝘁 𝗛𝗲𝗹𝗽

No Markdown, no asterisks, no numbered lists.
You may use bullet points starting with "• " where helpful, or short paragraphs.
Keep the answer around 180–220 words.
`.trim();
  } else {
    // Fallback if pathType is somehow null
    taskText = `
TASK:
Path type is unknown. Use the symptoms and lifestyle information above
to give safe, general guidance.

Use clear headings with Unicode bold as described in the system prompt.
No Markdown, no asterisks, no numbered lists.
Always end with information about when to see a doctor or get urgent help.
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
