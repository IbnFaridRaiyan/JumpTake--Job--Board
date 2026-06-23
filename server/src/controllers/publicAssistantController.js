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

  if (asksRegister && mentionsCandidate) return 'candidate-register';
  if (asksRegister && mentionsEmployer) return 'employer-register';
  if (asksLogin && mentionsCandidate) return 'candidate-login';
  if (asksLogin && mentionsEmployer) return 'employer-login';
  if (asksRegister) return 'choose-register';
  if (asksLogin) return 'choose-login';
  return null;
};

const fallbackAnswer = (message, action) => {
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

  return `JumpTake connects candidates and employers in one hiring platform. Candidates can discover jobs, apply, take assessments, build resumes, and network. Employers can post jobs, review applications, search talent, and manage hiring. You asked: "${String(message || '').trim()}". Ask me for a tour, help choosing an account, or details about any page.`;
};

const askPublicAssistant = async (req, res) => {
  const message = String(req.body?.message || '').trim();

  if (!message) {
    return res.status(400).json({ error: 'Please enter a question.' });
  }

  const action = inferAction(message);
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.json({ answer: fallbackAnswer(message, action), action });
  }

  const prompt = `
You are the public JumpTake guide. Answer concisely and accurately using only the product guide below.
Be welcoming and practical. If the visitor asks what to do next, recommend either exploring public jobs, creating an account, or logging in.
If they ask for a tour, explain the relevant public, candidate, and employer areas in a short ordered tour.
Never claim an unavailable feature exists. Do not output URLs or JSON.

${SITE_GUIDE}

Visitor: ${message}
`;

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

  return res.json({ answer: fallbackAnswer(message, action), action });
};

module.exports = {
  askPublicAssistant
};
