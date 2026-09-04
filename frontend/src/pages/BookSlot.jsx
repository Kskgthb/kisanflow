import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingService } from '../services/api';
import { getSession } from '../services/auth';

const BookSlot = () => {
  const navigate = useNavigate();
  const [centres, setCentres] = useState([]);
  const [crops] = useState([
    { id: 1, name: 'Wheat', msp: 2275 },
    { id: 2, name: 'Paddy', msp: 2183 },
    { id: 3, name: 'Cotton', msp: 7020 },
  ]);
  const [formData, setFormData] = useState({
    centreId: '',
    cropId: '',
    bookingDate: '',
    slotTime: '',
    quantity: '',
  });
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCentres();
  }, []);

  const fetchCentres = async () => {
    try {
      const response = await bookingService.getCentres();
      setCentres(response.data.centres);
    } catch (error) {
      console.error('Failed to fetch centres:', error);
    }
  };

  const fetchSlots = async (centreId, date) => {
    if (!centreId || !date) return;
    try {
      const response = await bookingService.getSlots(centreId, date);
      setSlots(response.data.slots);
    } catch (error) {
      console.error('Failed to fetch slots:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    if (name === 'centreId' || name === 'bookingDate') {
      fetchSlots(
        name === 'centreId' ? value : formData.centreId,
        name === 'bookingDate' ? value : formData.bookingDate
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const session = getSession();
      if (!session) { navigate('/login', { replace: true }); return; }
      const response = await bookingService.createBooking({
        farmerId: session.farmer.id,
        ...formData,
      });

      alert(`✅ Slot booked successfully!\nToken: ${response.data.tokenNumber}`);
      navigate('/farmer/dashboard');
    } catch (error) {
      alert('❌ Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <button onClick={() => navigate('/farmer/dashboard')} style={styles.backBtn}>
          ← Back
        </button>
        
        <h1 style={styles.title}>📅 Book Procurement Slot</h1>

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Select Procurement Centre *</label>
            <select
              name="centreId"
              value={formData.centreId}
              onChange={handleChange}
              style={styles.input}
              required
            >
              <option value="">-- Select Centre --</option>
              {centres.map((centre) => (
                <option key={centre.id} value={centre.id}>
                  {centre.name} - {centre.district}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Select Crop *</label>
            <select
              name="cropId"
              value={formData.cropId}
              onChange={handleChange}
              style={styles.input}
              required
            >
              <option value="">-- Select Crop --</option>
              {crops.map((crop) => (
                <option key={crop.id} value={crop.id}>
                  {crop.name} (MSP: ₹{crop.msp}/quintal)
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Select Date *</label>
            <input
              type="date"
              name="bookingDate"
              value={formData.bookingDate}
              onChange={handleChange}
              min={minDate}
              style={styles.input}
              required
            />
          </div>

          {slots.length > 0 && (
            <div style={styles.formGroup}>
              <label style={styles.label}>Available Time Slots *</label>
              <div style={styles.slotGrid}>
                {slots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    onClick={() => setFormData({ ...formData, slotTime: slot.time })}
                    style={{
                      ...styles.slotBtn,
                      background: formData.slotTime === slot.time ? '#667eea' : 'white',
                      color: formData.slotTime === slot.time ? 'white' : '#333',
                      cursor: slot.isAvailable ? 'pointer' : 'not-allowed',
                      opacity: slot.isAvailable ? 1 : 0.5,
                    }}
                    disabled={!slot.isAvailable}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={styles.formGroup}>
            <label style={styles.label}>Estimated Quantity (Quintals) *</label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              style={styles.input}
              min="1"
              max="100"
              required
            />
          </div>

          <button type="submit" style={styles.submitBtn} disabled={loading}>
            {loading ? 'Booking...' : 'Confirm Booking'}
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
    padding: '40px',
    borderRadius: '15px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    width: '500px',
    maxWidth: '100%',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#667eea',
    cursor: 'pointer',
    fontSize: '16px',
    marginBottom: '20px',
  },
  title: {
    textAlign: 'center',
    color: '#333',
    marginBottom: '30px',
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
  slotGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '10px',
  },
  slotBtn: {
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '14px',
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
    marginTop: '10px',
  },
};

export default BookSlot;