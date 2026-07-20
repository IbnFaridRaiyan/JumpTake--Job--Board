const crypto = require('crypto');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { recordLogin } = require('../utils/securityNotifications');

const User = require('../models/User');
const JobSeeker = require('../models/JobSeeker');
const Employer = require('../models/Employer');
const Company = require('../models/Company');
const { generateJumpTakeId } = require('../utils/jumptakeId');

const JWT_SECRET = process.env.JWT_SECRET || 'jumptake-jwt-secret';
const SOCIAL_PASSWORD_PREFIX = 'jumptake-social-';

const PROVIDERS = new Set(['google', 'github', 'apple']);
const ROLES = new Set(['candidate', 'employer']);

const base64UrlEncode = (value) => Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');

const getFrontendUrl = (req, fallback = '') => (
  String(fallback || process.env.CLIENT_URL || process.env.FRONTEND_URL || req.query?.returnTo || 'http://localhost:3000')
    .replace(/\/+$/, '')
);

const getServerOrigin = (req) => (
  String(
    process.env.API_PUBLIC_URL
    || process.env.SERVER_PUBLIC_URL
    || `${String(req.get('x-forwarded-proto') || req.protocol).split(',')[0]}://${String(req.get('x-forwarded-host') || req.get('host')).split(',')[0]}`
  )
    .replace(/\/+$/, '')
);

const getCallbackUrl = (req, role, provider) => (
  `${getServerOrigin(req)}/api/auth/${role}/${provider}/callback`
);

const redirectWithError = (req, res, message, role = 'candidate') => {
  const frontendUrl = getFrontendUrl(req);
  const params = new URLSearchParams({
    role,
    error: message || 'Social sign in failed'
  });
  return res.redirect(`${frontendUrl}/social-auth-complete?${params.toString()}`);
};

const sendSetupErrorPage = (req, res, { provider, role, message }) => {
  const frontendUrl = getFrontendUrl(req);
  const backUrl = `${frontendUrl}/social-auth-complete?${new URLSearchParams({
    role,
    error: message
  }).toString()}`;

  return res.status(503).send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>JumpTake social sign in</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #050707; color: #fff; font-family: Arial, sans-serif; }
    main { width: min(420px, calc(100vw - 32px)); padding: 22px; border: 1px solid rgba(99,192,184,.28); border-radius: 16px; background: rgba(255,255,255,.04); text-align: center; }
    h1 { margin: 0 0 10px; font-size: 24px; }
    p { color: rgba(255,255,255,.78); line-height: 1.45; }
    a { display: inline-flex; margin-top: 12px; color: #ff8a2a; font-weight: 800; }
  </style>
</head>
<body>
  <main>
    <h1>${provider} sign in is not ready</h1>
    <p>${message}</p>
    <p>Set the ${provider} OAuth credentials on the server, then this button will redirect to the real ${provider} login and permission screen.</p>
    <a href="${backUrl}">Back to JumpTake</a>
  </main>
</body>
</html>`);
};

const createState = ({ role, provider, returnTo }) => (
  jwt.sign({ role, provider, returnTo }, JWT_SECRET, { expiresIn: '10m' })
);

const readState = (rawState) => {
  try {
    return jwt.verify(String(rawState || ''), JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const makeRandomPassword = () => (
  `${SOCIAL_PASSWORD_PREFIX}${crypto.randomBytes(24).toString('hex')}`
);

const getUniqueEmployerUsername = async (seed) => {
  const base = String(seed || 'employer')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 28) || 'employer';

  let candidate = base;
  let suffix = 1;

  while (await Employer.exists({ username: candidate })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  return candidate;
};

const getProviderConfig = (provider) => {
  if (provider === 'google') {
    return {
      clientId: process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET
    };
  }

  if (provider === 'github') {
    return {
      clientId: process.env.GITHUB_CLIENT_ID || process.env.GITHUB_OAUTH_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET || process.env.GITHUB_OAUTH_CLIENT_SECRET
    };
  }

  return {
    clientId: process.env.APPLE_CLIENT_ID || process.env.APPLE_SERVICE_ID,
    teamId: process.env.APPLE_TEAM_ID,
    keyId: process.env.APPLE_KEY_ID,
    privateKey: process.env.APPLE_PRIVATE_KEY
  };
};

const isProviderConfigured = (provider) => {
  const config = getProviderConfig(provider);

  if (provider === 'apple') {
    return Boolean(config.clientId && config.teamId && config.keyId && config.privateKey);
  }

  return Boolean(config.clientId && config.clientSecret);
};

const getAppleClientSecret = () => {
  const config = getProviderConfig('apple');
  const privateKey = String(config.privateKey || '').replace(/\\n/g, '\n');

  return jwt.sign({}, privateKey, {
    algorithm: 'ES256',
    expiresIn: '180d',
    audience: 'https://appleid.apple.com',
    issuer: config.teamId,
    subject: config.clientId,
    keyid: config.keyId
  });
};

const startSocialAuth = (req, res) => {
  const role = String(req.params.role || '').toLowerCase();
  const provider = String(req.params.provider || '').toLowerCase();

  if (!ROLES.has(role) || !PROVIDERS.has(provider)) {
    return redirectWithError(req, res, 'Unknown social sign in provider.', role || 'candidate');
  }

  if (!isProviderConfigured(provider)) {
    return sendSetupErrorPage(req, res, {
      provider,
      role,
      message: `${provider} sign in is not configured on the server yet.`
    });
  }

  const config = getProviderConfig(provider);
  const returnTo = getFrontendUrl(req, req.query.returnTo);
  const state = createState({ role, provider, returnTo });
  const redirectUri = getCallbackUrl(req, role, provider);

  if (provider === 'google') {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      prompt: 'select_account',
      state
    });
    return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  }

  if (provider === 'github') {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      scope: 'read:user user:email',
      state
    });
    return res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    response_mode: 'query',
    scope: 'name email',
    state
  });
  return res.redirect(`https://appleid.apple.com/auth/authorize?${params.toString()}`);
};

const fetchGoogleProfile = async (req, code, role) => {
  const config = getProviderConfig('google');
  const redirectUri = getCallbackUrl(req, role, 'google');
  const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code'
  }).toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  const userInfo = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` }
  });

  return {
    provider: 'google',
    providerId: userInfo.data.sub,
    email: userInfo.data.email,
    name: userInfo.data.name,
    avatar: userInfo.data.picture,
    description: ''
  };
};

const fetchGithubProfile = async (req, code, role) => {
  const config = getProviderConfig('github');
  const redirectUri = getCallbackUrl(req, role, 'github');
  const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: redirectUri
  }, {
    headers: { Accept: 'application/json' }
  });

  const accessToken = tokenResponse.data.access_token;
  const [profileResponse, emailsResponse] = await Promise.all([
    axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json' }
    }),
    axios.get('https://api.github.com/user/emails', {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json' }
    }).catch(() => ({ data: [] }))
  ]);

  const primaryEmail = Array.isArray(emailsResponse.data)
    ? emailsResponse.data.find((entry) => entry.primary && entry.verified)?.email
      || emailsResponse.data.find((entry) => entry.verified)?.email
    : '';

  return {
    provider: 'github',
    providerId: String(profileResponse.data.id || profileResponse.data.login || ''),
    email: profileResponse.data.email || primaryEmail,
    name: profileResponse.data.name || profileResponse.data.login,
    avatar: profileResponse.data.avatar_url,
    description: profileResponse.data.bio || '',
    company: profileResponse.data.company || '',
    website: profileResponse.data.blog || profileResponse.data.html_url || ''
  };
};

const fetchAppleProfile = async (req, code, role, body = {}) => {
  const config = getProviderConfig('apple');
  const redirectUri = getCallbackUrl(req, role, 'apple');
  const tokenResponse = await axios.post('https://appleid.apple.com/auth/token', new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: getAppleClientSecret(),
    redirect_uri: redirectUri,
    grant_type: 'authorization_code'
  }).toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  const claims = jwt.decode(tokenResponse.data.id_token) || {};
  const submittedUser = typeof body.user === 'string' ? JSON.parse(body.user || '{}') : {};
  const submittedName = submittedUser?.name
    ? [submittedUser.name.firstName, submittedUser.name.lastName].filter(Boolean).join(' ')
    : '';

  return {
    provider: 'apple',
    providerId: String(claims.sub || ''),
    email: claims.email,
    name: submittedName || normalizeEmail(claims.email).split('@')[0],
    avatar: '',
    description: ''
  };
};

const fetchProviderProfile = async (req, provider, role, code, body) => {
  if (provider === 'google') {
    return fetchGoogleProfile(req, code, role);
  }

  if (provider === 'github') {
    return fetchGithubProfile(req, code, role);
  }

  return fetchAppleProfile(req, code, role, body);
};

const signCandidateIn = async (profile, req) => {
  const email = normalizeEmail(profile.email);
  if (!email) {
    throw new Error('The provider did not return a verified email address.');
  }

  let user = await User.findOne({ email });
  let jobSeeker = null;

  if (!user) {
    const name = String(profile.name || email.split('@')[0]).trim();
    jobSeeker = await JobSeeker.create({
      name,
      email,
      loginUsername: email.split('@')[0],
      profileImage: profile.avatar || '',
      experience: profile.company ? [profile.company] : [],
      interests: profile.website ? [profile.website] : [],
      resumeText: profile.description || '',
      socialProfile: {
        provider: profile.provider,
        providerId: profile.providerId,
        website: profile.website || ''
      }
    });

    user = await User.create({
      email,
      password: makeRandomPassword(),
      jobSeekerId: jobSeeker._id,
      jumptakeId: await generateJumpTakeId(name),
      authProvider: profile.provider,
      authProviderId: profile.providerId
    });

    jobSeeker.user = user._id;
    await jobSeeker.save();
  } else if (user.jobSeekerId) {
    jobSeeker = await JobSeeker.findById(user.jobSeekerId);
    if (jobSeeker) {
      if (!jobSeeker.profileImage && profile.avatar) jobSeeker.profileImage = profile.avatar;
      if (!jobSeeker.name && profile.name) jobSeeker.name = profile.name;
      if (!jobSeeker.resumeText && profile.description) jobSeeker.resumeText = profile.description;
      await jobSeeker.save();
    }
  }

  const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '1d' });

  await recordLogin({
    account: user,
    recipientType: 'candidate',
    recipientId: user._id,
    req,
    securityAlerts: user.notificationPreferences?.securityAlerts !== false
  });

  return {
    role: 'candidate',
    token,
    user: {
      id: user._id,
      email: user.email,
      jobSeekerId: user.jobSeekerId,
      jobInterests: user.jobInterests || [],
      jumptakeId: user.jumptakeId || null
    }
  };
};

const signEmployerIn = async (profile, req) => {
  const email = normalizeEmail(profile.email);
  if (!email) {
    throw new Error('The provider did not return a verified email address.');
  }

  let employer = await Employer.findOne({ email });
  let company = employer ? await Company.findById(employer.companyId) : null;

  if (!employer) {
    const displayName = String(profile.name || email.split('@')[0]).trim();
    const companyName = String(profile.company || `${displayName} Company`).replace(/^@/, '').trim() || `${displayName} Company`;

    company = await Company.create({
      name: companyName,
      industry: '',
      headquarters: '',
      website: profile.website || '',
      description: profile.description || `${companyName} profile created from ${profile.provider} sign in.`,
      logo: profile.avatar || '',
      source: profile.provider
    });

    employer = await Employer.create({
      username: await getUniqueEmployerUsername(displayName || email.split('@')[0]),
      email,
      password: makeRandomPassword(),
      companyId: company._id,
      authProvider: profile.provider,
      authProviderId: profile.providerId
    });
  }

  const token = jwt.sign(
    { id: employer._id, username: employer.username, companyId: employer.companyId },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  await recordLogin({
    account: employer,
    recipientType: 'employer',
    recipientId: employer.companyId,
    req
  });

  return {
    role: 'employer',
    token,
    employer: {
      id: employer._id,
      username: employer.username,
      companyId: employer.companyId,
      companyName: company?.name || 'Unknown Company',
      email: employer.email || '',
      phone: employer.phone || ''
    }
  };
};

const completeSocialAuth = async (req, res) => {
  const role = String(req.params.role || '').toLowerCase();
  const provider = String(req.params.provider || '').toLowerCase();
  const statePayload = readState(req.query.state || req.body?.state);
  const frontendUrl = getFrontendUrl(req, statePayload?.returnTo);

  try {
    if (!statePayload || statePayload.role !== role || statePayload.provider !== provider) {
      throw new Error('Social sign in state expired. Please try again.');
    }

    const code = req.query.code || req.body?.code;
    if (!code) {
      throw new Error(req.query.error_description || req.query.error || 'No provider authorization code was returned.');
    }

    const profile = await fetchProviderProfile(req, provider, role, code, req.body || {});
    const result = role === 'employer'
      ? await signEmployerIn(profile, req)
      : await signCandidateIn(profile, req);

    const params = new URLSearchParams({
      role,
      payload: base64UrlEncode(result)
    });

    return res.redirect(`${frontendUrl}/social-auth-complete?${params.toString()}`);
  } catch (error) {
    const params = new URLSearchParams({
      role,
      error: error.message || 'Social sign in failed'
    });
    return res.redirect(`${frontendUrl}/social-auth-complete?${params.toString()}`);
  }
};

module.exports = {
  startSocialAuth,
  completeSocialAuth
};
