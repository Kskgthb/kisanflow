import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
import { saveSession, isLoggedIn } from '../services/auth';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

const Login = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [phoneNumber, setPhoneNumber] = useState('');
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

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length < 10) {
      setError('Please enter a valid 10-digit mobile phone number.');
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
        setStep('OTP');
        setTestOtp(response.data.testOtp || '123456');
        setSuccessMsg(`OTP sent to ${phoneNumber}.`);
      }
    } catch (err) {
      console.error('Send OTP error:', err);
      setError(err.response?.data?.error || 'Failed to send OTP. Make sure your phone number is registered.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) {
      setError('Please enter the OTP.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const response = await authService.verifyLoginOtp({
        phoneNumber,
        otp,
        userType: 'FARMER',
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
      console.error('Verify OTP error:', err);
      setError(err.response?.data?.error || 'Invalid OTP. Please try again.');
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
          <p style={styles.subtitle}>Mobile OTP Login</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {successMsg && <div style={styles.success}>{successMsg}</div>}

        {step === 'PHONE' ? (
          <form onSubmit={handleSendOtp}>
            <div style={styles.formGroup}>
              <label style={styles.label}>{t('auth.phoneNumber')}</label>
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

            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? 'Sending OTP...' : '📲 Send Mobile OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            {testOtp && (
              <div style={styles.demoBox}>
                <strong>🔑 Verification OTP:</strong>
                <div style={{ marginTop: '4px', fontSize: '13px' }}>
                  OTP Code: <code style={styles.code}>{testOtp}</code> or <code style={styles.code}>123456</code>
                </div>
              </div>
            )}

            <div style={styles.formGroup}>
              <label style={styles.label}>Enter 6-Digit OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                style={{ ...styles.input, textAlign: 'center', fontSize: '20px', letterSpacing: '4px' }}
                placeholder="123456"
                maxLength="6"
                required
              />
            </div>

            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? 'Verifying OTP...' : '✅ Verify OTP & Login'}
            </button>

            <button
              type="button"
              onClick={() => { setStep('PHONE'); setError(''); setSuccessMsg(''); }}
              style={styles.backBtn}
            >
              ← Change Mobile Number
            </button>
          </form>
        )}

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