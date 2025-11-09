// Ultra-simple debug version of /api/chat
// This should NEVER crash. If it does, something else is wrong with Vercel config.

export default async function handler(req: any, res: any) {
  try {
    // Simple GET test: open /api/chat in the browser
    if (req.method === "GET") {
      res.status(200).json({
        ok: true,
        message: "GET /api/chat is working ✅",
      });
      return;
    }

    // Only allow POST for chat messages
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed. Use POST." });
      return;
    }

    // Echo back whatever the frontend sends
    const body = req.body || {};
    res.status(200).json({
      response:
        "Test OK from /api/chat ✅\n\n" +
        "I successfully received this JSON from the frontend:\n" +
        JSON.stringify(body, null, 2),
    });
  } catch (error: any) {
    console.error("chat.ts handler crashed:", error);
    res.status(500).json({
      error: "chat.ts handler crashed",
      details: error?.message || String(error),
    });
  }
}
