const { verifyGoogleToken } = require("./utils/verifyGoogle");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const { idToken, entry } = JSON.parse(event.body || "{}");
    if (!entry || !entry.tag) {
      return { statusCode: 400, body: JSON.stringify({ error: "entry puuttuu" }) };
    }

    await verifyGoogleToken(idToken);

    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || "main";
    const path = process.env.GITHUB_FILE_PATH || "games.json";
    const token = process.env.GITHUB_TOKEN;

    const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    const getRes = await fetch(getUrl, {
      headers: {
        Authorization: `token ${token}`,
        "User-Agent": "ottelukuvat-app"
      }
    });
    if (!getRes.ok) {
      throw new Error("games.json ei löytynyt repositorystä");
    }
    const fileData = await getRes.json();
    const currentContent = JSON.parse(
      Buffer.from(fileData.content, "base64").toString("utf-8")
    );

    currentContent.push(entry);

    const newContentB64 = Buffer.from(
      JSON.stringify(currentContent, null, 2) + "\n",
      "utf-8"
    ).toString("base64");

    const putRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: "PUT",
        headers: {
          Authorization: `token ${token}`,
          "User-Agent": "ottelukuvat-app",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: `Lisää ottelu: ${entry.date} vs ${entry.opponent}`,
          content: newContentB64,
          sha: fileData.sha,
          branch
        })
      }
    );

    if (!putRes.ok) {
      const errText = await putRes.text();
      throw new Error("GitHub-päivitys epäonnistui: " + errText);
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 403, body: JSON.stringify({ error: err.message || "Ei oikeuksia" }) };
  }
};
