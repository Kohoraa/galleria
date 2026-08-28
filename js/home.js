(function () {
  const cardsContainer = document.getElementById("latest-cards");
  const heroEl = document.getElementById("hero");
  const MAX_CARDS = 6;

  function thumbUrl(publicId, format) {
    return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload/w_600,h_450,c_fill,q_auto,f_auto/${publicId}.${format}`;
  }

  function heroImgUrl(publicId, format) {
    return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload/w_1600,h_1000,c_fill,q_auto,f_auto/${publicId}.${format}`;
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

  async function loadFirstPhoto(tag) {
    const url = `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/list/${encodeURIComponent(tag)}.json`;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      return (data.resources && data.resources[0]) || null;
    } catch (err) {
      return null;
    }
  }

  function renderCard(game, photo) {
    const card = document.createElement("a");
    card.className = "latest-card";
    card.href = `index.html#ottelu-${game.tag}`;

    const imgWrap = document.createElement("div");
    imgWrap.className = "latest-card-image";
    if (photo) {
      const img = document.createElement("img");
      img.src = thumbUrl(photo.public_id, photo.format);
      img.loading = "lazy";
      img.alt = `${game.title || "Ottelu"} ${game.opponent}`;
      imgWrap.appendChild(img);
    }
    card.appendChild(imgWrap);

    const body = document.createElement("div");
    body.className = "latest-card-body";
    body.innerHTML = `
      <span class="latest-card-sport">${capitalize(game.laji) || "Ottelu"}</span>
      <h3 class="latest-card-title">${game.title || "Kohoraa"} — ${game.opponent}</h3>
      <span class="latest-card-date">${formatDate(game.date)}</span>
    `;
    card.appendChild(body);

    cardsContainer.appendChild(card);
  }

  async function init() {
    cardsContainer.innerHTML = '<p class="loading-state">Ladataan otteluita…</p>';

    try {
      const res = await fetch("games.json");
      const games = await res.json();
      games.sort((a, b) => (a.date < b.date ? 1 : -1));

      if (!games.length) {
        cardsContainer.innerHTML = '<p class="empty-state">Ei vielä otteluita julkaistuna.</p>';
        return;
      }

      const latest = games.slice(0, MAX_CARDS);
      cardsContainer.innerHTML = "";

      let heroSet = false;

      for (const game of latest) {
        const photo = await loadFirstPhoto(game.tag);
        renderCard(game, photo);

        if (!heroSet && photo && heroEl) {
          heroEl.style.backgroundImage = `url("${heroImgUrl(photo.public_id, photo.format)}")`;
          heroSet = true;
        }
      }
    } catch (err) {
      cardsContainer.innerHTML = '<p class="empty-state">Otteluita ei voitu ladata juuri nyt.</p>';
      console.error(err);
    }
  }

  init();
})();
