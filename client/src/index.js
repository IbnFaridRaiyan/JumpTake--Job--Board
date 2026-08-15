import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/App';
import './styles/main.css';
import './styles/portal-modern.css';
import './styles/portal-solid-surfaces.css';
import './styles/portal-top-cleanup.css';
import './styles/portal-visual-polish.css';
import './styles/portal-open-canvas.css';
import './styles/portal-final-overrides.css';
import './styles/portal-feed-spacing.css';
import './styles/floating-messenger-redesign.css';
import './styles/messenger-final-canvas.css';
import './styles/settings-final-state.css';
import './styles/portal-layout-final.css';
import './styles/mobile-interactions.css';
import './styles/portal-desktop-dark.css';
import './styles/portal-desktop-light.css';
import './styles/portal-last-overrides.css';
import './styles/portal-widgets.css';
import './styles/portal-widgets-light.css';
import './styles/portal-widgets-dark.css';
import './styles/portal-request-fixes.css';
import './styles/portal-current-request.css';
import './styles/portal-august-visual-fixes.css';
import './styles/assistant-action-review.css';
import './styles/experience-final.css';
import './styles/tutorials.css';
import { installMobileInteractionFeedback } from './utils/mobileHaptics';
import { installMobileModalScrollLock } from './utils/mobileModalScrollLock';

installMobileInteractionFeedback();
installMobileModalScrollLock();

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
