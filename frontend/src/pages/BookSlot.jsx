import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingService } from '../services/api';
import { getSession } from '../services/auth';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import { formatAppDate, formatAppDateWithDay, formatAppTime, getRelativeDateLabel } from '../utils/dateFormatter';

const BookSlot = () => {
  const navigate = useNavigate();
  const { t, tCrop } = useLanguage();
  const [centres, setCentres] = useState([]);
  const [crops] = useState([
    { id: 1, name: 'Wheat', msp: 2275 },
    { id: 2, name: 'Paddy', msp: 2183 },
    { id: 3, name: 'Cotton', msp: 7020 },
  ]);

  // Compute helper dates
  const getDateOffset = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const quickDates = [
    { label: 'Tomorrow (1 Day After)', sub: formatAppDate(getDateOffset(1)), value: getDateOffset(1) },
    { label: 'In 2 Days (2 Days After)', sub: formatAppDate(getDateOffset(2)), value: getDateOffset(2) },
    { label: 'In 3 Days', sub: formatAppDate(getDateOffset(3)), value: getDateOffset(3) },
  ];

  const [formData, setFormData] = useState({
    centreId: '',
    cropId: '',
    bookingDate: quickDates[0].value, // Default to Tomorrow
    slotTime: '',
    quantity: '',
  });

  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);

  useEffect(() => {
    fetchCentres();
  }, []);

  const fetchCentres = async () => {
    try {
      const response = await bookingService.getCentres();
      const list = response.data.centres || [];
      setCentres(list);
      if (list.length > 0 && !formData.centreId) {
        setFormData((prev) => ({ ...prev, centreId: list[0].id.toString() }));
        fetchSlots(list[0].id, formData.bookingDate || quickDates[0].value);
      }
    } catch (error) {
      console.error('Failed to fetch centres:', error);
    }
  };

  const fetchSlots = async (centreId, date) => {
    if (!centreId || !date) return;
    try {
      const response = await bookingService.getSlots(centreId, date);
      setSlots(response.data.slots || []);
    } catch (error) {
      console.error('Failed to fetch slots:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'centreId' || name === 'bookingDate') {
      fetchSlots(
        name === 'centreId' ? value : formData.centreId,
        name === 'bookingDate' ? value : formData.bookingDate
      );
    }
  };

  const handleSelectQuickDate = (dateVal) => {
    setFormData((prev) => ({ ...prev, bookingDate: dateVal, slotTime: '' }));
    if (formData.centreId) {
      fetchSlots(formData.centreId, dateVal);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const session = getSession();
      if (!session) {
        navigate('/login', { replace: true });
        return;
      }

      const response = await bookingService.createBooking({
        farmerId: session.farmer.id,
        ...formData,
      });

      setBookingSuccess(response.data);
    } catch (error) {
      console.error('Booking error:', error);
      const errMsg = error.response?.data?.error || error.message || 'Booking failed. Please try again.';
      alert(`❌ Booking failed: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const minDate = getDateOffset(1);

  if (bookingSuccess) {
    const bookingDateFormatted = formatAppDateWithDay(formData.bookingDate);
    const relativeLabel = getRelativeDateLabel(formData.bookingDate);
    const timeFormatted = formatAppTime(formData.slotTime);

    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
            <LanguageSelector variant="light" />
          </div>

          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '60px' }}>🎉</span>
            <h2 style={{ color: '#2e7d32', margin: '10px 0 5px' }}>{t('bookSlot.successTitle')}</h2>
            <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
              {t('bookSlot.successSubtitle')}
            </p>
          </div>

          <div style={styles.tokenBox}>
            <div style={{ fontSize: '13px', color: '#667eea', fontWeight: 'bold' }}>{t('bookSlot.tokenNumber')}</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a237e', margin: '6px 0' }}>
              {bookingSuccess.tokenNumber}
            </div>

            {/* Scheduled Date & Time Details */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '10px 14px',
              margin: '12px 0',
              fontSize: '14px',
              color: '#334155',
            }}>
              <div style={{ fontWeight: 'bold', color: '#0f172a' }}>
                📅 Scheduled: {bookingDateFormatted} • {timeFormatted}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                {relativeLabel ? `(${relativeLabel})` : ''} • Notification & Reminder Active
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '12px' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#777' }}>{t('bookSlot.queuePosition')}</span>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#d84315' }}>
                  #{bookingSuccess.queuePosition || 1}
                </div>
              </div>
              <div style={{ borderLeft: '1px solid #ddd', paddingLeft: '20px' }}>
                <span style={{ fontSize: '12px', color: '#777' }}>{t('bookSlot.estimatedWait')}</span>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0277bd' }}>
                  ~{bookingSuccess.estimatedWaitMinutes || 10} {t('common.mins')}
                </div>
              </div>
            </div>
          </div>

          {/* Twilio SMS Notification Banner */}
          <div style={styles.smsBox}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>📱</span>
                <strong style={{ color: '#1565c0', fontSize: '14px' }}>
                  Twilio SMS Dispatched to {bookingSuccess.smsPhone ? `+91 ${bookingSuccess.smsPhone}` : 'Registered Mobile'}
                </strong>
              </div>
              <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0284c7', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                30-Min Reminder Scheduled
              </span>
            </div>
            <pre style={styles.smsPreview}>
              {`🌾 KisanFlow Alert: Namaste ${getSession()?.farmer?.fullName || 'Kisan'} ji!\n` +
               `📌 Token: ${bookingSuccess.tokenNumber}\n` +
               `🔢 Queue Position: #${bookingSuccess.queuePosition || 1}\n` +
               `📅 Date: ${bookingDateFormatted} (${timeFormatted})\n` +
               `🏢 Mandi: ${centres.find(c => c.id === parseInt(formData.centreId))?.name || 'Mandi Centre'}\n` +
               `⏱️ Waiting: ~${bookingSuccess.estimatedWaitMinutes || 10} Mins`}
            </pre>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <a
                href={`https://wa.me/91${bookingSuccess.smsPhone || ''}?text=${encodeURIComponent(`🌾 KisanFlow Token: ${bookingSuccess.tokenNumber} | Date: ${bookingDateFormatted} (${timeFormatted}) | Queue #${bookingSuccess.queuePosition || 1}`)}`}
                target="_blank"
                rel="noreferrer"
                style={styles.whatsappBtn}
              >
                {t('bookSlot.openWhatsApp')}
              </a>
              <a
                href={`sms:+91${bookingSuccess.smsPhone || ''}?body=${encodeURIComponent(`KisanFlow Token ${bookingSuccess.tokenNumber} Date ${bookingDateFormatted}`)}`}
                style={styles.phoneSmsBtn}
              >
                {t('bookSlot.openSms')}
              </a>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              onClick={() => navigate(`/farmer/track/${bookingSuccess.booking?.id}`)}
              style={styles.trackBtn}
            >
              {t('bookSlot.liveTrackQueue')}
            </button>
            <button
              onClick={() => navigate('/farmer/dashboard')}
              style={styles.dashboardBtn}
            >
              {t('bookSlot.backToDashboard')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <button onClick={() => navigate('/farmer/dashboard')} style={styles.backBtn}>
            {t('common.backToDashboard')}
          </button>
          <LanguageSelector variant="light" />
        </div>

        <h1 style={styles.title}>{t('bookSlot.title')}</h1>

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>{t('bookSlot.selectCentre')}</label>
            <select
              name="centreId"
              value={formData.centreId}
              onChange={handleChange}
              style={styles.input}
              required
            >
              <option value="">{t('bookSlot.selectCentrePlaceholder')}</option>
              {centres.map((centre) => (
                <option key={centre.id} value={centre.id}>
                  {centre.name} - {centre.district}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>{t('bookSlot.selectCrop')}</label>
            <select
              name="cropId"
              value={formData.cropId}
              onChange={handleChange}
              style={styles.input}
              required
            >
              <option value="">{t('bookSlot.selectCropPlaceholder')}</option>
              {crops.map((crop) => (
                <option key={crop.id} value={crop.id}>
                  {tCrop(crop.name)} ({t('bookSlot.mspPrefix', { msp: crop.msp })})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Date Selection Chips (1 Day After / 2 Days After / 3 Days) */}
          <div style={styles.formGroup}>
            <label style={styles.label}>📅 {t('bookSlot.selectDate')} (Realistic Slot Scheduling):</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '10px' }}>
              {quickDates.map((qd) => {
                const isSelected = formData.bookingDate === qd.value;
                return (
                  <button
                    key={qd.value}
                    type="button"
                    onClick={() => handleSelectQuickDate(qd.value)}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #667eea' : '1px solid #cbd5e1',
                      background: isSelected ? '#ede9fe' : '#f8fafc',
                      color: isSelected ? '#4338ca' : '#334155',
                      fontWeight: isSelected ? 'bold' : '500',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontSize: '13px' }}>{qd.label}</div>
                    <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>{qd.sub}</div>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Or select calendar date:</span>
              <input
                type="date"
                name="bookingDate"
                value={formData.bookingDate}
                onChange={handleChange}
                min={minDate}
                style={{ ...styles.input, padding: '8px 12px', width: 'auto', flex: 1 }}
                required
              />
            </div>
          </div>

          {slots.length > 0 && (
            <div style={styles.formGroup}>
              <label style={styles.label}>⏱️ {t('bookSlot.availableSlots')} ({formatAppDate(formData.bookingDate)}):</label>
              <div style={styles.slotGrid}>
                {slots.map((slot) => {
                  const isSelected = formData.slotTime === slot.time;
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, slotTime: slot.time }))}
                      style={{
                        ...styles.slotBtn,
                        background: isSelected ? '#667eea' : '#ffffff',
                        color: isSelected ? 'white' : '#1e293b',
                        cursor: slot.isAvailable ? 'pointer' : 'not-allowed',
                        opacity: slot.isAvailable ? 1 : 0.45,
                        border: isSelected ? '2px solid #667eea' : '1px solid #cbd5e1',
                        fontWeight: isSelected ? 'bold' : '600',
                        boxShadow: isSelected ? '0 4px 10px rgba(102, 126, 234, 0.3)' : 'none',
                      }}
                      disabled={!slot.isAvailable}
                    >
                      {formatAppTime(slot.time)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={styles.formGroup}>
            <label style={styles.label}>{t('bookSlot.quantityLabel')}</label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              style={styles.input}
              min="1"
              max="100"
              placeholder={t('bookSlot.quantityPlaceholder')}
              required
            />
          </div>

          <button type="submit" style={styles.submitBtn} disabled={loading || !formData.slotTime || !formData.bookingDate}>
            {loading ? t('bookSlot.submittingBtn') : t('bookSlot.submitBtn')}
          </button>
        </form>
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
    padding: '35px',
    borderRadius: '16px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    width: '540px',
    maxWidth: '100%',
    boxSizing: 'border-box',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#667eea',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 'bold',
    marginBottom: '15px',
    padding: 0,
  },
  title: {
    textAlign: 'center',
    color: '#333',
    marginBottom: '25px',
    fontSize: '24px',
  },
  formGroup: {
    marginBottom: '18px',
  },
  label: {
    display: 'block',
    marginBottom: '7px',
    color: '#444',
    fontWeight: '600',
    fontSize: '14px',
  },
  input: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    fontSize: '15px',
    boxSizing: 'border-box',
  },
  slotGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
  },
  slotBtn: {
    padding: '10px 6px',
    borderRadius: '8px',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '15px',
  },
  tokenBox: {
    background: '#eef2ff',
    border: '2px dashed #667eea',
    borderRadius: '12px',
    padding: '18px',
    textAlign: 'center',
    marginBottom: '18px',
  },
  smsBox: {
    background: '#f0f9ff',
    border: '1px solid #b9e6fe',
    borderRadius: '10px',
    padding: '14px',
    marginBottom: '18px',
  },
  smsPreview: {
    background: 'white',
    border: '1px solid #e0f2fe',
    borderRadius: '6px',
    padding: '10px',
    fontSize: '13px',
    color: '#333',
    whiteSpace: 'pre-wrap',
    fontFamily: 'inherit',
    margin: 0,
    lineHeight: '1.4',
  },
  whatsappBtn: {
    flex: 1,
    padding: '8px 12px',
    background: '#25D366',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: '13px',
    display: 'inline-block',
  },
  phoneSmsBtn: {
    flex: 1,
    padding: '8px 12px',
    background: '#0284c7',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: '13px',
    display: 'inline-block',
  },
  trackBtn: {
    flex: 1,
    padding: '12px',
    background: '#2e7d32',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '14px',
    cursor: 'pointer',
  },
  dashboardBtn: {
    flex: 1,
    padding: '12px',
    background: '#4b5563',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '14px',
    cursor: 'pointer',
  },
};

export default BookSlot;