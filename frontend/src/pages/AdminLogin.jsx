import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
import { saveAdminSession } from '../services/auth';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [loginMethod, setLoginMethod] = useState('PASSWORD'); // 'PASSWORD' | 'OTP'
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('ID'); // 'ID' | 'OTP'
  const [testOtp, setTestOtp] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCombinedAdminLogin = async (e) => {
    e.preventDefault();
    if (!loginId) {
      setError('Please enter your Officer ID or registered Phone Number.');
      return;
    }
    if (!password) {
      setError('Please enter your official account password.');
      return;
    }
    if (!otp) {
      setError('Please enter the 6-digit OTP code (Click "Request OTP" or use demo OTP 123456).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authService.adminLogin({
        loginId,
        password,
        otp,
      });
      if (response.data.success) {
        saveAdminSession(response.data.token, response.data.admin);
        navigate('/admin/dashboard', { replace: true });
      }
    } catch (err) {
      console.error('Admin 2FA login error:', err);
      setError(err.response?.data?.error || 'Invalid Officer credentials or OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!loginId) {
      setError('Please enter your Officer ID or registered Phone Number first.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const response = await authService.requestLoginOtp({
        phoneNumber: loginId,
        userType: 'ADMIN',
      });
      if (response.data.success) {
        setTestOtp(response.data.testOtp || '123456');
        setSuccessMsg(`Officer OTP dispatched. Demo OTP: ${response.data.testOtp || '123456'}`);
      }
    } catch (err) {
      console.error('Admin OTP send error:', err);
      setError(err.response?.data?.error || 'Failed to send OTP. Make sure your Officer ID / Phone is registered.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoBadge}>
            <span style={{ fontSize: '32px' }}>🛡️</span>
          </div>
          <h1 style={styles.title}>{t('adminAuth.loginTitle')}</h1>
          <p style={styles.subtitle}>West Bengal Mandi Officer Portal • Mandatory 2FA Login</p>
        </div>

        <div style={styles.langRow}>
          <LanguageSelector variant="light" />
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {successMsg && <div style={styles.success}>{successMsg}</div>}

        <form onSubmit={handleCombinedAdminLogin} style={styles.form}>
          <div style={styles.demoBox}>
            <strong>🔑 Demo Officer Access:</strong>
            <div style={{ marginTop: '4px', fontSize: '13px' }}>
              Officer ID: <code style={styles.code}>OFF-101</code> &bull; Pass: <code style={styles.code}>admin123</code> &bull; OTP: <code style={styles.code}>123456</code>
            </div>
          </div>

          {/* Field 1: Officer ID / Mobile Phone */}
          <div style={styles.formGroup}>
            <label style={styles.label}>{t('adminAuth.officerId')} / Mobile Phone *</label>
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              style={styles.input}
              placeholder="OFF-101 or 9876543210"
              required
            />
          </div>

          {/* Field 2: Officer Password */}
          <div style={styles.formGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={styles.label}>{t('adminAuth.password')} *</label>
              <Link to="/forgot-password" style={{ fontSize: '12px', color: '#1976d2', fontWeight: 'bold', textDecoration: 'none' }}>
                🔑 Forgot Password?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="Enter official password"
              required
            />
          </div>

          {/* Field 3: Mandatory Officer OTP Verification */}
          <div style={{ background: '#f0f9ff', padding: '14px', borderRadius: '10px', border: '1px solid #bae6fd' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ ...styles.label, marginBottom: 0, color: '#0369a1' }}>Officer Mobile OTP Verification *</label>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loading || !loginId}
                style={{
                  padding: '6px 12px',
                  background: '#0284c7',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  opacity: !loginId ? 0.6 : 1,
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

          {/* Final Combined Officer Submit Button */}
          <button
            type="submit"
            style={{ ...styles.button, background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', marginTop: '6px' }}
            disabled={loading || !loginId || !password || !otp}
          >
            {loading ? 'Authenticating Officer 2FA...' : '🔒 Verify Password & OTP to Enter Desk'}
          </button>
        </form>

        <div style={styles.footerLinks}>
          <p style={{ margin: '0 0 10px', fontSize: '14px', color: '#555' }}>
            {t('adminAuth.newOfficer')}{' '}
            <Link to="/admin/register" style={{ color: '#1976d2', fontWeight: 'bold' }}>
              {t('adminAuth.registerHere')}
            </Link>
          </p>

          <div style={{ paddingTop: '12px', borderTop: '1px solid #e0e0e0', textAlign: 'center' }}>
            <Link 
              to="/login" 
              style={{ color: '#2e7d32', fontWeight: 'bold', fontSize: '13px', textDecoration: 'none' }}
            >
              👨‍🌾 {t('common.appName')} Farmer Portal →
            </Link>
          </div>
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
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    padding: '20px',
    fontFamily: '"Segoe UI", Roboto, sans-serif',
  },
  card: {
    background: '#ffffff',
    padding: '36px',
    borderRadius: '16px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
    width: '100%',
    maxWidth: '440px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '16px',
  },
  logoBadge: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    background: '#e3f2fd',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 12px',
  },
  title: {
    margin: '0 0 6px',
    color: '#1565c0',
    fontSize: '24px',
    fontWeight: '800',
  },
  subtitle: {
    margin: 0,
    color: '#607d8b',
    fontSize: '13px',
  },
  langRow: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  tabContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
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
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#37474f',
  },
  input: {
    padding: '12px',
    border: '1px solid #cfd8dc',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border 0.2s',
  },
  button: {
    padding: '14px',
    background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '6px',
    boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
  },
  error: {
    background: '#ffebee',
    color: '#c62828',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '14px',
    border: '1px solid #ffcdd2',
  },
  success: {
    background: '#e8f5e9',
    color: '#2e7d32',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '14px',
    border: '1px solid #c8e6c9',
  },
  backBtn: {
    width: '100%',
    padding: '10px',
    background: 'none',
    border: 'none',
    color: '#607d8b',
    cursor: 'pointer',
    marginTop: '4px',
    fontSize: '13px',
  },
  footerLinks: {
    marginTop: '20px',
    textAlign: 'center',
  },
};

export default AdminLogin;
