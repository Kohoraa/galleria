(function () {
  const select = document.getElementById("link-game-select");
  const generateBtn = document.getElementById("link-generate-btn");
  const errorBox = document.getElementById("link-error");
  const resultBox = document.getElementById("link-result");
  const urlText = document.getElementById("link-url-text");
  const messageText = document.getElementById("link-message-text");
  const copyUrlBtn = document.getElementById("link-copy-url-btn");
  const copyMessageBtn = document.getElementById("link-copy-message-btn");

  let games = [];

  function formatDate(iso) {
    const d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("fi-FI", { day: "numeric", month: "long", year: "numeric" });
  }

  async function loadGames() {
    try {
      const res = await fetch("games.json");
      games = await res.json();
      games.sort((a, b) => (a.date < b.date ? 1 : -1));

      select.innerHTML = "";
      games.forEach((g) => {
        const opt = document.createElement("option");
        opt.value = g.tag;
        opt.textContent = `${formatDate(g.date)} — ${g.title || "Ottelu"}`;
        select.appendChild(opt);
      });
    } catch (err) {
      select.innerHTML = '<option value="">Otteluita ei voitu ladata</option>';
    }
  }

  function buildMessage(url, game) {
    const mobilepayLine = MOBILEPAY_CONFIG.code.startsWith("VAIHDA")
      ? ""
      : `\n\nJos haluat, voit tukea ${MOBILEPAY_CONFIG.teamName} -joukkuetta MobilePaylla: ${MOBILEPAY_CONFIG.code}`;

    return `Hei!

Tässä pyytämäsi kuvat (${game.title || "Ottelu"}, ${formatDate(game.date)}):
${url}

Kuvat ovat alkuperäisessä muodossa, ilman vesileimaa.${mobilepayLine}

Terveisin`;
  }

  generateBtn.addEventListener("click", async () => {
    const tag = select.value;
    if (!tag) return;

    const game = games.find((g) => g.tag === tag);

    errorBox.style.display = "none";
    resultBox.style.display = "none";
    generateBtn.disabled = true;
    generateBtn.textContent = "Luodaan…";

    try {
      const res = await fetch("/.netlify/functions/get-download-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: window.currentIdToken, tag })
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Latauslinkin luonti epäonnistui");
      }

      const data = await res.json();

      urlText.textContent = data.url;
      messageText.textContent = buildMessage(data.url, game);
      resultBox.style.display = "block";
      resultBox.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = "block";
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = "Luo latauslinkki";
    }
  });

  copyUrlBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(urlText.textContent).then(() => {
      copyUrlBtn.textContent = "Kopioitu ✓";
      setTimeout(() => (copyUrlBtn.textContent = "Kopioi linkki"), 1500);
    });
  });

  copyMessageBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(messageText.textContent).then(() => {
      copyMessageBtn.textContent = "Kopioitu ✓";
      setTimeout(() => (copyMessageBtn.textContent = "Kopioi viesti"), 1500);
    });
  });

  loadGames();
})();
