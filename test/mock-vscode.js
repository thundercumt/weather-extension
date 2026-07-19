const Module = require('node:module');
const path = require('path');

const vscodeMock = {
  window: {
    createStatusBarItem: () => ({
      show: () => {},
      dispose: () => {}
    }),
    showInformationMessage: () => {},
    showErrorMessage: () => {},
    showInputBox: () => {}
  },
  workspace: {
    getConfiguration: () => ({
      get: () => undefined
    })
  },
  commands: {
    registerCommand: () => ({ dispose: () => {} })
  },
  StatusBarAlignment: { Right: 1, Left: 2 }
};

// Intercept require('vscode') to return the mock
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === 'vscode') {
    return path.resolve(__dirname, 'mock-vscode.js');
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

module.exports = vscodeMock;