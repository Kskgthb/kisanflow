import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { bookingService } from '../services/api';
import { getSession, clearSession, getAdminSession } from '../services/auth';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import { formatAppDateWithDay, formatAppTime, getRelativeDateLabel, isSlotApproaching30Min } from '../utils/dateFormatter';

const FarmerDashboard = () => {
  const navigate = useNavigate();
  const { t, tCrop, tStatus } = useLanguage();
  const [farmer, setFarmer] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  const location = useLocation();

  useEffect(() => {
    const session = getSession();
    if (!session) {
      navigate('/login', { replace: true });
      return;
    }
    setFarmer(session.farmer);
    setLoading(true);
    fetchBookings(session.farmer.id);

    // Silent background poll every 4 seconds for instant live updates
    const interval = setInterval(() => {
      fetchBookings(session.farmer.id, true);
    }, 4000);

    return () => clearInterval(interval);
  }, [navigate, location.key]);


  const handleAdminSwitch = () => {
    const adminSess = getAdminSession();
    if (adminSess) {
      navigate('/admin/dashboard');
    } else {
      navigate('/admin/login');
    }
  };

  const fetchBookings = async (farmerId, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await bookingService.getFarmerBookings(farmerId);
      setBookings(response.data.bookings || []);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };


  const handleLogout = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'BOOKED':
        return { background: '#fff3e0', color: '#e65100' };
      case 'COMPLETED':
        return { background: '#e8f5e9', color: '#2e7d32' };
      case 'CANCELLED':
        return { background: '#ffebee', color: '#c62828' };
      case 'CHECKED_IN':
        return { background: '#e3f2fd', color: '#1565c0' };
      case 'WEIGHING':
        return { background: '#e0f7fa', color: '#00838f' };
      case 'QUALITY_CHECK':
        return { background: '#f3e5f5', color: '#7b1fa2' };
      case 'BILL_GENERATED':
        return { background: '#e8eaf6', color: '#283593' };
      case 'PAYMENT_INITIATED':
        return { background: '#fff8e1', color: '#f57f17' };
      default:
        return { background: '#f5f5f5', color: '#666' };
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.logo}>🌾 {t('common.appName')}</h1>
        <div style={styles.headerRight}>
          <LanguageSelector variant="light" />
          <span style={styles.welcome}>
            {t('common.welcome', { name: farmer?.fullName || 'Kisan' })}
          </span>

          {/* Three Dots Menu Button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '50%',
                color: '#333',
                lineHeight: 1,
              }}
              title="Menu options"
            >
              ⋮
            </button>

            {showMenu && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '40px',
                  background: 'white',
                  borderRadius: '10px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                  padding: '8px 0',
                  minWidth: '200px',
                  zIndex: 999,
                  border: '1px solid #e2e8f0',
                }}
              >
                <div
                  onClick={() => {
                    setShowMenu(false);
                    handleAdminSwitch();
                  }}
                  style={{
                    padding: '10px 16px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#1565c0',
                    fontWeight: '600',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#e3f2fd')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  🛡️ Mandi Admin Dashboard
                </div>

                <div style={{ height: '1px', background: '#edf2f7', margin: '4px 0' }} />

                <div
                  onClick={() => {
                    setShowMenu(false);
                    handleLogout();
                  }}
                  style={{
                    padding: '10px 16px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#c62828',
                    fontWeight: '600',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#ffebee')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  🚪 {t('common.logout')}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={styles.quickActions}>
        <button 
          onClick={() => navigate('/farmer/book-slot')} 
          style={styles.quickActionBtn}
        >
          {t('dashboard.bookNewSlot')}
        </button>
        <button 
          onClick={() => navigate('/farmer/payments')} 
          style={styles.quickActionBtn}
        >
          {t('dashboard.paymentHistory')}
        </button>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <h3>{t('dashboard.upcomingBookings')}</h3>
          <p style={styles.statNumber}>
            {bookings.filter(b => b.status !== 'COMPLETED' && b.status !== 'CANCELLED').length}
          </p>
        </div>
        <div style={styles.statCard}>
          <h3>{t('dashboard.completedBookings')}</h3>
          <p style={styles.statNumber}>
            {bookings.filter(b => b.status === 'COMPLETED').length}
          </p>
        </div>
        <div style={styles.statCard}>
          <h3>{t('dashboard.totalBookings')}</h3>
          <p style={styles.statNumber}>{bookings.length}</p>
        </div>
      </div>

      {/* Bookings List */}
      <div style={styles.bookingsSection}>
        <h2 style={styles.sectionTitle}>{t('dashboard.myBookings')}</h2>
        
        {loading ? (
          <div style={styles.loadingState}>
            <p>{t('dashboard.loadingBookings')}</p>
          </div>
        ) : bookings.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyIcon}>🚜</p>
            <p>{t('dashboard.noBookings')}</p>
            <button 
              onClick={() => navigate('/farmer/book-slot')} 
              style={styles.emptyBtn}
            >
              {t('dashboard.bookFirstSlot')}
            </button>
          </div>
        ) : (
          <div style={styles.bookingList}>
            {bookings.map((booking) => {
              const isApproaching = isSlotApproaching30Min(booking.booking_date, booking.slot_time) && booking.status !== 'COMPLETED';
              const relDate = getRelativeDateLabel(booking.booking_date);

              return (
                <div key={booking.id} style={styles.bookingCard}>
                  <div style={styles.bookingLeft}>
                    <div style={styles.cropIcon}>
                      🌾
                    </div>
                    <div style={styles.bookingInfo}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h4 style={{ ...styles.cropName, margin: 0 }}>
                          {tCrop(booking.crop_name)} - {booking.estimated_quantity_quintals} {t('common.quintals')}
                        </h4>
                        {isApproaching && (
                          <span style={{
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#1d4ed8',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            padding: '2px 8px',
                            borderRadius: '10px',
                          }}>
                            ⏰ 30-Min Alert Active
                          </span>
                        )}
                      </div>
                      <p style={styles.bookingDetail}>📍 {booking.centre_name}</p>
                      <p style={styles.bookingDetail}>
                        📅 {formatAppDateWithDay(booking.booking_date)} at {formatAppTime(booking.slot_time)} 
                        {relDate ? <span style={{ color: '#64748b', marginLeft: '6px' }}>({relDate})</span> : null}
                      </p>
                      <p style={styles.tokenText}>
                        🎫 {t('dashboard.tokenLabel')}: <strong>{booking.token_number}</strong>
                      </p>
                    </div>
                  </div>
                  
                  <div style={styles.bookingRight}>
                    <span style={{
                      ...styles.statusBadge,
                      ...getStatusStyle(booking.status)
                    }}>
                      {tStatus(booking.status)}
                    </span>
                    
                    <button 
                      onClick={() => navigate(`/farmer/track/${booking.id}`)}
                      style={styles.trackBtn}
                    >
                      {t('dashboard.trackStatus')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};


const styles = {
  container: {
    minHeight: '100vh',
    background: '#f5f5f5',
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    background: 'white',
    padding: '20px 30px',
    borderRadius: '15px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  logo: { 
    margin: 0, 
    color: '#333',
    fontSize: '24px',
  },
  headerRight: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '15px' 
  },
  welcome: { 
    color: '#666',
    fontSize: '16px',
  },
  logoutBtn: {
    padding: '10px 20px',
    background: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  quickActions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '15px',
    marginBottom: '20px',
  },
  quickActionBtn: {
    padding: '18px',
    background: 'white',
    border: '2px solid #667eea',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#667eea',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '15px',
    marginBottom: '20px',
  },
  statCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  statNumber: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#667eea',
    margin: '10px 0 0',
  },
  bookingsSection: {
    background: 'white',
    padding: '25px',
    borderRadius: '15px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    margin: '0 0 20px',
    color: '#333',
    fontSize: '22px',
  },
  bookingList: {
    display: 'grid',
    gap: '15px',
  },
  bookingCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    background: '#fafafa',
    borderRadius: '12px',
    border: '1px solid #e0e0e0',
    transition: 'all 0.3s',
    cursor: 'pointer',
  },
  bookingLeft: {
    display: 'flex',
    gap: '15px',
    alignItems: 'center',
  },
  cropIcon: {
    width: '50px',
    height: '50px',
    background: '#e8f5e9',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
  },
  bookingInfo: {},
  cropName: {
    margin: 0,
    color: '#333',
    fontSize: '16px',
  },
  bookingDetail: {
    margin: '5px 0 0',
    color: '#666',
    fontSize: '14px',
  },
  tokenText: {
    margin: '8px 0 0',
    color: '#666',
    fontSize: '13px',
  },
  bookingRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '10px',
  },
  statusBadge: {
    padding: '6px 15px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  trackBtn: {
    padding: '8px 16px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  loadingState: {
    textAlign: 'center',
    padding: '40px',
    color: '#999',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#999',
  },
  emptyIcon: {
    fontSize: '48px',
    margin: '0 0 10px',
  },
  emptyBtn: {
    marginTop: '15px',
    padding: '12px 24px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
};

export default FarmerDashboard;