import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

const TrackBooking = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { t, tCrop, tStatus } = useLanguage();
  const [booking, setBooking] = useState(null);
  const [procurementStatus, setProcurementStatus] = useState({
    currentStage: 'BOOKED',
    stages: [
      { key: 'BOOKED', icon: '📅', completed: true },
      { key: 'CHECKED_IN', icon: '✅', completed: false },
      { key: 'WEIGHING', icon: '⚖️', completed: false },
      { key: 'QUALITY_CHECK', icon: '🔍', completed: false },
      { key: 'BILL_GENERATED', icon: '📄', completed: false },
      { key: 'PAYMENT_INITIATED', icon: '💰', completed: false },
      { key: 'PAYMENT_CREDITED', icon: '🏦', completed: false },
    ]
  });

  useEffect(() => {
    // Demo data - actual API se fetch karna hoga
    const demoBooking = {
      id: bookingId,
      tokenNumber: `KISAN-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-001`,
      cropName: 'Wheat',
      quantity: '5.5',
      centreName: 'Mandi Samiti Ludhiana',
      bookingDate: new Date().toISOString().slice(0,10),
      slotTime: '10:00',
      status: 'IN_PROGRESS',
      queuePosition: 3,
      estimatedWait: 25,
    };
    setBooking(demoBooking);
  }, [bookingId]);

  const updateStage = (stageKey) => {
    setProcurementStatus(prev => {
      const stages = prev.stages.map(stage => ({
        ...stage,
        completed: stage.key === stageKey ? true : stage.completed
      }));
      return { ...prev, currentStage: stageKey, stages };
    });
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button onClick={() => navigate('/farmer/dashboard')} style={styles.backBtn}>
            {t('common.backToDashboard')}
          </button>
          <h1 style={styles.title}>{t('trackBooking.title')}</h1>
        </div>
        <LanguageSelector variant="light" />
      </div>

      {booking && (
        <>
          {/* Booking Info Card */}
          <div style={styles.infoCard}>
            <div style={styles.tokenSection}>
              <p style={styles.tokenLabel}>{t('trackBooking.tokenNumber')}</p>
              <h2 style={styles.tokenNumber}>{booking.tokenNumber}</h2>
            </div>
            <div style={styles.detailsGrid}>
              <div style={styles.detailItem}>
                <span>{t('trackBooking.crop')}</span>
                <strong>{tCrop(booking.cropName)}</strong>
              </div>
              <div style={styles.detailItem}>
                <span>{t('trackBooking.quantity')}</span>
                <strong>{booking.quantity} {t('common.quintals')}</strong>
              </div>
              <div style={styles.detailItem}>
                <span>{t('trackBooking.centre')}</span>
                <strong>{booking.centreName}</strong>
              </div>
              <div style={styles.detailItem}>
                <span>{t('trackBooking.dateTime')}</span>
                <strong>{booking.bookingDate} at {booking.slotTime}</strong>
              </div>
            </div>
          </div>

          {/* Queue Status */}
          <div style={styles.queueCard}>
            <h3>{t('trackBooking.queueStatusTitle')}</h3>
            <div style={styles.queueInfo}>
              <div>
                <p>{t('trackBooking.yourPosition')}</p>
                <h2>#{booking.queuePosition}</h2>
              </div>
              <div>
                <p>{t('trackBooking.estimatedWait')}</p>
                <h2>{booking.estimatedWait} {t('common.mins')}</h2>
              </div>
              <div>
                <p>{t('trackBooking.currentStatus')}</p>
                <h2 style={{color: '#ff9800'}}>{tStatus(booking.status)}</h2>
              </div>
            </div>
          </div>

          {/* Progress Timeline */}
          <div style={styles.timelineCard}>
            <h3>{t('trackBooking.procurementStatusTitle')}</h3>
            <div style={styles.timeline}>
              {procurementStatus.stages.map((stage, index) => (
                <div key={stage.key} style={styles.timelineItem}>
                  <div style={{
                    ...styles.timelineIcon,
                    background: stage.completed ? '#4caf50' : '#e0e0e0',
                    color: stage.completed ? 'white' : '#999',
                  }}>
                    {stage.completed ? '✓' : index + 1}
                  </div>
                  <div style={styles.timelineContent}>
                    <p style={{
                      ...styles.timelineLabel,
                      color: stage.completed ? '#333' : '#999',
                      fontWeight: stage.completed ? 'bold' : 'normal',
                    }}>
                      {stage.icon} {t(`trackBooking.stages.${stage.key}`)}
                    </p>
                    {stage.completed && <p style={styles.completedText}>✅ {t('trackBooking.completed')}</p>}
                  </div>
                  {index < procurementStatus.stages.length - 1 && (
                    <div style={{
                      ...styles.timelineLine,
                      background: stage.completed ? '#4caf50' : '#e0e0e0',
                    }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Demo Controls - Staff ke liye (Remove in production) */}
          <div style={styles.demoControls}>
            <h3>{t('trackBooking.demoTitle')}</h3>
            <p>{t('trackBooking.demoSubtitle')}</p>
            <div style={styles.buttonGroup}>
              <button onClick={() => updateStage('CHECKED_IN')} style={styles.demoBtn}>
                {t('trackBooking.demoButtons.CHECKED_IN')}
              </button>
              <button onClick={() => updateStage('WEIGHING')} style={styles.demoBtn}>
                {t('trackBooking.demoButtons.WEIGHING')}
              </button>
              <button onClick={() => updateStage('QUALITY_CHECK')} style={styles.demoBtn}>
                {t('trackBooking.demoButtons.QUALITY_CHECK')}
              </button>
              <button onClick={() => updateStage('BILL_GENERATED')} style={styles.demoBtn}>
                {t('trackBooking.demoButtons.BILL_GENERATED')}
              </button>
              <button onClick={() => updateStage('PAYMENT_INITIATED')} style={styles.demoBtn}>
                {t('trackBooking.demoButtons.PAYMENT_INITIATED')}
              </button>
              <button onClick={() => updateStage('PAYMENT_CREDITED')} style={styles.demoBtn}>
                {t('trackBooking.demoButtons.PAYMENT_CREDITED')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f5f5f5',
    padding: '20px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '20px',
  },
  backBtn: {
    padding: '10px 20px',
    background: 'white',
    border: '1px solid #ddd',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  title: {
    margin: 0,
    color: '#333',
  },
  infoCard: {
    background: 'white',
    padding: '30px',
    borderRadius: '15px',
    marginBottom: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  tokenSection: {
    textAlign: 'center',
    marginBottom: '20px',
    padding: '20px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '10px',
    color: 'white',
  },
  tokenLabel: {
    margin: 0,
    fontSize: '14px',
    opacity: 0.9,
  },
  tokenNumber: {
    margin: '10px 0 0',
    fontSize: '32px',
    letterSpacing: '2px',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '15px',
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  queueCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '15px',
    marginBottom: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  queueInfo: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    textAlign: 'center',
    marginTop: '15px',
  },
  timelineCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '15px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  timeline: {
    marginTop: '20px',
  },
  timelineItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '15px',
    position: 'relative',
    paddingBottom: '20px',
  },
  timelineIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    zIndex: 1,
  },
  timelineContent: {
    flex: 1,
    paddingTop: '8px',
  },
  timelineLabel: {
    margin: 0,
    fontSize: '16px',
  },
  completedText: {
    margin: '5px 0 0',
    fontSize: '12px',
    color: '#4caf50',
  },
  timelineLine: {
    position: 'absolute',
    left: '20px',
    top: '40px',
    bottom: '0',
    width: '2px',
  },
  demoControls: {
    background: '#fff3e0',
    padding: '20px',
    borderRadius: '15px',
    marginTop: '20px',
    border: '2px dashed #ff9800',
  },
  buttonGroup: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
    marginTop: '15px',
  },
  demoBtn: {
    padding: '12px',
    background: 'white',
    border: '1px solid #ff9800',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
  },
};

export default TrackBooking;