// Shared helpers used by all pages
const Auth = {
  get token() { return localStorage.getItem('token'); },
  get user() { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } },
  save(token, user) { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user)); },
  clear() { localStorage.removeItem('token'); localStorage.removeItem('user'); },
  logout() { Auth.clear(); location.href = '/index.html'; }
};

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('theme', theme);
  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.textContent = theme === 'dark' ? '☀ Light' : '☾ Dark';
    toggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
  }
}

function setupTheme() {
  const saved = localStorage.getItem('theme');
  const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  applyTheme(saved || preferred);
  const toggle = document.getElementById('themeToggle');
  if (toggle) toggle.addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  });
}

setupTheme();

document.querySelectorAll('[data-password-toggle]').forEach(toggle => {
  toggle.addEventListener('click', () => {
    const input = document.getElementById(toggle.dataset.passwordToggle);
    if (!input) return;
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    toggle.setAttribute('aria-label', visible ? 'Show password' : 'Hide password');
    toggle.textContent = visible ? 'Show' : 'Hide';
    toggle.classList.toggle('is-visible', !visible);
  });

  function passwordStrength(password) {
    if (!password) return { label: '', level: 0 };
    if (meetsPasswordPolicy(password)) return { label: 'Strong', level: 3 };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 2) return { label: 'Weak', level: 1 };
    return { label: 'Medium', level: 2 };
  }

  document.querySelectorAll('[data-password-strength]').forEach(indicator => {
    const input = document.getElementById(indicator.dataset.passwordStrength);
    if (!input) return;
    input.addEventListener('input', () => {
      const result = passwordStrength(input.value);
      indicator.className = `password-strength strength-${result.level}`;
      indicator.innerHTML = result.label
        ? `<span class="strength-label">${result.label}</span><span class="strength-bar"><i></i><i></i><i></i></span>`
        : '';
    });
  });
});

async function api(path, method = 'GET', body) {
  const res = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(Auth.token ? { Authorization: 'Bearer ' + Auth.token } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  let data = {};
  try { data = await res.json(); } catch {}
  if (res.status === 401 && Auth.token) { Auth.logout(); }
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Require login (and optionally a role) for a page
function requireRole(role) {
  const u = Auth.user;
  if (!Auth.token || !u) { location.href = '/index.html'; return null; }
  if (role && u.role !== role) { location.href = u.role === 'admin' ? '/admin.html' : '/user.html'; return null; }
  const who = document.getElementById('who');
  if (who) who.innerHTML = `<span>${esc([u.name, u.surname].filter(Boolean).join(' '))} (${u.role})</span><button class="secondary small" onclick="Auth.logout()">Logout</button>`;
  return u;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function flash(el, text, type = 'err') {
  el.innerHTML = text ? `<div class="msg ${type}">${esc(text)}</div>` : '';
  if (text && type === 'ok') setTimeout(() => (el.innerHTML = ''), 3000);
}

const fmtDate = d => new Date(d.replace(' ', 'T') + 'Z').toLocaleString();
