async function loadProjects() {
  const res = await fetch(
    "https://ugwx1ss2.api.sanity.io/v2023-01-01/data/query/production?query=*[_type=='project']"
  );

  const data = await res.json();

  const container = document.getElementById("projects");

  data.result.forEach((p) => {
    const div = document.createElement("div");
    div.className = "project";

    div.innerHTML = `
      <h2>${p.title}</h2>
      <p>${p.description}</p>
    `;

    container.appendChild(div);
  });
}

loadProjects();
