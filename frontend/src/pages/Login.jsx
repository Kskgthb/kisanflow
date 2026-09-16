import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
import { saveSession, isLoggedIn } from '../services/auth';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

const Login = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [loginMethod, setLoginMethod] = useState('PASSWORD'); // 'PASSWORD' | 'OTP'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('PHONE'); // 'PHONE' | 'OTP'
  const [testOtp, setTestOtp] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, skip the login page
  useEffect(() => {
    if (isLoggedIn()) {
      navigate('/farmer/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleCombinedLogin = async (e) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length < 10) {
      setError('Please enter a valid 10-digit mobile phone number.');
      return;
    }
    if (!password) {
      setError('Please enter your account password.');
      return;
    }
    if (!otp) {
      setError('Please enter the 6-digit OTP code (Click "Request OTP" or use demo OTP 123456).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authService.login({
        phoneNumber,
        password,
        otp,
      });
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
      console.error('2FA Login error:', err);
      setError(err.response?.data?.error || 'Invalid credentials or OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length < 10) {
      setError('Please enter a valid 10-digit mobile phone number first.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const response = await authService.requestLoginOtp({
        phoneNumber,
        userType: 'FARMER',
      });
      if (response.data.success) {
        setTestOtp(response.data.testOtp || '123456');
        setSuccessMsg(`OTP sent to ${phoneNumber}. Demo OTP: ${response.data.testOtp || '123456'}`);
      }
    } catch (err) {
      console.error('Send OTP error:', err);
      setError(err.response?.data?.error || 'Failed to send OTP. Make sure your phone number is registered.');
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
          <p style={styles.subtitle}>West Bengal Farmer Portal • Mandatory 2FA Login</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {successMsg && <div style={styles.success}>{successMsg}</div>}

        <form onSubmit={handleCombinedLogin}>
          {/* Field 1: Mobile Phone Number */}
          <div style={styles.formGroup}>
            <label style={styles.label}>{t('auth.phoneNumber')} *</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              style={styles.input}
              placeholder={t('auth.phonePlaceholder')}
              maxLength="10"
              required
            />
          </div>

          {/* Field 2: Password */}
          <div style={styles.formGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ ...styles.label, marginBottom: 0 }}>{t('auth.password')} *</label>
              <Link to="/forgot-password" style={{ fontSize: '12px', color: '#667eea', fontWeight: 'bold', textDecoration: 'none' }}>
                🔑 Forgot Password?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder={t('auth.passwordPlaceholder')}
              required
            />
          </div>

          {/* Field 3: Mandatory OTP Verification */}
          <div style={{ background: '#f0fdf4', padding: '14px', borderRadius: '10px', border: '1px solid #bbf7d0', marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ ...styles.label, marginBottom: 0, color: '#166534' }}>Mobile OTP Verification *</label>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loading || !phoneNumber || phoneNumber.length < 10}
                style={{
                  padding: '6px 12px',
                  background: '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  opacity: (!phoneNumber || phoneNumber.length < 10) ? 0.6 : 1,
                }}
              >
                📲 Request OTP
              </button>
            </div>

            {testOtp && (
              <div style={{ ...styles.demoBox, margin: '8px 0' }}>
                <strong>🔑 Verification OTP:</strong> Code: <code style={styles.code}>{testOtp}</code> or <code style={styles.code}>123456</code>
              </div>
            )}

            <div style={{ marginTop: '8px' }}>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                style={{ ...styles.input, textAlign: 'center', fontSize: '18px', letterSpacing: '3px' }}
                placeholder="Enter 6-Digit OTP"
                maxLength="6"
                required
              />
            </div>
          </div>

          {/* Final Combined Submit Button */}
          <button
            type="submit"
            style={{ ...styles.button, background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', marginTop: '5px' }}
            disabled={loading || !phoneNumber || !password || !otp}
          >
            {loading ? 'Authenticating 2FA...' : '🔒 Verify Password & OTP to Login'}
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
  tabContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    background: '#f8fafc',
    padding: '4px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
  },
  tabBtn: {
    flex: 1,
    padding: '10px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s',
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
  success: {
    background: '#e8f5e9',
    color: '#2e7d32',
    padding: '10px',
    borderRadius: '5px',
    marginBottom: '20px',
    textAlign: 'center',
    fontSize: '14px',
  },
  demoBox: {
    background: '#f0f4f8',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #d9e2ec',
    marginBottom: '16px',
    fontSize: '13px',
    color: '#334e68',
  },
  code: {
    background: '#e2e8f0',
    padding: '2px 6px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: '#102a43',
  },
  backBtn: {
    width: '100%',
    padding: '10px',
    background: 'none',
    border: 'none',
    color: '#666',
    cursor: 'pointer',
    marginTop: '10px',
    fontSize: '13px',
  },
  footer: {
    textAlign: 'center',
    marginTop: '20px',
    color: '#666',
  },
};

export default Login;