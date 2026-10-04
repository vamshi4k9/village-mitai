import axios from 'axios';
import { GoogleLogin } from '@react-oauth/google';
import { API_BASE_URL, SESSION_KEY } from '../constants';
import { saveSession } from '../utils/auth';

const GoogleLoginButton = ({ onLogin, onError }) => {
    const handleSuccess = async (credentialResponse) => {
        try {
            // the session key lets the backend attach this browser's guest
            // addresses and orders to the account
            const res = await axios.post(`${API_BASE_URL}/google-login/`, {
                credential: credentialResponse.credential,
            }, SESSION_KEY);
            saveSession(res.data);
            if (onLogin) onLogin(res.data.user);
        } catch (err) {
            console.log('Google login failed', err);
            if (onError) onError(err.response?.data?.error || 'Google login failed. Try again.');
        }
    };

    const handleError = () => {
        console.log('Google login failed');
        if (onError) onError('Google login failed. Try again.');
    };

    return (
        <GoogleLogin
            onSuccess={handleSuccess}
            onError={handleError}
        />
    );
};

export default GoogleLoginButton;
