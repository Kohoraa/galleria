(function () {
  const form = document.getElementById("contact-form");
  const submitBtn = document.getElementById("contact-submit");
  const successBox = document.getElementById("contact-success");
  const errorBox = document.getElementById("contact-error");

  function encode(data) {
    return Object.keys(data)
      .map((key) => encodeURIComponent(key) + "=" + encodeURIComponent(data[key]))
      .join("&");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    errorBox.style.display = "none";
    submitBtn.disabled = true;
    submitBtn.textContent = "Lähetetään…";

    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });

    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: encode(data)
    })
      .then(() => {
        form.style.display = "none";
        successBox.style.display = "block";
      })
      .catch((err) => {
        console.error(err);
        errorBox.textContent = "Viestin lähetys epäonnistui. Yritä hetken kuluttua uudelleen.";
        errorBox.style.display = "block";
        submitBtn.disabled = false;
        submitBtn.textContent = "Lähetä viesti";
      });
  });
})();
