// API URLs
// export const API_BASE_URL = 'http://127.0.0.1:8000/api';
// export const API_BASE_URL_MEDIA = 'http://127.0.0.1:8000';
export const API_BASE_URL = `${window.location.origin}/api`;
export const API_BASE_URL_MEDIA = `${window.location.origin}`;
// export const API_BASE_URL = 'https://villagemitai.zapto.org/api';
// export const API_BASE_URL_MEDIA = 'https://villagemitai.zapto.org';

const getSessionKey = () => {
  let sessionKey = localStorage.getItem("cart_session_key");
  if (!sessionKey) {
    sessionKey = `anon_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("cart_session_key", sessionKey);
  }
  return sessionKey;
};

export const SESSION_KEY = {
  headers: { "X-Session-Key": getSessionKey() },
};

// headers is a getter so the token is read at request time, not once at page
// load (otherwise a login without a reload would send "Bearer null")
export const SESSION_TOKEN = {
  get headers() {
    const token = localStorage.getItem("access_token");
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "X-Session-Key": getSessionKey(),
    };
  },
};
