// Vercel serverless function: приймає промпт, викликає Gemini (Nano Banana), повертає картинку.
// Ключ береться зі змінних середовища, а не з коду сторінки.
const MODELS = {
  banana: process.env.GEMINI_MODEL || "gemini-2.5-flash-image",
  pro: process.env.GEMINI_MODEL_PRO || "gemini-3-pro-image-preview",
};

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Лише POST" });

  const { prompt, model, code } = req.body || {};
  if (process.env.ACCESS_CODE && code !== process.env.ACCESS_CODE) {
    return res.status(401).json({ error: "Невірний код доступу" });
  }
  if (!prompt || typeof prompt !== "string" || prompt.length > 500) {
    return res.status(400).json({ error: "Опис має бути до 500 символів" });
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: "На сервері не задано GEMINI_API_KEY" });

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELS[model] || MODELS.banana}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: data.error?.message || "Помилка Gemini" });

    const parts = data.candidates?.[0]?.content?.parts || [];
    const img = parts.find((p) => p.inlineData || p.inline_data);
    const d = img && (img.inlineData || img.inline_data);
    if (!d) return res.status(502).json({ error: "Модель не повернула картинку. Спробуй інший опис." });

    res.status(200).json({ image: `data:${d.mimeType || d.mime_type || "image/png"};base64,${d.data}` });
  } catch (e) {
    res.status(500).json({ error: "Помилка сервера" });
  }
};
