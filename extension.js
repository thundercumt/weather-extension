const vscode = require('vscode');

const PROVIDERS = {
  'weatherapi': {
    name: 'WeatherAPI.com',
    requiresKey: true,
    getUrl: (city, apiKey) => `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${encodeURIComponent(city)}`,
    parseResponse: (data) => {
      const weather = data.current;
      const location = data.location;
      return [
        `🌤️ Weather in ${location.name}, ${location.country}`,
        `🌡️ Temperature: ${weather.temp_c}°C (feels like ${weather.feelslike_c}°C)`,
        `☁️ Condition: ${weather.condition.text}`,
        `💧 Humidity: ${weather.humidity}%`,
        `💨 Wind: ${weather.wind_kph} km/h ${weather.wind_dir}`
      ].join('\n');
    }
  },
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

function activate(context) {
  console.log('Weather extension is active!');

  const disposable = vscode.commands.registerCommand('weather-extension.getWeather', async function () {
    const config = vscode.workspace.getConfiguration('weather-extension');
    const providerId = config.get('provider', 'weatherapi');
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

    const city = await vscode.window.showInputBox({
      prompt: 'Enter city name for weather',
      placeHolder: 'e.g., London, Tokyo, New York',
      value: 'London'
    });

    if (!city) {
      return; // User cancelled
    }

    try {
      vscode.window.showInformationMessage(`Fetching weather for ${city} using ${provider.name}...`);

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

      vscode.window.showInformationMessage(message, { modal: true });
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to fetch weather: ${error.message}`);
    }
  });

  context.subscriptions.push(disposable);
}

function deactivate() {}

exports.activate = activate;
exports.deactivate = deactivate;