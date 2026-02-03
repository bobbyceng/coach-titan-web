const MODEL_ID = process.env.ARK_MODEL_ID || "doubao-seed-1-6-vision-250815";
const BASE_URL = process.env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3/responses";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const apiKey = process.env.ARK_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Missing ARK_API_KEY" });
    return;
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  const { prompt, imageBase64, imageUrl } = body;

  if (!prompt) {
    res.status(400).json({ error: "Missing prompt" });
    return;
  }

  const content = [];
  if (imageBase64 || imageUrl) {
    const imageSource = imageUrl || `data:image/jpeg;base64,${imageBase64}`;
    content.push({ type: "input_image", image_url: imageSource });
  }
  content.push({ type: "input_text", text: prompt });

  try {
    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL_ID,
        input: [
          {
            role: "user",
            content,
          },
        ],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      res.status(response.status).json({ error: "Ark API error", detail: data });
      return;
    }

    res.status(200).json({ data });
  } catch (error) {
    res.status(500).json({ error: "Request failed", detail: error?.message });
  }
}
