// netlify/functions/save-country.mjs
export default async (req, ctx) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { code, body } = await req.json();
  const owner = Deno.env.get("GITHUB_OWNER");
  const repo  = Deno.env.get("GITHUB_REPO");
  const token = Deno.env.get("GITHUB_TOKEN");
  const branch = Deno.env.get("GITHUB_BRANCH") || "main";
  const path = `src/country/${code.toLowerCase()}.md`;

  const api = (url, init={}) =>
    fetch(`https://api.github.com${url}`, {
      ...init,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
        ...init.headers
      }
    });

  // get current file (to preserve front-matter)
  let sha = null, existing = "";
  const getRes = await api(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`);
  if (getRes.ok) {
    const j = await getRes.json();
    sha = j.sha;
    existing = atob(j.content.replace(/\n/g, ""));
  }

  // extract front-matter if present
  let fm = "";
  if (existing.startsWith("---")) {
    const end = existing.indexOf("\n---", 3);
    if (end !== -1) fm = existing.slice(0, end + 4).trim() + "\n\n";
  }
  // default front-matter if missing
  if (!fm) {
    const ISO = code.toUpperCase();
    fm = `---\nlayout: layout.njk\ntitle: ${ISO}\npermalink: /country/${code.toLowerCase()}/\n---\n\n`;
  }

  const newContent = fm + (body ?? "").trim() + "\n";
  const b64 = btoa(unescape(encodeURIComponent(newContent)));

  // commit back to GitHub
  const commit = await api(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
    method: "PUT",
    body: JSON.stringify({
      message: `Update ${code}.md via inline editor`,
      content: b64,
      branch,
      sha
    })
  });

  if (!commit.ok) {
    const err = await commit.text();
    return new Response(err, { status: 500 });
  }
  return new Response("ok");
};
