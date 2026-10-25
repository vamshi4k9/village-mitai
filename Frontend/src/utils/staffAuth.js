// Staff and agent login (admin, maker, delivery, agent), kept apart from the
// customer login: customers sign in with Google and use access_token /
// refresh_token (utils/auth.js); staff use the keys below, so neither login
// overwrites or signs out the other.

export const STAFF_ROLES = ["admin", "maker", "delivery", "agent"];

const KEYS = {
  access: "staff_access_token",
  refresh: "staff_refresh_token",
  role: "staff_role",
  userId: "staff_user_id",
  info: "staff_user_info",
};

const read = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key, value) => {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // storage blocked: the login just won't be remembered
  }
};

// Staff used to be stored under the customer keys. Move such a session over
// once, so people already logged in stay logged in.
const moveOldStaffSession = () => {
  const oldRole = read("user_role");
  if (!STAFF_ROLES.includes(oldRole) || read(KEYS.access)) return;
  write(KEYS.access, read("access_token"));
  write(KEYS.refresh, read("refresh_token"));
  write(KEYS.role, oldRole);
  write(KEYS.userId, read("user_id"));
  write(KEYS.info, read("user_info"));
  ["access_token", "refresh_token", "user_role", "user_id", "user_info"].forEach((k) => write(k, null));
};
moveOldStaffSession();

// response of /admin-login/
export const saveStaffSession = (data) => {
  write(KEYS.access, data.access);
  write(KEYS.refresh, data.refresh);
  write(KEYS.role, data.user?.role);
  write(KEYS.userId, data.user?.id != null ? String(data.user.id) : null);
  write(KEYS.info, data.user ? JSON.stringify(data.user) : null);
};

export const clearStaffSession = () => {
  Object.values(KEYS).forEach((k) => write(k, null));
};

export const getStaffToken = () => read(KEYS.access);
export const getStaffRole = () => read(KEYS.role);

export const getStaffUser = () => {
  try {
    return JSON.parse(read(KEYS.info) || "null");
  } catch {
    return null;
  }
};

export const staffAuthHeader = () => {
  const token = getStaffToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// after logging out, staff go back to the catalogue of staff pages
export const staffLogout = () => {
  clearStaffSession();
  window.location.href = "/catalogue";
};
