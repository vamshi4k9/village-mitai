import axios from "axios";

// Counts in-flight axios requests so the route loader knows when a screen
// has finished fetching its data.
let pending = 0;
const listeners = new Set();

const change = (delta) => {
  pending = Math.max(0, pending + delta);
  listeners.forEach((listener) => listener(pending));
};

axios.interceptors.request.use((config) => {
  change(1);
  return config;
});

axios.interceptors.response.use(
  (response) => {
    change(-1);
    return response;
  },
  (error) => {
    change(-1);
    return Promise.reject(error);
  }
);

export const getPending = () => pending;

export const subscribePending = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
