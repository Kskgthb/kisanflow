/**
 * Universal Date & Time Formatting Utilities for KisanFlow
 */

export function parseDate(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;
  
  // Handle ISO string or "YYYY-MM-DD"
  if (typeof dateInput === 'string') {
    const cleanStr = dateInput.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
      const [y, m, d] = cleanStr.split('-').map(Number);
      return new Date(y, m - 1, d, 12, 0, 0); // use midday to avoid timezone day shift
    }
    const d = new Date(cleanStr);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function formatAppDate(dateInput) {
  const d = parseDate(dateInput);
  if (!d) return '—';
  
  const options = { day: '2-digit', month: 'short', year: 'numeric' };
  return d.toLocaleDateString('en-IN', options);
}

export function formatAppDateWithDay(dateInput) {
  const d = parseDate(dateInput);
  if (!d) return '—';

  const options = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };
  return d.toLocaleDateString('en-IN', options);
}

export function formatAppTime(timeInput) {
  if (!timeInput) return '';
  const clean = String(timeInput).slice(0, 5); // "10:30:00" -> "10:30"
  const [h, m] = clean.split(':').map(Number);
  if (isNaN(h)) return clean;
  
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${String(m || 0).padStart(2, '0')} ${ampm}`;
}

export function formatAppDateTime(dateInput, timeInput) {
  const dateStr = formatAppDate(dateInput);
  if (!timeInput) return dateStr;
  const timeStr = formatAppTime(timeInput);
  return `${dateStr} • ${timeStr}`;
}

/**
 * Returns relative day label like "Today", "Tomorrow (1 Day After)", "In 2 Days (2 Days After)"
 */
export function getRelativeDateLabel(dateInput) {
  const target = parseDate(dateInput);
  if (!target) return '';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
  const targetMid = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 12, 0, 0);

  const diffDays = Math.round((targetMid - today) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow (1 Day After)';
  if (diffDays === 2) return 'In 2 Days (2 Days After)';
  if (diffDays === 3) return 'In 3 Days';
  if (diffDays > 3) return `In ${diffDays} Days`;
  if (diffDays === -1) return 'Yesterday';
  return `${Math.abs(diffDays)} Days Ago`;
}

/**
 * Checks if slot is today and approaching within ~45 minutes or 30 minutes
 */
export function isSlotApproaching30Min(dateInput, timeInput) {
  if (!dateInput || !timeInput) return false;
  
  const targetDate = parseDate(dateInput);
  if (!targetDate) return false;

  const now = new Date();
  const isSameDay = 
    targetDate.getFullYear() === now.getFullYear() &&
    targetDate.getMonth() === now.getMonth() &&
    targetDate.getDate() === now.getDate();

  if (!isSameDay) return false;

  const cleanTime = String(timeInput).slice(0, 5);
  const [h, m] = cleanTime.split(':').map(Number);
  if (isNaN(h)) return false;

  const slotDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m || 0, 0);
  const diffMins = (slotDateTime.getTime() - now.getTime()) / (1000 * 60);

  // Return true if between -15 mins and +45 mins (ideal for 30 min window)
  return diffMins >= -15 && diffMins <= 45;
}

/**
 * Calculates human readable countdown
 */
export function getSlotCountdown(dateInput, timeInput) {
  if (!dateInput || !timeInput) return null;
  const targetDate = parseDate(dateInput);
  if (!targetDate) return null;

  const now = new Date();
  const cleanTime = String(timeInput).slice(0, 5);
  const [h, m] = cleanTime.split(':').map(Number);
  if (isNaN(h)) return null;

  const slotDateTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), h, m || 0, 0);
  const diffMs = slotDateTime.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / (1000 * 60));

  if (diffMins < 0) return 'Slot time reached / In progress';
  if (diffMins <= 45) return `~${diffMins} mins left (Approaching)`;
  if (diffMins <= 180) return `~${Math.round(diffMins / 60)} hours left`;
  return getRelativeDateLabel(dateInput);
}
