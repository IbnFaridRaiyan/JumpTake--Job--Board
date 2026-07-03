import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { persistCandidateSession, persistEmployerSession } from '../utils/authStorage';

const decodePayload = (payload) => {
  const normalized = String(payload || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return JSON.parse(window.atob(padded));
};

const SocialAuthComplete = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('Finishing sign in...');
  const [hasError, setHasError] = useState(false);

  const returnToPreviousPage = () => {
    const previousUrl = sessionStorage.getItem('jumptakeSocialAuthReturnUrl') || '/';
    window.location.href = previousUrl;
  };

  useEffect(() => {
    const error = searchParams.get('error');
    const role = searchParams.get('role') || 'candidate';
    const payload = searchParams.get('payload');

    if (error) {
      setMessage(error);
      setHasError(true);
      return;
    }

    try {
      const data = decodePayload(payload);

      if (role === 'employer' || data.role === 'employer') {
        persistEmployerSession({ token: data.token, employer: data.employer });
        navigate('/employer-dashboard#employer:home', { replace: true });
        return;
      }

      persistCandidateSession({ token: data.token, user: data.user });
      navigate('/home#candidate:home', { replace: true });
    } catch (parseError) {
      setMessage('Social sign in finished without a valid session. Please try again.');
      setHasError(true);
    }
  }, [navigate, searchParams]);

  return (
    <main className="social-auth-complete-screen">
      <section>
        <h1>JumpTake</h1>
        <p>{message}</p>
        {hasError ? (
          <button type="button" onClick={returnToPreviousPage}>
            Back to JumpTake
          </button>
        ) : null}
      </section>
    </main>
  );
};

export default SocialAuthComplete;
