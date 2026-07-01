import React from 'react';

const getApiBase = () => {
  const configured = process.env.REACT_APP_API_URL || '';
  if (typeof window === 'undefined') {
    return configured;
  }

  const isLocalPage = /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
  const isLocalApi = /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?/i.test(configured);
  return !isLocalPage && isLocalApi ? '' : configured;
};

const providers = [
  {
    id: 'google',
    label: 'Continue with Google',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#fbbc05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
        <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z" />
      </svg>
    )
  },
  {
    id: 'github',
    label: 'Continue with GitHub',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M12 .5A11.5 11.5 0 0 0 8.36 22.9c.58.1.79-.25.79-.56v-2.02c-3.21.7-3.89-1.38-3.89-1.38-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.78 1.2 1.78 1.2 1.04 1.77 2.72 1.26 3.38.96.11-.75.41-1.26.74-1.55-2.56-.29-5.26-1.28-5.26-5.72 0-1.26.45-2.29 1.2-3.1-.12-.29-.52-1.47.11-3.06 0 0 .98-.31 3.2 1.18A11.1 11.1 0 0 1 12 6.06c.99 0 1.98.13 2.91.39 2.22-1.49 3.2-1.18 3.2-1.18.63 1.59.23 2.77.11 3.06.75.81 1.2 1.84 1.2 3.1 0 4.45-2.7 5.42-5.28 5.71.42.36.79 1.08.79 2.18v3.02c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z" />
      </svg>
    )
  },
  {
    id: 'apple',
    label: 'Continue with Apple',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M16.65 12.7c-.02-2.26 1.85-3.35 1.94-3.4-1.06-1.55-2.7-1.76-3.27-1.78-1.39-.14-2.73.82-3.43.82-.72 0-1.81-.8-2.98-.78-1.53.02-2.95.89-3.74 2.26-1.6 2.77-.41 6.86 1.15 9.1.76 1.1 1.67 2.34 2.86 2.29 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.78.74 2.99.71 1.24-.02 2.02-1.12 2.78-2.22.87-1.28 1.23-2.52 1.24-2.58-.03-.01-2.39-.92-2.41-3.68zM14.41 6.05c.63-.77 1.06-1.84.94-2.9-.91.04-2.02.61-2.67 1.37-.59.68-1.1 1.77-.96 2.81 1.02.08 2.06-.52 2.69-1.28z" />
      </svg>
    )
  }
];

const SocialAuthButtons = ({ role = 'candidate', onError }) => {
  const startSocialAuth = (provider) => {
    try {
      sessionStorage.setItem('jumptakeSocialAuthReturnUrl', window.location.href);
      const returnTo = encodeURIComponent(window.location.origin);
      window.location.href = `${getApiBase()}/api/auth/${role}/${provider}/start?returnTo=${returnTo}`;
    } catch (error) {
      onError?.(error.message || 'Social sign in could not be started.');
    }
  };

  return (
    <div className="social-auth-row" aria-label="Social sign in options">
      {providers.map((provider) => (
        <button
          key={provider.id}
          type="button"
          className={`social-auth-icon-button social-auth-${provider.id}`}
          onClick={() => startSocialAuth(provider.id)}
          aria-label={provider.label}
          title={provider.label}
        >
          {provider.icon}
        </button>
      ))}
    </div>
  );
};

export default SocialAuthButtons;
