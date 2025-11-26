// Market hours detection utility
// Determines if US stock market is in regular hours, pre/post market, or closed

/**
 * Get current US market status
 * @returns {string} 'regular' | 'pre-market' | 'post-market' | 'closed'
 */
export function getMarketStatus() {
  const now = new Date();

  // Convert to ET (Eastern Time) timezone
  const etTime = new Date(now.toLocaleString('en-US', {
    timeZone: 'America/New_York'
  }));

  const day = etTime.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = etTime.getHours();
  const minute = etTime.getMinutes();
  const timeInMinutes = hour * 60 + minute;

  // Weekend check
  if (day === 0 || day === 6) {
    return 'closed';
  }

  // Regular market hours: 09:30 - 16:00 ET (570 - 960 minutes)
  if (timeInMinutes >= 570 && timeInMinutes < 960) {
    return 'regular';
  }

  // Pre-market hours: 04:00 - 09:30 ET (240 - 570 minutes)
  if (timeInMinutes >= 240 && timeInMinutes < 570) {
    return 'pre-market';
  }

  // Post-market hours: 16:00 - 20:00 ET (960 - 1200 minutes)
  if (timeInMinutes >= 960 && timeInMinutes < 1200) {
    return 'post-market';
  }

  // Outside trading hours
  return 'closed';
}

/**
 * Check if market is in regular trading hours
 * @returns {boolean}
 */
export function isRegularMarketHours() {
  return getMarketStatus() === 'regular';
}

/**
 * Check if market is in pre or post market hours
 * @returns {boolean}
 */
export function isPrePostMarketHours() {
  const status = getMarketStatus();
  return status === 'pre-market' || status === 'post-market';
}

/**
 * Get formatted market status info
 * @returns {object} Status info with timestamp
 */
export function getMarketStatusInfo() {
  const status = getMarketStatus();
  const now = new Date();

  return {
    status,
    timestamp: now.toISOString(),
    timezone: 'America/New_York'
  };
}

export default {
  getMarketStatus,
  isRegularMarketHours,
  isPrePostMarketHours,
  getMarketStatusInfo
};
