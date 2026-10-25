import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { API_BASE_URL } from "../constants";

export const saveToken = (token) => localStorage.setItem("token", token);
export const getToken = () => localStorage.getItem("token");
export const isLoggedIn = () => !!localStorage.getItem("token");
export const logout = () => localStorage.removeItem("token");

// fired on sign-in and sign-out so the cart can reload for the new user
export const AUTH_CHANGED = "auth-changed";
const announce = () => window.dispatchEvent(new Event(AUTH_CHANGED));

export const saveSession = ({ access, refresh }) => {
  const wasSignedIn = !!localStorage.getItem("access_token");
  localStorage.setItem("access_token", access);
  if (refresh) localStorage.setItem("refresh_token", refresh);
  // a token refresh keeps the same user; only a new sign-in is announced
  if (!wasSignedIn) announce();
};

export const clearSession = () => {
  const wasSignedIn = !!localStorage.getItem("access_token");
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  if (wasSignedIn) announce();
};

const isExpired = (token) => {
  try {
    // 30s margin so a token doesn't expire mid-request
    return jwtDecode(token).exp * 1000 < Date.now() + 30000;
  } catch (err) {
    return true;
  }
};

// Returns a usable access token, refreshing it if needed, or null when the
// user has to log in again.
export const getValidAccessToken = async () => {
  const access = localStorage.getItem("access_token");
  if (access && !isExpired(access)) return access;

  const refresh = localStorage.getItem("refresh_token");
  if (!refresh || isExpired(refresh)) {
    clearSession();
    return null;
  }

  try {
    const res = await axios.post(`${API_BASE_URL}/token/refresh/`, { refresh });
    saveSession({ access: res.data.access, refresh: res.data.refresh });
    return res.data.access;
  } catch (err) {
    clearSession();
    return null;
  }
};
