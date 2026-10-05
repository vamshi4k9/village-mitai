import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/FormPage.css';
import { API_BASE_URL } from '../constants';

function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await axios.post(`${API_BASE_URL}/admin-login/`, {
        username,
        password,
        role,
      });

      // Store tokens and user info
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      localStorage.setItem('user_role', res.data.user.role);
      localStorage.setItem('user_id', res.data.user.id);
      localStorage.setItem('user_info', JSON.stringify(res.data.user));

      // Navigate based on role
      navigateBasedOnRole(res.data.user.role);

    } catch (err) {
      console.error('Login error:', err);
      
      if (err.response) {
        switch (err.response.status) {
          case 401:
            setError('Invalid credentials');
            break;
          case 403:
            setError('Access denied for this role');
            break;
          case 400:
            setError(err.response.data.error || 'Invalid request');
            break;
          default:
            setError('Login failed. Please try again.');
        }
      } else if (err.request) {
        setError('Network error. Please check your connection.');
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const navigateBasedOnRole = (userRole) => {
    switch (userRole) {
      case 'admin':
        navigate('/admin/dashboard');
        break;
      case 'maker':
        navigate('/maker/dashboard');
        break;
      case 'delivery':
        navigate('/delivery/dashboard');
        break;
      default:
        setError('Unauthorized role. Access denied.');
        localStorage.clear(); // Clear stored tokens and user info
        navigate('/login'); // Redirect to login page
    }
  };

  // a form, so Enter in either field submits
  const handleSubmit = (e) => {
    e.preventDefault();
    handleLogin();
  };

  return (
    <div className="fp-auth">
      <form className="fp-card" onSubmit={handleSubmit} noValidate>
        <img
          src={`${process.env.PUBLIC_URL}/images/villageLogoLong.png`}
          alt="Village Mitai"
          className="fp-logo"
        />

        <h1 className="fp-title">Staff Login</h1>
        <p className="fp-sub">For admin, maker and delivery accounts</p>

        {error && (
          <div className="fp-alert error" role="alert">
            <i className="bi bi-exclamation-circle" aria-hidden="true"></i>
            {error}
          </div>
        )}

        <div className="fp-field">
          <label htmlFor="username" className="fp-label">Username</label>
          <input
            id="username"
            className="fp-input"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading}
            autoComplete="username"
          />
        </div>

        <div className="fp-field">
          <label htmlFor="password" className="fp-label">Password</label>
          <input
            id="password"
            className="fp-input"
            placeholder="Enter password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          className="fp-btn"
          disabled={isLoading}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

export default AdminLogin;