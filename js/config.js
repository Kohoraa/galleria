// Nämä kaksi arvoa ovat julkisia (eivät ole salaisuuksia):
// - cloudName tarvitaan kuvien näyttämiseen galleriassa
// - Google client_id on tarkoitettu näkymään selaimessa, se ei yksin päästä ketään sisään

const CLOUDINARY_CONFIG = {
  cloudName: "cnqsmdm5"
};

// client_id luodaan Google Cloud Consolessa: APIs & Services -> Credentials
// -> Create Credentials -> OAuth client ID -> Web application
// Authorized JavaScript origins: sivustosi Netlify-osoite
const GOOGLE_CONFIG = {
  clientId: "874779800458-971q6i0t01d0627q4gs9g85a6t5flfdu.apps.googleusercontent.com"
};

// Vapaaehtoinen tuki joukkueelle (ei pakollinen, mainitaan hillitysti)
const MOBILEPAY_CONFIG = {
  teamName: "Fortuna U18",
  recipientName: "Fortuna ry",
  code: "1502AQ"
};

// Sallitut sähköpostit ja Cloudinary/GitHub-salaisuudet asetetaan
// Netlifyssä ympäristömuuttujina (Site settings -> Environment variables),
// EI tähän tiedostoon — ks. README.
