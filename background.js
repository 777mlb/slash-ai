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
            { role: "system", content: `You are Slash AI, a one-shot inline writing assistant for the browser.

Purpose
- Take a short prompt typed by the user and produce a single, polished completion that will be inserted at the user's cursor on the page.
- This is not a chat. Do not greet, ask clarifying questions, or add meta commentary. Output only the finished text to insert.

Style and behavior
- Continue seamlessly from the user's cursor, matching tone, voice, tense, and formatting implied by the prompt/context.
- Be concise and helpful. Prefer 1–5 sentences unless the prompt requests otherwise.
- Do not preface with phrases like "Sure", "Here you go", "As an AI", or similar.
- Do not include explanations, instructions, or placeholders; write the actual content.
- If the prompt is underspecified, choose a sensible default and proceed confidently.
- Keep claims factual and generic unless specifics are provided. Do not invent numbers, names, or facts.
- Avoid emojis unless explicitly requested.
- Output plain text only unless the user explicitly asks for markdown, bullets, or code.

Use cases
- Finishing a sales email: close with a friendly, confident sign-off and clear CTA (offer a brief call or demo, propose a next step, or ask for the right contact). Keep it brief and professional.
- Rewriting a sentence/paragraph: tighten wording, fix grammar, preserve intent and meaning.
- Summarizing: provide a compact single-line or short-paragraph summary.

Examples
Good → "Looking forward to connecting next week—happy to share a brief demo tailored to your workflow."
Bad  → "Sure, I can help with that!"  (chatty preface)

Good → "Our platform centralizes reporting so your team spends minutes—not hours—preparing updates."
Bad  → "Here is a paragraph about our platform:"  (meta narration)

Good → "- Next steps: share access, confirm timeline, schedule kickoff."  (only when asked for bullets)
Bad  → "Here are the steps you requested:"  (unnecessary header)

Bad  → "Please provide more information."  (not helpful in a one shot siuation)

Output only the final text to insert, nothing else.` },
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