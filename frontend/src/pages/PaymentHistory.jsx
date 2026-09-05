import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

const PaymentHistory = () => {
  const navigate = useNavigate();
  const { t, tCrop, tStatus } = useLanguage();
  const [payments] = useState([
    {
      id: 1,
      billNumber: 'BILL-20260315-001',
      cropName: 'Wheat',
      quantity: 5.5,
      amount: 12512.50,
      status: 'CREDITED',
      initiatedDate: '2026-03-15',
      creditedDate: '2026-03-18',
      utrNumber: 'UTR123456789',
    },
    {
      id: 2,
      billNumber: 'BILL-20260220-002',
      cropName: 'Paddy',
      quantity: 8.0,
      amount: 17464.00,
      status: 'PROCESSING',
      initiatedDate: '2026-02-20',
      creditedDate: null,
      utrNumber: null,
    },
    {
      id: 3,
      billNumber: 'BILL-20260115-003',
      cropName: 'Wheat',
      quantity: 3.5,
      amount: 7962.50,
      status: 'CREDITED',
      initiatedDate: '2026-01-15',
      creditedDate: '2026-01-18',
      utrNumber: 'UTR987654321',
    },
  ]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'CREDITED': return '#4caf50';
      case 'PROCESSING': return '#ff9800';
      case 'FAILED': return '#f44336';
      default: return '#999';
    }
  };

  const totalEarnings = payments
    .filter(p => p.status === 'CREDITED')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button onClick={() => navigate('/farmer/dashboard')} style={styles.backBtn}>
            {t('common.back')}
          </button>
          <h1 style={styles.title}>{t('paymentHistory.title')}</h1>
        </div>
        <LanguageSelector variant="light" />
      </div>

      {/* Summary Cards */}
      <div style={styles.summaryRow}>
        <div style={styles.summaryCard}>
          <h3>{t('paymentHistory.totalEarnings')}</h3>
          <p style={styles.summaryAmount}>₹{totalEarnings.toLocaleString('en-IN')}</p>
        </div>
        <div style={styles.summaryCard}>
          <h3>{t('paymentHistory.totalTransactions')}</h3>
          <p style={styles.summaryAmount}>{payments.length}</p>
        </div>
        <div style={styles.summaryCard}>
          <h3>{t('paymentHistory.pendingPayments')}</h3>
          <p style={styles.summaryAmount}>
            {payments.filter(p => p.status === 'PROCESSING').length}
          </p>
        </div>
      </div>

      {/* Payments List */}
      <div style={styles.paymentsList}>
        {payments.map(payment => (
          <div key={payment.id} style={styles.paymentCard}>
            <div style={styles.paymentHeader}>
              <div>
                <h3 style={styles.billNumber}>{payment.billNumber}</h3>
                <p style={styles.cropName}>
                  {tCrop(payment.cropName)} - {payment.quantity} {t('common.quintals')}
                </p>
              </div>
              <div style={{
                ...styles.statusBadge,
                background: getStatusColor(payment.status) + '20',
                color: getStatusColor(payment.status),
              }}>
                {tStatus(payment.status)}
              </div>
            </div>

            <div style={styles.paymentDetails}>
              <div style={styles.detailRow}>
                <span>{t('paymentHistory.amount')}</span>
                <strong>₹{payment.amount.toLocaleString('en-IN')}</strong>
              </div>
              <div style={styles.detailRow}>
                <span>{t('paymentHistory.initiated')}</span>
                <strong>{payment.initiatedDate}</strong>
              </div>
              {payment.creditedDate && (
                <div style={styles.detailRow}>
                  <span>{t('paymentHistory.credited')}</span>
                  <strong>{payment.creditedDate}</strong>
                </div>
              )}
              {payment.utrNumber && (
                <div style={styles.detailRow}>
                  <span>{t('paymentHistory.utrNumber')}</span>
                  <strong>{payment.utrNumber}</strong>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div style={styles.progressContainer}>
              <div style={styles.progressSteps}>
                <div style={{
                  ...styles.progressStep,
                  background: '#4caf50',
                  color: 'white',
                }}>
                  ✓
                </div>
                <div style={{
                  ...styles.progressLine,
                  background: payment.status === 'CREDITED' ? '#4caf50' : '#ff9800',
                }} />
                <div style={{
                  ...styles.progressStep,
                  background: payment.status === 'CREDITED' ? '#4caf50' : '#ff9800',
                  color: 'white',
                }}>
                  {payment.status === 'CREDITED' ? '✓' : '⏳'}
                </div>
                <div style={{
                  ...styles.progressLine,
                  background: payment.status === 'CREDITED' ? '#4caf50' : '#e0e0e0',
                }} />
                <div style={{
                  ...styles.progressStep,
                  background: payment.status === 'CREDITED' ? '#4caf50' : '#e0e0e0',
                  color: payment.status === 'CREDITED' ? 'white' : '#999',
                }}>
                  {payment.status === 'CREDITED' ? '✓' : '○'}
                </div>
              </div>
              <div style={styles.progressLabels}>
                <span>{t('paymentHistory.steps.initiated')}</span>
                <span>{t('paymentHistory.steps.processing')}</span>
                <span>{t('paymentHistory.steps.credited')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
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
  },
  title: {
    margin: 0,
  },
  summaryRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '15px',
    marginBottom: '20px',
  },
  summaryCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '15px',
    textAlign: 'center',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  summaryAmount: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#667eea',
    margin: '10px 0 0',
  },
  paymentsList: {
    display: 'grid',
    gap: '15px',
  },
  paymentCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '15px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  paymentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px',
  },
  billNumber: {
    margin: 0,
    color: '#333',
  },
  cropName: {
    margin: '5px 0 0',
    color: '#666',
    fontSize: '14px',
  },
  statusBadge: {
    padding: '5px 15px',
    borderRadius: '20px',
    fontWeight: 'bold',
    fontSize: '12px',
  },
  paymentDetails: {
    borderTop: '1px solid #eee',
    paddingTop: '15px',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
  },
  progressContainer: {
    marginTop: '20px',
  },
  progressSteps: {
    display: 'flex',
    alignItems: 'center',
  },
  progressStep: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
  },
  progressLine: {
    flex: 1,
    height: '3px',
  },
  progressLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '5px',
    fontSize: '12px',
    color: '#666',
  },
};

export default PaymentHistory;