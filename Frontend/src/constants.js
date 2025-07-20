// API URLs
export const API_BASE_URL = 'https://villagemitai.zapto.org/api';
export const API_BASE_URL_MEDIA = 'https://villagemitai.zapto.org';

const getSessionKey = () => {
  let sessionKey = localStorage.getItem("cart_session_key");
  if (!sessionKey) {
    sessionKey = `anon_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("cart_session_key", sessionKey);
  }
  return sessionKey;
};

const token = localStorage.getItem("access_token") || null

export const SESSION_KEY = {
  headers: { "X-Session-Key": getSessionKey() },
};

export const SESSION_TOKEN = {
  headers: {
    Authorization: `Bearer ${token}`,
    "X-Session-Key": getSessionKey()
  },
};
