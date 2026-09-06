import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService, bookingService } from '../services/api';
import { saveAdminSession } from '../services/auth';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

const AdminRegister = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    officerId: '',
    fullName: '',
    phoneNumber: '',
    email: '',
    centreId: '',
    designation: 'Mandi Procurement Officer',
    password: '',
  });
  const [centres, setCentres] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCentres = async () => {
      try {
        const res = await bookingService.getCentres();
        if (res.data?.centres) {
          setCentres(res.data.centres);
          if (res.data.centres.length > 0) {
            setFormData((prev) => ({ ...prev, centreId: res.data.centres[0].id }));
          }
        }
      } catch (err) {
        console.warn('Failed to load centres:', err.message);
      }
    };
    fetchCentres();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.adminRegister(formData);
      if (response.data.success) {
        saveAdminSession(response.data.token, response.data.admin);
        navigate('/admin/dashboard', { replace: true });
      }
    } catch (err) {
      console.error('Admin registration error:', err);
      setError(err.response?.data?.error || 'Registration failed. Please check your details.');
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
          <h1 style={styles.title}>{t('adminAuth.registerTitle')}</h1>
          <p style={styles.subtitle}>{t('adminAuth.registerSubtitle')}</p>
        </div>

        <div style={styles.langRow}>
          <LanguageSelector variant="light" />
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.grid2}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Officer ID / Badge *</label>
              <input
                type="text"
                value={formData.officerId}
                onChange={(e) => setFormData({ ...formData, officerId: e.target.value })}
                style={styles.input}
                placeholder="e.g. OFF-102"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{t('adminAuth.fullName')}</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                style={styles.input}
                placeholder="Officer Full Name"
                required
              />
            </div>
          </div>

          <div style={styles.grid2}>
            <div style={styles.formGroup}>
              <label style={styles.label}>{t('adminAuth.phoneNumber')}</label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                style={styles.input}
                placeholder="9876543210"
                maxLength="10"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{t('adminAuth.email')}</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={styles.input}
                placeholder="officer@mandi.gov.in"
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>{t('adminAuth.centre')}</label>
            <select
              value={formData.centreId}
              onChange={(e) => setFormData({ ...formData, centreId: e.target.value })}
              style={styles.select}
              required
            >
              {centres.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.district})
                </option>
              ))}
            </select>
          </div>

          <div style={styles.grid2}>
            <div style={styles.formGroup}>
              <label style={styles.label}>{t('adminAuth.designation')}</label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                style={styles.input}
                placeholder="e.g. Mandi Inspector"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{t('adminAuth.password')} *</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                style={styles.input}
                placeholder="Create password"
                required
              />
            </div>
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? t('adminAuth.registering') : t('adminAuth.registerBtn')}
          </button>
        </form>

        <div style={styles.footerLinks}>
          <p style={{ margin: '0 0 10px', fontSize: '14px', color: '#555' }}>
            {t('adminAuth.alreadyRegistered')}{' '}
            <Link to="/admin/login" style={{ color: '#1976d2', fontWeight: 'bold' }}>
              {t('adminAuth.loginHere')}
            </Link>
          </p>

          <div style={{ paddingTop: '12px', borderTop: '1px solid #e0e0e0', textAlign: 'center' }}>
            <Link 
              to="/register" 
              style={{ color: '#2e7d32', fontWeight: 'bold', fontSize: '13px', textDecoration: 'none' }}
            >
              👨‍🌾 Farmer Registration Portal →
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
    padding: '30px 20px',
    fontFamily: '"Segoe UI", Roboto, sans-serif',
  },
  card: {
    background: '#ffffff',
    padding: '36px',
    borderRadius: '16px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
    width: '100%',
    maxWidth: '560px',
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
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '12px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#37474f',
  },
  input: {
    padding: '11px 12px',
    border: '1px solid #cfd8dc',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
    padding: '11px 12px',
    border: '1px solid #cfd8dc',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    background: '#fafafa',
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
    marginTop: '10px',
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

export default AdminRegister;
