import React, { useEffect, useState } from 'react';
import { apiUrl } from '../utils/apiUrl';
import './Pricing.css';

const PLANS = [
  { id: 'basic', name: 'Basic', price: 'Free', strap: 'Start your next move', features: ['3 JumpTake AI messages', 'Public jobs and talent stories', 'Core candidate and employer tools'] },
  { id: 'premium', name: 'Premium', price: '£5', cadence: '/month', strap: 'Move with more momentum', featured: true, features: ['50 JumpTake AI messages every day', 'Stand Out placement', 'Priority visibility in Talent Stories and Talent Pool', 'Everything in Basic'] },
  { id: 'extreme', name: 'Extreme', price: '£12', cadence: '/month', strap: 'No limits. Maximum visibility.', features: ['Unlimited JumpTake AI messages', 'Stand Out placement', 'Priority visibility in Talent Stories and Talent Pool', 'Everything in Premium'] }
];

const Pricing = ({ mode = 'candidate' }) => {
  const [membership, setMembership] = useState(null);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [code, setCode] = useState('');
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
  return <section className={`pricing-page pricing-page-${mode}`}>
    <header className="pricing-hero">
      <span className="pricing-eyebrow">JUMPTAKE MEMBERSHIP</span>
      <h1>Choose how far you want to <em>jump.</em></h1>
      <p>More AI support, more visibility, and more ways to get discovered.</p>
    </header>
    {notice ? <div className="pricing-notice" role="status">{notice}</div> : null}
    <div className="pricing-grid">
      {PLANS.map((plan) => <article key={plan.id} className={`pricing-card ${plan.featured ? 'is-featured' : ''} ${currentPlan === plan.id ? 'is-current' : ''}`}>
        {plan.featured ? <span className="pricing-popular">MOST POPULAR</span> : null}
        <div><span className="pricing-plan-name">{plan.name}</span><h2>{plan.price}<small>{plan.cadence}</small></h2><p>{plan.strap}</p></div>
        <ul>{plan.features.map((feature) => <li key={feature}><span>✓</span>{feature}</li>)}</ul>
        {currentPlan === plan.id ? <button type="button" disabled>Current plan</button>
          : plan.id === 'basic' ? <button type="button" onClick={manageBilling} disabled={busy === 'portal'}>Manage billing</button>
            : <button type="button" onClick={() => openCheckout(plan.id)} disabled={Boolean(busy)}>{busy === plan.id ? 'Opening…' : `Choose ${plan.name}`}</button>}
      </article>)}
    </div>
    <div className="pricing-payment-note"><strong>Secure checkout</strong><span>Pay by card, Apple Pay, or Google Pay when supported on your device.</span></div>
    <form className="pricing-code" onSubmit={redeem}><div><strong>Have an access code?</strong><span>Unlock a plan with a code issued by JumpTake.</span></div><label><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ENTER CODE" /><button disabled={busy === 'code'}>Redeem</button></label></form>
  </section>;
};

export default Pricing;
