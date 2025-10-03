export default async (req, context) => {
  // Require a logged-in Netlify Identity user
  const user = context.clientContext?.user;
  if (!user) return new Response(JSON.stringify({error:"unauthorized"}), {status: 401});

  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH = 'main' } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    return new Response(JSON.stringify({error:"server not configured"}), {status: 500});
  }

  if (req.method !== 'POST') return new Response('Method not allowed', {status: 405});

  const { iso, bodyMarkdown, message } = await req.json();
  if (!iso || !bodyMarkdown) {
    return new Response(JSON.stringify({error:"missing iso or bodyMarkdown"}), {status: 400});
  }

  // Path to the markdown file in your repo
  const path = `src/country/${iso.toLowerCase()}.md`;

  // Get current file (to obtain sha if it exists)
  const getUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(path)}?ref=${GITHUB_BRANCH}`;
  const headers = { Authorization: `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'netlify-fn' };

  let sha = undefined;
  const getRes = await fetch(getUrl, { headers });
  if (getRes.ok) {
    const info = await getRes.json();
    sha = info.sha;
  } else if (getRes.status !== 404) {
    return new Response(JSON.stringify({error:"github read failed"}), {status: 502});
  }

  // Compose minimal frontmatter + body
  // If a file already exists, we are replacing its full contents with the new body here.
  const content = bodyMarkdown;
  const b64 = Buffer.from(content, 'utf8').toString('base64');

  const putUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(path)}`;
  const putBody = {
    message: message || `edit(${iso}): inline update`,
    content: b64,
    branch: GITHUB_BRANCH,
    sha
  };

  const putRes = await fetch(putUrl, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(putBody)
  });

  if (!putRes.ok) {
    const txt = await putRes.text();
    return new Response(JSON.stringify({error:"github write failed", detail: txt}), {status: 502});
  }

  return new Response(JSON.stringify({ok:true}), {status: 200});
};
