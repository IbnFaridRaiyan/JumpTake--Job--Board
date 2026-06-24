const axios = require('axios');

const SITE_GUIDE = `
JumpTake is a two-sided job platform.

Public routes and actions:
- Candidate registration starts at /job-seeker. Candidates upload a resume, create an account, set job preferences, browse jobs, apply, track applications, take assessments, attend video interviews, build resumes, network with candidates, and manage their profile.
- Employer registration starts at /company. Employers search or register a company, create an employer account, post and manage jobs, browse the talent pool, review applications, create assessments, arrange interviews, message candidates, and manage company settings.
- Candidate login opens the candidate login dialog.
- Employer login opens the employer login dialog.
- Public visitors may browse job summaries, but opening or applying to a job requires candidate login.
- The homepage explains JumpTake, portal features, workflow, and terms.

Portal areas:
Candidate: Home, Notifications, View Candidates, Friends, Bookmarked Candidates, My Applications, My Assessments, Video Interviews, Draft Applications, Bookmarked Jobs, Job Preferences, Resume Playground, My Profile, About JumpTake, Progress Check, Settings.
Employer: Home, Notifications, Post a Job, Manage Jobs, Manage Applications, Talent Pool, Bookmarked Talents, Assessments, Interviews, Inbox, Company Profile, About JumpTake, Progress Check, Settings.
`;

const inferAction = (message) => {
  const normalized = String(message || '').toLowerCase();
  const mentionsCandidate = /\b(candidate|job seeker|jobseeker)\b/.test(normalized);
  const mentionsEmployer = /\b(employer|company|recruiter)\b/.test(normalized);
  const asksRegister = /\b(register|registration|create (an )?account|sign ?up|join)\b/.test(normalized);
  const asksLogin = /\b(log ?in|login|sign ?in)\b/.test(normalized);
  const asksJobs = /\b(job feed|jobs feed|browse jobs|open jobs|show jobs|job posts|find jobs)\b/.test(normalized);

  if (asksRegister && mentionsCandidate) return 'candidate-register';
  if (asksRegister && mentionsEmployer) return 'employer-register';
  if (asksLogin && mentionsCandidate) return 'candidate-login';
  if (asksLogin && mentionsEmployer) return 'employer-login';
  if (asksJobs) return 'open-jobs';
  if (asksRegister) return 'choose-register';
  if (asksLogin) return 'choose-login';
  return null;
};

const buildHistoryBlock = (history = []) => (
  history
    .filter((entry) => entry && typeof entry.text === 'string' && entry.text.trim())
    .slice(-8)
    .map((entry) => `${entry.role === 'assistant' ? 'Assistant' : 'Visitor'}: ${entry.text.trim()}`)
    .join('\n')
);

const getLastHistoryEntry = (history = [], role) => (
  [...history]
    .reverse()
    .find((entry) => entry && entry.role === role && typeof entry.text === 'string' && entry.text.trim())
);

const extractKnowledgeTopic = (message) => {
  const source = String(message || '').trim();
  const normalized = source.toLowerCase();

  const patterns = [
    /^what is (?:a |an |the )?(.+)$/i,
    /^who is (.+)$/i,
    /^where is (.+)$/i,
    /^tell me about (.+)$/i,
    /^explain (.+)$/i
  ];

  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  if (
    !inferAction(normalized)
    && /^[a-z0-9][a-z0-9\s,'-]{2,48}$/i.test(source)
    && /\b(banana|new york|london|paris|weather|movie|music|sports|bitcoin|crypto)\b/i.test(source)
  ) {
    return source.trim();
  }

  return '';
};

const lookupGeneralKnowledge = async (message) => {
  const topic = extractKnowledgeTopic(message);

  if (!topic) {
    return '';
  }

  const variants = [
    topic,
    topic.replace(/\?+$/, ''),
    topic.replace(/\s+/g, '_')
  ].filter(Boolean);

  for (const variant of [...new Set(variants)]) {
    try {
      const response = await axios.get(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(variant)}`,
        {
          timeout: 7000,
          headers: {
            Accept: 'application/json'
          }
        }
      );

      const summary = String(response.data?.extract || '').trim();
      if (!summary) {
        continue;
      }

      return `${summary} If you want, I can also help you navigate JumpTake after that.`;
    } catch (error) {
      if (error.response?.status && error.response.status !== 404) {
        console.warn('[PUBLIC ASSISTANT] Knowledge lookup failed:', error.response.status);
      }
    }
  }

  return '';
};

const fallbackAnswer = (message, action, history = []) => {
  const normalized = String(message || '').toLowerCase();
  const priorConversation = Array.isArray(history) && history.length > 0;
  const lastAssistantText = String(getLastHistoryEntry(history, 'assistant')?.text || '').toLowerCase();
  const looksLikeCasualShortMessage = normalized.length <= 12 && /^[a-z0-9\s,'!?-]+$/i.test(normalized);

  if (action === 'choose-login') {
    return 'Would you like to log in as a candidate or an employer?';
  }
  if (action === 'choose-register') {
    return 'Which account would you like to create: candidate or employer?';
  }
  if (action === 'candidate-login') {
    return 'Opening candidate login. Candidates can browse jobs, apply, track applications, complete assessments, and manage their profile.';
  }
  if (action === 'employer-login') {
    return 'Opening employer login. Employers can post jobs, manage applications, browse talent, and arrange assessments and interviews.';
  }
  if (action === 'candidate-register') {
    return 'Opening candidate registration. Start by uploading your resume, then create your account and choose job preferences.';
  }
  if (action === 'employer-register') {
    return 'Opening employer registration. Start by searching for your company or entering company information manually.';
  }
  if (action === 'open-jobs') {
    return 'Opening the public job feed. You can browse active jobs now, and candidate login is only needed when you want to open details or apply.';
  }

  if (/\b(what('?s| is) your name|who are you)\b/.test(normalized)) {
    return "I'm JumpTake AI. Want to learn more about me?";
  }

  if (/\b(yes|yeah|yep|sure|okay|ok|tell me more)\b/.test(normalized) && /learn more about me/.test(lastAssistantText)) {
    return "I'm JumpTake AI, your guide for the platform. I can help you explore jobs, explain portal pages, walk you through candidate or employer flows, and point you to the right next step.";
  }

  if (/\b(no|nope|nah)\b/.test(normalized) && /learn more about me/.test(lastAssistantText)) {
    return "No problem. I'm here whenever you want help with JumpTake, jobs, applications, resumes, hiring, or account setup.";
  }

  if (/\b(hi|hii|hello|helo|hey|hiya|yo|sup|good morning|good evening)\b/.test(normalized)) {
    return priorConversation
      ? "Hey, I'm still with you. Ask me about jobs, accounts, applications, resumes, hiring, or any JumpTake page."
      : "Hey there. I'm JumpTake AI. I can help with jobs, accounts, resumes, hiring, portal pages, and how the platform works.";
  }

  if (/\b(how are you|how you doing|what'?s up|whats up|wyd)\b/.test(normalized)) {
    return "I'm doing well and ready to help. Ask me about JumpTake, jobs, applications, resumes, hiring, or what you want to do next.";
  }

  if (/\b(thanks|thank you|cheers)\b/.test(normalized)) {
    return "You're welcome. If you want, I can help with the next step on JumpTake too.";
  }

  if (/\b(bye|goodbye|see you)\b/.test(normalized)) {
    return 'See you soon. Come back if you want help with JumpTake, jobs, hiring, or account setup.';
  }

  if (/\b(noob|newbie|beginner)\b/.test(normalized)) {
    return "No worries. If you're new to this, I can keep it simple and walk you through JumpTake step by step. Tell me whether you want the candidate side, employer side, jobs, or account setup.";
  }

  if (/\b(tour|show me around|how does jumptake work|how it works)\b/.test(normalized)) {
    return "Quick tour: public visitors can browse jobs, candidates can register, apply, build resumes, and track applications, and employers can register, post jobs, review applications, and search talent. Tell me which side you want to explore and I'll walk you through it.";
  }

  if (/\b(what next|next step|what should i do|help me start)\b/.test(normalized)) {
    return 'A good next step is either browsing the public job feed, creating an account, or logging in. If you want, I can point you to the candidate or employer side directly.';
  }

  if (/\bbanana\b/.test(normalized)) {
    return "A banana is a fruit. If you're done with snack talk, I can also help you explore JumpTake, jobs, resumes, applications, or hiring.";
  }

  if (/\bnew york\b/.test(normalized)) {
    return "New York is one of the best-known cities in the United States, famous for finance, media, culture, and a huge job market. If you want, I can switch us back to JumpTake and help with jobs or accounts too.";
  }

  if (/\b(what is|who is|where is|tell me about|explain)\b/.test(normalized)) {
    return "I can answer a bit of that too. Ask it again and I'll keep it short, then I can bring us back to JumpTake if you want.";
  }

  if (normalized.length <= 6 && /\b(ok|okay|cool|nice|hmm|huh|lol|lmao)\b/.test(normalized)) {
    return "Got you. I'm here when you want help with JumpTake or the next step.";
  }

  if (looksLikeCasualShortMessage) {
    return priorConversation
      ? "I'm here with you. Tell me what you want to do next on JumpTake, and I'll keep it simple."
      : "Hey. Tell me what you want help with on JumpTake, and I'll guide you.";
  }

  if (/\b(candidate|resume|application|assessment|interview|employer|company|hiring|talent|job|profile|portal)\b/.test(normalized)) {
    return "I can help with that. Tell me the exact page, action, or problem you want help with, and I'll keep it focused and practical.";
  }

  return priorConversation
    ? "I can stay with this. Ask me about the next step, a page, a job action, account setup, or anything you want to do on JumpTake."
    : 'I can help with JumpTake. Ask for a tour, a page explanation, jobs, account setup, or the next step.';
};

const askOpenAI = async ({ prompt }) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return '';
  }

  const model = process.env.OPENAI_MODEL || 'gpt-5.2';
  const response = await axios.post(
    'https://api.openai.com/v1/responses',
    {
      model,
      input: prompt,
      max_output_tokens: 500
    },
    {
      timeout: 20000,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const directText = String(response.data?.output_text || '').trim();
  if (directText) {
    return directText;
  }

  const outputBlocks = Array.isArray(response.data?.output) ? response.data.output : [];
  const joined = outputBlocks
    .flatMap((block) => Array.isArray(block?.content) ? block.content : [])
    .map((part) => part?.text || '')
    .join('')
    .trim();

  return joined;
};

const shouldUseDirectAssistantReply = (message, action) => {
  const normalized = String(message || '').toLowerCase();

  if (action) {
    return true;
  }

  return /\b(hi|hii|hello|helo|hey|hiya|yo|sup|good morning|good evening|what'?s up|whats up|how are you|how you doing|wyd|what('?s| is) your name|who are you|thanks|thank you|cheers|bye|goodbye|see you|noob|newbie|beginner|tour|show me around|how does jumptake work|how it works|what next|next step|what should i do|help me start)\b/.test(normalized);
};

const askPublicAssistant = async (req, res) => {
  const message = String(req.body?.message || '').trim();
  const history = Array.isArray(req.body?.history) ? req.body.history : [];

  if (!message) {
    return res.status(400).json({ error: 'Please enter a question.' });
  }

  const action = inferAction(message);
  const apiKey = process.env.GEMINI_API_KEY;

  const knowledgeAnswer = await lookupGeneralKnowledge(message);
  if (knowledgeAnswer) {
    return res.json({ answer: knowledgeAnswer, action: null });
  }

  if (shouldUseDirectAssistantReply(message, action)) {
    return res.json({ answer: fallbackAnswer(message, action, history), action });
  }

  const conversationHistory = buildHistoryBlock(history);

  const prompt = `
You are the public JumpTake guide. Answer concisely and accurately using only the product guide below.
Be welcoming and practical. If the visitor asks what to do next, recommend either exploring public jobs, creating an account, or logging in.
If they ask for a tour, explain the relevant public, candidate, and employer areas in a short ordered tour.
You may also answer broader career, job-search, resume, hiring, and platform-guidance questions in a helpful concise way.
If a question is unrelated to JumpTake, careers, hiring, candidates, employers, resumes, assessments, interviews, applications, or jobs, answer briefly in a natural way first, then gently offer JumpTake help instead of repeating a long introduction.
Do not repeat the same overview paragraph on every turn. Use the conversation history and answer the latest message directly.
If the visitor is making casual conversation, reply naturally but steer back toward JumpTake help.
If the visitor says hello, hi, hey, or another greeting, greet them back instead of giving a long product summary.
If the visitor asks your name, say you are JumpTake AI and ask whether they want to learn more.
If the visitor uses slang or casual language, interpret it naturally and reply like a polished support assistant.
Avoid repeating the phrase "JumpTake connects candidates and employers in one hiring platform" unless the visitor explicitly asks for the platform overview again.
Never claim an unavailable feature exists. Do not output URLs or JSON.

${SITE_GUIDE}

Conversation so far:
${conversationHistory || 'No prior conversation.'}

Visitor: ${message}
`;

  try {
    const openAiAnswer = await askOpenAI({ prompt });
    if (openAiAnswer) {
      return res.json({ answer: openAiAnswer, action });
    }
  } catch (error) {
    console.warn('[PUBLIC ASSISTANT] OpenAI failed:', error.response?.data?.error?.message || error.message);
  }

  if (!apiKey) {
    return res.json({ answer: fallbackAnswer(message, action, history), action });
  }

  const models = [
    process.env.GEMINI_MODEL,
    'gemini-2.0-flash',
    'gemini-1.5-flash'
  ].filter(Boolean);

  for (const model of [...new Set(models)]) {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 500
          }
        },
        { timeout: 20000 }
      );

      const answer = response.data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || '')
        .join('')
        .trim();

      if (answer) {
        return res.json({ answer, action });
      }
    } catch (error) {
      console.warn(`[PUBLIC ASSISTANT] ${model} failed:`, error.response?.data?.error?.message || error.message);
    }
  }

  return res.json({ answer: fallbackAnswer(message, action, history), action });
};

module.exports = {
  askPublicAssistant
};
