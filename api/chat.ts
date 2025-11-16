const apiKey = process.env.GEMINI_API_KEY as string | undefined;

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

type PathType = 'medicine' | 'lifestyle' | null;

interface UploadedFile {
  name: string;
  type: string;
  data: string; // base64 (no data: prefix)
}

function buildSystemPrompt(pathType: PathType) {
  const base = `
You are "Medsafe", an empathetic health companion chatbot.

SAFETY RULES
- Provide general educational information only.
- You are not a doctor, do not diagnose, and do not prescribe.
- Never give exact milligram doses or detailed personalised schedules.
- You may mention that medicines are often taken every few hours "as directed on the package",
  but always tell users to read the leaflet and speak with a doctor or pharmacist.
- If the user asks for exact amounts, exact timing, or personalised instructions,
  kindly explain you cannot provide that and they must talk to a clinician.

EMERGENCIES AND SELF-HARM
- If you notice chest pain, severe breathing trouble, stroke signs, severe bleeding,
  seizures, confusion, or self-harm thoughts:
  - Say this may be an emergency.
  - Advise them to seek urgent in-person help (emergency number, ER, urgent care, crisis line, or trusted adult).
  - Keep the tone calm and supportive.

STYLE
- Warm, calm, and reassuring.
- Use short paragraphs.
- Use plain text headings on their own line, with no hashes (#) or asterisks (*).
- Use simple dash bullets like "- " for lists.
- Do not use markdown formatting, tables, or emoji.
- End by reminding them this is general information and not a diagnosis.
`;

  const medicine = `
CONTEXT: The user selected Medicine Information.

FOR THE FIRST, COMPREHENSIVE ANSWER, STRUCTURE YOUR RESPONSE LIKE THIS
(headings as plain text lines, no symbols around them):

What You Are Experiencing And How To Support Recovery
- 2–4 short bullets summarising their symptoms, duration, and lifestyle context (meals, water, sleep).
- Mention where they are doing something helpful (for example drinking water).
- Gently suggest small improvements (for example more meals, more fluids, more rest).

Common Over-The-Counter Options
- 2–5 bullets listing general categories that many people use (for example paracetamol/acetaminophen, ibuprofen, antihistamines, throat lozenges), chosen to fit their symptoms.
- For each bullet, mention it is a common option and that people must follow package instructions and ask a doctor or pharmacist if unsure.

How Each Option Helps And Typical Use
- 2–5 bullets, one for each category above.
- Explain in plain language what it helps with (for example "reduces fever and body pain").
- You may say things like "often taken every 4–6 hours as directed on the package" but never mention exact mg numbers or maximum mg per day.

When To See A Doctor Or Get Urgent Help
- 3–6 bullets with clear warning signs (for example fever for several days, very high temperature, trouble breathing, chest pain, confusion, stiff neck, severe rash, severe pain, or anything that worries them).
- Tell them to seek urgent or in-person care if any of these happen.

Always finish with one short line reminding them that this is general education and not a diagnosis or substitute for medical care.
`;

  const lifestyle = `
CONTEXT: The user selected Lifestyle Guidance.

FOR THE FIRST, COMPREHENSIVE ANSWER, STRUCTURE YOUR RESPONSE LIKE THIS:

Your Current Habits At A Glance
- 3–6 bullets summarising their sleep, water, meals, stress, exercise, smoking, and alcohol based on the form.

Small Changes You Can Start With
- 4–8 bullets with specific but gentle suggestions (for example "aim for 2–3 small meals if you currently eat once", "add a 10–15 minute walk most days").
- Keep each suggestion achievable and non-judgmental.

What You Might Notice Over Time
- 3–6 bullets describing realistic timelines such as "many people feel a bit more energy after a few days of better hydration" or "sleep improvements can take 1–2 weeks of a steady routine".

When To Get Extra Support
- 3–6 bullets describing when it would be helpful to talk to a doctor, therapist, or other professional (for example ongoing fatigue, low mood, very high stress, or existing medical conditions).

Always end by saying this is general wellness guidance and does not replace personalised medical advice.
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
  file?: UploadedFile | null;
}) {
  const { message, pathType, patientInfo, chatHistory, file } = options;

  const historyText =
    chatHistory && chatHistory.length
      ? chatHistory
          .map((m: any) => `${m.role === 'user' ? 'User' : 'Medsafe'}: ${m.message}`)
          .join('\n')
      : 'No previous messages yet.';

  const hasHistory = !!(chatHistory && chatHistory.length);

  const fileLine = file
    ? `The user also uploaded a file named "${file.name}" of type "${file.type}". Use information from this file together with the text and form when helpful.`
    : 'No file was uploaded for this message.';

  // Extra behaviour instructions for follow-up turns
  const followUpInstructions = hasHistory
    ? `
FOLLOW-UP BEHAVIOUR
- This is a follow-up question, not the first response.
- Do NOT repeat your entire previous explanation or all sections again.
- Do NOT regenerate the full "Your Current Habits At A Glance" or "Small Changes You Can Start With" blocks unless the user clearly asks you to repeat them.
- Briefly refer to earlier points only if it helps (for example "earlier we talked about your sleep"), then focus on answering the new question.
- Keep follow-up replies shorter: usually 2–5 dash bullets OR 1–2 short paragraphs.
- Answer only what the user is asking now, using their previous context when helpful.
`
    : '';

  return `
Previous conversation
${historyText}

Form information
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

File information
- ${fileLine}

User's latest message
"${message}"

HOW TO RESPOND
- Speak as Medsafe in warm, plain language.
- Use the form information and, if present, the uploaded file content as context.
- For the first main answer in this conversation, follow the requested section structure for the chosen path type.
- Use headings as plain text lines with no hashes or asterisks.
- Use dash bullets for lists.
- Do not include emojis or markdown.
- Do not give exact doses or personalised prescriptions.
- Remind them at the end that this is general information and not a diagnosis.
${followUpInstructions}
`;
}

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    res.status(200).json({
      ok: true,
      message: 'GET /api/chat is working',
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
        'Medsafe configuration issue: the GEMINI_API_KEY is not set in the server environment. Please add it in Vercel settings and redeploy.',
    });
    return;
  }

  try {
    const { message, pathType, patientInfo, chatHistory, file } = req.body as {
      message: string;
      pathType: PathType;
      patientInfo: any;
      chatHistory: any[];
      file?: UploadedFile | null;
    };

    const systemPrompt = buildSystemPrompt(pathType);
    const userPrompt = buildUserPrompt({
      message,
      pathType,
      patientInfo,
      chatHistory: chatHistory || [],
      file: file || null,
    });

    const parts: any[] = [{ text: systemPrompt + '\n\n' + userPrompt }];

    if (file && file.data && file.type) {
      parts.push({
        inlineData: {
          mimeType: file.type,
          data: file.data,
        },
      });
    }

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
          'I had a problem talking to the Gemini model, so I could not generate a full answer.\n\n' +
          `Technical details for the developer:\nHTTP ${response.status} ${response.statusText}\n` +
          errorText,
      });
      return;
    }

    const data = await response.json();

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text || '')
        .join('') || 'Sorry, I could not generate a response right now.';

    res.status(200).json({ response: text });
  } catch (error: any) {
    console.error('/api/chat Gemini error:', error);
    res.status(200).json({
      response:
        'I ran into an error while trying to talk to the Gemini model.\n\n' +
        'Technical details for the developer:\n' +
        (error?.message || String(error)),
    });
  }
}
