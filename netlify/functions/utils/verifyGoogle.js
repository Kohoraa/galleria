// Varmistaa Google-kirjautumisen tokenin oikeasti palvelinpuolella
// (Googlen omaa tokeninfo-endpointia vasten) ja tarkistaa, että
// sähköposti löytyy ALLOWED_EMAILS-ympäristömuuttujasta.
// Tätä ei voi ohittaa selaimen konsolista, koska tarkistus tapahtuu
// tässä funktiossa, ei asiakaspään JavaScriptissä.

async function verifyGoogleToken(idToken) {
  if (!idToken) {
    throw new Error("Token puuttuu");
  }

  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
  );
  if (!res.ok) {
    throw new Error("Token ei kelpaa");
  }
  const data = await res.json();

  if (data.aud !== process.env.GOOGLE_CLIENT_ID) {
    throw new Error("Token ei ole tälle sovellukselle");
  }

  const emailVerified = data.email_verified === "true" || data.email_verified === true;
  if (!emailVerified) {
    throw new Error("Sähköpostia ei ole vahvistettu");
  }

  const allowed = (process.env.ALLOWED_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const email = (data.email || "").toLowerCase();
  if (!allowed.includes(email)) {
    throw new Error(`Tunnus ${email} ei ole oikeutettu`);
  }

  return email;
}

module.exports = { verifyGoogleToken };
