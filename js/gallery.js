(function () {
  const gamesContainer = document.getElementById("games");
  const filterBar = document.getElementById("sport-filter");
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  let currentImages = [];
  let currentIndex = 0;

  // Kaikki ottelut + niiden Cloudinary-kuvat ladataan kerran muistiin,
  // jotta lajisuodatus voi vaihtaa näkymää ilman uutta verkkohakua.
  let loadedGames = [];
  let activeSport = "kaikki";

  function thumbUrl(publicId, format) {
    return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload/w_500,h_375,c_fill,q_auto,f_auto/${publicId}.${format}`;
  }

  function fullUrl(publicId, format) {
    // Pieni, huomaamaton vesileima isoihin (lightbox-) kuviin.
    // Pikkukuviin (thumbUrl) ei lisätä vesileimaa.
    const watermark = "l_text:Arial_22:kohoraa.netlify.app,co_white,o_70,g_south_east,x_16,y_16";
    return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload/${watermark}/q_auto,f_auto/${publicId}.${format}`;
  }

  function formatDate(iso) {
    const d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("fi-FI", { day: "numeric", month: "long", year: "numeric" });
  }

  function capitalize(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Laji määrää seuran logon: jääkiekko = Kohoraa, jalkapallo = Tuisku Orivesi.
  function clubLogoFor(laji) {
    const key = (laji || "").toLowerCase();
    if (key === "jääkiekko") return { src: "assets/logo.png", alt: "Kohoraa" };
    if (key === "jalkapallo") return { src: "assets/logo-tuisku.png", alt: "Tuisku Orivesi" };
    return null;
  }

  function openLightbox(images, index) {
    currentImages = images;
    currentIndex = index;
    lightboxImg.src = currentImages[currentIndex];
    lightbox.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    lightbox.classList.remove("is-open");
    lightboxImg.src = "";
    document.body.style.overflow = "";
  }

  function step(delta) {
    currentIndex = (currentIndex + delta + currentImages.length) % currentImages.length;
    lightboxImg.src = currentImages[currentIndex];
  }

  document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
  document.getElementById("lightbox-prev").addEventListener("click", () => step(-1));
  document.getElementById("lightbox-next").addEventListener("click", () => step(1));
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("is-open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  });

  async function loadGamePhotos(tag) {
    const url = `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/list/${encodeURIComponent(tag)}.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Kuvia ei löytynyt tagilla " + tag);
    const data = await res.json();
    return data.resources || [];
  }

  function renderFilterBar(sports) {
    if (!filterBar) return;
    filterBar.innerHTML = "";

    const options = ["kaikki", ...sports];
    options.forEach((sport) => {
      const btn = document.createElement("button");
      btn.className = "filter-pill" + (sport === activeSport ? " is-active" : "");
      btn.textContent = sport === "kaikki" ? "Kaikki" : capitalize(sport);
      btn.addEventListener("click", () => {
        activeSport = sport;
        renderFilterBar(sports);
        renderGames();
      });
      filterBar.appendChild(btn);
    });
  }

  function renderGame(game, index, total) {
    const section = document.createElement("section");
    section.className = "game";
    section.id = `ottelu-${game.tag}`;

    const number = String(total - index).padStart(2, "0");

    const meta = document.createElement("div");
    meta.className = "game-meta";
    const logo = clubLogoFor(game.laji);
    meta.innerHTML = `
      ${logo ? `<img class="club-logo" src="${logo.src}" alt="${logo.alt}" />` : ""}
      <span class="game-number">${capitalize(game.laji) || "Ottelu"} ${number}</span>
      <span class="game-date">${formatDate(game.date)}</span>
      <h2 class="game-title">${game.title || "Kohoraa"} — ${game.opponent}</h2>
      ${game.venue ? `<span class="game-venue">${game.venue}</span>` : ""}
    `;
    section.appendChild(meta);

    if (game.raportti) {
      const report = document.createElement("p");
      report.className = "game-report";
      report.textContent = game.raportti;
      section.appendChild(report);
    }

    const resources = game.resources || [];

    if (!resources.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Ei kuvia vielä tästä ottelusta.";
      section.appendChild(empty);
      gamesContainer.appendChild(section);
      const divider = document.createElement("hr");
      divider.className = "rink-divider";
      gamesContainer.appendChild(divider);
      return;
    }

    const grid = document.createElement("div");
    grid.className = "grid";

    const fullUrls = resources.map((r) => fullUrl(r.public_id, r.format));

    resources.forEach((r, i) => {
      const thumb = document.createElement("div");
      thumb.className = "thumb";
      const img = document.createElement("img");
      img.src = thumbUrl(r.public_id, r.format);
      img.loading = "lazy";
      img.alt = `${game.title || "Ottelu"} ${game.opponent}, kuva ${i + 1}`;
      thumb.appendChild(img);
      thumb.addEventListener("click", () => openLightbox(fullUrls, i));
      grid.appendChild(thumb);
    });

    section.appendChild(grid);
    gamesContainer.appendChild(section);

    const divider = document.createElement("hr");
    divider.className = "rink-divider";
    gamesContainer.appendChild(divider);
  }

  function renderGames() {
    gamesContainer.innerHTML = "";

    const filtered =
      activeSport === "kaikki"
        ? loadedGames
        : loadedGames.filter((g) => (g.laji || "").toLowerCase() === activeSport);

    if (!filtered.length) {
      gamesContainer.innerHTML = '<p class="empty-state">Ei otteluita tällä suodattimella.</p>';
      return;
    }

    filtered.forEach((game, i) => renderGame(game, i, filtered.length));
  }

  async function init() {
    gamesContainer.innerHTML = '<p class="loading-state">Ladataan otteluita…</p>';
    const yearEl = document.getElementById("copyright-year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    try {
      const gamesRes = await fetch("games.json");
      const games = await gamesRes.json();
      games.sort((a, b) => (a.date < b.date ? 1 : -1));

      if (!games.length) {
        gamesContainer.innerHTML = '<p class="empty-state">Ei vielä otteluita julkaistuna.</p>';
        return;
      }

      const heroEl = document.getElementById("hero");
      let heroSet = false;

      loadedGames = [];
      for (const game of games) {
        let resources = [];
        try {
          resources = await loadGamePhotos(game.tag);
        } catch (err) {
          resources = [];
        }
        loadedGames.push(Object.assign({}, game, { resources }));

        if (!heroSet && resources.length && heroEl) {
          const hero = resources[0];
          const heroUrl = `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload/w_1600,h_1000,c_fill,q_auto,f_auto/${hero.public_id}.${hero.format}`;
          heroEl.style.backgroundImage = `url("${heroUrl}")`;
          heroSet = true;
        }
      }

      const sports = Array.from(
        new Set(loadedGames.map((g) => (g.laji || "").toLowerCase()).filter(Boolean))
      ).sort();

      renderFilterBar(sports);
      renderGames();
    } catch (err) {
      gamesContainer.innerHTML = '<p class="empty-state">Otteluita ei voitu ladata juuri nyt.</p>';
      console.error(err);
    }
  }

  init();
})();
