(() => {
  const INPUT_TYPES = new Set(["text","search","email","tel","url","password"]);
  const isMac = navigator.platform.toUpperCase().includes("MAC");
  let state = {
    activeEl: null,
    inPrompt: false,
    promptBuffer: "",
    caretIndex: 0,       // for inputs/textareas
    mode: null,          // "input" | "ce"
    overlay: null,
    ceRoot: null,        // contentEditable root
    bookmarkId: null     // id for insertion point in CE
  };

  // ---------- Utils ----------
  function isSimpleEditable(el) {
    if (!el) return false;
    if (el.tagName === "TEXTAREA") return true;
    if (el.tagName === "INPUT" && INPUT_TYPES.has(el.type)) return true;
    return false;
  }
  function getContentEditableRoot(node) {
    if (!node) return null;
    if (node.nodeType === 1 && node.isContentEditable) return node.closest("[contenteditable='true']");
    const el = node.nodeType === 3 ? node.parentElement : node;
    return el ? el.closest("[contenteditable='true']") : null;
  }

  function ensureOverlay() {
    if (state.overlay) return state.overlay;
    const d = document.createElement("div");
    d.id = "slashai-overlay";
    d.setAttribute("aria-live", "polite");
    d.className = "slashai-overlay";
    d.style.position = "fixed";
    d.style.zIndex = "2147483647";
    d.style.maxWidth = "420px";
    document.body.appendChild(d);
    return (state.overlay = d);
  }

  function overlayHTML(text, subtle=false) {
    const title = subtle ? "slash AI" : `slash AI — type your prompt, press ${isMac ? "⌘↵" : "Ctrl+Enter"}`;
    return `
      <div class="slashai-card">
        <div class="slashai-title">${title}</div>
        <div class="slashai-body">${escapeHtml(text || "")}</div>
        <div class="slashai-hint"><kbd>Esc</kbd> to cancel</div>
      </div>
    `;
  }

  function renderOverlay(text, subtle=false) {
    const d = ensureOverlay();
    d.innerHTML = overlayHTML(text, subtle);
    positionOverlay();
    d.style.display = "block";
  }

  function hideOverlay() { if (state.overlay) state.overlay.style.display = "none"; }

  function resetState() {
    state.inPrompt = false;
    state.promptBuffer = "";
    state.activeEl = null;
    state.caretIndex = 0;
    state.mode = null;
    state.ceRoot = null;
    if (state.bookmarkId) removeBookmark(state.bookmarkId);
    state.bookmarkId = null;
    hideOverlay();
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function positionOverlay() {
    const d = ensureOverlay();
    let rect;
    if (state.mode === "ce") {
      const sel = window.getSelection();
      if (sel && sel.rangeCount) {
        rect = sel.getRangeAt(0).getBoundingClientRect();
      }
      if (!rect || (!rect.width && !rect.height)) {
        rect = state.ceRoot?.getBoundingClientRect();
      }
    } else {
      rect = state.activeEl?.getBoundingClientRect();
    }
    if (!rect) return;

    const top = Math.max(8, rect.top + 8) + window.scrollY;
    const left = Math.min(window.innerWidth - 440, rect.left + 8) + window.scrollX;
    d.style.top = `${top}px`;
    d.style.left = `${left}px`;
  }

  // ---------- Simple inputs & textareas ----------
  document.addEventListener("input", (e) => {
    const el = e.target;
    if (!isSimpleEditable(el)) return;
    if (state.inPrompt) return;

    const caret = el.selectionStart;
    const val = el.value;
    if (typeof caret !== "number") return;
    if (caret >= 3 && val.slice(caret - 3, caret).toLowerCase() === "/ai") {
      el.value = val.slice(0, caret - 3) + val.slice(caret);
      const newCaret = caret - 3;
      el.selectionStart = el.selectionEnd = newCaret;

      state.inPrompt = true;
      state.activeEl = el;
      state.caretIndex = newCaret;
      state.mode = "input";
      state.promptBuffer = "";
      renderOverlay("", false);
    }
  }, true);

  // ---------- Gmail compose (contentEditable) ----------
  document.addEventListener("input", (e) => {
    if (state.inPrompt) return;
    const ceRoot = getContentEditableRoot(e.target);
    if (!ceRoot) return;

    // Only act inside Gmail compose or any CE in general — MVP aims for Gmail
    // Detect "/ai" just before caret using a text slice from root start to caret
    const textBefore = getTextBeforeCaret(ceRoot);
    if (!textBefore || textBefore.length < 3) return;
    if (textBefore.slice(-3).toLowerCase() !== "/ai") return;

    // Remove "/ai"
    const start = textBefore.length - 3;
    const end = textBefore.length;
    const delRange = rangeFromGlobalOffsets(ceRoot, start, end);
    if (delRange) delRange.deleteContents();

    // Place a tiny bookmark at caret to ensure robust insertion later
    const bookmarkId = placeBookmarkAtCaret();

    state.inPrompt = true;
    state.mode = "ce";
    state.ceRoot = ceRoot;
    state.bookmarkId = bookmarkId;
    state.promptBuffer = "";
    renderOverlay("", false);
  }, true);

  function getTextBeforeCaret(root) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return "";
    const r = document.createRange();
    r.selectNodeContents(root);
    // use anchor; collapsed selection so anchor==focus
    try {
      r.setEnd(sel.anchorNode, sel.anchorOffset);
    } catch {
      return "";
    }
    return r.toString();
  }

  function rangeFromGlobalOffsets(root, start, end) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let pos = 0, node, r = document.createRange();
    let haveStart = false, haveEnd = false;

    while ((node = walker.nextNode())) {
      const len = node.nodeValue.length;
      const next = pos + len;

      if (!haveStart && start <= next) {
        r.setStart(node, Math.max(0, start - pos));
        haveStart = true;
      }
      if (!haveEnd && end <= next) {
        r.setEnd(node, Math.max(0, end - pos));
        haveEnd = true;
        break;
      }
      pos = next;
    }
    if (!haveStart || !haveEnd) return null;
    return r;
  }

  function placeBookmarkAtCaret() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    const id = "slashai-bm-" + Math.random().toString(36).slice(2);
    const r = sel.getRangeAt(0).cloneRange();
    const span = document.createElement("span");
    span.setAttribute("data-slashai-bm", id);
    span.style.display = "inline-block";
    span.style.width = "0";
    span.style.height = "0";
    span.style.overflow = "hidden";
    r.insertNode(span);
    // Keep selection after bookmark
    const after = document.createRange();
    after.setStartAfter(span);
    after.collapse(true);
    sel.removeAllRanges();
    sel.addRange(after);
    return id;
  }

  function removeBookmark(id) {
    if (!id) return;
    const span = document.querySelector(`span[data-slashai-bm="${id}"]`);
    if (span && span.parentNode) span.parentNode.removeChild(span);
  }

  function insertAtBookmark(id, text) {
    const span = document.querySelector(`span[data-slashai-bm="${id}"]`);
    if (!span) return;

    const frag = document.createDocumentFragment();
    const lines = String(text).split("\n");
    for (let i = 0; i < lines.length; i++) {
      frag.appendChild(document.createTextNode(lines[i]));
      if (i < lines.length - 1) frag.appendChild(document.createElement("br"));
    }

    span.parentNode.insertBefore(frag, span);
    // place caret after inserted text
    const sel = window.getSelection();
    const r = document.createRange();
    const last = span.previousSibling || span;
    r.setStartAfter(last);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);

    span.remove();
  }

  // ---------- Shared prompt-mode keystrokes ----------
  document.addEventListener("keydown", (e) => {
    if (!state.inPrompt) return;

    // Ensure the user did not switch focus away
    if (state.mode === "input" && document.activeElement !== state.activeEl) {
      resetState();
      return;
    }
    if (state.mode === "ce") {
      const root = state.ceRoot;
      if (!root || !root.isConnected) { resetState(); return; }
    }

    // Send
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      e.stopPropagation();
      renderOverlay("Sending…", true);
      chrome.runtime.sendMessage(
        { type: "slashai:complete", prompt: state.promptBuffer.trim() },
        (resp) => {
          if (!resp || !resp.ok) {
            renderOverlay(resp?.error || "Error", true);
            setTimeout(resetState, 2000);
            return;
          }
          if (state.mode === "input") {
            insertAtCaret(state.activeEl, state.caretIndex, resp.content);
          } else {
            insertAtBookmark(state.bookmarkId, resp.content);
          }
          resetState();
        }
      );
      return;
    }

    // Cancel
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      resetState();
      return;
    }

    // Buffer edits
    if (e.key === "Backspace") {
      e.preventDefault();
      e.stopPropagation();
      state.promptBuffer = state.promptBuffer.slice(0, -1);
      renderOverlay(state.promptBuffer);
      return;
    }

    if (e.key.length === 1 && !e.altKey && !e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      state.promptBuffer += e.key;
      renderOverlay(state.promptBuffer);
      return;
    }

    // Prevent other keys from affecting the page while prompting
    if (!e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  // Insert for simple inputs
  function insertAtCaret(el, caretIndex, text) {
    const before = el.value.slice(0, caretIndex);
    const after = el.value.slice(caretIndex);
    el.value = before + text + after;
    const newCaret = caretIndex + text.length;
    el.selectionStart = el.selectionEnd = newCaret;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  // Cancel prompt if user clicks elsewhere or frame blurs
  document.addEventListener("mousedown", () => { if (state.inPrompt) resetState(); }, true);
  window.addEventListener("blur", () => { if (state.inPrompt) resetState(); });
})();