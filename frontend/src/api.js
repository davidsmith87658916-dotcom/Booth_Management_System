export const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/+$/, '');
export async function api(path, options = {}) {
  const response = await fetch(API_BASE + path, {credentials:'include', ...options, headers:{'Content-Type':'application/json','X-Requested-With':'ExpoHub',...options.headers}});
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('session-expired'));
    const message = typeof data.detail === 'string' ? data.detail : Array.isArray(data.detail) ? data.detail.map(d => `${d.loc?.slice(1).join('.')}: ${d.msg}`).join('; ') : 'Request failed. Please try again.';
    const error = new Error(message); error.status = response.status; throw error;
  }
  return data;
}
export function write(path, data, method = 'POST') { return api(path,{method,body:JSON.stringify(data)}); }
export function read(path, options = {}) { return api(path, options); }
