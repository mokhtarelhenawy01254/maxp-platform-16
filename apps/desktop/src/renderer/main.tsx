import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from './theme/ThemeContext';
import { RootErrorBoundary } from './components/RootErrorBoundary';
import { initMockElectronBridge } from './mockElectronBridge';
import App from './App';

initMockElectronBridge();

const root = createRoot(document.getElementById('root')!);
root.render(
  <RootErrorBoundary>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </RootErrorBoundary>
);
