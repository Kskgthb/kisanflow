import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
import { saveAdminSession } from '../services/auth';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    loginId: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.adminLogin(formData);
      if (response.data.success) {
        saveAdminSession(response.data.token, response.data.admin);
        navigate('/admin/dashboard', { replace: true });
      }
    } catch (err) {
      console.error('Admin login error:', err);
      setError(
        err.response?.data?.error || 
        t('adminAuth.invalidCredentials') ||
        'Invalid Officer ID or Password. Demo Officer ID: OFF-101 / Pass: admin123'
      );
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
          <p style={styles.subtitle}>{t('adminAuth.loginSubtitle')}</p>
        </div>

        <div style={styles.langRow}>
          <LanguageSelector variant="light" />
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {/* Demo Credentials Box for easy evaluation */}
        <div style={styles.demoBox}>
          <strong>🔑 Demo Officer Credentials:</strong>
          <div style={{ marginTop: '4px', fontSize: '13px' }}>
            Officer ID: <code style={styles.code}>OFF-101</code> &bull; Password: <code style={styles.code}>admin123</code>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>{t('adminAuth.officerId')}</label>
            <input
              type="text"
              value={formData.loginId}
              onChange={(e) => setFormData({ ...formData, loginId: e.target.value })}
              style={styles.input}
              placeholder={t('adminAuth.officerIdPlaceholder')}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ ...styles.label, marginBottom: 0 }}>{t('adminAuth.password')}</label>
              <Link 
                to="/forgot-password?role=admin" 
                style={{ color: '#1976d2', fontSize: '12px', fontWeight: 'bold', textDecoration: 'none' }}
              >
                {t('forgotPassword.title')}?
              </Link>
            </div>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              style={styles.input}
              placeholder={t('adminAuth.passwordPlaceholder')}
              required
            />
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? t('adminAuth.loggingIn') : t('adminAuth.loginBtn')}
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
  footerLinks: {
    marginTop: '20px',
    textAlign: 'center',
  },
};

export default AdminLogin;
