import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
import { saveSession, isLoggedIn } from '../services/auth';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    aadharNumber: '',
    fullName: '',
    phoneNumber: '',
    village: '',
    district: '',
    state: 'Punjab',
    bankAccount: '',
    bankIfsc: '',
    landArea: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) navigate('/farmer/dashboard', { replace: true });
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authService.register(formData);
      const { token, farmer } = response.data;
      const normalised = {
        id: farmer.id,
        fullName: farmer.fullName || farmer.full_name,
        phoneNumber: farmer.phoneNumber || farmer.phone_number,
        district: farmer.district,
      };
      saveSession(token, normalised);
      navigate('/farmer/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.error || '';
      if (msg === 'Farmer already registered') {
        setError('You are already registered. Please go to Login instead.');
      } else {
        setError(msg || 'Registration failed. Is the backend server running?');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <span style={styles.logo}>🌾</span>
          <h1 style={styles.title}>Farmer Registration</h1>
          <p style={styles.subtitle}>Join KisanFlow Platform</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.row}>
            <div style={styles.col}>
              <label style={styles.label}>Full Name *</label>
              <input type="text" name="fullName" onChange={handleChange} style={styles.input} required />
            </div>
            <div style={styles.col}>
              <label style={styles.label}>Aadhaar Number *</label>
              <input type="text" name="aadharNumber" onChange={handleChange} style={styles.input} maxLength="12" required />
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.col}>
              <label style={styles.label}>Phone Number *</label>
              <input type="tel" name="phoneNumber" onChange={handleChange} style={styles.input} maxLength="10" required />
            </div>
            <div style={styles.col}>
              <label style={styles.label}>Village</label>
              <input type="text" name="village" onChange={handleChange} style={styles.input} />
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.col}>
              <label style={styles.label}>District</label>
              <input type="text" name="district" onChange={handleChange} style={styles.input} />
            </div>
            <div style={styles.col}>
              <label style={styles.label}>State</label>
              <select name="state" onChange={handleChange} style={styles.input}>
                <option value="Punjab">Punjab</option>
                <option value="Haryana">Haryana</option>
                <option value="UP">Uttar Pradesh</option>
                <option value="MP">Madhya Pradesh</option>
              </select>
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.col}>
              <label style={styles.label}>Bank Account Number</label>
              <input type="text" name="bankAccount" onChange={handleChange} style={styles.input} />
            </div>
            <div style={styles.col}>
              <label style={styles.label}>IFSC Code</label>
              <input type="text" name="bankIfsc" onChange={handleChange} style={styles.input} />
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.col}>
              <label style={styles.label}>Land Area (Acres)</label>
              <input type="number" name="landArea" onChange={handleChange} style={styles.input} step="0.1" />
            </div>
            <div style={styles.col}>
              <label style={styles.label}>Password *</label>
              <input type="password" name="password" onChange={handleChange} style={styles.input} required minLength="6" />
            </div>
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p style={styles.footer}>
          Already registered? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
  },
  card: {
    background: 'white',
    padding: '40px',
    borderRadius: '15px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    width: '600px',
    maxWidth: '100%',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  logo: { fontSize: '50px' },
  title: { margin: '10px 0 5px', color: '#333', fontSize: '28px' },
  subtitle: { color: '#666', margin: '0' },
  row: {
    display: 'flex',
    gap: '15px',
    marginBottom: '15px',
  },
  col: { flex: 1 },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#555',
    fontWeight: '600',
    fontSize: '14px',
  },
  input: {
    width: '100%',
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '20px',
  },
  error: {
    background: '#ffebee',
    color: '#c62828',
    padding: '10px',
    borderRadius: '5px',
    marginBottom: '20px',
    textAlign: 'center',
  },
  footer: {
    textAlign: 'center',
    marginTop: '20px',
    color: '#666',
  },
};

export default Register;