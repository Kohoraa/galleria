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

  function buildMessage(pageUrl, game) {
    const mobilepayLine =
      typeof MOBILEPAY_CONFIG !== "undefined" && !MOBILEPAY_CONFIG.code.startsWith("VAIHDA")
        ? `\n\nJos haluat, voit tukea ${MOBILEPAY_CONFIG.teamName} -joukkuetta MobilePaylla (vastaanottaja ${MOBILEPAY_CONFIG.recipientName}): ${MOBILEPAY_CONFIG.code}`
        : "";

    return `Hei!

Tässä linkki pyytämiisi kuviin (${game.title || "Ottelu"}, ${formatDate(game.date)}) — alkuperäisessä muodossa, ilman vesileimaa:

${pageUrl}

Klikkaa haluamasi kuvat auki, jokainen ladataan erikseen.${mobilepayLine}

Terveisin`;
  }

  generateBtn.addEventListener("click", async () => {
    const tag = select.value;
    if (!tag) return;

    const game = games.find((g) => g.tag === tag);

    errorBox.style.display = "none";
    resultBox.style.display = "none";

    const pageUrl = `${window.location.origin}/lataa.html?peli=${encodeURIComponent(tag)}`;

    linkListEl.innerHTML = "";
    const row = document.createElement("div");
    row.className = "link-row";
    row.innerHTML = `<a href="${pageUrl}" target="_blank" rel="noopener">${pageUrl}</a>`;
    linkListEl.appendChild(row);

    messageText.textContent = buildMessage(pageUrl, game);
    resultBox.style.display = "block";
    resultBox.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  copyAllBtn.addEventListener("click", () => {
    const links = Array.from(linkListEl.querySelectorAll("a")).map((a) => a.href);
    navigator.clipboard.writeText(links.join("\n")).then(() => {
      copyAllBtn.textContent = "Kopioitu ✓";
      setTimeout(() => (copyAllBtn.textContent = "Kopioi linkki"), 1500);
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
