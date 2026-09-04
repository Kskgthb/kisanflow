import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import FarmerDashboard from './pages/FarmerDashboard';
import BookSlot from './pages/BookSlot';
import TrackBooking from './pages/TrackBooking';  // 👈 Naya
import PaymentHistory from './pages/PaymentHistory';  // 👈 Naya
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/farmer/dashboard" element={<FarmerDashboard />} />
        <Route path="/farmer/book-slot" element={<BookSlot />} />
        <Route path="/farmer/track/:bookingId" element={<TrackBooking />} />
        <Route path="/farmer/payments" element={<PaymentHistory />} />
      </Routes>
    </Router>
  );
}

export default App;