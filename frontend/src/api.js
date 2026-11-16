const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export function getToken() {
  return localStorage.getItem('fy_token');
}

export async function api(path, options = {}) {
  const headers = { 
    'Content-Type': 'application/json', 
    ...(options.headers || {}) 
  };
  
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API}${path}`, { ...options, headers });
  
  const data = await res.json().catch(() => ({ message: 'Unexpected server response.' }));
  
  if (!res.ok) {
    // If the token is invalid or expired, clear local storage so the user can re-authenticate
    if (res.status === 401) {
      localStorage.removeItem('fy_token');
      localStorage.removeItem('fy_user');
    }
    throw new Error(data.message || data.error || 'Request failed');
  }
  
  return data;
}