export async function getProjects() {
  const res = await fetch(
    "https://ugwx1ss2.api.sanity.io/v2023-01-01/data/query/production?query=*[_type=='project']"
  );
  const data = await res.json();
  return data.result;
}
