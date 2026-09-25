import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from './theme/ThemeContext';
import { RootErrorBoundary } from './components/RootErrorBoundary';
import App from './App';

const root = createRoot(document.getElementById('root')!);
root.render(
  <RootErrorBoundary>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </RootErrorBoundary>
);
