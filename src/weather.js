const PROVIDERS = {
  'open-meteo': {
    name: 'Open-Meteo (free, no key needed)',
    requiresKey: false,
    fetch: fetchWeatherOpenMeteo
  },
  'wttrin': {
    name: 'wttr.in (free, no key needed)',
    requiresKey: false,
    fetch: async (city) => {
      const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      const current = data.current_condition[0];
      const area = data.nearest_area[0];
      return [
        `🌤️ Weather in ${area.areaName[0].value}, ${area.country[0].value}`,
        `🌡️ Temperature: ${current.temp_C}°C (feels like ${current.FeelsLikeC}°C)`,
        `☁️ Condition: ${current.weatherDesc[0].value}`,
        `💧 Humidity: ${current.humidity}%`,
        `💨 Wind: ${current.windspeedKmph} km/h ${current.winddir16Point}`
      ].join('\n');
    }
  }
};

async function fetchWeatherOpenMeteo(city) {
  // Step 1: Geocode the city name to coordinates
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const geoResponse = await fetch(geoUrl);

  if (!geoResponse.ok) throw new Error(`Geocoding failed: HTTP ${geoResponse.status}`);
  const geoData = await geoResponse.json();
  if (!geoData.results || geoData.results.length === 0) {
    throw new Error(`City "${city}" not found`);
  }
  const { latitude, longitude, name, country } = geoData.results[0];

  // Step 2: Fetch weather using coordinates
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`;
  const weatherResponse = await fetch(weatherUrl);
  if (!weatherResponse.ok) throw new Error(`Weather fetch failed: HTTP ${weatherResponse.status}`);
  const weatherData = await weatherResponse.json();
  const w = weatherData.current_weather;

  return [
    `🌤️ Weather in ${name}, ${country}`,
    `🌡️ Temperature: ${w.temperature}°C`,
    `💨 Wind: ${w.windspeed} km/h`,
    `🧭 Wind Direction: ${w.winddirection}°`
  ].join('\n');
}

function formatWeatherForStatusBar(message) {
  const firstLine = message.split('\n')[0];
  const tempLine = message.split('\n')[1] || '';
  const tempMatch = tempLine.match(/[\d.]+°C/);
  const emojiMatch = firstLine.match(/^(\p{Emoji}\p{Emoji_Modifier}?\p{Emoji_Presentation}?\p{Emoji_Modifier_Base}?\p{Emoji_Component}?\s*)/u);
  const icon = emojiMatch ? emojiMatch[1].trim() : '🌤️';
  const cityPart = firstLine.replace(/^[^\w]*/, '').replace(/^.*in /, '');
  const tempStr = tempMatch ? tempMatch[0] : '';
  return {
    text: `${icon} ${cityPart} ${tempStr}`,
    tooltip: message
  };
}

async function fetchWeather(city, providerId) {
  const provider = PROVIDERS[providerId];
  if (!provider) {
    throw new Error(`Unknown weather provider: ${providerId}`);
  }

  const message = await provider.fetch(city);
  return formatWeatherForStatusBar(message);
}

module.exports = {
  PROVIDERS,
  fetchWeatherOpenMeteo,
  formatWeatherForStatusBar,
  fetchWeather
};