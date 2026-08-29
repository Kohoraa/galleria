(function () {
  const form = document.getElementById("upload-form");
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("file-input");
  const fileListEl = document.getElementById("file-list");
  const uploadBtn = document.getElementById("upload-btn");
  const snippetBox = document.getElementById("snippet-box");
  const snippetText = document.getElementById("snippet-text");
  const copyBtn = document.getElementById("copy-btn");
  const formError = document.getElementById("form-error");
  const successBox = document.getElementById("success-box");

  let selectedFiles = [];
  let isSubmitting = false;

  const sportSelect = document.getElementById("game-sport");
  const sportOtherGroup = document.getElementById("game-sport-other-group");
  sportSelect.addEventListener("change", () => {
    sportOtherGroup.style.display = sportSelect.value === "muu" ? "block" : "none";
  });

  function slugify(str) {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function buildTag() {
    const date = document.getElementById("game-date").value;
    const home = document.getElementById("game-home").value;
    const away = document.getElementById("game-away").value;
    return `peli-${date}-${slugify(home)}-${slugify(away)}`;
  }

  function renderFileList() {
    fileListEl.innerHTML = "";
    selectedFiles.forEach((f) => {
      const row = document.createElement("div");
      row.dataset.name = f.name;
      row.innerHTML = `<span>${f.name}</span><span class="status" data-status>odottaa</span>`;
      fileListEl.appendChild(row);
    });
    uploadBtn.disabled = selectedFiles.length === 0;
  }

  function addFiles(fileArray) {
    selectedFiles = selectedFiles.concat(
      fileArray.filter((f) => f.type.startsWith("image/"))
    );
    renderFileList();
  }

  dropzone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => addFiles(Array.from(e.target.files)));

  ["dragenter", "dragover"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add("is-dragover");
    })
  );
  ["dragleave", "drop"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove("is-dragover");
    })
  );
  dropzone.addEventListener("drop", (e) => {
    addFiles(Array.from(e.dataTransfer.files));
  });

  function setStatus(filename, text, ok) {
    const row = fileListEl.querySelector(`[data-name="${CSS.escape(filename)}"] [data-status]`);
    if (!row) return;
    row.textContent = text;
    row.className = ok ? "status-ok" : "status-err";
  }

  async function getUploadSignature(tag) {
    const res = await fetch("/.netlify/functions/get-upload-signature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: window.currentIdToken, tag })
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Ei oikeuksia ladata kuvia");
    }
    return res.json();
  }

  async function uploadOne(file, tag, sig) {
    const url = `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`;
    const body = new FormData();
    body.append("file", file);
    body.append("api_key", sig.apiKey);
    body.append("timestamp", sig.timestamp);
    body.append("signature", sig.signature);
    body.append("tags", tag);

    const res = await fetch(url, { method: "POST", body });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }
    return res.json();
  }

  async function registerGame(entry) {
    const res = await fetch("/.netlify/functions/add-game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: window.currentIdToken, entry })
    });
    if (!res.ok) return { ok: false };
    return res.json().catch(() => ({ ok: true }));
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!selectedFiles.length) return;
    if (isSubmitting) return; // estää tuplapainalluksen
    isSubmitting = true;

    formError.style.display = "none";
    successBox.style.display = "none";
    snippetBox.style.display = "none";

    const tag = buildTag();
    uploadBtn.disabled = true;
    uploadBtn.textContent = "Tarkistetaan…";

    let sig;
    try {
      sig = await getUploadSignature(tag);
    } catch (err) {
      formError.textContent = err.message;
      formError.style.display = "block";
      uploadBtn.disabled = false;
      uploadBtn.textContent = "Lataa kuvat";
      isSubmitting = false;
      return;
    }

    uploadBtn.textContent = "Ladataan…";
    let successCount = 0;

    for (const file of selectedFiles) {
      setStatus(file.name, "ladataan…", true);
      try {
        await uploadOne(file, tag, sig);
        setStatus(file.name, "valmis", true);
        successCount++;
      } catch (err) {
        setStatus(file.name, "virhe", false);
        console.error(err);
      }
    }

    if (successCount > 0) {
      uploadBtn.textContent = "Rekisteröidään ottelua…";

      const date = document.getElementById("game-date").value;
      const home = document.getElementById("game-home").value;
      const away = document.getElementById("game-away").value;
      const venue = document.getElementById("game-venue").value;
      const report = document.getElementById("game-report").value;

      const sportValue = document.getElementById("game-sport").value;
      const sportOther = document.getElementById("game-sport-other").value;
      const laji = sportValue === "muu" ? (sportOther || "muu") : sportValue;

      const entry = {
        tag,
        date,
        laji,
        kotijoukkue: home,
        vierasjoukkue: away,
        title: `${home} - ${away}`,
        venue: venue || "",
        raportti: report || ""
      };

      const result = await registerGame(entry);

      if (result.ok && result.duplicate) {
        successBox.style.display = "block";
        successBox.textContent = `${successCount} kuvaa lisätty olemassa olevaan otteluun (${entry.title}).`;
      } else if (result.ok) {
        successBox.style.display = "block";
        successBox.textContent = `${successCount} kuvaa ladattu ja uusi ottelu lisätty galleriaan automaattisesti.`;
      } else {
        // Varajärjestely: jos games.json-päivitys epäonnistuu (esim. GitHub-tunnukset
        // puuttuvat Netlifystä), näytä rivi manuaalista lisäystä varten.
        snippetText.textContent = JSON.stringify(entry, null, 2) + ",";
        snippetBox.style.display = "block";
        snippetBox.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    uploadBtn.textContent = "Lataa kuvat";
    uploadBtn.disabled = false;
    isSubmitting = false;
  });

  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(snippetText.textContent).then(() => {
      copyBtn.textContent = "Kopioitu ✓";
      setTimeout(() => (copyBtn.textContent = "Kopioi"), 1500);
    });
  });
})();
