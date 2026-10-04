import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { API_BASE_URL } from "../constants";

export const saveToken = (token) => localStorage.setItem("token", token);
export const getToken = () => localStorage.getItem("token");
export const isLoggedIn = () => !!localStorage.getItem("token");
export const logout = () => localStorage.removeItem("token");

export const saveSession = ({ access, refresh }) => {
  localStorage.setItem("access_token", access);
  if (refresh) localStorage.setItem("refresh_token", refresh);
};

export const clearSession = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
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
