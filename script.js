async function loadProjects() {
  try {
    const res = await fetch(
      "https://ugwx1ss2.api.sanity.io/v2023-01-01/data/query/production?query=*[_type==\"project\"]"
    );

    if (!res.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await res.json();

    console.log(data);

    const container = document.getElementById("projects");
    container.innerHTML = "";

    if (!data.result || data.result.length === 0) {
      container.innerHTML = "<p>No projects found</p>";
      return;
    }

    data.result.forEach((p) => {
      const div = document.createElement("div");
      div.className = "project";

      div.innerHTML = `
        <h2>${p.title || "No title"}</h2>
        <p>${p.description || "No description"}</p>
      `;

      container.appendChild(div);
    });

  } catch (error) {
    console.error(error);
    document.getElementById("projects").innerHTML =
      "<p style='color:red'>Failed to load data</p>";
  }
}

loadProjects();
