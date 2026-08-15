export const JUMPTAKE_TUTORIALS = [
    {
        id: 'tailor-resume',
        eyebrow: 'Create with AI',
        title: 'Tailor a resume to a role',
        description: 'Use an AI action to match your experience to an open role, review the draft, and approve it in the editor.',
        video: '/tutorials/tailor-resume.mp4',
        poster: '/tutorials/tailor-resume.png',
        keywords: ['resume', 'cv', 'tailor', 'cover letter', 'document', 'editor']
    },
    {
        id: 'react-work-news',
        eyebrow: 'Work News',
        title: 'React to a Work News post',
        description: 'Ask JumpTake AI for a reaction, review the proposed action, then approve it before anything changes.',
        video: '/tutorials/react-work-news.mp4',
        poster: '/tutorials/react-work-news.png',
        keywords: ['react', 'reaction', 'like', 'celebrate', 'congratulate', 'motivate']
    },
    {
        id: 'comment-work-news',
        eyebrow: 'Work News',
        title: 'Comment on a Work News post',
        description: 'Let AI draft a thoughtful comment, edit it in the approval card, and post only when it is ready.',
        video: '/tutorials/comment-work-news.mp4',
        poster: '/tutorials/comment-work-news.png',
        keywords: ['comment', 'reply', 'write on post', 'post comment']
    },
    {
        id: 'message-someone',
        eyebrow: 'Messages',
        title: 'Send a message with AI',
        description: 'Name the person, tell AI what you want to say, and approve the message before it is sent.',
        video: '/tutorials/message-someone.mp4',
        poster: '/tutorials/message-someone.png',
        keywords: ['message', 'dm', 'send text', 'chat with', 'contact someone']
    },
    {
        id: 'create-ai-post',
        eyebrow: 'Create',
        title: 'Create and publish a post',
        description: 'Turn a simple idea into a polished post, review the generated copy, and publish with your approval.',
        video: '/tutorials/create-ai-post.mp4',
        poster: '/tutorials/create-ai-post.png',
        keywords: ['create post', 'make post', 'publish', 'posting', 'post', 'write a post', 'share an update']
    },
    {
        id: 'search-jumptake',
        eyebrow: 'Find anything',
        title: 'Use the portal search',
        description: 'Search pages and tools from the field above the navigation, then jump straight to the best result.',
        video: '/tutorials/search-jumptake.mp4',
        poster: '/tutorials/search-jumptake.png',
        keywords: ['search', 'find', 'search bar', 'find anything', 'locate', 'navigation search']
    },
    {
        id: 'ai-notepad-reminder',
        eyebrow: 'Notepad',
        title: 'Create a reminder with AI',
        description: 'Ask AI to remember a task and watch it appear in the Notepad widget with the right reminder details.',
        video: '/tutorials/ai-notepad-reminder.mp4',
        poster: '/tutorials/ai-notepad-reminder.png',
        keywords: ['notepad', 'reminder', 'remind me', 'saved note', 'notes widget', 'make a note']
    },
    {
        id: 'match-job-posts',
        eyebrow: 'Job Posts',
        title: 'Match your profile to a job',
        description: 'Open Job Posts, run Match, and see how your profile aligns with the role before applying.',
        video: '/tutorials/match-job-posts.mp4',
        poster: '/tutorials/match-job-posts.png',
        keywords: ['match', 'job match', 'match job', 'matching', 'match button', 'skills match']
    }
];

export const getTutorialById = (tutorialId = '') => (
    JUMPTAKE_TUTORIALS.find((tutorial) => tutorial.id === tutorialId) || null
);

export const findTutorialForPrompt = (prompt = '') => {
    const normalized = String(prompt || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const asksForWalkthrough = /\b(show|teach|tutorial|guide|walkthrough|demo|video|how do|how can|how to)\b/.test(normalized);
    if (!asksForWalkthrough) return null;

    const bestMatch = JUMPTAKE_TUTORIALS
        .map((tutorial) => ({
            tutorial,
            score: tutorial.keywords.reduce((score, keyword) => (
                normalized.includes(keyword) ? Math.max(score, keyword.split(' ').length * 10 + keyword.length) : score
            ), 0)
        }))
        .sort((a, b) => b.score - a.score)[0];

    return bestMatch?.score > 0 ? bestMatch.tutorial : null;
};
