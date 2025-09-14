(async function() {
  const input = document.getElementById("apiKey");
  const msg = document.getElementById("msg");
  const btn = document.getElementById("save");

  const { apiKey } = await chrome.storage.sync.get(["apiKey"]);
  if (apiKey) input.value = apiKey;

  btn.addEventListener("click", async () => {
    const val = input.value.trim();
    await chrome.storage.sync.set({ apiKey: val });
    msg.textContent = "Saved.";
    setTimeout(() => (msg.textContent = ""), 1500);
  });
})();