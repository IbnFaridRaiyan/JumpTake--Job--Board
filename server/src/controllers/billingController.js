const crypto = require('crypto');
const Stripe = require('stripe');
const User = require('../models/User');
const Employer = require('../models/Employer');
const PlanCode = require('../models/PlanCode');
const { getAccountFromRequest, normalizeMembership } = require('../utils/membership');

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const priceIds = {
  'demo-premium': process.env.STRIPE_DEMO_PREMIUM_PRICE_ID,
  premium: process.env.STRIPE_PREMIUM_PRICE_ID,
  extreme: process.env.STRIPE_EXTREME_PRICE_ID
};
const configuredAppUrl = () => String(process.env.CLIENT_URL || process.env.APP_URL || '').replace(/\/$/, '');

const appUrl = (req) => {
  const requestOrigin = String(req.get('origin') || '').trim();
  if (/^https?:\/\/[^/]+$/i.test(requestOrigin)) return requestOrigin.replace(/\/$/, '');

  const forwardedHost = String(req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim();
  const forwardedProto = String(req.get('x-forwarded-proto') || req.protocol || 'https').split(',')[0].trim();
  if (forwardedHost && /^[a-z0-9.-]+(?::\d+)?$/i.test(forwardedHost) && /^https?$/i.test(forwardedProto)) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return configuredAppUrl() || 'http://localhost:3000';
};

const pricingReturnUrl = (req, accountType, state = '') => {
  const portal = accountType === 'employer' ? 'employer' : 'candidate';
  const portalPath = accountType === 'employer' ? '/employer-dashboard' : '/home';
  const query = state ? `?billing=${encodeURIComponent(state)}` : '';
  return `${appUrl(req)}${portalPath}${query}#${portal}:pricing`;
};

const requireStripe = () => {
  if (!stripe) { const error = new Error('Payments are not configured yet.'); error.status = 503; throw error; }
  return stripe;
};

const findAccountByCustomer = async (customerId) => {
  const candidate = await User.findOne({ 'membership.stripeCustomerId': customerId });
  if (candidate) return candidate;
  return Employer.findOne({ 'membership.stripeCustomerId': customerId });
};

const applySubscription = async (subscription) => {
  const account = await findAccountByCustomer(String(subscription.customer));
  if (!account) return;
  const plan = subscription.metadata?.plan || Object.entries(priceIds).find(([, id]) =>
    subscription.items?.data?.some((item) => item.price?.id === id))?.[0] || 'basic';
  const paidActive = ['active', 'trialing'].includes(subscription.status);
  account.membership.plan = paidActive ? plan : 'basic';
  account.membership.status = subscription.status;
  account.membership.stripeSubscriptionId = subscription.id;
  account.membership.currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null;
  account.membership.cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end);
  account.membership.standOutEnabled = paidActive && ['premium', 'extreme'].includes(plan);
  await account.save();
};

exports.getMembership = async (req, res) => {
  try { const { account } = await getAccountFromRequest(req); res.json({ membership: normalizeMembership(account) }); }
  catch (error) { res.status(error.status || 500).json({ error: error.message }); }
};

exports.createCheckout = async (req, res) => {
  try {
    const plan = String(req.body?.plan || '');
    if (!['demo-premium', 'premium', 'extreme'].includes(plan) || !priceIds[plan]) return res.status(400).json({ error: 'That plan is not configured.' });
    const { account, accountType } = await getAccountFromRequest(req);
    const currentMembership = normalizeMembership(account);
    if (plan === 'demo-premium' && ['premium', 'extreme'].includes(currentMembership.plan)) {
      return res.status(400).json({ error: 'Your account already has a full paid membership.' });
    }
    const client = requireStripe();
    let customerId = account.membership?.stripeCustomerId;
    if (!customerId) {
      const customer = await client.customers.create({
        email: account.email || undefined,
        name: account.username || undefined,
        metadata: { accountId: String(account._id), accountType }
      });
      customerId = customer.id;
      account.membership.stripeCustomerId = customerId;
      await account.save();
    }
    const isDemo = plan === 'demo-premium';
    const session = await client.checkout.sessions.create({
      mode: isDemo ? 'payment' : 'subscription', customer: customerId,
      line_items: [{ price: priceIds[plan], quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${appUrl(req)}${accountType === 'employer' ? '/employer-dashboard' : '/home'}?billing=success&session_id={CHECKOUT_SESSION_ID}#${accountType === 'employer' ? 'employer' : 'candidate'}:pricing`,
      cancel_url: pricingReturnUrl(req, accountType, 'cancelled'),
      ...(isDemo
        ? { payment_intent_data: { metadata: { plan, accountId: String(account._id), accountType } } }
        : { subscription_data: { metadata: { plan, accountId: String(account._id), accountType } } }),
      metadata: { plan, accountId: String(account._id), accountType }
    });
    res.json({ url: session.url });
  } catch (error) { res.status(error.status || 500).json({ error: error.message }); }
};

exports.createPortal = async (req, res) => {
  try {
    const { account } = await getAccountFromRequest(req);
    if (!account.membership?.stripeCustomerId) return res.status(400).json({ error: 'No billing account exists yet.' });
    const accountType = account.companyId ? 'employer' : 'candidate';
    const session = await requireStripe().billingPortal.sessions.create({ customer: account.membership.stripeCustomerId, return_url: pricingReturnUrl(req, accountType) });
    res.json({ url: session.url });
  } catch (error) { res.status(error.status || 500).json({ error: error.message }); }
};

exports.setStandOut = async (req, res) => {
  try {
    const { account } = await getAccountFromRequest(req);
    const membership = normalizeMembership(account);
    if (membership.plan === 'basic') return res.status(403).json({ error: 'Stand Out is available on Premium and Extreme.' });
    account.membership.standOutEnabled = Boolean(req.body?.enabled);
    await account.save();
    res.json({ membership: normalizeMembership(account) });
  } catch (error) { res.status(error.status || 500).json({ error: error.message }); }
};

exports.redeemCode = async (req, res) => {
  try {
    const rawCode = String(req.body?.code || '').trim().toUpperCase();
    if (!rawCode) return res.status(400).json({ error: 'Enter an access code.' });
    const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');
    const code = await PlanCode.findOne({ codeHash, active: true });
    if (!code || code.uses >= code.maxUses || (code.expiresAt && code.expiresAt < new Date())) return res.status(400).json({ error: 'This code is invalid or expired.' });
    const { account, accountType } = await getAccountFromRequest(req);
    if (code.redeemedBy.some((entry) => String(entry.accountId) === String(account._id) && entry.accountType === accountType)) return res.status(400).json({ error: 'This code was already used by this account.' });
    account.membership.plan = code.plan; account.membership.status = 'active'; account.membership.standOutEnabled = true;
    code.uses += 1; code.redeemedBy.push({ accountType, accountId: account._id, redeemedAt: new Date() });
    await Promise.all([account.save(), code.save()]);
    res.json({ membership: normalizeMembership(account) });
  } catch (error) { res.status(error.status || 500).json({ error: error.message }); }
};

exports.handleWebhook = async (req, res) => {
  try {
    const event = requireStripe().webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
    if (['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'].includes(event.type)) await applySubscription(event.data.object);
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      if (session.metadata?.plan === 'demo-premium' && session.payment_status === 'paid') {
        const Model = session.metadata.accountType === 'employer' ? Employer : User;
        const account = await Model.findById(session.metadata.accountId);
        if (account) {
          account.membership.plan = 'demo-premium';
          account.membership.status = 'active';
          account.membership.currentPeriodEnd = new Date(Date.now() + (30 * 60 * 1000));
          account.membership.cancelAtPeriodEnd = false;
          account.membership.standOutEnabled = true;
          account.membership.aiUsageDay = new Date().toISOString().slice(0, 10);
          account.membership.aiMessagesUsed = 0;
          await account.save();
        }
      } else if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        await applySubscription(subscription);
      }
    }
    res.json({ received: true });
  } catch (error) { res.status(400).send(`Webhook error: ${error.message}`); }
};
