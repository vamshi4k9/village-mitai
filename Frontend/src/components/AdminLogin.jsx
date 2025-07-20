// LoginPage.js
import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/LoginPage.css';
import { API_BASE_URL } from '../constants';

function LoginPage() {
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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-heading">Admin Login</h2>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="username" className="form-label">Username</label>
          <input
            id="username"
            className="login-input"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            autoComplete="username"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password" className="form-label">Password</label>
          <input
            id="password"
            className="login-input"
            placeholder="Enter password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            autoComplete="current-password"
          />
        </div>

        <button 
          className="login-button" 
          onClick={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>

        {/* <div className="login-footer">
          <p>Select your role and enter your credentials to access the admin panel.</p>
        </div> */}
      </div>
    </div>
  );
}

export default LoginPage;