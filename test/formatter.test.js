const assert = require('node:assert');
const { describe, it } = require('node:test');
const { formatWeatherForStatusBar } = require('../src/extension.js');

describe('formatWeatherForStatusBar', () => {
  it('should extract city and temperature from WeatherAPI format', () => {
    const message = [
      '🌤️ Weather in London, United Kingdom',
      '🌡️ Temperature: 15°C (feels like 13°C)',
      '☁️ Condition: Partly cloudy',
      '💧 Humidity: 72%',
      '💨 Wind: 24 km/h SW'
    ].join('\n');

    const result = formatWeatherForStatusBar(message);
    assert.strictEqual(result.text, '🌤️ London, United Kingdom 15°C');
    assert.strictEqual(result.tooltip, message);
  });

  it('should extract city and temperature from wttr.in format', () => {
    const message = [
      '🌤️ Weather in Paris, France',
      '🌡️ Temperature: 18°C (feels like 16°C)',
      '☁️ Condition: Overcast',
      '💧 Humidity: 65%',
      '💨 Wind: 15 km/h W'
    ].join('\n');

    const result = formatWeatherForStatusBar(message);
    assert.strictEqual(result.text, '🌤️ Paris, France 18°C');
  });

  it('should extract city and temperature from Open-Meteo format', () => {
    const message = [
      '🌤️ Weather in Tokyo, Japan',
      '🌡️ Temperature: 22°C',
      '💨 Wind: 12 km/h',
      '🧭 Wind Direction: 180°'
    ].join('\n');

    const result = formatWeatherForStatusBar(message);
    assert.strictEqual(result.text, '🌤️ Tokyo, Japan 22°C');
  });

  it('should handle missing temperature gracefully', () => {
    const message = [
      '🌤️ Weather in Berlin, Germany',
      '☁️ Condition: Cloudy',
      '💧 Humidity: 60%'
    ].join('\n');

    const result = formatWeatherForStatusBar(message);
    assert.strictEqual(result.text, '🌤️ Berlin, Germany ');
  });

  it('should handle single-line message', () => {
    const message = '🌤️ Weather in Rome, Italy';
    const result = formatWeatherForStatusBar(message);
    assert.strictEqual(result.text, '🌤️ Rome, Italy ');
  });

  it('should handle empty message', () => {
    const result = formatWeatherForStatusBar('');
    assert.strictEqual(result.text, '🌤️  ');
  });

  it('should handle message with decimal temperature', () => {
    const message = [
      '🌤️ Weather in New York, United States of America',
      '🌡️ Temperature: 23.5°C (feels like 21.8°C)'
    ].join('\n');

    const result = formatWeatherForStatusBar(message);
    assert.strictEqual(result.text, '🌤️ New York, United States of America 23.5°C');
  });

  it('should preserve the full message as tooltip', () => {
    const message = [
      '🌤️ Weather in Sydney, Australia',
      '🌡️ Temperature: 20°C (feels like 18°C)',
      '☁️ Condition: Sunny',
      '💧 Humidity: 45%',
      '💨 Wind: 10 km/h E'
    ].join('\n');

    const result = formatWeatherForStatusBar(message);
    assert.strictEqual(result.tooltip, message);
  });
});