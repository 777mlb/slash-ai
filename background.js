chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== "slashai:complete") return;

  (async () => {
    try {
      const { prompt } = msg;
      if (!prompt || typeof prompt !== "string") {
        sendResponse({ ok: false, error: "Empty prompt." });
        return;
      }
      const { apiKey } = await chrome.storage.sync.get(["apiKey"]);
      if (!apiKey) {
        sendResponse({ ok: false, error: "OpenAI API key not set. Open extension Options to add it." });
        return;
      }

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You write concise, helpful text that continues seamlessly from the user's cursor." },
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 600
        })
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        sendResponse({ ok: false, error: `OpenAI error ${res.status}: ${text.slice(0, 300)}` });
        return;
      }
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content?.trim();
      if (!content) {
        sendResponse({ ok: false, error: "No content returned." });
        return;
      }
      sendResponse({ ok: true, content });
    } catch (e) {
      sendResponse({ ok: false, error: String(e?.message || e) });
    }
  })();

  return true;
});