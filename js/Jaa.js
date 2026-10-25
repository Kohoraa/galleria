// Jakolinkit ja linkkien esikatselukortit (Open Graph).
//
// WhatsApp, Facebook, Messenger ym. eivät suorita JavaScriptiä, joten
// ottelukohtaiset tiedot (otsikko, kuvaus, kansikuva) pitää antaa niille
// valmiina HTML:nä. Tämä funktio tekee sen:
//
//   /ottelu/<tag>       -> pieni HTML-sivu, jossa ottelun og:-tagit.
//                          Ihminen ohjataan heti varsinaiseen galleriaan
//                          (ottelut.html#ottelu-<tag>), botti lukee tagit.
//   /og-kuva/uusin      -> uudelleenohjaus tuoreimman ottelun kansikuvaan
//                          (etusivun ja Ottelut-sivun kiinteä og:image).
//
// Reitit on määritelty netlify.toml:ssa. games.json niputetaan funktioon
// buildin yhteydessä, joten uusi ottelu näkyy täällä samalla deployllä
// kuin muuallakin sivustolla.

const games = require("../../games.json");

const SITE = "https://kohoraa.netlify.app";
const CLOUD = process.env.CLOUDINARY_CLOUD_NAME || "cnqsmdm5";

// 1200x630 on Facebookin/WhatsAppin suosittelema kortin kuvakoko.
// Sama vesileima kuin galleriassa, hieman pienempänä.
const OG_TRANSFORM =
  "w_1200,h_630,c_fill,g_auto,q_auto,f_jpg/l_text:Arial_30:kohoraa.netlify.app,co_white,o_80,g_south_east,x_20,y_20";

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(iso) {
  const [y, m, d] = String(iso || "").split("-");
  return y && m && d ? `${Number(d)}.${Number(m)}.${y}` : "";
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

function shorten(text, max) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ") > 0 ? cut.lastIndexOf(" ") : max) + "…";
}

function imageUrl(publicId, format) {
  return `https://res.cloudinary.com/${CLOUD}/image/upload/${OG_TRANSFORM}/${publicId}.${format || "jpg"}`;
}

// Kansikuva: tallennettu kansikuva, tai vanhemmille otteluille sama
// varajärjestely kuin galleriassa (Cloudinaryn listan ensimmäinen kuva).
async function coverFor(game) {
  if (game.kansikuva && game.kansikuva.public_id) {
    return imageUrl(game.kansikuva.public_id, game.kansikuva.format);
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(
      `https://res.cloudinary.com/${CLOUD}/image/list/${encodeURIComponent(game.tag)}.json`,
      { signal: ctrl.signal }
    );
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const first = (data.resources || [])[0];
      if (first) return imageUrl(first.public_id, first.format);
    }
  } catch (e) {
    // ei kuvaa -> käytetään logoa
  }
  return `${SITE}/assets/logo.png`;
}

function latestGame() {
  return [...games].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
}

function sharePage(game, image) {
  const shareUrl = `${SITE}/ottelu/${encodeURIComponent(game.tag)}`;
  const target = `/ottelut.html#ottelu-${encodeURIComponent(game.tag)}`;
  const title = `${game.title || "Ottelu"} · ${formatDate(game.date)}`;
  const place = [capitalize(game.laji), game.venue].filter(Boolean).join(", ");
  const description = shorten(
    [place, game.raportti].filter(Boolean).join(". "),
    180
  );

  return `<!DOCTYPE html>
<html lang="fi">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)} — Kohoraa</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${esc(shareUrl)}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="Kohoraa" />
<meta property="og:locale" content="fi_FI" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${esc(shareUrl)}" />
<meta property="og:image" content="${esc(image)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="${esc(game.title || "Ottelukuva")}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="robots" content="noindex, follow" />
<meta name="theme-color" content="#121212" />
<script>location.replace(${JSON.stringify(target)});</script>
</head>
<body style="background:#121212;color:#e8eef5;font-family:sans-serif;padding:2rem">
<p><a href="${esc(target)}" style="color:#f5c518">Siirry ottelun kuviin: ${esc(game.title || "Ottelu")}</a></p>
</body>
</html>`;
}

exports.handler = async (event) => {
  const path = (event.path || "").replace(/\/+$/, "");

  // Etusivun ja Ottelut-sivun kiinteä og:image osoittaa tänne.
  if (path.endsWith("/og-kuva/uusin")) {
    const game = latestGame();
    const location = game ? await coverFor(game) : `${SITE}/assets/logo.png`;
    return {
      statusCode: 302,
      headers: { Location: location, "Cache-Control": "public, max-age=600" },
      body: ""
    };
  }

  const tag = decodeURIComponent(path.split("/").pop() || "");
  const game = games.find((g) => g.tag === tag);

  if (!game) {
    return {
      statusCode: 302,
      headers: { Location: "/ottelut.html" },
      body: ""
    };
  }

  const image = await coverFor(game);
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300"
    },
    body: sharePage(game, image)
  };
};
