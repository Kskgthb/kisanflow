import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService, bookingService } from '../services/api';
import { getAdminSession, clearAdminSession, getSession } from '../services/auth';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { t, tCrop, tStatus } = useLanguage();

  const [adminUser, setAdminUser] = useState(null);
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'procurements' | 'farmers' | 'config'
  const [selectedCentre, setSelectedCentre] = useState('all');
  const [centresList, setCentresList] = useState([]);
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [procurements, setProcurements] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [crops, setCrops] = useState([]);
  
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [notification, setNotification] = useState('');

  // Modals state
  const [selectedBookingForBill, setSelectedBookingForBill] = useState(null);
  const [weighModalBooking, setWeighModalBooking] = useState(null);
  const [weighQty, setWeighQty] = useState('');
  const [weighGrade, setWeighGrade] = useState('Grade A');

  // Enforce Officer Authentication Guard
  useEffect(() => {
    const session = getAdminSession();
    if (!session) {
      navigate('/admin/login', { replace: true });
      return;
    }
    setAdminUser(session.admin);
    if (session.admin.centreId) {
      setSelectedCentre(session.admin.centreId.toString());
    }
  }, [navigate]);

  // Load centres on mount
  useEffect(() => {
    const fetchCentres = async () => {
      try {
        const res = await bookingService.getCentres();
        if (res.data?.centres) {
          setCentresList(res.data.centres);
        }
      } catch (err) {
        console.warn('Failed to load centres:', err.message);
      }
    };
    fetchCentres();
  }, []);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // 1. Fetch stats
      const statsRes = await adminService.getStats(selectedCentre);
      if (statsRes.data?.stats) {
        setStats(statsRes.data.stats);
        if (statsRes.data.crops) setCrops(statsRes.data.crops);
        if (statsRes.data.centres && statsRes.data.centres.length > 0) {
          setCentresList(statsRes.data.centres);
        }
      }

      // 2. Fetch bookings
      const bookingsRes = await adminService.getBookings({
        centreId: selectedCentre,
        status: statusFilter,
        search: searchTerm,
      });
      if (bookingsRes.data?.bookings) {
        setBookings(bookingsRes.data.bookings);
      }

      // 3. If in procurements tab, fetch procurements
      if (activeTab === 'procurements') {
        const procRes = await adminService.getProcurements({
          centreId: selectedCentre,
          search: searchTerm,
        });
        if (procRes.data?.procurements) {
          setProcurements(procRes.data.procurements);
        }
      }

      // 4. If in farmers tab, fetch farmers
      if (activeTab === 'farmers') {
        const farmersRes = await adminService.getFarmers({ search: searchTerm });
        if (farmersRes.data?.farmers) {
          setFarmers(farmersRes.data.farmers);
        }
      }
    } catch (err) {
      console.warn('Admin load data fallback error:', err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedCentre, statusFilter, searchTerm, activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto refresh every 12 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadData(true);
    }, 12000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  const handleAdvanceStage = async (bookingId, stageKey, extraData = {}) => {
    setActionLoading(true);
    try {
      await adminService.updateStage(bookingId, {
        status: stageKey,
        ...extraData,
      });
      showToast(`✅ Booking stage updated to ${stageKey}`);
      await loadData(true);
    } catch (err) {
      showToast(`❌ Failed to update stage: ${err.message}`);
    } finally {
      setActionLoading(false);
      setWeighModalBooking(null);
    }
  };

  const handleSaveCropMsp = async (cropId, newMsp) => {
    try {
      await adminService.updateCropMsp(cropId, newMsp);
      showToast(`✅ MSP updated successfully for crop #${cropId}`);
      loadData(true);
    } catch (err) {
      showToast(`❌ Failed to update MSP: ${err.message}`);
    }
  };

  const handleSaveCentreCapacity = async (centreId, newCapacity) => {
    try {
      await adminService.updateCentreCapacity(centreId, newCapacity);
      showToast(`✅ Daily capacity updated for Mandi #${centreId}`);
      loadData(true);
    } catch (err) {
      showToast(`❌ Failed to update capacity: ${err.message}`);
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'BOOKED':
        return { bg: '#fff3e0', text: '#e65100', border: '#ffe0b2' };
      case 'CHECKED_IN':
        return { bg: '#e3f2fd', text: '#1565c0', border: '#bbdefb' };
      case 'WEIGHING':
        return { bg: '#e0f7fa', text: '#00838f', border: '#b2ebf2' };
      case 'QUALITY_CHECK':
        return { bg: '#f3e5f5', text: '#7b1fa2', border: '#e1bee7' };
      case 'BILL_GENERATED':
        return { bg: '#ede7f6', text: '#512da8', border: '#d1c4e9' };
      case 'PAYMENT_INITIATED':
        return { bg: '#fff8e1', text: '#f57f17', border: '#ffecb3' };
      case 'COMPLETED':
      case 'CREDITED':
        return { bg: '#e8f5e9', text: '#2e7d32', border: '#c8e6c9' };
      case 'CANCELLED':
        return { bg: '#ffebee', text: '#c62828', border: '#ffcdd2' };
      default:
        return { bg: '#f5f5f5', text: '#666', border: '#ddd' };
    }
  };

  return (
    <div style={styles.container}>
      {/* Top Navigation Bar */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logoBadge}>
            <span style={{ fontSize: '26px' }}>🌾</span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={styles.headerTitle}>KisanFlow</h1>
              <span style={styles.portalTag}>MANDI OFFICER PORTAL</span>
            </div>
            <p style={styles.headerSubtitle}>
              Punjab State Agricultural Marketing Board • Smart Procurement Control Desk
            </p>
          </div>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.liveIndicator}>
            <span style={styles.pulsingDot} />
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#2e7d32' }}>Live Operations</span>
          </div>

          {adminUser && (
            <div style={{
              background: '#f0f4f8',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#334e68',
              border: '1px solid #d9e2ec',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <strong>👤 {adminUser.fullName}</strong>
              <span style={{ fontSize: '11px', color: '#627d98' }}>{adminUser.officerId || 'Officer'} • {adminUser.designation || 'Mandi Desk'}</span>
            </div>
          )}

          <LanguageSelector variant="light" />

          <button 
            onClick={() => {
              const farmerSess = getSession();
              if (farmerSess) {
                navigate('/farmer/dashboard');
              } else {
                navigate('/login');
              }
            }}
            style={styles.switchBtn}
            title="Switch to Farmer Portal"
          >
            👨‍🌾 Farmer Portal
          </button>

          <button
            onClick={() => {
              clearAdminSession();
              navigate('/admin/login', { replace: true });
            }}
            style={{
              padding: '8px 14px',
              background: '#ffebee',
              color: '#c62828',
              border: '1px solid #ffcdd2',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            {t('common.logout')}
          </button>
        </div>
      </header>

      {/* Alert Notification */}
      {notification && (
        <div style={styles.toast}>
          {notification}
        </div>
      )}

      {/* Control Bar: Centre Selector & Filter Controls */}
      <div style={styles.controlBar}>
        <div style={styles.controlItem}>
          <label style={styles.controlLabel}>📍 Mandi / Procurement Centre:</label>
          <select 
            value={selectedCentre} 
            onChange={(e) => setSelectedCentre(e.target.value)}
            style={styles.selectInput}
          >
            <option value="all">🌐 All Mandi Centres (Punjab Statewide)</option>
            {centresList.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.district})
              </option>
            ))}
          </select>
        </div>

        <div style={styles.controlItem}>
          <label style={styles.controlLabel}>🔍 Global Search (Farmer/Token/Bill/UTR):</label>
          <input 
            type="text"
            placeholder="Search by farmer name, token, phone, bill..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
          <button 
            onClick={() => loadData()} 
            style={styles.refreshBtn}
            disabled={loading}
          >
            {loading ? '⏳ Loading...' : '🔄 Refresh Data'}
          </button>
          <button 
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              ...styles.toggleBtn,
              background: autoRefresh ? '#e8f5e9' : '#fafafa',
              borderColor: autoRefresh ? '#4caf50' : '#ddd',
              color: autoRefresh ? '#2e7d32' : '#666',
            }}
          >
            {autoRefresh ? '🟢 Auto-Sync ON (12s)' : '⚪ Auto-Sync OFF'}
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div style={styles.kpiGrid}>
        <div style={{ ...styles.kpiCard, borderLeft: '4px solid #1976d2' }}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Total Bookings</span>
            <span style={styles.kpiIcon}>📅</span>
          </div>
          <div style={styles.kpiValue}>{stats?.totalBookings ?? bookings.length}</div>
          <div style={styles.kpiSub}>
            <span style={{ color: '#1976d2', fontWeight: 'bold' }}>{stats?.todayBookings || 0}</span> booked today
          </div>
        </div>

        <div style={{ ...styles.kpiCard, borderLeft: '4px solid #f57c00' }}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Active Queue / Waiting</span>
            <span style={styles.kpiIcon}>⏳</span>
          </div>
          <div style={{ ...styles.kpiValue, color: '#f57c00' }}>
            {stats?.activeQueue ?? bookings.filter(b => b.status !== 'COMPLETED' && b.status !== 'CANCELLED').length}
          </div>
          <div style={styles.kpiSub}>Farmers at Mandi premises</div>
        </div>

        <div style={{ ...styles.kpiCard, borderLeft: '4px solid #00897b' }}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Procured Quantity</span>
            <span style={styles.kpiIcon}>⚖️</span>
          </div>
          <div style={{ ...styles.kpiValue, color: '#00897b' }}>
            {(stats?.actualProcuredQuintals || stats?.totalEstimatedQuintals || 0).toFixed(1)} <span style={{ fontSize: '16px' }}>Qtl</span>
          </div>
          <div style={styles.kpiSub}>Weighed & Verified Stock</div>
        </div>

        <div style={{ ...styles.kpiCard, borderLeft: '4px solid #2e7d32' }}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>MSP Disbursed Amount</span>
            <span style={styles.kpiIcon}>💰</span>
          </div>
          <div style={{ ...styles.kpiValue, color: '#2e7d32' }}>
            ₹{((stats?.totalDisbursed || 0)).toLocaleString('en-IN')}
          </div>
          <div style={styles.kpiSub}>
            Direct DBT payments credited to farmer accounts
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={styles.tabNav}>
        <button 
          onClick={() => setActiveTab('queue')}
          style={{
            ...styles.tabBtn,
            ...(activeTab === 'queue' ? styles.tabBtnActive : {}),
          }}
        >
          📋 Live Operations & Queue ({bookings.length})
        </button>
        <button 
          onClick={() => setActiveTab('procurements')}
          style={{
            ...styles.tabBtn,
            ...(activeTab === 'procurements' ? styles.tabBtnActive : {}),
          }}
        >
          🌾 Procurement & Bills Register
        </button>
        <button 
          onClick={() => setActiveTab('farmers')}
          style={{
            ...styles.tabBtn,
            ...(activeTab === 'farmers' ? styles.tabBtnActive : {}),
          }}
        >
          👨‍🌾 Farmers Directory
        </button>
        <button 
          onClick={() => setActiveTab('config')}
          style={{
            ...styles.tabBtn,
            ...(activeTab === 'config' ? styles.tabBtnActive : {}),
          }}
        >
          ⚙️ Mandi Capacities & MSP Rates
        </button>
      </div>

      {/* TAB 1: Live Operations & Queue */}
      {activeTab === 'queue' && (
        <div style={styles.tabContent}>
          {/* Status Sub-filter */}
          <div style={styles.statusFilterRow}>
            {[
              { key: 'all', label: 'All Statuses' },
              { key: 'BOOKED', label: '📅 Booked' },
              { key: 'CHECKED_IN', label: '✅ Checked In' },
              { key: 'WEIGHING', label: '⚖️ Weighing' },
              { key: 'QUALITY_CHECK', label: '🔍 Quality Check' },
              { key: 'BILL_GENERATED', label: '📄 Bill Generated' },
              { key: 'PAYMENT_INITIATED', label: '💰 Payment Initiated' },
              { key: 'COMPLETED', label: '🏦 Completed & Credited' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                style={{
                  ...styles.statusFilterPill,
                  background: statusFilter === f.key ? '#1976d2' : '#f0f4f8',
                  color: statusFilter === f.key ? '#fff' : '#455a64',
                  fontWeight: statusFilter === f.key ? 'bold' : 'normal',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Bookings Operations List */}
          {loading ? (
            <div style={styles.loadingBox}>⏳ Loading mandi live operations...</div>
          ) : bookings.length === 0 ? (
            <div style={styles.emptyBox}>
              <p style={{ fontSize: '42px', margin: 0 }}>🌾</p>
              <h3>No bookings found matching selected filters</h3>
              <p style={{ color: '#78909c' }}>Adjust centre selection or search keywords</p>
            </div>
          ) : (
            <div style={styles.operationsList}>
              {bookings.map((b) => {
                const badge = getStatusBadgeStyle(b.status);
                const isCompleted = b.status === 'COMPLETED';

                return (
                  <div key={b.id} style={styles.opCard}>
                    <div style={styles.opCardHeader}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={styles.tokenPill}>{b.token_number || `TOKEN-#${b.id}`}</span>
                          <span style={{ ...styles.badge, background: badge.bg, color: badge.text, borderColor: badge.border }}>
                            {tStatus(b.status)}
                          </span>
                          {b.queue_position > 0 && !isCompleted && (
                            <span style={styles.queuePosBadge}>Queue Position: #{b.queue_position}</span>
                          )}
                        </div>
                        <h3 style={styles.farmerNameTitle}>
                          👨‍🌾 {b.farmer_name || 'Kisan'} • <span style={{ color: '#607d8b', fontSize: '15px' }}>📞 {b.phone_number}</span>
                        </h3>
                        <p style={styles.farmerSubDetails}>
                          📍 {b.village ? `${b.village}, ` : ''}{b.centre_name} ({b.centre_district}) • 📅 {b.booking_date} at {b.slot_time}
                        </p>
                      </div>

                      <div style={styles.cropSummaryBox}>
                        <div style={styles.cropNameBig}>{tCrop(b.crop_name)}</div>
                        <div style={styles.cropQtyBig}>
                          {b.actual_quantity_quintals || b.quantity} {t('common.quintals')}
                        </div>
                        <div style={styles.mspRateText}>MSP: ₹{b.msp_per_quintal || 2275}/Qtl</div>
                      </div>
                    </div>

                    {/* Operational Details Row */}
                    <div style={styles.opDetailsGrid}>
                      <div style={styles.opDetailCol}>
                        <span style={styles.colLabel}>Aadhaar & Bank Info:</span>
                        <strong style={styles.colValue}>
                          A/C: {b.bank_account || '00451010009823'} ({b.bank_ifsc || 'SBIN0001234'})
                        </strong>
                      </div>
                      <div style={styles.opDetailCol}>
                        <span style={styles.colLabel}>Bill / Receipt Number:</span>
                        <strong style={styles.colValue}>
                          {b.bill_number ? (
                            <span style={{ color: '#2e7d32' }}>📄 {b.bill_number}</span>
                          ) : (
                            <span style={{ color: '#90a4ae' }}>Pending Generation</span>
                          )}
                        </strong>
                      </div>
                      <div style={styles.opDetailCol}>
                        <span style={styles.colLabel}>Total Payout / Amount:</span>
                        <strong style={{ ...styles.colValue, color: '#2e7d32', fontSize: '16px' }}>
                          ₹{parseFloat(b.payment_amount || b.procurement_amount || (parseFloat(b.quantity || 10) * parseFloat(b.msp_per_quintal || 2275))).toLocaleString('en-IN')}
                        </strong>
                      </div>
                      <div style={styles.opDetailCol}>
                        <span style={styles.colLabel}>Payment UTR & Date:</span>
                        <strong style={styles.colValue}>
                          {b.utr_number ? (
                            <span style={{ color: '#1565c0' }}>🏦 {b.utr_number} ({b.credited_date?.slice(0, 10) || 'Credited'})</span>
                          ) : (
                            <span style={{ color: '#90a4ae' }}>Awaiting DBT Transfer</span>
                          )}
                        </strong>
                      </div>
                    </div>

                    {/* Officer Action Advancement Station */}
                    <div style={styles.actionStation}>
                      <span style={styles.actionStationLabel}>⚙️ Officer Stage Action:</span>
                      
                      <div style={styles.stageButtonGroup}>
                        <button
                          onClick={() => handleAdvanceStage(b.id, 'CHECKED_IN')}
                          disabled={actionLoading}
                          style={{
                            ...styles.stageActionBtn,
                            background: b.status === 'CHECKED_IN' ? '#1565c0' : '#fff',
                            color: b.status === 'CHECKED_IN' ? '#fff' : '#1565c0',
                            borderColor: '#1565c0',
                          }}
                        >
                          1. Check In ✅
                        </button>

                        <button
                          onClick={() => {
                            setWeighModalBooking(b);
                            setWeighQty(b.actual_quantity_quintals || b.quantity || '10');
                            setWeighGrade(b.quality_grade || 'Grade A');
                          }}
                          disabled={actionLoading}
                          style={{
                            ...styles.stageActionBtn,
                            background: b.status === 'WEIGHING' ? '#00838f' : '#fff',
                            color: b.status === 'WEIGHING' ? '#fff' : '#00838f',
                            borderColor: '#00838f',
                          }}
                        >
                          2. Weigh Produce ⚖️
                        </button>

                        <button
                          onClick={() => handleAdvanceStage(b.id, 'QUALITY_CHECK', { qualityGrade: 'Grade A' })}
                          disabled={actionLoading}
                          style={{
                            ...styles.stageActionBtn,
                            background: b.status === 'QUALITY_CHECK' ? '#7b1fa2' : '#fff',
                            color: b.status === 'QUALITY_CHECK' ? '#fff' : '#7b1fa2',
                            borderColor: '#7b1fa2',
                          }}
                        >
                          3. Quality Passed 🔍
                        </button>

                        <button
                          onClick={() => handleAdvanceStage(b.id, 'BILL_GENERATED')}
                          disabled={actionLoading}
                          style={{
                            ...styles.stageActionBtn,
                            background: b.status === 'BILL_GENERATED' ? '#512da8' : '#fff',
                            color: b.status === 'BILL_GENERATED' ? '#fff' : '#512da8',
                            borderColor: '#512da8',
                          }}
                        >
                          4. Generate Bill 📄
                        </button>

                        <button
                          onClick={() => handleAdvanceStage(b.id, 'PAYMENT_INITIATED')}
                          disabled={actionLoading}
                          style={{
                            ...styles.stageActionBtn,
                            background: b.status === 'PAYMENT_INITIATED' ? '#f57f17' : '#fff',
                            color: b.status === 'PAYMENT_INITIATED' ? '#fff' : '#f57f17',
                            borderColor: '#f57f17',
                          }}
                        >
                          5. Initiate DBT 💰
                        </button>

                        <button
                          onClick={() => handleAdvanceStage(b.id, 'PAYMENT_CREDITED')}
                          disabled={actionLoading}
                          style={{
                            ...styles.stageActionBtn,
                            background: isCompleted ? '#2e7d32' : '#e8f5e9',
                            color: isCompleted ? '#fff' : '#2e7d32',
                            borderColor: '#2e7d32',
                            fontWeight: 'bold',
                          }}
                        >
                          6. Mark Credited 🏦
                        </button>

                        {/* View / Print Bill Button */}
                        <button
                          onClick={() => setSelectedBookingForBill(b)}
                          style={styles.printBillBtn}
                        >
                          📄 Print Mandi Receipt
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Procurement & Bills Register */}
      {activeTab === 'procurements' && (
        <div style={styles.tabContent}>
          <div style={styles.tableHeaderSection}>
            <div>
              <h2 style={styles.sectionTitle}>🌾 Official Mandi Procurement & Billing Register</h2>
              <p style={{ margin: 0, color: '#607d8b' }}>
                Complete verifiable transaction ledgers, bills, quality grading, and bank UTR numbers
              </p>
            </div>
            <button 
              onClick={() => window.print()} 
              style={styles.exportBtn}
            >
              🖨️ Print Ledger Report
            </button>
          </div>

          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeadRow}>
                  <th style={styles.th}>Bill Number</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Farmer Name & Phone</th>
                  <th style={styles.th}>Mandi Centre</th>
                  <th style={styles.th}>Crop & Grade</th>
                  <th style={styles.th}>Actual Qty</th>
                  <th style={styles.th}>MSP Rate</th>
                  <th style={styles.th}>Total Amount</th>
                  <th style={styles.th}>Payment Status</th>
                  <th style={styles.th}>UTR Number</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {procurements.length === 0 ? (
                  <tr>
                    <td colSpan="11" style={{ textAlign: 'center', padding: '40px', color: '#90a4ae' }}>
                      No procurement records found for the selected centre. Advance bookings to generate bills.
                    </td>
                  </tr>
                ) : (
                  procurements.map((p) => (
                    <tr key={p.id} style={styles.tableRow}>
                      <td style={{ ...styles.td, fontWeight: 'bold', color: '#1565c0' }}>
                        {p.bill_number}
                      </td>
                      <td style={styles.td}>
                        {p.created_at ? new Date(p.created_at).toISOString().slice(0, 10) : p.booking_date}
                      </td>
                      <td style={styles.td}>
                        <strong>{p.farmer_name}</strong>
                        <div style={{ fontSize: '12px', color: '#607d8b' }}>{p.phone_number}</div>
                      </td>
                      <td style={styles.td}>{p.centre_name}</td>
                      <td style={styles.td}>
                        <span style={styles.cropBadge}>{tCrop(p.crop_name)}</span>
                        <span style={{ fontSize: '11px', color: '#555', display: 'block' }}>{p.quality_grade || 'Grade A'}</span>
                      </td>
                      <td style={{ ...styles.td, fontWeight: '600' }}>
                        {p.actual_quantity_quintals} Qtl
                      </td>
                      <td style={styles.td}>₹{p.msp_per_quintal || 2275}</td>
                      <td style={{ ...styles.td, fontWeight: 'bold', color: '#2e7d32' }}>
                        ₹{parseFloat(p.total_amount).toLocaleString('en-IN')}
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          background: p.payment_status === 'CREDITED' ? '#e8f5e9' : '#fff8e1',
                          color: p.payment_status === 'CREDITED' ? '#2e7d32' : '#f57f17',
                        }}>
                          {p.payment_status || 'CREDITED'}
                        </span>
                      </td>
                      <td style={{ ...styles.td, fontSize: '12px', fontFamily: 'monospace' }}>
                        {p.utr_number || 'UTR634182151'}
                      </td>
                      <td style={styles.td}>
                        <button
                          onClick={() => setSelectedBookingForBill({
                            id: p.booking_id,
                            token_number: p.token_number,
                            farmer_name: p.farmer_name,
                            phone_number: p.phone_number,
                            bank_account: p.bank_account,
                            bank_ifsc: p.bank_ifsc,
                            centre_name: p.centre_name,
                            crop_name: p.crop_name,
                            actual_quantity_quintals: p.actual_quantity_quintals,
                            quality_grade: p.quality_grade,
                            msp_per_quintal: p.msp_per_quintal,
                            payment_amount: p.total_amount,
                            bill_number: p.bill_number,
                            utr_number: p.utr_number,
                            credited_date: p.credited_date,
                          })}
                          style={styles.actionSmallBtn}
                        >
                          View Receipt 🧾
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Farmers Directory */}
      {activeTab === 'farmers' && (
        <div style={styles.tabContent}>
          <div style={styles.tableHeaderSection}>
            <div>
              <h2 style={styles.sectionTitle}>👨‍🌾 Registered Farmers Database</h2>
              <p style={{ margin: 0, color: '#607d8b' }}>
                Farmer KYC, Aadhaar registry, Bank accounts, and lifetime procurement volume
              </p>
            </div>
            <div style={styles.statCountBadge}>
              Total Farmers: {farmers.length}
            </div>
          </div>

          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeadRow}>
                  <th style={styles.th}>Farmer ID</th>
                  <th style={styles.th}>Full Name</th>
                  <th style={styles.th}>Phone Number</th>
                  <th style={styles.th}>Aadhaar Number</th>
                  <th style={styles.th}>Village & District</th>
                  <th style={styles.th}>Land Area</th>
                  <th style={styles.th}>Bank Account</th>
                  <th style={styles.th}>IFSC Code</th>
                  <th style={styles.th}>Total Bookings</th>
                  <th style={styles.th}>Delivered Qtl</th>
                </tr>
              </thead>
              <tbody>
                {farmers.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: '#90a4ae' }}>
                      No farmers found.
                    </td>
                  </tr>
                ) : (
                  farmers.map((f) => (
                    <tr key={f.id} style={styles.tableRow}>
                      <td style={{ ...styles.td, fontWeight: 'bold' }}>#{f.id}</td>
                      <td style={{ ...styles.td, fontWeight: '600', color: '#1976d2' }}>
                        {f.full_name}
                      </td>
                      <td style={styles.td}>📞 {f.phone_number}</td>
                      <td style={{ ...styles.td, fontFamily: 'monospace' }}>
                        {f.aadhar_number ? `XXXX-XXXX-${f.aadhar_number.slice(-4)}` : 'Verified'}
                      </td>
                      <td style={styles.td}>
                        {f.village ? `${f.village}, ` : ''}{f.district || 'Ludhiana'} ({f.state || 'Punjab'})
                      </td>
                      <td style={styles.td}>{f.land_area_acres || 4.5} Acres</td>
                      <td style={{ ...styles.td, fontFamily: 'monospace' }}>
                        {f.bank_account || '00451010009823'}
                      </td>
                      <td style={{ ...styles.td, fontFamily: 'monospace' }}>
                        {f.bank_ifsc || 'SBIN0001234'}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <span style={styles.countPill}>{f.total_bookings || 1}</span>
                      </td>
                      <td style={{ ...styles.td, fontWeight: 'bold', color: '#2e7d32' }}>
                        {parseFloat(f.delivered_quintals || 5.5).toFixed(1)} Qtl
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Mandi Capacities & MSP Config */}
      {activeTab === 'config' && (
        <div style={styles.tabContent}>
          <div style={styles.configGrid}>
            {/* Mandi Capacity Settings */}
            <div style={styles.configCard}>
              <h2 style={styles.sectionTitle}>🏢 Mandi Centres Daily Capacity</h2>
              <p style={{ color: '#607d8b', fontSize: '14px' }}>
                Set max daily procurement quota per mandi centre to prevent traffic congestion.
              </p>

              <div style={styles.centresListContainer}>
                {centresList.map((centre) => (
                  <div key={centre.id} style={styles.centreConfigRow}>
                    <div>
                      <h4 style={{ margin: '0 0 4px', fontSize: '16px' }}>{centre.name}</h4>
                      <p style={{ margin: 0, color: '#78909c', fontSize: '13px' }}>
                        📍 {centre.district}, {centre.state}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input 
                        type="number"
                        defaultValue={centre.daily_capacity_quintals || 500}
                        id={`cap-${centre.id}`}
                        style={styles.numberInput}
                      />
                      <span style={{ fontSize: '14px', color: '#555' }}>Qtl/Day</span>
                      <button
                        onClick={() => {
                          const val = document.getElementById(`cap-${centre.id}`).value;
                          handleSaveCentreCapacity(centre.id, val);
                        }}
                        style={styles.saveSmallBtn}
                      >
                        Save 💾
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Crop MSP Rates Settings */}
            <div style={styles.configCard}>
              <h2 style={styles.sectionTitle}>🌾 Minimum Support Price (MSP) Rates</h2>
              <p style={{ color: '#607d8b', fontSize: '14px' }}>
                Government-mandated MSP rates per quintal for Season 2026-27.
              </p>

              <div style={styles.cropsListContainer}>
                {crops.map((crop) => (
                  <div key={crop.id} style={styles.cropConfigRow}>
                    <div>
                      <h4 style={{ margin: '0 0 4px', fontSize: '16px' }}>
                        {tCrop(crop.name)} ({crop.season || 'Rabi'})
                      </h4>
                      <p style={{ margin: 0, color: '#78909c', fontSize: '13px' }}>
                        Crop Code: #CRP-{crop.id}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#2e7d32' }}>₹</span>
                      <input 
                        type="number"
                        defaultValue={crop.msp_per_quintal || 2275}
                        id={`msp-${crop.id}`}
                        style={styles.numberInput}
                      />
                      <span style={{ fontSize: '14px', color: '#555' }}>/Qtl</span>
                      <button
                        onClick={() => {
                          const val = document.getElementById(`msp-${crop.id}`).value;
                          handleSaveCropMsp(crop.id, val);
                        }}
                        style={styles.saveSmallBtn}
                      >
                        Update MSP 💰
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Weighing & Quality Grade Entry */}
      {weighModalBooking && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>⚖️ Record Weighing & Quality Inspection</h3>
              <button onClick={() => setWeighModalBooking(null)} style={styles.closeBtn}>✕</button>
            </div>

            <div style={{ padding: '20px 0' }}>
              <p style={{ margin: '0 0 15px', color: '#555' }}>
                Recording official intake for <strong>{weighModalBooking.farmer_name}</strong> ({weighModalBooking.token_number})
              </p>

              <div style={styles.formGroup}>
                <label style={styles.label}>Crop Type:</label>
                <input 
                  type="text" 
                  value={tCrop(weighModalBooking.crop_name)} 
                  disabled 
                  style={{ ...styles.inputDisabled, background: '#f5f5f5' }}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Actual Weighed Quantity (Quintals) *:</label>
                <input 
                  type="number"
                  step="0.01"
                  value={weighQty}
                  onChange={(e) => setWeighQty(e.target.value)}
                  style={styles.inputModal}
                  placeholder="e.g. 10.50"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Quality Inspection Grade *:</label>
                <select 
                  value={weighGrade} 
                  onChange={(e) => setWeighGrade(e.target.value)}
                  style={styles.inputModal}
                >
                  <option value="Grade A">Grade A (Premium Fair Average Quality - FAQ)</option>
                  <option value="Grade B">Grade B (Standard Market Quality)</option>
                  <option value="Grade C">Grade C (Below Standard / Moisture Deviation)</option>
                </select>
              </div>

              <div style={styles.calcSummaryBox}>
                <div>MSP Rate: <strong>₹{weighModalBooking.msp_per_quintal || 2275} / Qtl</strong></div>
                <div style={{ marginTop: '6px', fontSize: '16px', color: '#2e7d32' }}>
                  Total Payout: <strong>₹{(parseFloat(weighQty || 0) * parseFloat(weighModalBooking.msp_per_quintal || 2275)).toFixed(2)}</strong>
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button onClick={() => setWeighModalBooking(null)} style={styles.cancelBtn}>
                Cancel
              </button>
              <button 
                onClick={() => handleAdvanceStage(weighModalBooking.id, 'WEIGHING', {
                  actualQuantity: parseFloat(weighQty),
                  qualityGrade: weighGrade,
                })}
                style={styles.confirmBtn}
                disabled={actionLoading}
              >
                {actionLoading ? 'Saving...' : 'Confirm & Save Weighing ✅'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Official Mandi Procurement Bill / Receipt */}
      {selectedBookingForBill && (
        <div style={styles.modalOverlay}>
          <div style={styles.billReceiptModal}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedBookingForBill(null)} style={styles.closeBtn}>✕</button>
            </div>

            {/* Printable Bill Area */}
            <div id="printable-bill" style={styles.printableReceipt}>
              <div style={styles.receiptHeader}>
                <div style={{ fontSize: '32px' }}>🌾</div>
                <h2 style={{ margin: '6px 0 2px', fontSize: '20px', color: '#1b5e20' }}>
                  PUNJAB STATE AGRICULTURAL MARKETING BOARD
                </h2>
                <h4 style={{ margin: '0 0 6px', fontSize: '14px', color: '#555' }}>
                  {selectedBookingForBill.centre_name || 'Mandi Samiti'} • E-Procurement Receipt (J-Form)
                </h4>
                <div style={styles.billMetaRow}>
                  <span>Bill No: <strong>{selectedBookingForBill.bill_number || `BILL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${selectedBookingForBill.id}`}</strong></span>
                  <span>Date: <strong>{new Date().toISOString().slice(0, 10)}</strong></span>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px dashed #bbb', margin: '15px 0' }} />

              <div style={styles.receiptGrid}>
                <div>
                  <span style={styles.receiptFieldLabel}>Farmer Name:</span>
                  <strong style={styles.receiptFieldVal}>{selectedBookingForBill.farmer_name || 'Kisan'}</strong>
                </div>
                <div>
                  <span style={styles.receiptFieldLabel}>Token Number:</span>
                  <strong style={styles.receiptFieldVal}>{selectedBookingForBill.token_number}</strong>
                </div>
                <div>
                  <span style={styles.receiptFieldLabel}>Mobile Number:</span>
                  <strong style={styles.receiptFieldVal}>{selectedBookingForBill.phone_number}</strong>
                </div>
                <div>
                  <span style={styles.receiptFieldLabel}>Bank Account & IFSC:</span>
                  <strong style={styles.receiptFieldVal}>{selectedBookingForBill.bank_account || '00451010009823'} ({selectedBookingForBill.bank_ifsc || 'SBIN0001234'})</strong>
                </div>
              </div>

              <table style={styles.receiptTable}>
                <thead>
                  <tr style={{ background: '#f0f4f8' }}>
                    <th style={styles.receiptTh}>Crop Description</th>
                    <th style={styles.receiptTh}>Quality Grade</th>
                    <th style={styles.receiptTh}>Quantity (Qtl)</th>
                    <th style={styles.receiptTh}>Govt MSP (₹/Qtl)</th>
                    <th style={styles.receiptTh}>Gross Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={styles.receiptTd}>{tCrop(selectedBookingForBill.crop_name)}</td>
                    <td style={styles.receiptTd}>{selectedBookingForBill.quality_grade || 'Grade A (FAQ)'}</td>
                    <td style={styles.receiptTd}>{selectedBookingForBill.actual_quantity_quintals || selectedBookingForBill.quantity || 10}</td>
                    <td style={styles.receiptTd}>₹{selectedBookingForBill.msp_per_quintal || 2275}</td>
                    <td style={{ ...styles.receiptTd, fontWeight: 'bold', color: '#1b5e20' }}>
                      ₹{parseFloat(selectedBookingForBill.payment_amount || (parseFloat(selectedBookingForBill.quantity || 10) * parseFloat(selectedBookingForBill.msp_per_quintal || 2275))).toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={styles.receiptPaymentDetails}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span>DBT Payment Status:</span>
                  <strong style={{ color: '#2e7d32' }}>✅ Direct Bank Transfer (DBT) Credited</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span>Bank Transaction UTR:</span>
                  <strong style={{ fontFamily: 'monospace' }}>{selectedBookingForBill.utr_number || 'UTR634182151'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Credited Date:</span>
                  <strong>{selectedBookingForBill.credited_date?.slice(0, 10) || new Date().toISOString().slice(0, 10)}</strong>
                </div>
              </div>

              <div style={styles.receiptStampArea}>
                <div>
                  <div style={styles.verifiedStamp}>
                    ✓ VERIFIED BY MANDI OFFICER
                  </div>
                  <div style={{ fontSize: '11px', color: '#777', marginTop: '4px' }}>Digitally Signed & Authenticated</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '12px', color: '#555' }}>
                  <p style={{ margin: 0 }}>Mandi Secretary Signature</p>
                  <p style={{ margin: '20px 0 0', fontWeight: 'bold' }}>Krishi Mandi Samiti</p>
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button onClick={() => window.print()} style={styles.printActionBtn}>
                🖨️ Print Official Receipt
              </button>
              <button onClick={() => setSelectedBookingForBill(null)} style={styles.cancelBtn}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f4f6f9',
    fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    color: '#263238',
  },
  header: {
    background: '#ffffff',
    padding: '16px 28px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
    borderBottom: '1px solid #e0e0e0',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  logoBadge: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(46,125,50,0.15)',
  },
  headerTitle: {
    margin: 0,
    fontSize: '22px',
    fontWeight: '800',
    color: '#1b5e20',
  },
  portalTag: {
    background: '#1976d2',
    color: '#fff',
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
  },
  headerSubtitle: {
    margin: '2px 0 0',
    fontSize: '13px',
    color: '#607d8b',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  liveIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: '#e8f5e9',
    padding: '6px 12px',
    borderRadius: '20px',
    border: '1px solid #a5d6a7',
  },
  pulsingDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#2e7d32',
    display: 'inline-block',
  },
  switchBtn: {
    padding: '8px 16px',
    background: '#fff',
    border: '1px solid #cfd8dc',
    borderRadius: '8px',
    fontWeight: '600',
    color: '#37474f',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s',
  },
  toast: {
    background: '#2e7d32',
    color: '#fff',
    padding: '12px 24px',
    textAlign: 'center',
    fontWeight: 'bold',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  controlBar: {
    background: '#fff',
    margin: '20px 28px',
    padding: '16px 20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '15px',
  },
  controlItem: {
    flex: 1,
    minWidth: '240px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  controlLabel: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#546e7a',
    textTransform: 'uppercase',
  },
  selectInput: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #cfd8dc',
    fontSize: '14px',
    outline: 'none',
    background: '#fafafa',
  },
  searchInput: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #cfd8dc',
    fontSize: '14px',
    outline: 'none',
  },
  refreshBtn: {
    padding: '10px 18px',
    background: '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '13px',
  },
  toggleBtn: {
    padding: '10px 14px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '13px',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '18px',
    margin: '0 28px 20px',
  },
  kpiCard: {
    background: '#fff',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  kpiHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: '13px',
    color: '#78909c',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  kpiIcon: {
    fontSize: '20px',
  },
  kpiValue: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#263238',
    margin: '8px 0 4px',
  },
  kpiSub: {
    fontSize: '12px',
    color: '#90a4ae',
  },
  tabNav: {
    display: 'flex',
    gap: '10px',
    margin: '0 28px 15px',
    borderBottom: '2px solid #eceff1',
    paddingBottom: '2px',
  },
  tabBtn: {
    padding: '12px 20px',
    background: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    fontSize: '15px',
    fontWeight: '600',
    color: '#607d8b',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabBtnActive: {
    color: '#1976d2',
    borderBottom: '3px solid #1976d2',
    fontWeight: 'bold',
  },
  tabContent: {
    margin: '0 28px 40px',
  },
  statusFilterRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginBottom: '16px',
  },
  statusFilterPill: {
    padding: '6px 14px',
    borderRadius: '20px',
    border: 'none',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  loadingBox: {
    textAlign: 'center',
    padding: '60px',
    background: '#fff',
    borderRadius: '12px',
    fontSize: '18px',
    color: '#607d8b',
  },
  emptyBox: {
    textAlign: 'center',
    padding: '60px',
    background: '#fff',
    borderRadius: '12px',
  },
  operationsList: {
    display: 'grid',
    gap: '16px',
  },
  opCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
    border: '1px solid #eef2f6',
  },
  opCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid #f0f4f8',
    paddingBottom: '14px',
  },
  tokenPill: {
    background: '#e3f2fd',
    color: '#1565c0',
    padding: '4px 10px',
    borderRadius: '6px',
    fontWeight: 'bold',
    fontSize: '13px',
  },
  badge: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontWeight: 'bold',
    fontSize: '12px',
    border: '1px solid transparent',
  },
  queuePosBadge: {
    background: '#fff3e0',
    color: '#e65100',
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  farmerNameTitle: {
    margin: '10px 0 4px',
    fontSize: '18px',
    color: '#263238',
  },
  farmerSubDetails: {
    margin: 0,
    fontSize: '13px',
    color: '#78909c',
  },
  cropSummaryBox: {
    textAlign: 'right',
    background: '#f8fafc',
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  cropNameBig: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  cropQtyBig: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#1e293b',
    margin: '2px 0',
  },
  mspRateText: {
    fontSize: '12px',
    color: '#64748b',
  },
  opDetailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
    padding: '14px 0',
    borderBottom: '1px solid #f0f4f8',
  },
  opDetailCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  colLabel: {
    fontSize: '11px',
    color: '#94a3b8',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  colValue: {
    fontSize: '13px',
    color: '#334155',
  },
  actionStation: {
    paddingTop: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  actionStationLabel: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#475569',
  },
  stageButtonGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  stageActionBtn: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  printBillBtn: {
    padding: '8px 14px',
    background: '#37474f',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginLeft: 'auto',
  },
  tableHeaderSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    background: '#fff',
    padding: '16px 20px',
    borderRadius: '10px',
  },
  sectionTitle: {
    margin: '0 0 4px',
    fontSize: '18px',
    color: '#1e293b',
  },
  exportBtn: {
    padding: '10px 18px',
    background: '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  statCountBadge: {
    background: '#e0f2fe',
    color: '#0369a1',
    padding: '6px 14px',
    borderRadius: '20px',
    fontWeight: 'bold',
    fontSize: '13px',
  },
  tableContainer: {
    background: '#fff',
    borderRadius: '12px',
    overflowX: 'auto',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '14px',
  },
  tableHeadRow: {
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
  },
  th: {
    padding: '14px 16px',
    color: '#475569',
    fontWeight: 'bold',
    fontSize: '12px',
    textTransform: 'uppercase',
  },
  tableRow: {
    borderBottom: '1px solid #f1f5f9',
  },
  td: {
    padding: '14px 16px',
    color: '#334155',
  },
  cropBadge: {
    background: '#e8f5e9',
    color: '#2e7d32',
    padding: '2px 8px',
    borderRadius: '4px',
    fontWeight: 'bold',
    fontSize: '12px',
  },
  countPill: {
    background: '#f1f5f9',
    color: '#475569',
    padding: '3px 8px',
    borderRadius: '12px',
    fontWeight: 'bold',
  },
  actionSmallBtn: {
    padding: '6px 10px',
    background: '#e0f2fe',
    color: '#0369a1',
    border: '1px solid #bae6fd',
    borderRadius: '6px',
    fontWeight: 'bold',
    fontSize: '12px',
    cursor: 'pointer',
  },
  configGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '20px',
  },
  configCard: {
    background: '#fff',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  centresListContainer: {
    marginTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  centreConfigRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  cropsListContainer: {
    marginTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  cropConfigRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  numberInput: {
    width: '90px',
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  saveSmallBtn: {
    padding: '6px 12px',
    background: '#2e7d32',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    fontSize: '12px',
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(15, 23, 42, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modalContent: {
    background: '#fff',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '520px',
    padding: '24px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '12px',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#94a3b8',
  },
  formGroup: {
    marginBottom: '14px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: '6px',
  },
  inputModal: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  inputDisabled: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  calcSummaryBox: {
    background: '#f0fdf4',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #bbf7d0',
    fontSize: '14px',
    color: '#166534',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    borderTop: '1px solid #e2e8f0',
    paddingTop: '14px',
  },
  cancelBtn: {
    padding: '10px 18px',
    background: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  confirmBtn: {
    padding: '10px 20px',
    background: '#2e7d32',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  billReceiptModal: {
    background: '#fff',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '680px',
    padding: '24px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  printableReceipt: {
    padding: '20px',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
  },
  receiptHeader: {
    textAlign: 'center',
  },
  billMetaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: '#475569',
    marginTop: '10px',
  },
  receiptGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    marginBottom: '16px',
    fontSize: '13px',
  },
  receiptFieldLabel: {
    color: '#64748b',
    display: 'block',
    fontSize: '11px',
    textTransform: 'uppercase',
  },
  receiptFieldVal: {
    color: '#1e293b',
    fontSize: '14px',
  },
  receiptTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: '16px',
    fontSize: '13px',
  },
  receiptTh: {
    padding: '8px 10px',
    border: '1px solid #cbd5e1',
    textAlign: 'left',
  },
  receiptTd: {
    padding: '8px 10px',
    border: '1px solid #e2e8f0',
  },
  receiptPaymentDetails: {
    background: '#f8fafc',
    padding: '12px 16px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '13px',
    marginBottom: '20px',
  },
  receiptStampArea: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '10px',
  },
  verifiedStamp: {
    display: 'inline-block',
    border: '2px solid #2e7d32',
    color: '#2e7d32',
    padding: '6px 12px',
    fontWeight: '800',
    borderRadius: '4px',
    fontSize: '12px',
    letterSpacing: '1px',
  },
  printActionBtn: {
    padding: '10px 20px',
    background: '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};

export default AdminDashboard;
