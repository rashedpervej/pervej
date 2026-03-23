async function loadProjects() {
  const res = await fetch(
    "https://ugwx1ss2.api.sanity.io/v2023-01-01/data/query/production?query=*[_type==\"project\"]"
  );

  const data = await res.json();

  const container = document.getElementById("projects");
  container.innerHTML = "";

  data.result.forEach((p) => {
    const div = document.createElement("div");
    div.className = "project";

    const imageUrl = p.image
      ? `https://cdn.sanity.io/images/ugwx1ss2/production/${p.image.asset._ref
          .replace("image-", "")
          .replace("-jpg", ".jpg")}`
      : "";

    div.innerHTML = `
      ${imageUrl ? `<img src="${imageUrl}" style="width:100%; border-radius:10px;">` : ""}
      <h2>${p.title}</h2>
      <p>${p.description}</p>
      ${p.link ? `<a href="${p.link}" target="_blank">View Project</a>` : ""}
    `;

    container.appendChild(div);
  });
}

loadProjects();
