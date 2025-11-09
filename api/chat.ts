// Simple test handler to verify Vercel function + frontend wiring
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    const { message } = req.body || {};
    res.status(200).json({
      response:
        'Test OK from /api/chat ✅\n\nI successfully received your message: "' +
        (message || '(no message)') +
        '".',
    });
  } catch (err: any) {
    console.error('Test handler error:', err);
    res.status(500).json({ error: 'Test handler failed', details: err?.message });
  }
}
