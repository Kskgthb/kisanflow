import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
import { saveSession, isLoggedIn } from '../services/auth';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

const Register = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
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
      console.error('Register error:', err);
      const msg = err.response?.data?.error;
      const status = err.response?.status;
      const targetUrl = (err.config?.baseURL || '') + (err.config?.url || '');
      if (msg === 'Farmer already registered') {
        setError(t('auth.alreadyRegisteredErr'));
      } else {
        setError(msg || `${err.message || 'Registration failed'} (URL: ${targetUrl || 'unknown'}, Status: ${status || 'Network Error'})`);
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
          <h1 style={styles.title}>{t('auth.registerTitle')}</h1>
          <p style={styles.subtitle}>{t('auth.registerSubtitle')}</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.row}>
            <div style={styles.col}>
              <label style={styles.label}>{t('auth.fullName')}</label>
              <input type="text" name="fullName" onChange={handleChange} style={styles.input} required />
            </div>
            <div style={styles.col}>
              <label style={styles.label}>{t('auth.aadharNumber')}</label>
              <input type="text" name="aadharNumber" onChange={handleChange} style={styles.input} maxLength="12" required />
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.col}>
              <label style={styles.label}>{t('auth.phoneNumberReq')}</label>
              <input type="tel" name="phoneNumber" onChange={handleChange} style={styles.input} maxLength="10" required />
            </div>
            <div style={styles.col}>
              <label style={styles.label}>{t('auth.village')}</label>
              <input type="text" name="village" onChange={handleChange} style={styles.input} />
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.col}>
              <label style={styles.label}>{t('auth.district')}</label>
              <input type="text" name="district" onChange={handleChange} style={styles.input} />
            </div>
            <div style={styles.col}>
              <label style={styles.label}>{t('auth.state')}</label>
              <select name="state" value={formData.state} onChange={handleChange} style={styles.input}>
                <option value="Punjab">{t('auth.states.Punjab')}</option>
                <option value="Haryana">{t('auth.states.Haryana')}</option>
                <option value="UP">{t('auth.states.UP')}</option>
                <option value="MP">{t('auth.states.MP')}</option>
                <option value="WB">{t('auth.states.WB')}</option>
              </select>
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.col}>
              <label style={styles.label}>{t('auth.bankAccount')}</label>
              <input type="text" name="bankAccount" onChange={handleChange} style={styles.input} />
            </div>
            <div style={styles.col}>
              <label style={styles.label}>{t('auth.bankIfsc')}</label>
              <input type="text" name="bankIfsc" onChange={handleChange} style={styles.input} />
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.col}>
              <label style={styles.label}>{t('auth.landArea')}</label>
              <input type="number" name="landArea" onChange={handleChange} style={styles.input} step="0.1" />
            </div>
            <div style={styles.col}>
              <label style={styles.label}>{t('auth.passwordReq')}</label>
              <input type="password" name="password" onChange={handleChange} style={styles.input} required minLength="6" />
            </div>
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? t('auth.registering') : t('auth.registerBtn')}
          </button>
        </form>

        <p style={styles.footer}>
          {t('auth.alreadyRegistered')}{' '}
          <Link to="/login" style={{ color: '#667eea', fontWeight: 'bold' }}>
            {t('auth.loginHere')}
          </Link>
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