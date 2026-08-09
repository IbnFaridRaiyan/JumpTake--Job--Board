import React, { useEffect, useState } from 'react';
import { apiUrl } from '../utils/apiUrl';
import './Pricing.css';

const PLANS = [
  { id: 'basic', name: 'Basic', price: 'Free', strap: 'Start your next move', features: ['3 JumpTake AI messages', 'Public jobs and talent stories', 'Core candidate and employer tools'] },
  { id: 'demo-premium', name: 'Demo Premium', price: '£0.30', cadence: '/30 min', strap: 'Try the Premium momentum', features: ['Premium access for 30 minutes', '50 JumpTake AI messages', 'Stand Out priority placement', 'One-time payment — no subscription'] },
  { id: 'premium', name: 'Premium', price: '£5', cadence: '/month', strap: 'Move with more momentum', featured: true, features: ['50 JumpTake AI messages every day', 'Stand Out placement', 'Priority visibility in Talent Stories and Talent Pool', 'Everything in Basic'] },
  { id: 'extreme', name: 'Extreme', price: '£12', cadence: '/month', strap: 'No limits. Maximum visibility.', features: ['Unlimited JumpTake AI messages', 'Stand Out placement', 'Priority visibility in Talent Stories and Talent Pool', 'Everything in Premium'] }
];

const Pricing = ({ mode = 'candidate' }) => {
  const [membership, setMembership] = useState(null);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [code, setCode] = useState('');
  const [clockNow, setClockNow] = useState(Date.now());
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const readResponse = async (response) => {
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error(response.ok
        ? 'The payment service returned an invalid response.'
        : 'The payment endpoint is not available on this server yet. Deploy/restart the updated backend and check the Stripe environment variables.');
    }
    return response.json();
  };

  const loadMembership = async () => {
    try {
      const response = await fetch(apiUrl('/api/billing/membership'), { headers });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(data.error);
      setMembership(data.membership);
    } catch (error) { setNotice(error.message || 'Could not load your plan.'); }
  };

  useEffect(() => { loadMembership(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (membership?.plan !== 'demo-premium' || !membership.currentPeriodEnd) return undefined;
    let refreshedAfterExpiry = false;
    const timer = window.setInterval(() => {
      const nextNow = Date.now();
      setClockNow(nextNow);
      if (!refreshedAfterExpiry && nextNow >= new Date(membership.currentPeriodEnd).getTime()) {
        refreshedAfterExpiry = true;
        window.clearInterval(timer);
        loadMembership();
      }
    }, 1000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membership?.plan, membership?.currentPeriodEnd]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const billingState = params.get('billing');
    if (billingState === 'cancelled') {
      setNotice('Checkout was cancelled. Your plan has not changed.');
    }
    if (billingState !== 'success') return undefined;

    setNotice('Payment received. Activating your plan…');
    let checks = 0;
    const timer = window.setInterval(async () => {
      checks += 1;
      await loadMembership();
      if (checks >= 6) {
        window.clearInterval(timer);
        setNotice('Payment completed. Your membership status is shown above.');
      }
    }, 1200);

    window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCheckout = async (plan) => {
    setBusy(plan); setNotice('');
    try {
      const response = await fetch(apiUrl('/api/billing/checkout'), { method: 'POST', headers, body: JSON.stringify({ plan }) });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(data.error);
      window.location.assign(data.url);
    } catch (error) { setNotice(error.message || 'Checkout could not be opened.'); setBusy(''); }
  };

  const manageBilling = async () => {
    setBusy('portal'); setNotice('');
    try {
      const response = await fetch(apiUrl('/api/billing/portal'), { method: 'POST', headers });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(data.error);
      window.location.assign(data.url);
    } catch (error) { setNotice(error.message || 'Billing management could not be opened.'); setBusy(''); }
  };

  const redeem = async (event) => {
    event.preventDefault(); if (!code.trim()) return;
    setBusy('code'); setNotice('');
    try {
      const response = await fetch(apiUrl('/api/billing/redeem'), { method: 'POST', headers, body: JSON.stringify({ code }) });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(data.error);
      setMembership(data.membership); setCode(''); setNotice('Plan unlocked successfully.');
    } catch (error) { setNotice(error.message || 'Code could not be redeemed.'); }
    finally { setBusy(''); }
  };

  const currentPlan = membership?.plan || 'basic';
  const demoMillisecondsRemaining = currentPlan === 'demo-premium' && membership?.currentPeriodEnd
    ? Math.max(0, new Date(membership.currentPeriodEnd).getTime() - clockNow)
    : 0;
  const demoMinutes = Math.floor(demoMillisecondsRemaining / 60000);
  const demoSeconds = Math.floor((demoMillisecondsRemaining % 60000) / 1000);
  return <section className={`pricing-page pricing-page-${mode}`}>
    <header className="pricing-hero">
      <span className="pricing-eyebrow">JUMPTAKE MEMBERSHIP</span>
      <h1>Choose how far you want to <em>jump.</em></h1>
      <p>More AI support, more visibility, and more ways to get discovered.</p>
    </header>
    {notice ? <div className="pricing-notice" role="status">{notice}</div> : null}
    {currentPlan === 'demo-premium' ? <div className="pricing-demo-countdown" role="timer" aria-live="polite">
      <div><span>DEMO PREMIUM ACTIVE</span><strong>Your Premium access is live</strong></div>
      <div className="pricing-demo-clock" aria-label={`${demoMinutes} minutes and ${demoSeconds} seconds remaining`}>
        <strong>{String(demoMinutes).padStart(2, '0')}:{String(demoSeconds).padStart(2, '0')}</strong>
        <span>remaining</span>
      </div>
    </div> : null}
    <div className="pricing-grid">
      {PLANS.map((plan) => <article key={plan.id} className={`pricing-card ${plan.featured ? 'is-featured' : ''} ${currentPlan === plan.id ? 'is-current' : ''}`}>
        {plan.featured ? <span className="pricing-popular">MOST POPULAR</span> : null}
        <div><span className="pricing-plan-name">{plan.name}</span><h2>{plan.price}<small>{plan.cadence}</small></h2><p>{plan.strap}</p></div>
        <ul>{plan.features.map((feature) => <li key={feature}><span>✓</span>{feature}</li>)}</ul>
        {currentPlan === plan.id ? <button type="button" disabled>Current plan</button>
          : plan.id === 'basic' ? <button type="button" onClick={manageBilling} disabled={busy === 'portal'}>Manage billing</button>
            : <button type="button" onClick={() => openCheckout(plan.id)} disabled={Boolean(busy)}>{busy === plan.id ? 'Opening…' : plan.id === 'demo-premium' ? 'Unlock for 30 minutes' : `Choose ${plan.name}`}</button>}
      </article>)}
    </div>
    <div className="pricing-payment-note"><strong>Secure checkout</strong><span>Pay by card, Apple Pay, or Google Pay when supported on your device.</span></div>
    <form className="pricing-code" onSubmit={redeem}><div><strong>Have an access code?</strong><span>Unlock a plan with a code issued by JumpTake.</span></div><label><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ENTER CODE" /><button disabled={busy === 'code'}>Redeem</button></label></form>
  </section>;
};

export default Pricing;
