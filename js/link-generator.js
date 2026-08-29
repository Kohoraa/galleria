(function () {
  const select = document.getElementById("link-game-select");
  const generateBtn = document.getElementById("link-generate-btn");
  const errorBox = document.getElementById("link-error");
  const resultBox = document.getElementById("link-result");
  const linkListEl = document.getElementById("link-url-list");
  const messageText = document.getElementById("link-message-text");
  const copyAllBtn = document.getElementById("link-copy-all-btn");
  const copyMessageBtn = document.getElementById("link-copy-message-btn");

  let games = [];

  function formatDate(iso) {
    const d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("fi-FI", { day: "numeric", month: "long", year: "numeric" });
  }

  // Pakottaa selaimen lataamaan tiedoston sen sijaan että se yrittäisi
  // näyttää sen. Ei vaadi allekirjoitusta, koska kuva on jo julkisesti
  // saatavilla (sama periaate kuin galleria käyttää).
  function downloadUrl(publicId, format) {
    return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload/fl_attachment/${publicId}.${format}`;
  }

  async function loadGameList() {
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

  async function loadGamePhotos(tag) {
    const url = `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/list/${encodeURIComponent(tag)}.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Kuvia ei löytynyt tälle ottelulle");
    const data = await res.json();
    return data.resources || [];
  }

  function buildMessage(urls, game) {
    const mobilepayLine =
      typeof MOBILEPAY_CONFIG !== "undefined" && !MOBILEPAY_CONFIG.code.startsWith("VAIHDA")
        ? `\n\nJos haluat, voit tukea ${MOBILEPAY_CONFIG.teamName} -joukkuetta MobilePaylla: ${MOBILEPAY_CONFIG.code}`
        : "";

    const linkLines = urls.map((u, i) => `${i + 1}. ${u}`).join("\n");

    return `Hei!

Tässä pyytämäsi kuvat (${game.title || "Ottelu"}, ${formatDate(game.date)}) — ${urls.length} kpl, alkuperäisessä muodossa ilman vesileimaa:

${linkLines}

Jokainen linkki lataa yhden kuvan.${mobilepayLine}

Terveisin`;
  }

  generateBtn.addEventListener("click", async () => {
    const tag = select.value;
    if (!tag) return;

    const game = games.find((g) => g.tag === tag);

    errorBox.style.display = "none";
    resultBox.style.display = "none";
    generateBtn.disabled = true;
    generateBtn.textContent = "Haetaan kuvia…";

    try {
      const resources = await loadGamePhotos(tag);
      if (!resources.length) {
        throw new Error("Tälle ottelulle ei löytynyt yhtään kuvaa");
      }

      const urls = resources.map((r) => downloadUrl(r.public_id, r.format));

      linkListEl.innerHTML = "";
      urls.forEach((u, i) => {
        const row = document.createElement("div");
        row.className = "link-row";
        row.innerHTML = `<a href="${u}" target="_blank" rel="noopener">Kuva ${i + 1}</a>`;
        linkListEl.appendChild(row);
      });

      messageText.textContent = buildMessage(urls, game);
      resultBox.style.display = "block";
      resultBox.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = "block";
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = "Luo latauslinkit";
    }
  });

  copyAllBtn.addEventListener("click", () => {
    const links = Array.from(linkListEl.querySelectorAll("a")).map((a) => a.href);
    navigator.clipboard.writeText(links.join("\n")).then(() => {
      copyAllBtn.textContent = "Kopioitu ✓";
      setTimeout(() => (copyAllBtn.textContent = "Kopioi kaikki linkit"), 1500);
    });
  });

  copyMessageBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(messageText.textContent).then(() => {
      copyMessageBtn.textContent = "Kopioitu ✓";
      setTimeout(() => (copyMessageBtn.textContent = "Kopioi viesti"), 1500);
    });
  });

  loadGameList();
})();
