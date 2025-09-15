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
    bookmarkId: null,    // id for insertion point in CE
    showCommandDropdown: false,
    selectedCommandIndex: 0,
    includeContext: true
  };

  const SLASH_COMMANDS = [
    { command: '/date', description: 'Insert current date' },
    { command: '/time', description: 'Insert current time' }
  ];

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
    let dropdownHTML = "";

    if (state.showCommandDropdown) {
      const filteredCommands = getFilteredCommands(text);
      if (filteredCommands.length > 0) {
        dropdownHTML = `
          <div class="slashai-dropdown">
            ${filteredCommands.map((cmd, index) => `
              <div class="slashai-dropdown-item ${index === state.selectedCommandIndex ? 'selected' : ''}" data-command="${cmd.command}">
                <span class="command">${cmd.command}</span>
                <span class="description">${cmd.description}</span>
              </div>
            `).join('')}
          </div>
        `;
      }
    }

    return `
      <div class="slashai-card">
        <div class="slashai-title">${title}</div>
        <div class="slashai-body">${formatPromptWithCommands(text || "")}</div>
        <div class="slashai-ctxrow">
          <label class="slashai-ctxlabel">
            <input type="checkbox" id="slashai-ctx-toggle" ${state.includeContext ? 'checked' : ''} /> Include selection/context
          </label>
        </div>
        ${dropdownHTML}
        <div class="slashai-hint"><kbd>Esc</kbd> to cancel</div>
      </div>
    `;
  }

  function getFilteredCommands(text) {
    if (!text.includes('/')) return [];
    const words = text.split(/\s+/);
    const lastWord = words[words.length - 1];
    if (!lastWord.startsWith('/')) return [];

    // If just "/", show all commands
    if (lastWord === '/') {
      return SLASH_COMMANDS;
    }

    return SLASH_COMMANDS.filter(cmd =>
      cmd.command.toLowerCase().startsWith(lastWord.toLowerCase())
    );
  }

  function renderOverlay(text, subtle=false) {
    const d = ensureOverlay();
    d.innerHTML = overlayHTML(text, subtle);
    positionOverlay();
    d.style.display = "block";

    // Wire up context toggle
    const cb = d.querySelector('#slashai-ctx-toggle');
    if (cb) {
      cb.addEventListener('click', (ev) => {
        // Keep prompt open and avoid page interactions
        ev.stopPropagation();
      }, true);
      cb.addEventListener('change', (ev) => {
        state.includeContext = !!cb.checked;
        ev.stopPropagation();
      }, true);
    }
  }

  function hideOverlay() { if (state.overlay) state.overlay.style.display = "none"; }

  function resetState() {
    state.inPrompt = false;
    state.promptBuffer = "";
    state.activeEl = null;
    state.caretIndex = 0;
    state.mode = null;
    state.ceRoot = null;
    state.showCommandDropdown = false;
    state.selectedCommandIndex = 0;
    if (state.bookmarkId) removeBookmark(state.bookmarkId);
    state.bookmarkId = null;
    hideOverlay();
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function formatPromptWithCommands(text) {
    if (!text) return '';

    // Split by spaces and process each word
    const words = text.split(/(\s+)/); // Include whitespace in split
    return words.map(word => {
      const trimmedWord = word.trim();
      // Check if this word is a complete slash command
      const isValidCommand = SLASH_COMMANDS.some(cmd => cmd.command === trimmedWord);

      if (isValidCommand) {
        return `<span class="slashai-command">${escapeHtml(word)}</span>`;
      } else {
        return escapeHtml(word);
      }
    }).join('');
  }

  function processSlashCommands(text) {
    return text
      .replace(/\/date\b/g, () => {
        const now = new Date();
        return now.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
      })
      .replace(/\/time\b/g, () => {
        const now = new Date();
        return now.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      });
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
    console.log("Slash AI Debug - insertAtBookmark called with id:", id);
    const span = document.querySelector(`span[data-slashai-bm="${id}"]`);
    console.log("Slash AI Debug - Found bookmark span:", span);

    if (!span) {
      console.log("Slash AI Debug - Bookmark span not found, trying fallback insertion");
      // Fallback: try to insert at the currently focused element
      const activeEl = document.activeElement;
      console.log("Slash AI Debug - Fallback active element:", activeEl);

      if (activeEl && activeEl.isContentEditable) {
        console.log("Slash AI Debug - Using fallback contentEditable insertion");
        activeEl.focus();
        const selection = window.getSelection();

        // Insert at current cursor position rather than end
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents(); // Clear any selection

          // Insert text
          const textNode = document.createTextNode(text);
          range.insertNode(textNode);

          // Move cursor after inserted text
          range.setStartAfter(textNode);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          // Fallback: append to end but avoid extra spacing
          const lastChild = activeEl.lastChild;
          const textNode = document.createTextNode(text);

          // If last child is a text node, append directly
          if (lastChild && lastChild.nodeType === Node.TEXT_NODE) {
            lastChild.textContent += text;
          } else {
            activeEl.appendChild(textNode);
          }

          // Set cursor after the inserted text
          const range = document.createRange();
          range.setStartAfter(textNode);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }

        // Trigger input event
        activeEl.dispatchEvent(new Event("input", { bubbles: true }));
        return;
      }
      return;
    }

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

    // Trigger input event for LinkedIn compatibility
    const contentEditableRoot = span.closest('[contenteditable="true"]');
    if (contentEditableRoot) {
      contentEditableRoot.dispatchEvent(new Event("input", { bubbles: true }));
    }
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
      const processedPrompt = processSlashCommands(state.promptBuffer.trim());

      // Build optional context string
      const ctx = collectContext();
      const finalPrompt = ctx
        ? `Context (do not quote verbatim; use only as background):\n${ctx}\n\nTask: ${processedPrompt}`
        : processedPrompt;

      chrome.runtime.sendMessage(
        { type: "slashai:complete", prompt: finalPrompt },
        (resp) => {
          if (!resp || !resp.ok) {
            renderOverlay(resp?.error || "Error", true);
            setTimeout(resetState, 2000);
            return;
          }
          console.log("Slash AI Debug - Inserting text:", resp.content);
          console.log("Slash AI Debug - Mode:", state.mode);
          console.log("Slash AI Debug - Active element:", state.activeEl);

          if (state.mode === "input") {
            console.log("Slash AI Debug - Using insertAtCaret");
            insertAtCaret(state.activeEl, state.caretIndex, resp.content);
          } else {
            console.log("Slash AI Debug - Using insertAtBookmark");
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

    // Arrow keys for command dropdown navigation
    if (state.showCommandDropdown && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      e.stopPropagation();
      const filteredCommands = getFilteredCommands(state.promptBuffer);
      if (filteredCommands.length > 0) {
        if (e.key === "ArrowDown") {
          state.selectedCommandIndex = (state.selectedCommandIndex + 1) % filteredCommands.length;
        } else {
          state.selectedCommandIndex = (state.selectedCommandIndex - 1 + filteredCommands.length) % filteredCommands.length;
        }
        renderOverlay(state.promptBuffer);
      }
      return;
    }

    // Tab or Enter to select command from dropdown
    if (state.showCommandDropdown && (e.key === "Tab" || e.key === "Enter") && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
      const filteredCommands = getFilteredCommands(state.promptBuffer);
      if (filteredCommands.length > 0) {
        const selectedCommand = filteredCommands[state.selectedCommandIndex];
        // Replace the partial command with the full command
        const words = state.promptBuffer.split(/\s+/);
        words[words.length - 1] = selectedCommand.command;
        state.promptBuffer = words.join(' ');
        state.showCommandDropdown = false;
        state.selectedCommandIndex = 0;
        renderOverlay(state.promptBuffer);
      }
      return;
    }

    if (e.key.length === 1 && !e.altKey && !e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      state.promptBuffer += e.key;

      // Check if we should show command dropdown
      const words = state.promptBuffer.split(/\s+/);
      const lastWord = words[words.length - 1];
      state.showCommandDropdown = lastWord.startsWith('/');
      if (!state.showCommandDropdown) {
        state.selectedCommandIndex = 0;
      }

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
    const newValue = before + text + after;

    // More robust approach for React/LinkedIn compatibility
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    )?.set || Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value"
    )?.set;

    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(el, newValue);
    } else {
      el.value = newValue;
    }

    const newCaret = caretIndex + text.length;
    el.selectionStart = el.selectionEnd = newCaret;

    // Dispatch multiple events for compatibility
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));

    // Add React-specific events for LinkedIn
    if (el._valueTracker) {
      el._valueTracker.setValue(before);
    }

    // Focus the element to ensure LinkedIn recognizes the change
    el.focus();
  }

  // Cancel prompt if user clicks elsewhere (but keep overlay interactive) or frame blurs
  document.addEventListener("mousedown", (e) => {
    if (!state.inPrompt) return;
    const d = state.overlay;
    if (d && d.contains(e.target)) {
      // Keep prompt open; block page from stealing focus
      e.stopPropagation();
      return;
    }
    resetState();
  }, true);
  window.addEventListener("blur", () => { if (state.inPrompt) resetState(); });

  // -------- Context collection --------
  function collectContext() {
    try {
      if (!state.includeContext) return "";
      if (state.mode === "input") {
        const el = state.activeEl;
        if (!el) return "";
        const hasSel = typeof el.selectionStart === 'number' && el.selectionStart !== el.selectionEnd;
        if (hasSel) {
          const s = (el.value || '').slice(el.selectionStart, el.selectionEnd).trim();
          if (s) return truncate(s, 2000);
        }
        const before = (el.value || '').slice(0, state.caretIndex);
        const recent = before.slice(-500);
        return recent.trim();
      }
      if (state.mode === "ce") {
        const sel = window.getSelection();
        if (sel && sel.rangeCount && !sel.isCollapsed) {
          const s = sel.toString().trim();
          if (s) return truncate(s, 2000);
        }
        const before = getTextBeforeCaret(state.ceRoot) || "";
        const recent = before.slice(-500);
        return recent.trim();
      }
      return "";
    } catch {
      return "";
    }
  }

  function truncate(str, max) {
    if (!str) return "";
    return str.length > max ? str.slice(0, max) : str;
  }
})();
