import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8000/api/",
});

export const sendOTP = (phone) => API.post("send-otp/", { phone });
export const verifyOTP = (phone, otp) => API.post("verify-otp/", { phone, otp });

export default API;
