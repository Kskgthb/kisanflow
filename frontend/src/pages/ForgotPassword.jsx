import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authService } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();

  const initialRole = searchParams.get('role') === 'admin' ? 'ADMIN' : 'FARMER';
  const [userType, setUserType] = useState(initialRole); // 'FARMER' | 'ADMIN'
  const [step, setStep] = useState(1); // 1 = Enter Phone, 2 = Verify OTP & Set Password

  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [testOtp, setTestOtp] = useState('');
  const [accountName, setAccountName] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 1: Request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const response = await authService.requestResetOtp({
        phoneNumber,
        userType,
      });

      if (response.data.success) {
        setTestOtp(response.data.testOtp || '');
        setAccountName(response.data.userName || '');
        setStep(2);
      }
    } catch (err) {
      console.error('OTP request error:', err);
      setError(err.response?.data?.error || 'Failed to send OTP. Please check your phone number.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (newPassword !== confirmPassword) {
      setError(t('forgotPassword.passMismatch') || 'Passwords do not match!');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.resetPassword({
        phoneNumber,
        userType,
        otp,
        newPassword,
      });

      if (response.data.success) {
        setSuccessMsg(t('forgotPassword.success') || '🎉 Password reset successfully! Redirecting to login...');
        setTimeout(() => {
          if (userType === 'ADMIN') {
            navigate('/admin/login', { replace: true });
          } else {
            navigate('/login', { replace: true });
          }
        }, 2200);
      }
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err.response?.data?.error || 'Failed to reset password. Please check OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoBadge}>
            <span style={{ fontSize: '32px' }}>🔐</span>
          </div>
          <h1 style={styles.title}>{t('forgotPassword.title')}</h1>
          <p style={styles.subtitle}>{t('forgotPassword.subtitle')}</p>
        </div>

        <div style={styles.langRow}>
          <LanguageSelector variant="light" />
        </div>

        {/* Role Toggle Tabs */}
        {step === 1 && (
          <div style={styles.roleToggle}>
            <button
              type="button"
              onClick={() => setUserType('FARMER')}
              style={{
                ...styles.roleBtn,
                background: userType === 'FARMER' ? '#2e7d32' : 'transparent',
                color: userType === 'FARMER' ? '#fff' : '#666',
                fontWeight: userType === 'FARMER' ? 'bold' : 'normal',
              }}
            >
              {t('forgotPassword.farmerRole')}
            </button>
            <button
              type="button"
              onClick={() => setUserType('ADMIN')}
              style={{
                ...styles.roleBtn,
                background: userType === 'ADMIN' ? '#1565c0' : 'transparent',
                color: userType === 'ADMIN' ? '#fff' : '#666',
                fontWeight: userType === 'ADMIN' ? 'bold' : 'normal',
              }}
            >
              {t('forgotPassword.adminRole')}
            </button>
          </div>
        )}

        {error && <div style={styles.error}>{error}</div>}
        {successMsg && <div style={styles.success}>{successMsg}</div>}

        {/* Step 1 Form */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>{t('forgotPassword.phoneLabel')}</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                style={styles.input}
                placeholder={t('forgotPassword.phonePlaceholder')}
                maxLength="10"
                required
              />
            </div>

            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? t('forgotPassword.sendingOtp') : t('forgotPassword.sendOtpBtn')}
            </button>
          </form>
        )}

        {/* Step 2 Form */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} style={styles.form}>
            {accountName && (
              <div style={styles.accountNotice}>
                👤 Account: <strong>{accountName}</strong> ({phoneNumber})
              </div>
            )}

            {testOtp && (
              <div style={styles.demoOtpBox}>
                📲 {t('forgotPassword.testOtpNotice', { otp: testOtp })}
              </div>
            )}

            <div style={styles.formGroup}>
              <label style={styles.label}>{t('forgotPassword.otpLabel')}</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                style={styles.input}
                placeholder={t('forgotPassword.otpPlaceholder')}
                maxLength="6"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{t('forgotPassword.newPassLabel')}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={styles.input}
                placeholder={t('forgotPassword.newPassPlaceholder')}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{t('forgotPassword.confirmPassLabel')}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={styles.input}
                placeholder={t('forgotPassword.confirmPassPlaceholder')}
                required
              />
            </div>

            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? t('forgotPassword.resetting') : t('forgotPassword.resetBtn')}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              style={styles.backStepBtn}
            >
              ← Change Mobile Number
            </button>
          </form>
        )}

        <div style={styles.footerLinks}>
          <Link
            to={userType === 'ADMIN' ? '/admin/login' : '/login'}
            style={{ color: userType === 'ADMIN' ? '#1565c0' : '#2e7d32', fontWeight: 'bold', textDecoration: 'none', fontSize: '14px' }}
          >
            {t('forgotPassword.backToLogin')}
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
    background: 'linear-gradient(135deg, #2b5876 0%, #4e4376 100%)',
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
    background: '#f3e5f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 12px',
  },
  title: {
    margin: '0 0 6px',
    color: '#311b92',
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
  roleToggle: {
    display: 'flex',
    background: '#f0f4f8',
    borderRadius: '10px',
    padding: '4px',
    marginBottom: '18px',
    gap: '4px',
  },
  roleBtn: {
    flex: 1,
    padding: '10px 8px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  accountNotice: {
    background: '#f0fdf4',
    color: '#166534',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #bbf7d0',
    fontSize: '13px',
  },
  demoOtpBox: {
    background: '#eff6ff',
    color: '#1e40af',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #bfdbfe',
    fontSize: '13px',
    fontWeight: 'bold',
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
  },
  button: {
    padding: '14px',
    background: 'linear-gradient(135deg, #512da8 0%, #311b92 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '6px',
    boxShadow: '0 4px 12px rgba(81, 45, 168, 0.3)',
  },
  backStepBtn: {
    padding: '8px',
    background: 'transparent',
    color: '#607d8b',
    border: 'none',
    fontSize: '13px',
    cursor: 'pointer',
    textAlign: 'center',
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
    padding: '12px 14px',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '14px',
    border: '1px solid #a5d6a7',
    fontWeight: 'bold',
  },
  footerLinks: {
    marginTop: '20px',
    textAlign: 'center',
  },
};

export default ForgotPassword;
