import { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import GoogleLoginButton from './GoogleLoginButton';
import '../styles/FormPage.css';
import { API_BASE_URL} from '../constants';


function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/login/`, {
        username,
        password,
      });
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      navigate('/');
    } catch (err) {
      setError('Invalid credentials');
      setIsLoading(false);
    }
  };

  return (
    <div className="fp-auth">
      <form className="fp-card" onSubmit={handleLogin} noValidate>
        <Link to="/">
          <img
            src={`${process.env.PUBLIC_URL}/images/villageLogoLong.png`}
            alt="Village Mitai"
            className="fp-logo"
          />
        </Link>

        <h1 className="fp-title">Welcome Back</h1>
        <p className="fp-sub">Log in to your Village Mitai account</p>

        {error && (
          <div className="fp-alert error" role="alert">
            <i className="bi bi-exclamation-circle" aria-hidden="true"></i>
            {error}
          </div>
        )}

        <div className="fp-field">
          <label htmlFor="login-username" className="fp-label">Username</label>
          <input
            id="login-username"
            className="fp-input"
            placeholder="Enter username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
          />
        </div>

        <div className="fp-field">
          <label htmlFor="login-password" className="fp-label">Password</label>
          <input
            id="login-password"
            className="fp-input"
            placeholder="Enter password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        <button type="submit" className="fp-btn" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>

        <div className="fp-divider"><span>or</span></div>

        {/* same Google sign-in as the cart and profile; it saves the session itself */}
        <div className="fp-google">
          <GoogleLoginButton onLogin={() => navigate('/')} onError={setError} />
        </div>

        <p className="fp-foot">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </div>
  );
}

export default LoginPage;
