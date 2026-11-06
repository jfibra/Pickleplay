import React from 'react';
import ReactDOM from 'react-dom/client';
import MaintenanceGateWrapper from './MaintenanceGateWrapper';
import AppErrorBoundary from './components/AppErrorBoundary';
import { initPlayerEvents } from './services/playerEvents';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

initPlayerEvents();

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppErrorBoundary>
      <MaintenanceGateWrapper />
    </AppErrorBoundary>
  </React.StrictMode>
);
