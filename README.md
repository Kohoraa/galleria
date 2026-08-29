# Ottelukuvat — kuvagalleria urheiluseuroille

Tämä on valokuvagalleria, joka on rakennettu erityisesti paikallisten
urheiluseurojen otteluiden kuvaamiseen ja kuvien jakamiseen. Se on tehty
harrastelijavalokuvaajan omaan käyttöön, mutta koodi ja rakenne ovat
julkisia — jos haluat tehdä vastaavan omalle seurallesi, tämä dokumentti
kertoo sekä miltä sivusto näyttää käyttäjälle että miten se on rakennettu
teknisesti alusta loppuun.

**Live-esimerkki:** [kohoraa.netlify.app](https://kohoraa.netlify.app)

---

## Mitä tällä voi tehdä?

- 📸 **Julkaista otteluista kuvia** ryhmiteltynä ottelun mukaan, useasta
  lajista ja seurasta samalla sivustolla
- 🏒⚽ **Suodattaa lajin mukaan** (jääkiekko, jalkapallo, tai mikä tahansa
  muu laji jonka lisäät)
- 📝 **Kirjoittaa lyhyen otteluraportin** kuvien yhteyteen, ei pelkkää
  kuvagalleriaa
- 🔒 **Rajata kuvien lisäämisen** vain itselleen (tai valituille
  henkilöille) Google-kirjautumisella — kuka tahansa ei voi ladata roskaa
  sivustolle
- 💌 **Ottaa vastaan yhteydenottoja ja kuvapyyntöjä** lomakkeella, joka
  osaa jo kertoa mistä ottelusta on kyse
- 🖼️ **Lähettää alkuperäisiä, vesileimattomia kuvia** pyytäjälle yhdellä
  klikkauksella, ilman käsin ladattavaa tiedostoa
- 💛 **Näyttää seuran oman brändin** — logon, värit, ja halutessaan
  vapaaehtoisen tukilinkin (esim. MobilePay)

Kaikki tämä ilman erillistä palvelinta ylläpidettäväksi, ja ilmaisilla
tai lähes ilmaisilla palveluilla.

---

## Miten tämä toimii — pähkinänkuoressa

Kolme ilmaista/edullista pilvipalvelua tekevät yhdessä kokonaisuuden.
Sinun ei tarvitse osata pyörittää mitään omaa palvelinta.

```
   Kävijä selaimessa
         │
         ▼
   ┌─────────────┐     staattiset tiedostot      ┌──────────────┐
   │   Netlify    │◄──────(HTML/CSS/JS)──────────│    GitHub     │
   │  (hostaus +  │        automaattinen deploy    │  (koodi +     │
   │  pieni       │───────joka pushista──────────►│  ottelurekisteri) │
   │  taustalogiikka) │                            └──────────────┘
   └──────┬───────┘
          │
          │ kuvien tallennus/nouto
          ▼
   ┌─────────────┐
   │  Cloudinary  │
   │  (kuvat)     │
   └─────────────┘
```

- **GitHub** säilyttää koodin ja pienen `games.json`-tiedoston, joka
  toimii "tietokantana" kaikille julkaistuille otteluille.
- **Netlify** hostaa itse sivuston ja ajaa muutaman pienen
  taustafunktion niitä harvoja asioita varten, joita täysin staattinen
  sivu ei voi tehdä turvallisesti (esim. kirjautumisen varmistaminen).
- **Cloudinary** säilyttää ja optimoi kuvat, ja osaa hakea ne
  automaattisesti "tagin" (yhden ottelun tunnisteen) perusteella.

**Miksi ei vain yksinkertainen staattinen sivu?** Koska halusimme, että
vain valtuutetut henkilöt voivat lisätä kuvia — ja se vaatii edes
pienen palvelinpuolen, jotta kirjautumista ei voi huijata selaimen
kehitystyökaluilla. Netlify Functions antaa juuri sen verran
palvelinpuolta ilman että täytyy pyörittää mitään omaa infraa.

---

## Rakenna oma vastaava sivusto

Jos haluat pystyttää tämän omalle seurallesi, tarvitset neljä ilmaista
(tai lähes ilmaista) tiliä:

| Palvelu | Mihin | Kustannus |
|---|---|---|
| [GitHub](https://github.com) | koodi ja versiohallinta | ilmainen |
| [Cloudinary](https://cloudinary.com) | kuvien tallennus ja optimointi | ilmainen taso riittää pienelle seuralle |
| [Google Cloud Console](https://console.cloud.google.com) | kirjautumisen varmistus | ilmainen |
| [Netlify](https://netlify.com) | sivuston hostaus + taustalogiikka | ilmainen taso yleensä riittää, isommalla käytöllä muutama euro/kk |

Koko käyttöönotto vie ensimmäisellä kerralla noin 30–45 minuuttia, koska
neljä palvelua pitää yhdistää toisiinsa. Yksityiskohtaiset,
vaihe-vaiheelta-ohjeet (mukaan lukien tarkat klikkauspolut) löytyvät alta
kohdasta ["Tekninen käyttöönotto"](#tekninen-käyttöönotto).

---

## Arjen käyttö kuvaajalle

Kun sivusto on pystyssä, uuden ottelun lisääminen menee näin:

1. Avaa lataussivu ja kirjaudu Googlella
2. Täytä päivämäärä, laji, kotijoukkue ja vierasjoukkue
3. Raahaa kuvat laatikkoon
4. Paina "Lataa kuvat" — kuvat menevät automaattisesti oikeaan paikkaan
   ja ottelu ilmestyy galleriaan itsestään, ilman että sinun tarvitsee
   koskea koodiin

Jos joku pyytää alkuperäisen kuvan yhteydenottolomakkeella, voit luoda
hänelle valmiin latauslinkkipaketin ja vastausviestin parilla
klikkauksella samalta sivulta.

---

## Tekninen käyttöönotto

### 1. Cloudinary

1. Rekisteröidy [cloudinary.com](https://cloudinary.com) (ilmainen taso
   riittää reilusti pienelle seuralle: 25 GB tallennustilaa, 25 GB
   kuukausisiirtoa).
2. Dashboard-etusivulta löytyy heti **Cloud name** — kopioi talteen.
3. **Settings → Access Keys** → kopioi **API Key** ja **API Secret**.
4. **Settings → Security**:
   - Kytke päälle **"Allow list resources"** (tai "Resource list") —
     ilman tätä galleria ei voi hakea kuvia tagin perusteella.
   - Kytke päälle **"Allow delivery of PDF and ZIP files"**, jos aiot
     joskus koota kuvia zip-paketiksi (huom: raw-tiedostojen kokoraja on
     ilmaisella tasolla vain 10 MB, joten yksittäiset latauslinkit
     toimivat käytännössä paremmin isommille ottelukansioille).

### 2. Google-kirjautuminen

Tämä rajaa, kuka näkee ja voi käyttää lataussivun lomaketta.

1. [Google Cloud Console](https://console.cloud.google.com/) → uusi
   projekti.
2. **APIs & Services → OAuth consent screen** → User Type: **External**
   → täytä sovelluksen nimi ja oma sähköpostisi. Google saattaa näyttää
   "unverified app" -varoituksen pienelle sovellukselle — se on
   normaalia eikä estä toimintaa.
3. **APIs & Services → Credentials → Create Credentials → OAuth client
   ID** → Web application.
4. **Authorized JavaScript origins** → lopullinen Netlify-osoitteesi
   (voit täydentää tämän myöhemmin, kun osoite on tiedossa).
5. Kopioi syntynyt **Client ID**.

### 3. GitHub-token

Tätä käytetään siihen, että lataussivu voi automaattisesti päivittää
ottelurekisterin puolestasi.

1. GitHub → **Settings → Developer settings → Personal access tokens →
   Fine-grained tokens → Generate new token**.
2. Rajaa oikeus **vain omaan repoosi**.
3. Anna oikeudeksi **Contents: Read and write**.
4. Kopioi token heti talteen (näytetään vain kerran).

### 4. Koodin asetukset

Avaa `js/config.js` ja täytä kaksi julkista (ei-salaista) arvoa:

```js
const CLOUDINARY_CONFIG = {
  cloudName: "sinun-cloud-name"
};

const GOOGLE_CONFIG = {
  clientId: "sinun-client-id.apps.googleusercontent.com"
};
```

Halutessasi voit täyttää myös `MOBILEPAY_CONFIG`-lohkon, jos haluat
näyttää vapaaehtoisen tukilinkin sivustolla — jätä se ennalleen jos et
tarvitse sitä.

### 5. Netlify

1. [netlify.com](https://netlify.com) → **Add new site → Import an
   existing project** → yhdistä GitHub-repo.
2. Build-asetukset: **jätä build-komento tyhjäksi**, publish directory
   `.` (juuri) — sivusto on täysin staattinen.
3. Deployn jälkeen: palaa Google Cloud Consoleen ja lisää lopullinen
   osoite *Authorized JavaScript origins* -listaan, jos et vielä
   tehnyt sitä.
4. **Site settings → Environment variables** — lisää:

   | Muuttuja | Arvo |
   |---|---|
   | `GOOGLE_CLIENT_ID` | sama kuin `js/config.js`:ssä |
   | `ALLOWED_EMAILS` | sallitut Gmail-osoitteet pilkulla eroteltuna |
   | `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
   | `CLOUDINARY_API_KEY` | Cloudinary API key |
   | `CLOUDINARY_API_SECRET` | Cloudinary API secret |
   | `GITHUB_TOKEN` | vaiheessa 3 luotu token |
   | `GITHUB_OWNER` | GitHub-käyttäjänimesi |
   | `GITHUB_REPO` | repon nimi |
   | `GITHUB_BRANCH` | yleensä `main` |
   | `GITHUB_FILE_PATH` | `games.json` |

5. **Deploys → Trigger deploy → Deploy site**, jotta uudet muuttujat
   otetaan käyttöön.

### 6. Testaus

1. Avaa sivusto — etusivun pitäisi näkyä (aluksi ilman otteluita).
2. Mene lataussivulle, kirjaudu Google-tilillä joka on
   `ALLOWED_EMAILS`-listalla.
3. Lisää testiottelu, lataa 1–2 testikuvaa.
4. Tarkista että kuvat ilmestyvät Cloudinaryyn ja ottelu galleriaan
   muutaman sekunnin sisällä.
5. Poista testiottelu ja -kuvat kun olet varmistunut että kaikki toimii.

---

## Tiedostorakenne

```
etusivu.html    Etusivu — tuoreimmat ottelut, kuvapyyntö-banneri
index.html      Galleria — kaikki ottelut, lajisuodatus, lightbox
upload.html     Lataussivu (Google-kirjautumisen takana) + ylläpitotyökalut
yhteydenotto.html   Yhteydenottolomake, osaa yhdistää viestin tiettyyn otteluun
games.json      Ottelurekisteri — "tietokanta" ilman erillistä tietokantaa

css/style.css   Koko ulkoasu

js/config.js          Julkiset asetukset (ei salaisuuksia)
js/auth.js            Google-kirjautumisen käyttöliittymä
js/gallery.js         Galleria, lajisuodatus, lightbox, vesileima, pyyhkäisytuki
js/home.js            Etusivun tuoreimmat-ottelut-korttinäkymä
js/upload.js          Kuvien lataus + ottelun rekisteröinti
js/contact.js         Yhteydenottolomakkeen lähetys
js/link-generator.js  Ylläpidon työkalu: yksittäiset latauslinkit kuvapyyntöihin

netlify.toml                     Netlify-asetukset (mm. etusivun ohjaus)
netlify/functions/get-upload-signature.js   Varmistaa kirjautumisen, antaa allekirjoitetun latausluvan
netlify/functions/add-game.js               Varmistaa kirjautumisen, päivittää games.json:n GitHubissa
```

---

## Turvallisuusmalli lyhyesti

- Lataussivun *näkeminen* on julkista — se ei ole ongelma, koska pelkkä
  näkeminen ei anna oikeutta ladata mitään.
- Oikea tarkistus tapahtuu palvelinpuolella jokaisen latauksen
  yhteydessä, Googlen omaa rajapintaa vasten — ei ohitettavissa
  selaimen konsolista.
- API-avaimet ja salaisuudet ovat aina Netlifyn ympäristömuuttujissa,
  eivät koskaan koodissa tai GitHub-repossa.
- Kuvien vesileima suojaa julkisesti näkyviä esikatselukuvia — pyytäjä
  saa alkuperäisen, vesileimattoman version vasta erillisen
  yhteydenoton kautta.

---

## Vianetsintä

**"Google-kirjautumista ei saatu ladattua"** — tarkista Client ID ja
että Netlify-osoite on lisätty Google Cloud Consolen sallittujen
origin-osoitteiden listaan.

**Kuvat latautuvat, mutta eivät näy galleriassa** — todennäköisesti
Cloudinaryn "Allow list resources" -asetus ei ole päällä.

**Ottelu ei päivity automaattisesti latauksen jälkeen** — tarkista
`GITHUB_TOKEN`-muuttuja ja että sillä on kirjoitusoikeus juuri tähän
repoon.

**Latauslinkki ei toimi** — jos käytät zip-pakettia (ei suositella
ilmaisella Cloudinary-tasolla), tarkista raw-tiedostojen kokoraja ja
"Allow delivery of PDF and ZIP files" -asetus. Yksittäiset
latauslinkit (oletustapa tässä projektissa) eivät kärsi tästä
rajoituksesta.

---

## Teknologiat

Ei kehyksiä, ei build-vaihetta — pelkkää HTML:ää, CSS:ää ja
JavaScriptiä, plus kolme pilvipalvelua liimana. Tarkoituksella
yksinkertaista, jotta kuka tahansa voi ymmärtää ja muokata koodia ilman
että täytyy opetella erillistä työkaluketjua.
