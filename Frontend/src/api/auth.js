import axios from "axios";
import { API_BASE_URL} from '../constants'; 

const API = axios.create({
  baseURL: `${API_BASE_URL}/api/`,
});

export const sendOTP = (phone) => API.post("send-otp/", { phone });
export const verifyOTP = (phone, otp) => API.post("verify-otp/", { phone, otp });

export default API;
