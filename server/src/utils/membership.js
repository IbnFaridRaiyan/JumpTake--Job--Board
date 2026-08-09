const User = require('../models/User');
const Employer = require('../models/Employer');
const { getAuthenticatedPayload } = require('./candidateAuth');

const PLAN_LIMITS = Object.freeze({ basic: 3, 'demo-premium': 50, premium: 50, extreme: null });

const getAccountFromRequest = async (req) => {
  const payload = getAuthenticatedPayload(req);
  const accountType = payload.companyId ? 'employer' : 'candidate';
  const Model = accountType === 'employer' ? Employer : User;
  const account = await Model.findById(payload.id);
  if (!account) {
    const error = new Error('Account no longer exists');
    error.status = 401;
    throw error;
  }
  return { account, accountType };
};

const dayKey = (date = new Date()) => date.toISOString().slice(0, 10);

const normalizeMembership = (account) => {
  const membership = account.membership || {};
  const demoActive = membership.plan === 'demo-premium'
    && ['active', 'trialing'].includes(membership.status)
    && membership.currentPeriodEnd
    && new Date(membership.currentPeriodEnd) > new Date();
  const activePaid = ['active', 'trialing'].includes(membership.status);
  const plan = demoActive
    ? 'demo-premium'
    : activePaid && ['premium', 'extreme'].includes(membership.plan) ? membership.plan : 'basic';
  const today = dayKey();
  const used = plan === 'basic'
    ? Number(membership.basicMessagesUsed || 0)
    : membership.aiUsageDay === today ? Number(membership.aiMessagesUsed || 0) : 0;
  const limit = PLAN_LIMITS[plan];
  return {
    plan,
    status: plan === 'basic' ? 'active' : membership.status,
    price: plan === 'demo-premium' ? 0.30 : plan === 'premium' ? 5 : plan === 'extreme' ? 12 : 0,
    currency: 'GBP',
    aiMessagesUsed: used,
    aiMessageLimit: limit,
    aiMessagesRemaining: limit === null ? null : Math.max(0, limit - used),
    standOutEnabled: plan !== 'basic' && membership.standOutEnabled !== false,
    currentPeriodEnd: membership.currentPeriodEnd || null,
    cancelAtPeriodEnd: Boolean(membership.cancelAtPeriodEnd)
  };
};

const consumeAiMessage = async (account) => {
  const entitlement = normalizeMembership(account);
  if (entitlement.aiMessageLimit !== null && entitlement.aiMessagesRemaining <= 0) {
    const error = new Error(entitlement.plan === 'basic'
      ? 'Your 3 Basic AI messages have been used. Upgrade to Premium to continue.'
      : entitlement.plan === 'demo-premium'
        ? 'Your Demo Premium AI allowance has been used. Upgrade to Premium or Extreme to continue.'
        : 'Your 50 Premium AI messages for today have been used. Upgrade to Extreme or try again tomorrow.');
    error.status = 402;
    error.code = 'AI_PLAN_LIMIT_REACHED';
    error.entitlement = entitlement;
    throw error;
  }

  if (entitlement.plan === 'basic') {
    account.membership.basicMessagesUsed = Number(account.membership.basicMessagesUsed || 0) + 1;
  } else if (['demo-premium', 'premium'].includes(entitlement.plan)) {
    const today = dayKey();
    if (account.membership.aiUsageDay !== today) {
      account.membership.aiUsageDay = today;
      account.membership.aiMessagesUsed = 0;
    }
    account.membership.aiMessagesUsed = Number(account.membership.aiMessagesUsed || 0) + 1;
  }
  await account.save();
  return normalizeMembership(account);
};

module.exports = { PLAN_LIMITS, getAccountFromRequest, normalizeMembership, consumeAiMessage };
