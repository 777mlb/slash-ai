# Slash AI (v0.2)

Type `/ai` inside:
- any textarea or simple input
- **Gmail compose message body** (contentEditable in mail.google.com)

A tiny overlay appears. Type your prompt, press ⌘↵ (or Ctrl+Enter). The AI response is inserted at the original cursor. No page scraping in v0.

## Install (unpacked)
1. Save files to a folder.
2. `chrome://extensions` → enable **Developer mode**.
3. **Load unpacked** → select the folder.
4. Open "Extension options" and paste your OpenAI API key.

## Use
- In Gmail, click **Compose** so your caret is in the message body, type `/ai`, write your prompt in the overlay, press ⌘↵ / Ctrl+Enter.
- Works similarly in textareas and simple inputs.

## Notes
- We inject into all frames (`all_frames: true`) so Gmail compose iframes are covered.
- Newlines in responses become `<br>` lines in Gmail.
- Notion and other rich editors are out of scope for this MVP.

## Next up (not in v0)
- Notion and general `contentEditable` robustness.
- Tiny spinner in overlay.
- Optional "include selection as context".

Quick acceptance tests
    •    Gmail: Compose → type /ai then "write a friendly signoff for this email" → ⌘↵ → text appears at caret with line breaks respected.
    •    Esc cancels and leaves compose untouched.
    •    If API key missing, overlay shows a clear error.
    •    Still works in any <textarea> (e.g., a comment box).