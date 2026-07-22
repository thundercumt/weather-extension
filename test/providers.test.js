const assert = require('node:assert');
const { describe, it, before, after } = require('node:test');
const { PROVIDERS, fetchWeatherOpenMeteo } = require('../src/weather.js');

describe('wttr.in provider fetch', () => {
  let originalFetch;

  before(() => {
    originalFetch = global.fetch;
  });

  after(() => {
    global.fetch = originalFetch;
  });

  it('should format weather data correctly', async () => {
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
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
      })
    });

    const result = await PROVIDERS.wttrin.fetch('Paris');
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

  it('should throw on HTTP error', async () => {
    global.fetch = async () => ({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    await assert.rejects(
      () => PROVIDERS.wttrin.fetch('Paris'),
      { message: 'HTTP 500: Internal Server Error' }
    );
  });
});

describe('Open-Meteo provider metadata', () => {
  it('should not require an API key', () => {
    assert.strictEqual(PROVIDERS['open-meteo'].requiresKey, false);
  });

  it('should have fetch bound to fetchWeatherOpenMeteo', () => {
    assert.strictEqual(PROVIDERS['open-meteo'].fetch, fetchWeatherOpenMeteo);
  });
});

describe('Provider metadata', () => {
  it('should list all providers', () => {
    const providerIds = Object.keys(PROVIDERS);
    assert.deepStrictEqual(providerIds.sort(), ['open-meteo', 'wttrin']);
  });

  it('each provider should have a fetch function', () => {
    for (const id of Object.keys(PROVIDERS)) {
      assert.strictEqual(typeof PROVIDERS[id].fetch, 'function', `Provider ${id} missing fetch function`);
    }
  });

  it('should not require API key for any provider', () => {
    assert.strictEqual(PROVIDERS['open-meteo'].requiresKey, false);
    assert.strictEqual(PROVIDERS.wttrin.requiresKey, false);
  });
});