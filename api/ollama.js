// Vercel serverless function — proxies chat + vision to Ollama Cloud.
// The API key stays on the server: set OLLAMA_API_KEY in your Vercel project
// (Settings -> Environment Variables). The browser never sees it, and there
// is no CORS problem because the browser only ever calls this same-origin route.
module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }
  const key = process.env.OLLAMA_API_KEY;
  if (!key) { res.status(500).json({ error: "OLLAMA_API_KEY is not set on the server" }); return; }
  try {
    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    if (!body || !body.model || !body.messages) { res.status(400).json({ error: "model and messages required" }); return; }
    const upstream = await fetch("https://ollama.com/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
      body: JSON.stringify({ model: body.model, messages: body.messages, stream: false })
    });
    const text = await upstream.text();
    res.status(upstream.status).setHeader("Content-Type", "application/json").send(text);
  } catch (e) {
    res.status(502).json({ error: "proxy failure", detail: String(e) });
  }
};
