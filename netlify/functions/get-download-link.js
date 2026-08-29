const { verifyGoogleToken } = require("./utils/verifyGoogle");

// Pyytää Cloudinarylta valmiin zip-paketin kaikista tietyn tagin kuvista.
// Cloudinary generoi ja isännöi zipin itse, palauttaa siihen suoran linkin.
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const { idToken, tag } = JSON.parse(event.body || "{}");
    if (!tag) {
      return { statusCode: 400, body: JSON.stringify({ error: "tag puuttuu" }) };
    }

    await verifyGoogleToken(idToken);

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/generate_archive`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tags: [tag],
          target_format: "zip",
          mode: "create"
        })
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error("Cloudinary-zip epäonnistui: " + errText);
    }

    const data = await res.json();

    return {
      statusCode: 200,
      body: JSON.stringify({ url: data.secure_url, fileCount: data.file_count || null })
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 403, body: JSON.stringify({ error: err.message || "Ei oikeuksia" }) };
  }
};
