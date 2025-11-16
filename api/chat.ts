// api/chat.ts

const apiKey = process.env.GEMINI_API_KEY as string | undefined;

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

type PathType = 'medicine' | 'lifestyle' | null;

function buildSystemPrompt(pathType: PathType) {
  const base = `
You are "Medsafe", an empathetic health companion chatbot.

SAFETY RULES:
- Provide general educational information only.
- You are NOT a doctor, do NOT diagnose, and do NOT prescribe for this specific user.
- Never calculate a personalised dose based on weight, age, or history.
- You may mention common over-the-counter (OTC) categories and typical schedules in general terms
  (for example: "many adults take paracetamol every 4–6 hours as directed on the package"),
  but always tell them to follow the package instructions and ask a doctor or pharmacist.
- If the user asks "exactly what should I take / how many mg / how many times / after which meal",
  kindly explain you cannot provide personalised instructions and they must talk to a real clinician.

EMERGENCIES AND SELF-HARM:
- If they mention chest pain, difficulty breathing, stroke symptoms, severe bleeding,
  confusion, seizures, or self-harm thoughts:
  - Clearly say this may be an emergency.
  - Advise them to seek urgent in-person help (emergency number, ER, crisis line, trusted adult).
  - Keep the tone calm and supportive and avoid casual lifestyle or medicine suggestions.

STYLE RULES:
- Very warm, calm, and reassuring.
- Use short paragraphs.
- Use **bold headings** like: **What You’re Experiencing & How to Support Recovery**
- Use bullet lists with "- " (dash + space).
- Do NOT use hashes (#, ##, ###) for headings.
- Do NOT use "*" bullets.
- Keep the answer concise but complete enough to be genuinely helpful.
- Always end by reminding them this is general information and not a diagnosis or a substitute for professional care.
`;

  const medicine = `
CONTEXT: User selected "Medicine Information".

GOALS AND STRUCTURE:
- Start with 1–2 empathetic sentences.
- Then use this structure (headings must be bold):

**What You’re Experiencing & How to Support Recovery**
- Summarise their main symptoms, duration, meals, water intake, and any key context.
- Briefly explain how improving meals, hydration, sleep, and rest can support recovery.

**Common Over-the-Counter Options**
- Use 2–4 bullets for common categories used by many people for symptoms like theirs,
  for example: paracetamol/acetaminophen, ibuprofen, simple cold-and-flu combinations, throat lozenges, etc.
- Each bullet should be "Medicine/category – very short description of what it is usually used for".

**How Each Option Helps & Typical Use**
- Use bullets again, matching the options you mentioned above.
- For each, explain:
  - how it generally works,
  - typical patterns like "often taken every 4–6 hours as directed on the package",
  - whether people usually take it with food or not.
- Keep it clearly general, not personalised instructions.

**When to See a Doctor or Get Urgent Help**
- Give 4–6 clear bullets with warning signs or red flags.
- Include both:
  - when to book a normal doctor appointment, and
  - when to seek urgent or emergency care.

- Finish with 1 short, encouraging sentence and the reminder that this is educational only.
`;

  const lifestyle = `
CONTEXT: User selected "Lifestyle Guidance".

GOALS AND STRUCTURE:
- Start with 1–2 empathetic sentences.
- Then use this structure (headings must be bold):

**Your Current Habits at a Glance**
- Summarise their sleep, water intake, meals, stress, exercise, smoking, and alcohol in 3–5 short bullets.

**Small Changes That Could Help**
- Give 4–6 small, realistic suggestions (hydration, sleep routine, gentle movement, stress tools, etc.).
- Each bullet should be one clear behaviour change, not a big list.

**What You Might Notice Over Time**
- 3–4 bullets describing approximate timelines like:
  - "Many people notice a bit more energy after a few days of…"
  - "Sleep often feels more settled after 1–2 weeks of…"

**When to Talk to a Professional**
- 3–5 bullets on when to see a doctor, counsellor, or other professional.

- Finish with a short supportive message and reminder that this is not medical advice.
`;

  if (pathType === 'medicine') return base + medicine;
  if (pathType === 'lifestyle') return base + lifestyle;
  return base;
}

function buildUserPrompt(options: {
  message: string;
  pathType: PathType;
  patientInfo: any;
  chatHistory: any[];
  hasFile: boolean;
}) {
  const { message, pathType, patientInfo, chatHistory, hasFile } = options;

  const historyText =
    chatHistory && chatHistory.length
      ? chatHistory
          .map((m: any) => `${m.role === 'user' ? 'User' : 'Medsafe'}: ${m.message}`)
          .join('\n')
      : 'No previous messages yet.';

  const fileNote = hasFile
    ? '\nThe user has also attached a file. Use any helpful information from that file when answering, but still follow the safety rules.\n'
    : '';

  return `
Previous conversation:
${historyText}

Form information:
- Path type: ${pathType ?? 'unknown'}
- Symptoms: ${patientInfo?.symptoms || 'not provided'}
- Duration: ${patientInfo?.symptomDuration} ${patientInfo?.symptomUnit}
- Meals per day: ${patientInfo?.mealsPerDay}
- Water intake: ${patientInfo?.waterIntake} L/day
- Last meal: ${patientInfo?.lastMeal || 'not provided'}
- Selected foods: ${(patientInfo?.selectedFoods || []).join(', ') || 'none'}
- Sleep hours: ${patientInfo?.sleepHours}
- Stress level: ${patientInfo?.stressLevel}
- Exercise frequency: ${patientInfo?.exerciseFrequency}
- Smoking status: ${patientInfo?.smokingStatus}
- Alcohol consumption: ${patientInfo?.alcoholConsumption}
${fileNote}
User's latest message:
"${message || '[User only uploaded a file without extra text]'}"

HOW TO RESPOND:
- Speak as "Medsafe".
- Use their symptoms/lifestyle context naturally.
- Follow the required structure and headings for this path type.
- Use "- " for bullets, no numbered lists unless needed.
- Do NOT use hash symbols (#, ##, ###) or markdown headings.
- Keep it empathetic, concise, and practical.
- Do not provide personalised prescriptions or dosing instructions.
- End with a reminder that this is general information and not a diagnosis or substitute for seeing a professional.
`;
}

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    res.status(200).json({
      ok: true,
      message: 'GET /api/chat is working ✅',
      hasApiKey: !!apiKey,
    });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  if (!apiKey) {
    res.status(200).json({
      response:
        '⚠️ Medsafe server configuration issue: GEMINI_API_KEY is not set or invalid in the Vercel Environment Variables. Please add it and redeploy.',
    });
    return;
  }

  try {
    const {
      message,
      pathType,
      patientInfo,
      chatHistory,
      file,
    }: {
      message: string;
      pathType: PathType;
      patientInfo: any;
      chatHistory: any[];
      file?: { name: string; type: string; data: string } | null;
    } = req.body;

    const systemPrompt = buildSystemPrompt(pathType);
    const userPrompt = buildUserPrompt({
      message,
      pathType,
      patientInfo,
      chatHistory: chatHistory || [],
      hasFile: !!file && !!file.data,
    });

    const parts: any[] = [
      { text: systemPrompt },
    ];

    // If a file was uploaded, send it as inlineData so Gemini can read it
    if (file && file.data) {
      parts.push({
        inlineData: {
          mimeType: file.type || 'application/octet-stream',
          data: file.data,
        },
      });
    }

    parts.push({ text: '\n\n' + userPrompt });

    const payload = {
      contents: [
        {
          role: 'user',
          parts,
        },
      ],
    };

    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      res.status(200).json({
        response:
          '⚠️ I had a problem talking to the Gemini model, so I could not generate a full answer.\n\n' +
          `Technical details for the developer:\nHTTP ${response.status} ${response.statusText}\n` +
          errorText,
      });
      return;
    }

    const data = await response.json();

    let text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text || '')
        .join('') || 'Sorry, I could not generate a response right now.';

    // Light post-processing: strip leading "#" from any lines, just in case
    text = text
      .split('\n')
      .map((line: string) => line.replace(/^#+\s*/, ''))
      .join('\n');

    res.status(200).json({ response: text });
  } catch (error: any) {
    console.error('/api/chat Gemini error:', error);
    res.status(200).json({
      response:
        '⚠️ I ran into an error while trying to talk to the Gemini model.\n\n' +
        'Technical details for the developer:\n' +
        (error?.message || String(error)),
    });
  }
}
