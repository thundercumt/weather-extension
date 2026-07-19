const assert = require('node:assert');
const { describe, it, before, after } = require('node:test');
const { fetchWeatherOpenMeteo } = require('../src/extension.js');

describe('fetchWeatherOpenMeteo', () => {
  let originalFetch;

  before(() => {
    originalFetch = global.fetch;
  });

  after(() => {
    global.fetch = originalFetch;
  });

  it('should fetch weather successfully with geocoding and weather data', async () => {
    let callCount = 0;
    global.fetch = async (url) => {
      callCount++;
      if (callCount === 1) {
        // Geocoding response
        assert.ok(url.includes('geocoding-api.open-meteo.com'));
        return {
          ok: true,
          json: async () => ({
            results: [{
              name: 'London',
              country: 'United Kingdom',
              latitude: 51.5,
              longitude: -0.12
            }]
          })
        };
      }
      // Weather response
      assert.ok(url.includes('api.open-meteo.com'));
      return {
        ok: true,
        json: async () => ({
          current_weather: {
            temperature: 15.2,
            windspeed: 24.1,
            winddirection: 220
          }
        })
      };
    };

    const result = await fetchWeatherOpenMeteo('London');
    assert.ok(result.includes('London'));
    assert.ok(result.includes('United Kingdom'));
    assert.ok(result.includes('15.2°C'));
    assert.ok(result.includes('24.1 km/h'));
    assert.ok(result.includes('220°'));
    assert.strictEqual(callCount, 2);
  });

  it('should throw error when city is not found', async () => {
    global.fetch = async () => ({
      ok: true,
      json: async () => ({ results: [] })
    });

    await assert.rejects(
      () => fetchWeatherOpenMeteo('Atlantis'),
      { message: 'City "Atlantis" not found' }
    );
  });

  it('should throw error when geocoding API returns no results property', async () => {
    global.fetch = async () => ({
      ok: true,
      json: async () => ({})
    });

    await assert.rejects(
      () => fetchWeatherOpenMeteo('UnknownCity'),
      { message: 'City "UnknownCity" not found' }
    );
  });

  it('should throw error on geocoding HTTP failure', async () => {
    global.fetch = async () => ({
      ok: false,
      status: 429
    });

    await assert.rejects(
      () => fetchWeatherOpenMeteo('London'),
      { message: 'Geocoding failed: HTTP 429' }
    );
  });

  it('should throw error on weather fetch HTTP failure', async () => {
    let callCount = 0;
    global.fetch = async () => {
      callCount++;
      if (callCount === 1) {
        return {
          ok: true,
          json: async () => ({
            results: [{
              name: 'London',
              country: 'United Kingdom',
              latitude: 51.5,
              longitude: -0.12
            }]
          })
        };
      }
      return {
        ok: false,
        status: 500
      };
    };

    await assert.rejects(
      () => fetchWeatherOpenMeteo('London'),
      { message: 'Weather fetch failed: HTTP 500' }
    );
  });

  it('should encode special characters in city name', async () => {
    let callCount = 0;
    let geocodeUrl = '';
    global.fetch = async (url) => {
      callCount++;
      if (callCount === 1) {
        geocodeUrl = url;
        return {
          ok: true,
          json: async () => ({
            results: [{
              name: 'São Paulo',
              country: 'Brazil',
              latitude: -23.5,
              longitude: -46.6
            }]
          })
        };
      }
      return {
        ok: true,
        json: async () => ({
          current_weather: {
            temperature: 25,
            windspeed: 8,
            winddirection: 90
          }
        })
      };
    };

    await fetchWeatherOpenMeteo('São Paulo');
    assert.ok(geocodeUrl.includes('S%C3%A3o%20Paulo'));
  });

  it('should use correct coordinates for weather fetch', async () => {
    let callCount = 0;
    let weatherUrl = '';
    global.fetch = async (url) => {
      callCount++;
      if (callCount === 1) {
        return {
          ok: true,
          json: async () => ({
            results: [{
              name: 'Tokyo',
              country: 'Japan',
              latitude: 35.6762,
              longitude: 139.6503
            }]
          })
        };
      }
      weatherUrl = url;
      return {
        ok: true,
        json: async () => ({
          current_weather: {
            temperature: 22,
            windspeed: 10,
            winddirection: 180
          }
        })
      };
    };

    await fetchWeatherOpenMeteo('Tokyo');
    assert.ok(weatherUrl.includes('latitude=35.6762'));
    assert.ok(weatherUrl.includes('longitude=139.6503'));
  });
});