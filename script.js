async function loadProjects() {
  try {
    const res = await fetch(
      "https://ugwx1ss2.api.sanity.io/v2023-01-01/data/query/production?query=*[_type==\"project\"]"
    );

    const data = await res.json();
    const container = document.getElementById("projects");
    container.innerHTML = "";

    data.result.forEach((p) => {
      const div = document.createElement("div");
      div.className = "project";

      let imageUrl = "";

      if (p.image && p.image.asset && p.image.asset._ref) {
        const ref = p.image.asset._ref;
        const id = ref.replace("image-", "").replace("-jpg", ".jpg");
        imageUrl = `https://cdn.sanity.io/images/ugwx1ss2/production/${id}`;
      }

      div.innerHTML = `
        ${imageUrl ? `<img src="${imageUrl}">` : ""}
        <h2>${p.title}</h2>
        <p>${p.description}</p>
        ${p.link ? `<a href="${p.link}" target="_blank">View Project →</a>` : ""}
      `;

      container.appendChild(div);
    });

  } catch (err) {
    console.error(err);
    document.getElementById("projects").innerHTML =
      "<p style='color:red'>Error loading projects</p>";
  }
}

loadProjects();
