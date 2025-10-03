// src/js/tiptap-editor.js
const main = document.getElementById('page-main');
if (!main) throw new Error('main not found');

function countryCodeFromPath() {
  // /country/co/ -> 'co'
  const parts = location.pathname.split('/').filter(Boolean);
  const i = parts.indexOf('country');
  return (i >= 0 && parts[i+1]) ? parts[i+1].toLowerCase() : null;
}

function ensureIdentity() {
  return new Promise((resolve) => {
    const id = window.netlifyIdentity;
    if (!id) return resolve(null);

    id.on('init', user => {
      if (user) return resolve(user);
      id.open('login');
    });
    id.on('login', user => {
      id.close();
      resolve(user);
    });

    // kick off init
    id.init();
  });
}

function makeToolbar() {
  const bar = document.createElement('div');
  bar.style.position = 'fixed';
  bar.style.top = '12px';
  bar.style.right = '12px';
  bar.style.zIndex = '100';
  bar.style.display = 'flex';
  bar.style.gap = '8px';

  const save = document.createElement('button');
  save.textContent = 'Save';
  save.style.padding = '8px 12px';
  save.style.fontWeight = '700';
  save.style.border = '1px solid #111';
  save.style.background = '#fff';
  save.style.cursor = 'pointer';

  const logout = document.createElement('button');
  logout.textContent = 'Log out';
  logout.style.padding = '8px 12px';
  logout.style.border = '1px solid #ccc';
  logout.style.background = '#f7f7f7';
  logout.style.cursor = 'pointer';

  bar.append(save, logout);
  document.body.appendChild(bar);
  return { save, logout };
}

function makeEditable() {
  const wrap = document.createElement('div');
  wrap.style.border = '1px solid #e5e7eb';
  wrap.style.boxShadow = '0 8px 30px rgba(0,0,0,.08)';
  wrap.style.padding = '16px';
  wrap.style.background = '#fff';

  // take the current page content markup
  const editable = document.createElement('div');
  editable.contentEditable = 'true';
  editable.style.minHeight = '200px';
  editable.innerHTML = main.innerHTML;

  // replace main content
  main.innerHTML = '';
  wrap.appendChild(editable);
  main.appendChild(wrap);
  return editable;
}

(async () => {
  const code = countryCodeFromPath();
  if (!code) {
    alert('No country code detected in URL path.');
    return;
  }

  const user = await ensureIdentity();
  if (!user) return;

  const editable = makeEditable();
  const { save, logout } = makeToolbar();

  save.addEventListener('click', async () => {
    save.disabled = true;
    try {
      const jwt = await window.netlifyIdentity.currentUser().jwt(true);
      const res = await fetch('/.netlify/functions/save-country', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`
        },
        body: JSON.stringify({
          code,
          html: editable.innerHTML
        })
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t);
      }
      alert('Saved. Netlify will rebuild your site in a few moments.');
    } catch (err) {
      console.error(err);
      alert('Save failed. See console for details.');
    } finally {
      save.disabled = false;
    }
  });

  logout.addEventListener('click', () => {
    window.netlifyIdentity.logout();
    location.reload();
  });
})();
