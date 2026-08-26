// Näyttää Google-kirjautumispainikkeen ja paljastaa lomakkeen kirjautumisen
// jälkeen. Tämä on käyttöliittymän mukavuutta varten — oikea tarkistus
// tapahtuu palvelinpuolella (Netlify-funktiot) jokaisen latauksen yhteydessä,
// joten tätä ei voi ohittaa selaimen konsolista.

window.currentIdToken = null;

function handleCredentialResponse(response) {
  window.currentIdToken = response.credential;

  const authGate = document.getElementById("auth-gate");
  const uploadContent = document.getElementById("upload-content");
  const signedInAs = document.getElementById("signed-in-as");

  try {
    const payload = parseJwtForDisplay(response.credential);
    if (signedInAs) {
      signedInAs.textContent = `Kirjautunut: ${payload.email}`;
    }
  } catch (err) {
    console.error(err);
  }

  authGate.style.display = "none";
  uploadContent.style.display = "block";
}

// Vain näyttöä varten (esim. "Kirjautunut: ..."), EI turvatarkistus.
function parseJwtForDisplay(token) {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
  return JSON.parse(jsonPayload);
}

window.onload = function () {
  if (!window.google || !google.accounts) {
    document.getElementById("auth-error").style.display = "block";
    document.getElementById("auth-error").textContent =
      "Google-kirjautumista ei saatu ladattua. Tarkista verkkoyhteys ja lataa sivu uudelleen.";
    return;
  }
  google.accounts.id.initialize({
    client_id: GOOGLE_CONFIG.clientId,
    callback: handleCredentialResponse
  });
  google.accounts.id.renderButton(document.getElementById("g_id_signin"), {
    theme: "outline",
    size: "large",
    text: "signin_with",
    locale: "fi"
  });
};
