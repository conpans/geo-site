// netlify/functions/save-country.mjs
// Node runtime Netlify Function that updates a country .md file on GitHub.
// Needs env vars: GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, GITHUB_TOKEN

export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { path, content } = JSON.parse(event.body || '{}');
    if (!path || typeof content !== 'string') {
      return { statusCode: 400, body: 'Bad payload: expected { path, content }' };
    }

    // Map /country/co/ -> src/country/co.md  (fix missing slash)
    const normalized = path.replace(/\/+$/, '').replace(/^\/+/, ''); // "country/co"
    const filePath = `src/${normalized}.md`;                         // "src/country/co.md"

    const owner  = process.env.GITHUB_OWNER;
    const repo   = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || 'main';
    const token  = process.env.GITHUB_TOKEN;

    if (!owner || !repo || !token) {
      return { statusCode: 500, body: 'Missing GitHub env vars' };
    }

    const apiBase = 'https://api.github.com';

    // 1) Fetch existing file to get front-matter + sha
    const getRes = await fetch(
      `${apiBase}/repos/${owner}/${repo}/contents/${filePath}?ref=${encodeURIComponent(branch)}`,
      { headers: { Authorization: `token ${token}`, 'User-Agent': 'netlify-fn' } }
    );

    if (!getRes.ok) {
      const msg = await getRes.text();
      return { statusCode: getRes.status, body: `GET contents failed: ${msg}` };
    }

    const current = await getRes.json();
    const sha = current.sha;
    const existing = Buffer.from(current.content, 'base64').toString('utf8');

    // 2) Preserve front-matter if present, replace only the body
    let front = '';
    if (existing.startsWith('---')) {
      const end = existing.indexOf('\n---', 3);
      if (end !== -1) {
        front = existing.slice(0, end + 4) + '\n\n'; // include trailing "---\n\n"
      }
    }
    const newMarkdown = front + content.trim() + '\n';
    const b64 = Buffer.from(newMarkdown, 'utf8').toString('base64');

    // 3) Commit update via GitHub Contents API
    const putRes = await fetch(
      `${apiBase}/repos/${owner}/${repo}/contents/${filePath}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          'User-Agent': 'netlify-fn',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `update ${filePath} via inline editor`,
          content: b64,
          branch,
          sha
        })
      }
    );

    if (!putRes.ok) {
      const msg = await putRes.text();
      return { statusCode: putRes.status, body: `PUT contents failed: ${msg}` };
    }

    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    return { statusCode: 500, body: `Error: ${err.message}` };
  }
}
