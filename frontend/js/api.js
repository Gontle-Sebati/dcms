const API = 'http://localhost:5000/api';

function getToken() { return localStorage.getItem('dcms_token'); }
function getUser() { return JSON.parse(localStorage.getItem('dcms_user') || 'null'); }
function saveSession(token, user) {
  localStorage.setItem('dcms_token', token);
  localStorage.setItem('dcms_user', JSON.stringify(user));
}
function logout() {
  localStorage.removeItem('dcms_token');
  localStorage.removeItem('dcms_user');
  window.location.href = 'login.html';
}
async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
