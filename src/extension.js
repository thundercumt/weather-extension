const vscode = require('vscode');

const PROVIDERS = {
  'open-meteo': {
    name: 'Open-Meteo (free, no key needed)',
    requiresKey: false,
    getUrl: (city) => {
      // First geocode the city name to coordinates, then fetch weather
      return null; // handled differently
    },
    parseResponse: null // handled differently
  },
  'wttrin': {
    name: 'wttr.in (free, no key needed)',
    requiresKey: false,
    getUrl: (city) => `https://wttr.in/${encodeURIComponent(city)}?format=j1`,
    parseResponse: (data) => {
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

async function getCityFromGeoIP() {
  try {
    const response = await fetch('https://ip-api.com/json/?fields=city');
    if (!response.ok) return null;
    const data = await response.json();
    return data.city || null;
  } catch {
    return null;
  }
}

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

async function fetchAndUpdateWeather(statusBarItem) {
  const config = vscode.workspace.getConfiguration('weather-extension');
  const providerId = config.get('provider', 'wttrin');
  const apiKey = config.get('apiKey', '');
  const provider = PROVIDERS[providerId];

  if (!provider) {
    return;
  }

  if (provider.requiresKey && !apiKey) {
    return;
  }

  // Detect city from IP to use as default
  const city = await getCityFromGeoIP();
  if (!city) {
    return; // Keep placeholder if we can't detect city
  }

  try {
    let message;
    if (providerId === 'open-meteo') {
      message = await fetchWeatherOpenMeteo(city);
    } else {
      const url = provider.getUrl(city, apiKey);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      message = provider.parseResponse(data);
    }

    const formatted = formatWeatherForStatusBar(message);
    statusBarItem.text = formatted.text;
    statusBarItem.tooltip = formatted.tooltip;
  } catch {
    // Silently fail on startup — keep the placeholder text
  }
}

function activate(context) {
  console.log('Weather extension is active!');

  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'weather-extension.getWeather';
  statusBarItem.text = '$(cloud) Weather';
  statusBarItem.tooltip = 'Click to fetch weather for a city';
  statusBarItem.show();

  // Auto-fetch weather on startup
  fetchAndUpdateWeather(statusBarItem);

  const disposable = vscode.commands.registerCommand('weather-extension.getWeather', async function () {
    const config = vscode.workspace.getConfiguration('weather-extension');
    const providerId = config.get('provider', 'wttrin');
    const apiKey = config.get('apiKey', '');
    const provider = PROVIDERS[providerId];

    if (!provider) {
      vscode.window.showErrorMessage(`Unknown weather provider: ${providerId}`);
      return;
    }

    if (provider.requiresKey && !apiKey) {
      vscode.window.showErrorMessage(
        `${provider.name} requires an API key. Set it in settings: weather-extension.apiKey, or switch to a free provider in settings: weather-extension.provider`
      );
      return;
    }

    // Detect city from IP to use as default
    const city = await getCityFromGeoIP() || '';

    try {
      let message;
      if (providerId === 'open-meteo') {
        message = await fetchWeatherOpenMeteo(city);
      } else {
        const url = provider.getUrl(city, apiKey);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        message = provider.parseResponse(data);
      }

      const formatted = formatWeatherForStatusBar(message);
      statusBarItem.text = formatted.text;
      statusBarItem.tooltip = formatted.tooltip;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to fetch weather: ${error.message}`);
    }
  });

  context.subscriptions.push(disposable);
  context.subscriptions.push(statusBarItem);
}

function deactivate() {}

exports.activate = activate;
exports.deactivate = deactivate;
exports.PROVIDERS = PROVIDERS;
exports.getCityFromGeoIP = getCityFromGeoIP;
exports.fetchWeatherOpenMeteo = fetchWeatherOpenMeteo;
exports.formatWeatherForStatusBar = formatWeatherForStatusBar;