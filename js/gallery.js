(function () {
  const gamesContainer = document.getElementById("games");
  const filterBar = document.getElementById("sport-filter");
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  let currentImages = [];
  let currentIndex = 0;
  let currentGame = null;
  const captionLink = document.getElementById("lightbox-caption-link");

  // Kaikki ottelut + niiden Cloudinary-kuvat ladataan kerran muistiin,
  // jotta lajisuodatus voi vaihtaa näkymää ilman uutta verkkohakua.
  let loadedGames = [];
  let activeSport = "kaikki";

  function thumbUrl(publicId, format) {
    return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload/w_500,h_375,c_fill,q_auto,f_auto/${publicId}.${format}`;
  }

  function fullUrl(publicId, format) {
    // Rajaa leveys ennen vesileimaa (järjestys tärkeä: leiman asemointi
    // lasketaan sen hetkisen, jo pienennetyn kuvan mukaan).
    // c_limit ei koskaan suurenna pienempiä kuvia, vain rajaa isoja.
    const resize = "w_2000,c_limit,q_auto,f_auto";
    const watermark = "l_text:Arial_38:kohoraa.netlify.app,co_white,o_80,g_south_east,x_24,y_24";
    return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload/${resize}/${watermark}/${publicId}.${format}`;
  }

  function preload(url) {
    const img = new Image();
    img.src = url;
  }

  function preloadNeighbors(images, index) {
    if (images.length < 2) return;
    const nextIndex = (index + 1) % images.length;
    const prevIndex = (index - 1 + images.length) % images.length;
    preload(images[nextIndex]);
    preload(images[prevIndex]);
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

  function gameLabel(game) {
    return `${game.title || "Ottelu"}, ${formatDate(game.date)}`;
  }

  function updateCaptionLink(game) {
    if (!captionLink || !game) return;
    const params = new URLSearchParams({
      aihe: "Kuvapyyntö",
      peli: game.tag,
      otsikko: gameLabel(game)
    });
    captionLink.href = `yhteydenotto.html?${params.toString()}`;
  }

  function openLightbox(images, index, game) {
    currentImages = images;
    currentIndex = index;
    currentGame = game;
    lightboxImg.src = currentImages[currentIndex];
    lightbox.classList.add("is-open");
    document.body.style.overflow = "hidden";
    preloadNeighbors(currentImages, currentIndex);
    updateCaptionLink(currentGame);
  }

  function closeLightbox() {
    lightbox.classList.remove("is-open");
    lightboxImg.src = "";
    document.body.style.overflow = "";
  }

  function step(delta) {
    currentIndex = (currentIndex + delta + currentImages.length) % currentImages.length;
    lightboxImg.src = currentImages[currentIndex];
    preloadNeighbors(currentImages, currentIndex);
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

  // Pyyhkäisytuki kosketusnäytöille (puhelin/tabletti).
  // Vaakasuuntainen liike selaa kuvia, pystysuuntainen jätetään huomiotta
  // (ettei vahingossa laukea kun käyttäjä yrittää vain scrollata).
  let touchStartX = 0;
  let touchStartY = 0;
  const SWIPE_THRESHOLD = 50;

  lightbox.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.changedTouches[0].clientX;
      touchStartY = e.changedTouches[0].clientY;
    },
    { passive: true }
  );

  lightbox.addEventListener(
    "touchend",
    (e) => {
      const deltaX = e.changedTouches[0].clientX - touchStartX;
      const deltaY = e.changedTouches[0].clientY - touchStartY;

      if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;
      if (Math.abs(deltaX) < Math.abs(deltaY)) return; // pystyliike, ei selausta

      if (deltaX < 0) {
        step(1); // pyyhkäisy vasemmalle -> seuraava kuva
      } else {
        step(-1); // pyyhkäisy oikealle -> edellinen kuva
      }
    },
    { passive: true }
  );

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
      <h2 class="game-title">${game.title || "Ottelu"}</h2>
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
      img.alt = `${game.title || "Ottelu"}, kuva ${i + 1}`;
      thumb.appendChild(img);
      thumb.addEventListener("click", () => openLightbox(fullUrls, i, game));
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
