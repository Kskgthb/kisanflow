// Centralized role-based authentication helpers

// --- FARMER SESSION ---
export const saveSession = (token, farmer) => {
  localStorage.setItem('token', token);
  localStorage.setItem('farmer', JSON.stringify(farmer));
};

export const getSession = () => {
  const token = localStorage.getItem('token');
  const farmerRaw = localStorage.getItem('farmer');
  if (!token || !farmerRaw) return null;
  try {
    const farmer = JSON.parse(farmerRaw);
    if (!farmer || !farmer.id) return null;
    return { token, farmer };
  } catch {
    return null;
  }
};

export const clearSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('farmer');
};

export const isLoggedIn = () => !!getSession();

// --- ADMIN / OFFICER SESSION ---
export const saveAdminSession = (token, admin) => {
  localStorage.setItem('admin_token', token);
  localStorage.setItem('admin_user', JSON.stringify(admin));
};

export const getAdminSession = () => {
  const token = localStorage.getItem('admin_token');
  const adminRaw = localStorage.getItem('admin_user');
  if (!token || !adminRaw) return null;
  try {
    const admin = JSON.parse(adminRaw);
    if (!admin || !admin.id) return null;
    return { token, admin };
  } catch {
    return null;
  }
};

export const clearAdminSession = () => {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
};

export const isAdminLoggedIn = () => !!getAdminSession();
