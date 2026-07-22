const assert = require('node:assert');
const { describe, it, before, after } = require('node:test');
const { getCityFromGeoIP } = require('../src/geoip.js');

describe('getCityFromGeoIP', () => {
  let originalFetch;

  before(() => {
    originalFetch = global.fetch;
  });

  after(() => {
    global.fetch = originalFetch;
  });

  it('should return city name on successful API response', async () => {
    global.fetch = async () => ({
      ok: true,
      json: async () => ({ city: 'London' })
    });
    const result = await getCityFromGeoIP();
    assert.strictEqual(result, 'London');
  });

  it('should return null when city field is missing', async () => {
    global.fetch = async () => ({
      ok: true,
      json: async () => ({})
    });
    const result = await getCityFromGeoIP();
    assert.strictEqual(result, null);
  });

  it('should return null on non-ok response', async () => {
    global.fetch = async () => ({
      ok: false
    });
    const result = await getCityFromGeoIP();
    assert.strictEqual(result, null);
  });

  it('should return null on network error', async () => {
    global.fetch = async () => {
      throw new Error('Network error');
    };
    const result = await getCityFromGeoIP();
    assert.strictEqual(result, null);
  });

  it('should return null on fetch timeout', async () => {
    global.fetch = async () => {
      throw new Error('fetch failed');
    };
    const result = await getCityFromGeoIP();
    assert.strictEqual(result, null);
  });

  it('should call the correct URL', async () => {
    let calledUrl = '';
    global.fetch = async (url) => {
      calledUrl = url;
      return {
        ok: true,
        json: async () => ({ city: 'Tokyo' })
      };
    };
    await getCityFromGeoIP();
    assert.strictEqual(calledUrl, 'https://ip-api.com/json/?fields=city');
  });
});