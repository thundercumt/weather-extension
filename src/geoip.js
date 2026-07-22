async function getCityFromGeoIP() {
  // Primary: ip-api.com via HTTPS (fast, no key needed for non-commercial use)
  try {
    const response = await fetch('https://ip-api.com/json/?fields=city');
    if (response.ok) {
      const data = await response.json();
      if (data.city) return data.city;
    }
  } catch {
    // Fall through to backup
  }

  // Backup: freeipapi.com
  try {
    const response = await fetch('https://freeipapi.com/api/json');
    if (response.ok) {
      const data = await response.json();
      return data.cityName || null;
    }
  } catch {
    // Fall through to backup
  }

  // Final fallback: ip-api.com via HTTP (in case HTTPS is blocked)
  try {
    const response = await fetch('http://ip-api.com/json/?fields=city');
    if (response.ok) {
      const data = await response.json();
      return data.city || null;
    }
  } catch {
    // Give up
  }

  return null;
}

module.exports = { getCityFromGeoIP };