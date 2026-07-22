const assert = require('node:assert');
const { describe, it } = require('node:test');
const { PROVIDERS } = require('../src/weather.js');

describe('wttr.in provider parsing', () => {
  const mockData = {
    current_condition: [{
      temp_C: '18',
      FeelsLikeC: '16',
      weatherDesc: [{ value: 'Overcast' }],
      humidity: '65',
      windspeedKmph: '15',
      winddir16Point: 'W'
    }],
    nearest_area: [{
      areaName: [{ value: 'Paris' }],
      country: [{ value: 'France' }]
    }]
  };

  it('should parse wttr.in weather data correctly', () => {
    const result = PROVIDERS.wttrin.parseResponse(mockData);
    const lines = result.split('\n');
    assert.strictEqual(lines.length, 5);
    assert.ok(lines[0].includes('Paris'));
    assert.ok(lines[0].includes('France'));
    assert.ok(lines[1].includes('18°C'));
    assert.ok(lines[1].includes('feels like 16°C'));
    assert.ok(lines[2].includes('Overcast'));
    assert.ok(lines[3].includes('65%'));
    assert.ok(lines[4].includes('15 km/h'));
    assert.ok(lines[4].includes('W'));
  });
});

describe('Open-Meteo provider metadata', () => {
  it('should not require an API key', () => {
    assert.strictEqual(PROVIDERS['open-meteo'].requiresKey, false);
  });

  it('should have getUrl returning null', () => {
    assert.strictEqual(PROVIDERS['open-meteo'].getUrl('London'), null);
  });

  it('should have parseResponse as null', () => {
    assert.strictEqual(PROVIDERS['open-meteo'].parseResponse, null);
  });
});

describe('Provider metadata', () => {
  it('should list all providers', () => {
    const providerIds = Object.keys(PROVIDERS);
    assert.deepStrictEqual(providerIds.sort(), ['open-meteo', 'wttrin']);
  });

  it('should not require API key for any provider', () => {
    assert.strictEqual(PROVIDERS['open-meteo'].requiresKey, false);
    assert.strictEqual(PROVIDERS.wttrin.requiresKey, false);
  });
});