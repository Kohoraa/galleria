const { verifyGoogleToken } = require("./utils/verifyGoogle");
const { signParams } = require("./utils/cloudinarySign");

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

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signParams({ tags: tag, timestamp }, process.env.CLOUDINARY_API_SECRET);

    return {
      statusCode: 200,
      body: JSON.stringify({
        timestamp,
        signature,
        apiKey: process.env.CLOUDINARY_API_KEY,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME
      })
    };
  } catch (err) {
    return { statusCode: 403, body: JSON.stringify({ error: err.message || "Ei oikeuksia" }) };
  }
};
