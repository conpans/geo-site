// netlify/functions/save-country.mjs
// Writes edited content to src/country/<code>.md on your GitHub repo

import { Buffer } from 'node:buffer';

const OWNER = process.env.GITHUB_OWNER; // e.g. "conpans"
const REPO  = process.env.GITHUB_REPO;  // e.g. "geo-site"
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const TOKEN = process.env.GITHUB_TOKEN; // fine-grained PAT
const API = 'https://api.github.com';

function isoFromPath(path) {
  // expected /country/<iso2>/
  const m = path.match(/^\/country\/([a-z]{2})\/?$/i);
  return m ? m[1].toLowerCase() : null;
}

async function getFileSha(path) {
  const url = `${API}/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(BRANCH)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}`, 'User-Agent': 'netlify-func' }});
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub GET failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.sha || null;
}

export async function handler(event, context) {
  try {
    // --------- auth: require logged-in Netlify Identity user ----------
    // If you want to skip auth while testing, comment the next 6 lines.
    const user = context.clientContext?.user;
    if (!user) {
      return { statusCode: 401, body: 'Unauthorized (log in with Netlify Identity)' };
    }

    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { path, content } = JSON.parse(event.body || '{}');
    const iso = isoFromPath(path || '');
    if (!iso) return { statusCode: 400, body: 'Bad path. Expected /country/<iso2>/' };

    // file in repo to write
    const filePath = `src/country/${iso}.md`;

    // Create simple markdown body; you can format however you like
    const md = (content || '').trim() + '\n';

    // get current sha if exists (required by GitHub for updates)
    const sha = await getFileSha(filePath);

    // commit via GitHub Contents API
    const putUrl = `${API}/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(filePath)}`;
    const payload = {
      message: `update ${iso}.md via inline editor`,
      content: Buffer.from(md, 'utf8').toString('base64'),
      branch: BRANCH,
      ...(sha ? { sha } : {})
    };

    const putRes = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'netlify-func'
      },
      body: JSON.stringify(payload)
    });

    if (!putRes.ok) {
      const txt = await putRes.text();
      return { statusCode: 502, body: `GitHub write failed: ${putRes.status} ${txt}` };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, body: `Server error: ${err.message}` };
  }
}
