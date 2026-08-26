# Ottelukuvat

Jääkiekko-ottelukuvien julkaisusivusto. Kuvat säilytetään Cloudinaryssa,
sivusto hostataan Netlifyssä, ja koodi versioidaan GitHubissa. Tämä
dokumentti käy läpi **kaikki vaiheet alusta loppuun** siten, että koko
projektin pystyy pystyttämään uudelleen pelkän tämän ohjeen avulla.

Lue ensin "Miten tämä toimii" -osio, jotta ymmärrät kokonaisuuden ennen
kuin alat klikkailla — se säästää aikaa, kun tiedät miksi mikäkin
palanen on olemassa.

---

## Sisällys

1. [Miten tämä toimii](#miten-tämä-toimii)
2. [Mitä tarvitset ennen aloitusta](#mitä-tarvitset-ennen-aloitusta)
3. [Vaihe 1: Cloudinary](#vaihe-1-cloudinary)
4. [Vaihe 2: Google-kirjautuminen](#vaihe-2-google-kirjautuminen)
5. [Vaihe 3: GitHub-token](#vaihe-3-github-token)
6. [Vaihe 4: config.js:n täyttäminen](#vaihe-4-configjsn-täyttäminen)
7. [Vaihe 5: Netlify](#vaihe-5-netlify)
8. [Vaihe 6: Testaus](#vaihe-6-testaus)
9. [Arjen työnkulku: uuden ottelun lisäys](#arjen-työnkulku-uuden-ottelun-lisäys)
10. [Tiedostorakenne selitettynä](#tiedostorakenne-selitettynä)
11. [Vianetsintä](#vianetsintä)
12. [Turvallisuusmalli lyhyesti](#turvallisuusmalli-lyhyesti)
13. [Keskeneräiset asiat / muistilista](#keskeneräiset-asiat--muistilista)

---

## Miten tämä toimii

Kolme palvelua tekevät yhdessä kokonaisuuden:

```
   Kävijä selaimessa
         │
         ▼
   ┌─────────────┐     staattiset tiedostot      ┌──────────────┐
   │   Netlify    │◄──────(HTML/CSS/JS)──────────│    GitHub     │
   │  (hostaus +  │        automaattinen deploy    │  (koodi +     │
   │  funktiot)   │───────joka pushista──────────►│  games.json)  │
   └──────┬───────┘                                └──────────────┘
          │
          │ kuvien tallennus/nouto
          ▼
   ┌─────────────┐
   │  Cloudinary  │
   │  (kuvat)     │
   └─────────────┘
```

- **GitHub**: koodin versionhallinta. `games.json` toimii myös "tietokantana"
  otteluista — se on tavallinen tiedosto samassa repossa.
- **Netlify**: hostaa itse sivuston (`index.html`, `upload.html` jne.) ja
  ajaa kaksi pientä palvelinfunktiota (`netlify/functions/`), jotka
  tekevät asioita joita täysin staattinen sivu ei voi tehdä turvallisesti:
  tarkistaa kirjautumisen ja päivittää `games.json`-tiedostoa.
- **Cloudinary**: säilyttää itse kuvat, optimoi ja pakkaa ne automaattisesti,
  ja tarjoaa tavan hakea kuvat julkisesti "tagin" (esim. yhden ottelun)
  perusteella ilman erillistä tietokantaa.

**Miksi näin monimutkainen rakenne?** Alun perin sivusto oli pelkkää
GitHub Pagesia, mutta täysin staattinen sivu ei voi turvallisesti
tarkistaa "kuka saa ladata kuvia" -kysymystä, koska palvelinta ei ole.
Netlify Functions tuo juuri sen verran palvelinpuolta, että kirjautuminen
voidaan oikeasti varmistaa eikä sitä voi ohittaa selaimen kehitystyökaluista.

**Kaksi eri lataus-mekanismia, älä sekoita niitä:**
- *Kuvat* menevät suoraan selaimesta Cloudinaryyn (nopea, ei kokorajoituksia Netlify-funktioiden kautta).
- *games.json-päivitys* menee Netlify-funktion kautta GitHubiin (pieni tekstipäivitys, sopii funktiolle hyvin).

---

## Mitä tarvitset ennen aloitusta

- GitHub-tili (koodi on jo push attu tänne, tai tuot zipin sinne)
- Cloudinary-tili (ilmainen taso riittää, [cloudinary.com](https://cloudinary.com))
- Google-tili + pääsy [Google Cloud Consoleen](https://console.cloud.google.com/) (ilmainen)
- Netlify-tili ([netlify.com](https://netlify.com), ilmainen taso riittää)

Koko käyttöönotto vie ensimmäisellä kerralla noin 30–45 minuuttia, koska
neljä eri palvelua pitää yhdistää toisiinsa. Seuraavilla kerroilla (esim.
jos rakennat sivuston uudelle joukkueelle) se on nopeampi, kun tietää
mistä mikäkin asetus löytyy.

---

## Vaihe 1: Cloudinary

1. Rekisteröidy [cloudinary.com](https://cloudinary.com) (ilmainen taso: 25 GB tallennustilaa, 25 GB kuukausisiirtoa — riittää reilusti tähän mittakaavaan).
2. Kirjaudu sisään → Dashboard-etusivulla näkyy heti **Cloud name**. Kopioi talteen.
3. Mene **Settings (rataskuvake) → Access Keys**. Kopioi talteen **API Key** ja **API Secret**.
4. Mene **Settings → Security**. Etsi kohta *"Allow list resources"* tai *"Resource list"* ja kytke se **päälle**. Tämä on tärkeä: ilman tätä galleria ei pysty hakemaan kuvia julkisesti tagin perusteella.

> Näitä kolmea arvoa (Cloud name, API Key, API Secret) ei kirjoiteta minnekään koodiin — ne annetaan Netlifylle ympäristömuuttujina vaiheessa 5. Cloud name on ainoa, joka näkyy myös julkisessa koodissa (se ei ole salaisuus, se tarvitaan kuvien näyttämiseen).

---

## Vaihe 2: Google-kirjautuminen

Tämä rajaa, kuka näkee ja voi käyttää `upload.html`-sivun latauslomaketta.

1. Mene [Google Cloud Consoleen](https://console.cloud.google.com/).
2. Luo uusi projekti (ylävalikosta "Select a project" → "New Project"). Nimeä esim. `ottelukuvat`.
3. Vasemmasta valikosta: **APIs & Services → Credentials**.
4. **+ Create Credentials → OAuth client ID**.
   - Jos sovellus pyytää ensin "OAuth consent screen" -asetusta: valitse User Type **External**, täytä pakolliset kentät (sovelluksen nimi, oma sähköposti kahteen kohtaan). Et tarvitse Googlen virallista hyväksyntää ("verification") tähän, koska käyttäjämäärä on pieni ja tiedossa — Google saattaa näyttää "unverified app" -varoituksen kirjautuessa, se on odotettua eikä estä toimintaa.
5. Application type: **Web application**. Nimeä esim. `ottelukuvat-web`.
6. **Authorized JavaScript origins** → lisää Netlify-sivustosi osoite (saat sen vasta vaiheessa 5 — voit palata tänne täydentämään sen jälkeen). Esimerkki: `https://ottelukuvat.netlify.app`.
7. Luo. Kopioi talteen syntynyt **Client ID** (muotoa `123456-abc.apps.googleusercontent.com`).

> Client ID on turvallista laittaa julkiseen koodiin (`js/config.js`) — se ei yksin päästä ketään sisään. Sen sijaan **sallittujen sähköpostien lista** (`ALLOWED_EMAILS`) ei koskaan mene koodiin, vaan Netlifyn ympäristömuuttujiin vaiheessa 5. Tämä on juuri se kohta, joka tekee kirjautumisesta oikeasti turvallisen eikä pelkän käyttöliittymän kosmetiikkaa.

---

## Vaihe 3: GitHub-token

Tätä käytetään siihen, että lataussivu voi automaattisesti lisätä uuden
ottelun `games.json`-tiedostoon puolestasi.

1. GitHub → oma profiilikuva → **Settings → Developer settings → Personal access tokens → Fine-grained tokens**.
2. **Generate new token**.
3. Repository access: rajaa **vain tähän yhteen repoon** (esim. `ottelukuvat`) — älä anna oikeuksia kaikkiin repoihisi.
4. Permissions → **Contents: Read and write**. Muita oikeuksia ei tarvita.
5. Luo token ja kopioi se heti talteen (GitHub näyttää sen vain kerran).

---

## Vaihe 4: config.js:n täyttäminen

Avaa `js/config.js` ja täytä kaksi julkista (ei-salaista) arvoa:

```js
const CLOUDINARY_CONFIG = {
  cloudName: "sinun-cloud-name"
};

const GOOGLE_CONFIG = {
  clientId: "sinun-client-id.apps.googleusercontent.com"
};
```

Committaa ja pushaa muutos GitHubiin.

**Miksi vain nämä kaksi menevät koodiin?** Cloud name ja Google client ID
on suunniteltu näkymään julkisessa selainkoodissa — ne eivät yksin riitä
mihinkään väärinkäytökseen. Kaikki oikeasti arkaluontoinen (API-avaimet,
salaisuudet, sallittujen sähköpostien lista) menee sen sijaan Netlifyn
ympäristömuuttujiin, joita selain ei koskaan näe.

---

## Vaihe 5: Netlify

1. [netlify.com](https://netlify.com) → **Add new site → Import an existing project**.
2. Yhdistä GitHub-tilisi ja valitse tämä repo.
3. Build-asetukset: **jätä build-komento tyhjäksi** (sivusto on staattinen, mitään ei tarvitse kääntää). Publish directory: `.` (juuri).
4. Deploy site. Netlify antaa sivustolle satunnaisen osoitteen, esim. `https://random-name-123.netlify.app` — voit vaihtaa sen: **Site settings → Domain management → Options → Edit site name**.
5. **Palaa Google Cloud Consoleen (vaihe 2)** ja lisää tämä lopullinen osoite kohtaan *Authorized JavaScript origins*, jos et tehnyt sitä jo.
6. Netlifyssä: **Site settings → Environment variables → Add a variable**. Lisää kaikki seuraavat:

   | Muuttuja | Arvo | Mistä |
   |---|---|---|
   | `GOOGLE_CLIENT_ID` | sama kuin `js/config.js`:ssä | vaihe 2 |
   | `ALLOWED_EMAILS` | sallitut Gmail-osoitteet pilkulla eroteltuna, esim. `minä@gmail.com,toinen@gmail.com` | oma päätös |
   | `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | vaihe 1 |
   | `CLOUDINARY_API_KEY` | Cloudinary API key | vaihe 1 |
   | `CLOUDINARY_API_SECRET` | Cloudinary API secret | vaihe 1 |
   | `GITHUB_TOKEN` | vaiheessa 3 luotu token | vaihe 3 |
   | `GITHUB_OWNER` | GitHub-käyttäjänimesi | — |
   | `GITHUB_REPO` | repon nimi, esim. `ottelukuvat` | — |
   | `GITHUB_BRANCH` | yleensä `main` | — |
   | `GITHUB_FILE_PATH` | `games.json` | — |

7. Tallennuksen jälkeen: **Deploys**-välilehti → **Trigger deploy → Deploy site**, jotta uudet ympäristömuuttujat otetaan käyttöön funktioissa.

---

## Vaihe 6: Testaus

1. Avaa sivusto selaimessa. Etusivun pitäisi näyttää tyhjä galleria (koska `games.json`:issa on vasta esimerkkirivi, jolla ei ole oikeita kuvia).
2. Mene `upload.html`-sivulle. Pitäisi näkyä Google-kirjautumispainike.
3. Kirjaudu Google-tilillä, joka on `ALLOWED_EMAILS`-listalla. Lomakkeen pitäisi tulla näkyviin.
4. Täytä testiottelu (esim. päivämäärä + "Testi") ja lataa 1–2 testikuvaa.
5. Jos kaikki menee putkeen: kuvat ilmestyvät Cloudinaryn Media Library -näkymään, ja `games.json`-tiedostoon syntyy uusi commit GitHubissa muutaman sekunnin sisällä.
6. Päivitä galleria (`index.html`) — testiottelun pitäisi näkyä.
7. Poista testirivi `games.json`:ista ja testikuvat Cloudinarysta, kun olet varmistunut että homma toimii.

Jos jokin näistä ei toimi, ks. [Vianetsintä](#vianetsintä).

---

## Arjen työnkulku: uuden ottelun lisäys

1. `upload.html` → kirjaudu Googlella (jos istunto on vanhentunut).
2. Täytä päivämäärä, vastustaja, halutessasi otsikko ja areena.
3. Raahaa tai valitse kuvat (10–30 per ottelu on täysin normaali määrä).
4. "Lataa kuvat" → odota kunnes kaikki näyttävät "valmis".
5. Sivu vahvistaa, kun ottelu on lisätty galleriaan automaattisesti. Ei muita käsin tehtäviä vaiheita.

---

## Tiedostorakenne selitettynä

```
index.html          Etusivun galleria. Hakee ensin games.json:n, sitten
                     jokaisen ottelun kuvat Cloudinarystä tagin perusteella.
                     Hero-kuva yläreunassa on uusimman ottelun ensimmäinen kuva.

upload.html          Latauslomake. Piilossa Google-kirjautumisen takana
                     (auth-gate), lomake (upload-content) paljastuu vasta
                     onnistuneen kirjautumisen jälkeen.

games.json           "Tietokanta": lista otteluista ja niiden Cloudinary-
                     tageista. Tavallinen JSON-tiedosto samassa repossa —
                     ei erillistä tietokantapalvelua.

css/style.css         Koko ulkoasu: värit, typografia, hero, kortit, lightbox.

js/config.js          Julkiset asetukset (cloud name, Google client id).
                     EI sisällä mitään salaista.

js/auth.js            Google-kirjautumispainikkeen alustus. Näyttää lomakkeen
                     kirjautumisen jälkeen — tämä on käyttöliittymän mukavuutta,
                     EI itse turvatarkistus (se tapahtuu funktioissa).

js/gallery.js         Hakee games.json:n ja kuvat, rakentaa ruudukot,
                     hoitaa lightboxin (suurennettu kuvanäkymä + selaus).

js/upload.js          Lähettää kuvat Cloudinaryyn allekirjoitetulla luvalla
                     (ei julkista preset-nimeä) ja kutsuu add-game-funktiota
                     games.json:n päivittämiseksi.

netlify.toml           Kertoo Netlifylle, että funktiot löytyvät
                     netlify/functions-kansiosta.

netlify/functions/get-upload-signature.js
                     Tarkistaa Google-tokenin OIKEASTI palvelimella (Googlen
                     tokeninfo-rajapintaa vasten, ei vain selaimessa).
                     Jos kirjautuminen ja sähköposti kelpaavat, laskee
                     Cloudinarylle allekirjoituksen, joka kelpaa vain
                     muutaman minuutin — selain käyttää sitä ladatakseen
                     kuvat suoraan Cloudinaryyn.

netlify/functions/add-game.js
                     Tarkistaa saman kirjautumisen, hakee nykyisen
                     games.json:n GitHubista, lisää uuden rivin, ja
                     committaa muutoksen takaisin GitHub API:n kautta.

netlify/functions/utils/verifyGoogle.js
                     Jaettu apufunktio: varmistaa Google-tokenin ja
                     tarkistaa sähköpostin ALLOWED_EMAILS-listalta.

netlify/functions/utils/cloudinarySign.js
                     Jaettu apufunktio: laskee Cloudinary-allekirjoituksen
                     (SHA-1 parametreista + API secret).
```

---

## Vianetsintä

**"Google-kirjautumista ei saatu ladattua"**
Tarkista, että `js/config.js`:n `GOOGLE_CONFIG.clientId` on oikein, ja
että Netlify-osoite on lisätty Google Cloud Consolen *Authorized
JavaScript origins* -listaan täsmälleen (ilman kauttaviivaa lopussa).

**Kirjautuminen onnistuu, mutta lataus epäonnistuu "Ei oikeuksia"**
Sähköpostisi ei ole `ALLOWED_EMAILS`-ympäristömuuttujassa Netlifyssä, tai
muuttujaa ei ole otettu käyttöön (vaatii uuden deployn muutoksen jälkeen).

**Kuvat latautuvat, mutta eivät näy galleriassa**
Todennäköisimmin Cloudinaryn *"Allow list resources"* -asetus (vaihe 1,
kohta 4) ei ole päällä — ilman sitä tagilla haku ei toimi julkisesti.

**games.json ei päivity automaattisesti latauksen jälkeen**
Tarkista `GITHUB_TOKEN`, `GITHUB_OWNER` ja `GITHUB_REPO` -muuttujat
Netlifyssä, ja että tokenilla on *Contents: Read and write* -oikeus juuri
tähän repoon. Tässä tilanteessa sivu näyttää varajärjestelynä valmiin
JSON-rivin, jonka voi lisätä käsin GitHubissa.

**Netlify-funktio palauttaa virheen, mutta et näe miksi**
Netlify → Site → **Functions**-välilehti → valitse funktio → **Function log**
näyttää tarkat virheviestit (esim. mikä ympäristömuuttuja puuttuu).

---

## Turvallisuusmalli lyhyesti

- Kuka tahansa voi *nähdä* `upload.html`-sivun ja sen lomakkeen ulkoasun.
  Tämä ei ole ongelma, koska pelkkä sivun näkeminen ei anna oikeutta
  ladata mitään.
- Oikea tarkistus tapahtuu jokaisen latauksen ja games.json-päivityksen
  yhteydessä palvelinpuolella (Netlify-funktiot), Googlen omaa
  tokeninfo-rajapintaa vasten. Tätä ei voi ohittaa selaimen konsolista.
- Cloudinary-lataus käyttää lyhytikäistä allekirjoitusta yksittäistä
  latauskertaa varten — ei pysyvää, kaikille avointa preset-nimeä.
- API-avaimet, secretit ja sallittujen sähköpostien lista ovat aina
  Netlifyn ympäristömuuttujissa, eivät koskaan GitHub-repossa tai
  selaimessa näkyvässä koodissa.

---

## Keskeneräiset asiat / muistilista

- [ ] `index.html`:n ja `upload.html`:n footerissa on placeholder-sähköposti
      (`VAIHDA_TAHAN@example.com`) kuvien poisto-pyyntöjä varten — vaihda omaksi.
- [ ] Harkitse, tuleeko footeriin lisätä tarkempi käyttöoikeusteksti
      (esim. saako kuvia jakaa somessa lähde mainiten).
- [ ] Maksulliset lataukset / vapaaehtoiset lahjoitukset: ei vielä
      toteutettu, päätös siirretty myöhemmäksi (ks. keskustelu — juridisia
      näkökohtia sekä myynnissä että lahjoituksissa).
