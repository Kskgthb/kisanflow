import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
import { saveSession, isLoggedIn } from '../services/auth';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

const Login = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({ phoneNumber: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, skip the login page
  useEffect(() => {
    if (isLoggedIn()) {
      navigate('/farmer/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authService.login(formData);
      const { token, farmer } = response.data;

      // Normalise farmer object keys (backend returns snake_case sometimes)
      const normalised = {
        id: farmer.id,
        fullName: farmer.fullName || farmer.full_name,
        phoneNumber: farmer.phoneNumber || farmer.phone_number,
        district: farmer.district,
      };

      saveSession(token, normalised);
      navigate('/farmer/dashboard', { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      const msg = err.response?.data?.error;
      const status = err.response?.status;
      const targetUrl = (err.config?.baseURL || '') + (err.config?.url || '');
      if (msg === 'Invalid credentials') {
        setError(t('auth.invalidCredentials'));
      } else {
        setError(msg || `${err.message || 'Request failed'} (URL: ${targetUrl || 'unknown'}, Status: ${status || 'Network Error'})`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
          <LanguageSelector variant="light" />
        </div>

        <div style={styles.header}>
          <span style={styles.logo}>🌾</span>
          <h1 style={styles.title}>{t('auth.loginTitle')}</h1>
          <p style={styles.subtitle}>{t('auth.loginSubtitle')}</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>{t('auth.phoneNumber')}</label>
            <input
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              style={styles.input}
              placeholder={t('auth.phonePlaceholder')}
              maxLength="10"
              required
            />
          </div>

          <div style={styles.formGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ ...styles.label, marginBottom: 0 }}>{t('auth.password')}</label>
              <Link 
                to="/forgot-password?role=farmer" 
                style={{ color: '#2e7d32', fontSize: '12px', fontWeight: 'bold', textDecoration: 'none' }}
              >
                {t('forgotPassword.title')}?
              </Link>
            </div>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              style={styles.input}
              placeholder={t('auth.passwordPlaceholder')}
              required
            />
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? t('auth.loggingIn') : t('auth.loginBtn')}
          </button>
        </form>

        <p style={styles.footer}>
          {t('auth.newFarmer')}{' '}
          <Link to="/register" style={{ color: '#667eea', fontWeight: 'bold' }}>
            {t('auth.registerHere')}
          </Link>
        </p>

        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #eee', textAlign: 'center' }}>
          <Link to="/admin/login" style={{ color: '#1976d2', fontWeight: 'bold', fontSize: '13px', textDecoration: 'none' }}>
            🛡️ Access Mandi Officer / Admin Portal →
          </Link>
        </div>
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
  },
  card: {
    background: 'white',
    padding: '40px',
    borderRadius: '15px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    width: '400px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  logo: {
    fontSize: '50px',
  },
  title: {
    margin: '10px 0 5px',
    color: '#333',
    fontSize: '28px',
  },
  subtitle: {
    color: '#666',
    margin: '0',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#555',
    fontWeight: '600',
  },
  input: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '16px',
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
    marginTop: '10px',
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

export default Login;