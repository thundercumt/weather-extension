const vscode = require('vscode');
const { getCityFromGeoIP } = require('./geoip');
const { fetchWeather } = require('./weather');

async function fetchAndUpdateWeather(statusBarItem) {
  const config = vscode.workspace.getConfiguration('weather-extension');
  const providerId = config.get('provider', 'wttrin');
  const apiKey = config.get('apiKey', '');

  // Detect city from IP to use as default
  const city = await getCityFromGeoIP();
  if (!city) {
    return; // Keep placeholder if we can't detect city
  }

  try {
    const formatted = await fetchWeather(city, providerId, apiKey);
    statusBarItem.text = formatted.text;
    statusBarItem.tooltip = formatted.tooltip;
  } catch {
    // Show a subtle error indicator instead of keeping the generic placeholder
    statusBarItem.text = '$(warning) Weather';
    statusBarItem.tooltip = 'Weather unavailable. Click to retry.';
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

  // Retry when window gains focus in case network wasn't ready at activation
  const focusDisposable = vscode.window.onDidChangeWindowState((windowState) => {
    if (windowState.focused) {
      // Only retry if the status bar still shows the placeholder or error indicator
      const currentText = statusBarItem.text;
      if (currentText === '$(cloud) Weather' || currentText === '$(warning) Weather') {
        fetchAndUpdateWeather(statusBarItem);
      }
    }
  });
  context.subscriptions.push(focusDisposable);

  // Refresh weather every 30 minutes
  const refreshInterval = setInterval(() => fetchAndUpdateWeather(statusBarItem), 30 * 60 * 1000);
  context.subscriptions.push({ dispose: () => clearInterval(refreshInterval) });

  const disposable = vscode.commands.registerCommand('weather-extension.getWeather', async function () {
    const config = vscode.workspace.getConfiguration('weather-extension');
    const providerId = config.get('provider', 'wttrin');
    const apiKey = config.get('apiKey', '');
    const { PROVIDERS } = require('./weather');
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
      const formatted = await fetchWeather(city, providerId, apiKey);
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