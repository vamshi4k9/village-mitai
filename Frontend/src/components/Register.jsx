import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL} from '../constants'; 

function Register() {
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const navigate = useNavigate();

  const handleRegister = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/register/`, formData);
      navigate('/login');
    } catch (err) {
      alert('Registration failed');
    }
  };

  return (
    <div>
      <h2>Register</h2>
      <input placeholder="Username" onChange={e => setFormData({ ...formData, username: e.target.value })} />
      <input placeholder="Email" onChange={e => setFormData({ ...formData, email: e.target.value })} />
      <input placeholder="Password" type="password" onChange={e => setFormData({ ...formData, password: e.target.value })} />
      <button onClick={handleRegister}>Register</button>
    </div>
  );
}

export default Register;
