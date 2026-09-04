// Centralized auth helpers

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
