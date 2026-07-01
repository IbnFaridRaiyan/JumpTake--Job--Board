import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ResumeFilePreview from './ResumeFilePreview';
import { apiUrl } from '../utils/apiUrl';
import reactionButtonIcon from './media/reaction.png';

const WORK_NEWS_STORAGE_KEY = 'jumptakeWorkNewsPosts';
const TALENT_STORIES_STORAGE_KEY = 'jumptakeTalentStoriesPosts';
const JOB_REACH_STORAGE_KEY = 'jumptakeJobReachMap';
const HOME_JOB_LIKE_STORAGE_KEY = 'jumptakeHomeJobLikeMap';
const RESUME_PLAYGROUND_STORAGE_KEY = 'jumptakeResumePlayground:';
const SAVED_POSTS_STORAGE_PREFIX = 'jumptakeSavedPosts:';
const BLOCKED_FEED_AUTHORS_STORAGE_PREFIX = 'jumptakeBlockedFeedAuthors:';
const HOME_JOB_PAGE_SIZE = 7;
const MOBILE_FEED_TOUCH_SCROLL_RATIO = 1.05;
const MOBILE_FEED_MAX_TOUCH_SCROLL = 1560;

const escapeHtml = (value = '') => (
    String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
);

const readJobReachMap = () => {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        const parsed = JSON.parse(localStorage.getItem(JOB_REACH_STORAGE_KEY) || '{}');
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
        return {};
    }
};

const readHomeJobLikeMap = () => {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        const parsed = JSON.parse(localStorage.getItem(HOME_JOB_LIKE_STORAGE_KEY) || '{}');
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
        return {};
    }
};

const getViewerId = ({ mode, currentUser, companyData, profileData }) => (
    String(
        currentUser?.id
        || currentUser?._id
        || currentUser?.userId
        || currentUser?.companyId
        || companyData?._id
        || profileData?._id
        || `${mode}-guest`
    )
);

const getDisplayName = ({ mode, currentUser, companyData, profileData }) => {
    if (mode === 'employer') {
        return companyData?.name || currentUser?.companyName || currentUser?.username || 'Company';
    }

    return profileData?.name || currentUser?.name || currentUser?.email?.split('@')[0] || 'Candidate';
};

const normalizeJobApplications = (job) => {
    if (Array.isArray(job?.applications)) {
        return job.applications;
    }

    if (Array.isArray(job?.applicants)) {
        return job.applicants;
    }

    return [];
};

const countApplicationsByStatus = (job, statusTerms) => {
    const terms = statusTerms.map((term) => term.toLowerCase());

    return normalizeJobApplications(job).filter((application) => {
        const status = String(application?.status || application?.candidateStatus || '').toLowerCase();
        return terms.some((term) => status.includes(term));
    }).length;
};

const getJobKey = (job) => String(job?._id || job?.jobNumber || job?.title || 'job');

const getPostKey = (post, fallbackIndex = 0) => String(post?.id || post?._id || `post-${fallbackIndex}`);

const formatCompactCount = (value) => {
    const numericValue = Number(value || 0);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
        return '0';
    }

    if (numericValue >= 1000) {
        return `${Math.floor(numericValue / 100)}K`;
    }

    return String(numericValue);
};

const getSavedPostsStorageKey = (viewerId = 'guest') => `${SAVED_POSTS_STORAGE_PREFIX}${viewerId || 'guest'}`;
const getBlockedFeedAuthorsStorageKey = (viewerId = 'guest') => `${BLOCKED_FEED_AUTHORS_STORAGE_PREFIX}${viewerId || 'guest'}`;

const readStorageArray = (key) => {
    if (typeof window === 'undefined') {
        return [];
    }

    try {
        const parsed = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
};

const writeStorageArray = (key, value) => {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.setItem(key, JSON.stringify(Array.isArray(value) ? value : []));
};

const getFeedShareUrl = ({ kind = 'post', id = '', tab = 'work-news', portal = 'candidate' }) => {
    if (typeof window === 'undefined') {
        return '';
    }

    const url = new URL(window.location.href);
    url.searchParams.delete('jtPost');
    url.searchParams.delete('jtJob');
    url.searchParams.delete('jtTab');

    if (kind === 'job') {
        url.searchParams.set('jtJob', id);
        url.searchParams.set('jtTab', 'job-posts');
    } else {
        url.searchParams.set('jtPost', id);
        url.searchParams.set('jtTab', tab);
    }

    url.hash = portal === 'employer' ? 'employer:home-feed' : 'candidate:job-feed';
    return url.toString();
};

const getPostTabFromStorageKey = (key, activeTab = '') => {
    if (activeTab === 'my-feed') {
        return 'talent-stories';
    }

    if (activeTab === 'my-company-posts') {
        return 'work-news';
    }

    return key === WORK_NEWS_STORAGE_KEY ? 'work-news' : 'talent-stories';
};

const asDisplayText = (value, fallback = '') => {
    if (value === null || value === undefined) {
        return fallback;
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    return fallback;
};

const buildSavedResumePreview = (resumeRecord) => {
    if (!resumeRecord?.html || typeof window === 'undefined') {
        return null;
    }

    const resumeMarkup = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(resumeRecord.name || 'Saved Resume')}</title>
  <style>
    body { margin: 0; padding: 24px; background: #ffffff; color: #111111; font-family: Arial, sans-serif; }
    .resume-preview-root { max-width: 850px; margin: 0 auto; }
    img, iframe, table { max-width: 100%; }
  </style>
</head>
<body>
  <div class="resume-preview-root">${resumeRecord.html}</div>
</body>
</html>`;

    const encoded = window.btoa(unescape(encodeURIComponent(resumeMarkup)));
    return {
        fileName: `${resumeRecord.name || 'Saved Resume'}.html`,
        mimeType: 'text/html',
        dataUrl: `data:text/html;base64,${encoded}`,
        source: 'saved-resume'
    };
};

const formatCommaSeparatedValue = (value) => {
    if (Array.isArray(value)) {
        return value.join(', ');
    }

    return typeof value === 'string' ? value : '';
};

const formatMultilineValue = (value) => {
    if (Array.isArray(value)) {
        return value
            .map((item) => {
                if (item && typeof item === 'object') {
                    return Object.values(item).filter(Boolean).join(' - ');
                }

                return item;
            })
            .join('\n');
    }

    return typeof value === 'string' ? value : '';
};

const splitCommaSeparatedValue = (value = '') => (
    value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
);

const splitMultilineValue = (value = '') => (
    value
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean)
);

const createApplicationProfileDraft = (profileData, userData = {}) => ({
    name: profileData?.name || userData?.name || userData?.email?.split('@')[0] || '',
    email: profileData?.email || userData?.email || '',
    profileImage: profileData?.profileImage || '',
    skills: formatCommaSeparatedValue(profileData?.skills),
    interests: formatCommaSeparatedValue(profileData?.interests),
    hobbies: formatCommaSeparatedValue(profileData?.hobbies),
    education: formatMultilineValue(profileData?.education),
    experience: formatMultilineValue(profileData?.experience),
    achievements: formatMultilineValue(profileData?.achievements)
});

const prepareApplicationProfileSnapshot = (profileDraft) => ({
    name: String(profileDraft.name || '').trim(),
    email: String(profileDraft.email || '').trim(),
    profileImage: profileDraft.profileImage || '',
    skills: splitCommaSeparatedValue(profileDraft.skills || ''),
    interests: splitCommaSeparatedValue(profileDraft.interests || ''),
    hobbies: splitCommaSeparatedValue(profileDraft.hobbies || ''),
    education: splitMultilineValue(profileDraft.education || ''),
    experience: splitMultilineValue(profileDraft.experience || ''),
    achievements: splitMultilineValue(profileDraft.achievements || '')
});

const readResumeFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected resume.'));
    reader.onload = (event) => resolve(String(event.target.result || ''));
    reader.readAsDataURL(file);
});

const createCoverLetterTemplate = (profileData, job, userData = {}) => {
    const applicantName = profileData?.name || userData?.name || userData?.email?.split('@')[0] || 'Candidate';
    const jobTitle = job?.title || 'this role';
    const companyName = job?.companyName || job?.company?.name || 'your team';

    return [
        `Dear Hiring Team,`,
        ``,
        `I am excited to apply for the ${asDisplayText(jobTitle, 'this role')} role at ${asDisplayText(companyName, 'your team')}. My experience and skills align well with the opportunity, and I would love to contribute to your team.`,
        ``,
        `Thank you for your time and consideration.`,
        ``,
        `Sincerely,`,
        `${applicantName}`
    ].join('\n');
};

const createCoverLetterHtml = (text = '') => (
    String(text || '')
        .split('\n')
        .map((line) => `<p>${escapeHtml(line || ' ')}</p>`)
        .join('')
);

const htmlToPlainText = (html = '') => (
    String(html || '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim()
);

const getSalarySortValue = (salary) => {
    const matches = Array.from(
        asDisplayText(salary)
            .replace(/,/g, '')
            .matchAll(/(\d+(?:\.\d+)?)\s*([km])?/gi)
    );

    if (!matches.length) {
        return null;
    }

    const values = matches
        .map((match) => {
            const numericValue = Number(match[1]);
            const suffix = String(match[2] || '').toLowerCase();

            if (!Number.isFinite(numericValue)) {
                return null;
            }

            if (suffix === 'm') {
                return numericValue * 1000000;
            }

            if (suffix === 'k') {
                return numericValue * 1000;
            }

            return numericValue;
        })
        .filter((value) => value !== null);

    return values.length ? Math.max(...values) : null;
};

const normalizePostComments = (comments) => (
    Array.isArray(comments)
        ? comments.filter((comment) => comment && typeof comment === 'object')
        : []
);

const safeDateLabel = (value) => {
    const date = new Date(value || Date.now());
    return Number.isNaN(date.getTime())
        ? new Date().toLocaleDateString()
        : date.toLocaleDateString();
};

const normalizePostMedia = (media) => {
    if (!media || typeof media !== 'object' || typeof media.dataUrl !== 'string' || !media.dataUrl) {
        return null;
    }

    return {
        dataUrl: media.dataUrl,
        type: media.type === 'video' ? 'video' : 'image',
        name: asDisplayText(media.name, 'Post attachment')
    };
};

const normalizePostForDisplay = (post, index = 0) => {
    const normalizedComments = normalizePostComments(post.comments).map((comment, commentIndex) => ({
        ...comment,
        id: asDisplayText(comment.id, `comment-${commentIndex}`),
        authorId: asDisplayText(comment.authorId, ''),
        authorName: asDisplayText(comment.authorName, 'User'),
        authorType: comment.authorType === 'employer' ? 'employer' : 'candidate',
        authorAvatar: typeof comment.authorAvatar === 'string' ? comment.authorAvatar : '',
        text: asDisplayText(comment.text),
        mentions: Array.isArray(comment.mentions)
            ? comment.mentions.map((mention) => asDisplayText(mention)).filter(Boolean)
            : [],
        createdAt: comment.createdAt
    }));

    return {
        ...post,
        id: getPostKey(post, index),
        body: asDisplayText(post.body),
        authorId: asDisplayText(post.authorId, ''),
        authorName: asDisplayText(post.authorName, 'Unknown author'),
        authorType: post.authorType === 'employer' ? 'employer' : 'candidate',
        authorAvatar: typeof post.authorAvatar === 'string' ? post.authorAvatar : '',
        audience: ['everyone', 'friends', 'only-me'].includes(post.audience) ? post.audience : 'everyone',
        reach: Number(post.reach || 0) || 0,
        hiddenBy: Array.isArray(post.hiddenBy) ? post.hiddenBy.map(String) : [],
        reactions: post.reactions && typeof post.reactions === 'object' ? post.reactions : {},
        reactionsByUser: post.reactionsByUser && typeof post.reactionsByUser === 'object' ? post.reactionsByUser : {},
        media: normalizePostMedia(post.media),
        comments: normalizedComments
    };
};

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read selected media.'));
    reader.onload = (event) => resolve(String(event.target.result || ''));
    reader.readAsDataURL(file);
});

const createPost = ({ type, body, viewerId, authorName, authorType, authorAvatar, media = null, audience = 'everyone' }) => ({
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    body,
    authorId: viewerId,
    authorType,
    authorName,
    authorAvatar: authorAvatar || '',
    audience,
    createdAt: new Date().toISOString(),
    reach: 1,
    seenBy: [viewerId],
    reactions: {},
    reactionsByUser: {},
    media,
    comments: []
});

const reactionLabels = {
    work: ['Like', 'Appreciate', 'Love', 'Empower', 'Congratulate', 'Motivate', 'Angry', 'Sad', 'Bad', 'Hide'],
    talent: ['Like', 'Appreciate', 'Love', 'Empower', 'Congratulate', 'Motivate', 'Angry', 'Sad', 'Bad', 'Hide']
};

const reactionIconPaths = {
    Like: 'M6.956 1.745C7.021.81 7.908.087 8.864.325l.261.066c.463.116.874.456 1.012.965.22.816.533 2.511.062 4.51a10 10 0 0 1 .443-.051c.713-.065 1.669-.072 2.516.21.518.173.994.681 1.2 1.273.184.532.16 1.162-.234 1.733q.086.18.138.363c.077.27.113.567.113.856s-.036.586-.113.856c-.039.135-.09.273-.16.404.169.387.107.819-.003 1.148a3.2 3.2 0 0 1-.488.901c.054.152.076.312.076.465 0 .305-.089.625-.253.912C13.1 15.522 12.437 16 11.5 16H8c-.605 0-1.07-.081-1.466-.218a4.8 4.8 0 0 1-.97-.484l-.048-.03c-.504-.307-.999-.609-2.068-.722C2.682 14.464 2 13.846 2 13V9c0-.85.685-1.432 1.357-1.615.849-.232 1.574-.787 2.132-1.41.56-.627.914-1.28 1.039-1.639.199-.575.356-1.539.428-2.59z',
    Comment: 'M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4.414a1 1 0 0 0-.707.293L.854 15.146A.5.5 0 0 1 0 14.793zm3.5 1a.5.5 0 0 0 0 1h9a.5.5 0 0 0 0-1zm0 2.5a.5.5 0 0 0 0 1h9a.5.5 0 0 0 0-1zm0 2.5a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1z',
    Love: 'M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314',
    Appreciate: 'M7.657 6.247c.11-.33.576-.33.686 0l.645 1.937a2.89 2.89 0 0 0 1.829 1.828l1.936.645c.33.11.33.576 0 .686l-1.937.645a2.89 2.89 0 0 0-1.828 1.829l-.645 1.936a.361.361 0 0 1-.686 0l-.645-1.937a2.89 2.89 0 0 0-1.828-1.828l-1.937-.645a.361.361 0 0 1 0-.686l1.937-.645a2.89 2.89 0 0 0 1.828-1.828zM3.794 1.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387A1.73 1.73 0 0 0 4.593 5.69l-.387 1.162a.217.217 0 0 1-.412 0L3.407 5.69A1.73 1.73 0 0 0 2.31 4.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387A1.73 1.73 0 0 0 3.407 2.31zM10.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.16 1.16 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.16 1.16 0 0 0-.732-.732L9.1 2.137a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732z',
    Empower: 'M5.52.359A.5.5 0 0 1 6 0h4a.5.5 0 0 1 .474.658L8.694 6H12.5a.5.5 0 0 1 .395.807l-7 9a.5.5 0 0 1-.873-.454L6.823 9.5H3.5a.5.5 0 0 1-.48-.641z',
    Congratulate: 'M9.5 2.672a.5.5 0 1 0 1 0V.843a.5.5 0 0 0-1 0zm4.5.035A.5.5 0 0 0 13.293 2L12 3.293a.5.5 0 1 0 .707.707zM7.293 4A.5.5 0 1 0 8 3.293L6.707 2A.5.5 0 0 0 6 2.707zm-.621 2.5a.5.5 0 1 0 0-1H4.843a.5.5 0 1 0 0 1zm8.485 0a.5.5 0 1 0 0-1h-1.829a.5.5 0 0 0 0 1zM13.293 10A.5.5 0 1 0 14 9.293L12.707 8a.5.5 0 1 0-.707.707zM9.5 11.157a.5.5 0 0 0 1 0V9.328a.5.5 0 0 0-1 0zm1.854-5.097a.5.5 0 0 0 0-.706l-.708-.708a.5.5 0 0 0-.707 0L8.646 5.94a.5.5 0 0 0 0 .707l.708.708a.5.5 0 0 0 .707 0l1.293-1.293Zm-3 3a.5.5 0 0 0 0-.706l-.708-.708a.5.5 0 0 0-.707 0L.646 13.94a.5.5 0 0 0 0 .707l.708.708a.5.5 0 0 0 .707 0z',
    Motivate: 'M12.17 9.53c2.307-2.592 3.278-4.684 3.641-6.218.21-.887.214-1.58.16-2.065a3.6 3.6 0 0 0-.108-.563 2 2 0 0 0-.078-.23V.453c-.073-.164-.168-.234-.352-.295a2 2 0 0 0-.16-.045 4 4 0 0 0-.57-.093c-.49-.044-1.19-.03-2.08.188-1.536.374-3.618 1.343-6.161 3.604l-2.4.238h-.006a2.55 2.55 0 0 0-1.524.734L.15 7.17a.512.512 0 0 0 .433.868l1.896-.271c.28-.04.592.013.955.132.232.076.437.16.655.248l.203.083c.196.816.66 1.58 1.275 2.195.613.614 1.376 1.08 2.191 1.277l.082.202c.089.218.173.424.249.657.118.363.172.676.132.956l-.271 1.9a.512.512 0 0 0 .867.433l2.382-2.386c.41-.41.668-.949.732-1.526zm.11-3.699c-.797.8-1.93.961-2.528.362-.598-.6-.436-1.733.361-2.532.798-.799 1.93-.96 2.528-.361s.437 1.732-.36 2.531ZM5.205 10.787a7.6 7.6 0 0 0 1.804 1.352c-1.118 1.007-4.929 2.028-5.054 1.903-.126-.127.737-4.189 1.839-5.18.346.69.837 1.35 1.411 1.925',
    Angry: 'M11.46.146A.5.5 0 0 0 11.107 0H4.893a.5.5 0 0 0-.353.146L.146 4.54A.5.5 0 0 0 0 4.893v6.214a.5.5 0 0 0 .146.353l4.394 4.394a.5.5 0 0 0 .353.146h6.214a.5.5 0 0 0 .353-.146l4.394-4.394a.5.5 0 0 0 .146-.353V4.893a.5.5 0 0 0-.146-.353zm-6.106 4.5L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 1 1 .708-.708',
    Sad: 'M8.867 14.41c13.308-9.322 4.79-16.563.064-13.824L7 3l1.5 4-2 3L8 15a38 38 0 0 0 .867-.59m-.303-1.01-.971-3.237 1.74-2.608a1 1 0 0 0 .103-.906l-1.3-3.468 1.45-1.813c1.861-.948 4.446.002 5.197 2.11.691 1.94-.055 5.521-6.219 9.922m-1.25 1.137a36 36 0 0 1-1.522-1.116C-5.077 4.97 1.842-1.472 6.454.293c.314.12.618.279.904.477L5.5 3 7 7l-1.5 3zm-2.3-3.06-.442-1.106a1 1 0 0 1 .034-.818l1.305-2.61L4.564 3.35a1 1 0 0 1 .168-.991l1.032-1.24c-1.688-.449-3.7.398-4.456 2.128-.711 1.627-.413 4.55 3.706 8.229Z',
    Bad: 'M15 8a6.97 6.97 0 0 0-1.71-4.584l-9.874 9.875A7 7 0 0 0 15 8M2.71 12.584l9.874-9.875a7 7 0 0 0-9.874 9.874ZM16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0',
    Hide: 'm10.79 12.912-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7 7 0 0 0 2.79-.588M5.21 3.088A7 7 0 0 1 8 2.5c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 0 0-4.474-4.474zM5.525 7.646a2.5 2.5 0 0 0 2.829 2.829zm4.95.708-2.829-2.83a2.5 2.5 0 0 1 2.829 2.829zm3.171 6-12-12 .708-.708 12 12z'
};

const tabIconPaths = {
    'talent-stories': 'm13.498.795.149-.149a1.207 1.207 0 1 1 1.707 1.708l-.149.148a1.5 1.5 0 0 1-.059 2.059L4.854 14.854a.5.5 0 0 1-.233.131l-4 1a.5.5 0 0 1-.606-.606l1-4a.5.5 0 0 1 .131-.232l9.642-9.642a.5.5 0 0 0-.642.056L6.854 4.854a.5.5 0 1 1-.708-.708L9.44.854A1.5 1.5 0 0 1 11.5.796a1.5 1.5 0 0 1 1.998-.001m-.644.766a.5.5 0 0 0-.707 0L1.95 11.756l-.764 3.057 3.057-.764L14.44 3.854a.5.5 0 0 0 0-.708z',
    'candidate-talent-stories': 'M2 6a6 6 0 1 1 10.174 4.31c-.203.196-.359.4-.453.619l-.762 1.769A.5.5 0 0 1 10.5 13h-5a.5.5 0 0 1-.46-.302l-.761-1.77a2 2 0 0 0-.453-.618A5.98 5.98 0 0 1 2 6m3 8.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1l-.224.447a1 1 0 0 1-.894.553H6.618a1 1 0 0 1-.894-.553L5.5 15a.5.5 0 0 1-.5-.5',
    'work-news': 'M6.5 1A1.5 1.5 0 0 0 5 2.5V3H1.5A1.5 1.5 0 0 0 0 4.5v1.384l7.614 2.03a1.5 1.5 0 0 0 .772 0L16 5.884V4.5A1.5 1.5 0 0 0 14.5 3H11v-.5A1.5 1.5 0 0 0 9.5 1zm0 1h3a.5.5 0 0 1 .5.5V3H6v-.5a.5.5 0 0 1 .5-.5M0 12.5A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5V6.85L8.129 8.947a.5.5 0 0 1-.258 0L0 6.85z',
    'job-posts': 'M11 8h2V6h-2zM0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm8.5.5a.5.5 0 0 0-1 0v7a.5.5 0 0 0 1 0zM2 5.5a.5.5 0 0 0 .5.5H6a.5.5 0 0 0 0-1H2.5a.5.5 0 0 0-.5.5M2.5 7a.5.5 0 0 0 0 1H6a.5.5 0 0 0 0-1zM2 9.5a.5.5 0 0 0 .5.5H6a.5.5 0 0 0 0-1H2.5a.5.5 0 0 0-.5.5m8-4v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5',
    'create-post': 'M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814zM1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z',
    'create-story': 'M15.807.531c-.174-.177-.41-.289-.64-.363a3.8 3.8 0 0 0-.833-.15c-.62-.049-1.394 0-2.252.175C10.365.545 8.264 1.415 6.315 3.1S3.147 6.824 2.557 8.523c-.294.847-.44 1.634-.429 2.268.005.316.05.62.154.88q.025.061.056.122A68 68 0 0 0 .08 15.198a.53.53 0 0 0 .157.72.504.504 0 0 0 .705-.16 68 68 0 0 1 2.158-3.26c.285.141.616.195.958.182.513-.02 1.098-.188 1.723-.49 1.25-.605 2.744-1.787 4.303-3.642l1.518-1.55a.53.53 0 0 0 0-.739l-.729-.744 1.311.209a.5.5 0 0 0 .443-.15l.663-.684c.663-.68 1.292-1.325 1.763-1.892.314-.378.585-.752.754-1.107.163-.345.278-.773.112-1.188a.5.5 0 0 0-.112-.172M3.733 11.62C5.385 9.374 7.24 7.215 9.309 5.394l1.21 1.234-1.171 1.196-.027.03c-1.5 1.789-2.891 2.867-3.977 3.393-.544.263-.99.378-1.324.39a1.3 1.3 0 0 1-.287-.018Zm6.769-7.22c1.31-1.028 2.7-1.914 4.172-2.6a7 7 0 0 1-.4.523c-.442.533-1.028 1.134-1.681 1.804l-.51.524zm3.346-3.357C9.594 3.147 6.045 6.8 3.149 10.678c.007-.464.121-1.086.37-1.806.533-1.535 1.65-3.415 3.455-4.976 1.807-1.561 3.746-2.36 5.31-2.68a8 8 0 0 1 1.564-.173',
    'my-company-posts': 'M15 .5a.5.5 0 0 0-.724-.447l-8 4A.5.5 0 0 0 6 4.5v3.14L.342 9.526A.5.5 0 0 0 0 10v5.5a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5V14h1v1.5a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5zM2 11h1v1H2zm2 0h1v1H4zm-1 2v1H2v-1zm1 0h1v1H4zm9-10v1h-1V3zM8 5h1v1H8zm1 2v1H8V7zM8 9h1v1H8zm2 0h1v1h-1zm-1 2v1H8v-1zm1 0h1v1h-1zm3-2v1h-1V9zm-1 2h1v1h-1zm-2-4h1v1h-1zm3 0v1h-1V7zm-2-2v1h-1V5zm1 0h1v1h-1z',
    'my-job-posts': 'M11 8h2V6h-2zM0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm8.5.5a.5.5 0 0 0-1 0v7a.5.5 0 0 0 1 0zM2 5.5a.5.5 0 0 0 .5.5H6a.5.5 0 0 0 0-1H2.5a.5.5 0 0 0-.5.5M2.5 7a.5.5 0 0 0 0 1H6a.5.5 0 0 0 0-1zM2 9.5a.5.5 0 0 0 .5.5H6a.5.5 0 0 0 0-1H2.5a.5.5 0 0 0-.5.5m8-4v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5',
    'my-feed': 'M2 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm6 2.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0m3.5.878c1.482-1.42 4.795 1.392 0 4.622-4.795-3.23-1.482-6.043 0-4.622M2 5.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5m0 2a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5m0 2a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5'
};

const tabAccentColors = {
    'talent-stories': '#f5b82e',
    'work-news': '#9b5724',
    'job-posts': '#3b82f6',
    'create-post': '#22c55e',
    'create-story': '#ffffff',
    'my-company-posts': '#ffffff',
    'my-job-posts': '#3b82f6',
    'my-feed': '#f97316'
};

const statIconPaths = {
    hired: 'M12.5 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7m1.679-4.493-1.335 2.226a.75.75 0 0 1-1.174.144l-.774-.773a.5.5 0 0 1 .708-.708l.547.548 1.17-1.951a.5.5 0 1 1 .858.514M2 1a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v7.256A4.5 4.5 0 0 0 12.5 8a4.5 4.5 0 0 0-3.59 1.787A.5.5 0 0 0 9 9.5v-1a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .39-.187A4.5 4.5 0 0 0 8.027 12H6.5a.5.5 0 0 0-.5.5V16H3a1 1 0 0 1-1-1zm2 1.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5m3 0v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5m3.5-.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5zM4 5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5M7.5 5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5zm2.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5M4.5 8a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5z',
    applicants: [
        'M.05 3.555A2 2 0 0 1 2 2h12a2 2 0 0 1 1.95 1.555L8 8.414zM0 4.697v7.104l5.803-3.558zM6.761 8.83l-6.57 4.027A2 2 0 0 0 2 14h6.256A4.5 4.5 0 0 1 8 12.5a4.49 4.49 0 0 1 1.606-3.446L8 9.586zm3.399-.13.037-.022L16 11.801V4.697z',
        'M12.5 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7m.354-5.354 1.25 1.25a.5.5 0 0 1-.708.708L13 12.207V14.5a.5.5 0 0 1-1 0v-2.293l-.396.397a.5.5 0 0 1-.708-.708l1.25-1.25a.5.5 0 0 1 .708 0'
    ],
    rejected: 'M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708',
    hold: 'M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M6.25 5C5.56 5 5 5.56 5 6.25v3.5a1.25 1.25 0 1 0 2.5 0v-3.5C7.5 5.56 6.94 5 6.25 5m3.5 0c-.69 0-1.25.56-1.25 1.25v3.5a1.25 1.25 0 1 0 2.5 0v-3.5C11 5.56 10.44 5 9.75 5',
    assessment: 'M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2zM3 5.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5M3 8a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 8m0 2.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5',
    interview: 'M8 9.05a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M2 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm10.798 11c-.453-1.27-1.76-3-4.798-3-3.037 0-4.345 1.73-4.798 3H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1z',
    reach: 'M8 3.5a4.5 4.5 0 0 0-4.473 4h1.005a3.5 3.5 0 1 1 .65 2.032.5.5 0 0 0-.762.647A4.5 4.5 0 1 0 8 3.5M7.5 5a.5.5 0 0 1 1 0v3.25l2.15 1.29a.5.5 0 0 1-.515.858l-2.4-1.44A.5.5 0 0 1 7.5 8.53z'
};

const jobMetaIconPaths = {
    jobNumber: 'M11 8h2V6h-2zM0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm8.5.5a.5.5 0 0 0-1 0v7a.5.5 0 0 0 1 0zM2 5.5a.5.5 0 0 0 .5.5H6a.5.5 0 0 0 0-1H2.5a.5.5 0 0 0-.5.5M2.5 7a.5.5 0 0 0 0 1H6a.5.5 0 0 0 0-1zM2 9.5a.5.5 0 0 0 .5.5H6a.5.5 0 0 0 0-1H2.5a.5.5 0 0 0-.5.5',
    location: 'M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6',
    jobType: tabIconPaths['work-news'],
    salary: 'M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2 1a1 1 0 0 0 1-1h10a1 1 0 0 0 1 1v6a1 1 0 0 0-1 1H3a1 1 0 0 0-1-1zm6 6a3 3 0 1 0 0-6 3 3 0 0 0 0 6'
};

const utilityIconPaths = {
    starFill: 'M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z',
    chevronDoubleLeft: [
        'M8.354 1.646a.5.5 0 0 1 0 .708L2.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0',
        'M12.354 1.646a.5.5 0 0 1 0 .708L6.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0'
    ],
    chevronDoubleRight: [
        'M3.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L9.293 8 3.646 2.354a.5.5 0 0 1 0-.708',
        'M7.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L13.293 8 7.646 2.354a.5.5 0 0 1 0-.708'
    ]
};

const ReactionIcon = ({ name }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="currentColor"
        viewBox="0 0 16 16"
        aria-hidden="true"
        focusable="false"
    >
        <path fillRule={name === 'Love' ? 'evenodd' : undefined} d={reactionIconPaths[name] || reactionIconPaths.Like} />
        {name === 'Congratulate' && (
            <path className="magic-stick-accent" d="M1.3 14.7 8.35 7.65" />
        )}
    </svg>
);

const SharePostIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="currentColor"
        className="bi bi-arrow-90deg-right"
        viewBox="0 0 16 16"
        aria-hidden="true"
        focusable="false"
    >
        <path fillRule="evenodd" d="M14.854 4.854a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 4H3.5A2.5 2.5 0 0 0 1 6.5v8a.5.5 0 0 0 1 0v-8A1.5 1.5 0 0 1 3.5 5h9.793l-3.147 3.146a.5.5 0 0 0 .708.708z" />
    </svg>
);

const DeletePostIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="currentColor"
        viewBox="0 0 16 16"
        aria-hidden="true"
        focusable="false"
    >
        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z" />
        <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1 0-2H5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1h2.5a1 1 0 0 1 1 1M4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z" />
    </svg>
);

const MoreOptionsIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="currentColor"
        viewBox="0 0 16 16"
        aria-hidden="true"
        focusable="false"
    >
        <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3" />
    </svg>
);

const PortalCloseIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="currentColor"
        className="bi bi-x"
        viewBox="0 0 16 16"
        aria-hidden="true"
        focusable="false"
    >
        <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708" />
    </svg>
);

const DefaultProfileIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
    >
        <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0" />
        <path d="M2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2zm12 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1v-1c0-1-1-4-6-4s-6 3-6 4v1a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" />
    </svg>
);

const PortalActionIcon = ({ type }) => {
    const paths = {
        submit: 'M14.854 3.146a.5.5 0 0 1 0 .708l-7.5 7.5a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L7 10.293l7.146-7.147a.5.5 0 0 1 .708 0',
        upload: 'M.5 9.9a.5.5 0 0 1 .5.5V13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.6a.5.5 0 0 1 1 0V13a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.6a.5.5 0 0 1 .5-.5M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708z',
        resume: 'M4 0h5.5L14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2m5 1.5V5h3.5zM4.5 8a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1zm0 2a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1zm0 2a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1z',
        profile: 'M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m0 1c-2.667 0-5 1.333-5 3v1h10v-1c0-1.667-2.333-3-5-3m5.5 1.5a.5.5 0 0 1 .5.5v1h1a.5.5 0 0 1 0 1h-1v1a.5.5 0 0 1-1 0v-1h-1a.5.5 0 0 1 0-1h1v-1a.5.5 0 0 1 .5-.5',
        draft: 'M4 0h5.5L14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2m5 1.5V5h3.5zM5 8.5a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1zm0 2a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1z',
        cancel: 'M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z',
        filter: 'M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5M3 6.5A.5.5 0 0 1 3.5 6h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 6.5M1.5 2A.5.5 0 0 1 2 1.5h12a.5.5 0 0 1 0 1H2a.5.5 0 0 1-.5-.5',
        open: 'M6 3.5A1.5 1.5 0 0 1 7.5 2h5A1.5 1.5 0 0 1 14 3.5v5A1.5 1.5 0 0 1 12.5 10H12v-1h.5a.5.5 0 0 0 .5-.5v-5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0-.5.5V4H6zM2 7.5A1.5 1.5 0 0 1 3.5 6h5A1.5 1.5 0 0 1 10 7.5v5A1.5 1.5 0 0 1 8.5 14h-5A1.5 1.5 0 0 1 2 12.5z'
    };

    return (
        <svg className="portal-action-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d={paths[type] || paths.submit} />
        </svg>
    );
};

const ReactionTooltip = ({ children }) => (
    <span className="portal-reaction-tooltip" role="tooltip">{children}</span>
);

const SimpleIcon = ({ path }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        {(Array.isArray(path) ? path : [path]).map((pathValue, index) => (
            <path key={index} d={pathValue} />
        ))}
    </svg>
);

const getTotalReactionCount = (post) => Object.entries(post.reactions || {}).reduce(
    (total, [reaction, count]) => (reaction === 'Hide' ? total : total + (Number(count) || 0)),
    0
);

const getViewerReaction = (post, viewerId) => (
    post.reactionsByUser && typeof post.reactionsByUser === 'object'
        ? post.reactionsByUser[viewerId]
        : []
);

const normalizeViewerReactions = (value) => {
    if (Array.isArray(value)) {
        return value.filter(Boolean).filter((reaction) => reaction !== 'Hide').slice(0, 3);
    }

    return value && value !== 'Hide' ? [value] : [];
};

const adjustReactionCounts = (reactions = {}, previousReactions, selectedReactions) => {
    const nextCounts = { ...reactions };
    const previousList = normalizeViewerReactions(previousReactions);
    const nextList = normalizeViewerReactions(selectedReactions);

    previousList
        .filter((reaction) => !nextList.includes(reaction))
        .forEach((reaction) => {
            nextCounts[reaction] = Math.max(0, Number(nextCounts[reaction] || 0) - 1);
        });

    nextList
        .filter((reaction) => !previousList.includes(reaction))
        .forEach((reaction) => {
            nextCounts[reaction] = Number(nextCounts[reaction] || 0) + 1;
        });

    return nextCounts;
};

const normalizeTextList = (value) => {
    if (!value) {
        return [];
    }

    const source = Array.isArray(value) ? value : [value];

    return source
        .flatMap((item) => {
            if (item === null || item === undefined) {
                return [];
            }

            if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
                return [String(item)];
            }

            if (typeof item === 'object') {
                return [
                    item.name,
                    item.title,
                    item.label,
                    item.skill,
                    item.value,
                    item.text
                ];
            }

            return [];
        })
        .map((item) => asDisplayText(item).trim())
        .filter(Boolean);
};

const getCompanyNameFromJob = (job) => (
    asDisplayText(job?.company?.name)
    || asDisplayText(job?.companyName)
    || asDisplayText(job?.employerName)
    || asDisplayText(job?.company)
    || 'Company unavailable'
);

const getCompanyLogoFromJob = (job) => (
    typeof job?.company?.logo === 'string' ? job.company.logo
        : typeof job?.companyLogo === 'string' ? job.companyLogo
            : typeof job?.employerLogo === 'string' ? job.employerLogo
                : ''
);

const normalizeHomeJobForDisplay = (job, index = 0) => {
    const source = job && typeof job === 'object' ? job : {};
    const companyName = getCompanyNameFromJob(source);
    const skills = normalizeTextList(source?.skills);
    const requirements = normalizeTextList(source?.requirements);
    const applications = normalizeJobApplications(source);
    const fallbackId = `job-${index}`;

    return {
        ...source,
        _id: asDisplayText(source?._id, asDisplayText(source?.id, fallbackId)),
        id: asDisplayText(source?.id, asDisplayText(source?._id, fallbackId)),
        title: asDisplayText(source?.title, asDisplayText(source?.jobTitle, 'Untitled job')),
        companyName: asDisplayText(companyName, 'Company unavailable'),
        companyLogo: getCompanyLogoFromJob(source),
        location: asDisplayText(source?.location, 'Location not set'),
        jobType: asDisplayText(source?.jobType, asDisplayText(source?.type, 'Job type not set')),
        salary: asDisplayText(source?.salary, ''),
        applicationLink: asDisplayText(source?.applicationLink, asDisplayText(source?.applyLink, asDisplayText(source?.externalApplyLink, ''))),
        jobNumber: asDisplayText(source?.jobNumber, asDisplayText(source?.reference, 'Not assigned')),
        description: asDisplayText(source?.description, asDisplayText(source?.summary, asDisplayText(source?.about, 'No description added.'))),
        skills,
        requirements,
        applications,
        applicants: Array.isArray(source?.applicants) ? source.applicants : [],
        applicationCount: Number(source?.applicationCount || source?.applicationsCount || applications.length || 0) || 0,
        createdAt: source?.createdAt || source?.postedAt || source?.date || Date.now()
    };
};

const normalizeExternalUrl = (value = '') => {
    const trimmed = asDisplayText(value).trim();

    if (!trimmed) {
        return '';
    }

    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const getCandidateSkillSet = (profileData) => {
    const skills = [
        ...normalizeTextList(profileData?.skills),
        ...normalizeTextList(profileData?.technicalSkills),
        ...normalizeTextList(profileData?.keySkills),
        ...normalizeTextList(profileData?.interests)
    ];

    return new Set(skills.map((skill) => skill.toLowerCase()));
};

const calculateCandidateFit = (job, profileData) => {
    const jobSkills = normalizeTextList(job?.skills).map((skill) => skill.toLowerCase());
    const candidateSkills = getCandidateSkillSet(profileData);

    if (!jobSkills.length || !candidateSkills.size) {
        return 0;
    }

    const matches = jobSkills.filter((skill) => candidateSkills.has(skill)).length;
    return Math.min(100, Math.round((matches / jobSkills.length) * 100));
};

const getApplicationUserId = (application) => String(
    application?.user?._id
    || application?.user?.id
    || application?.user
    || application?.userId
    || application?.candidateId
    || application?.applicantId
    || ''
);

const getApplicationJobId = (application) => String(
    application?.job?._id
    || application?.job?.id
    || application?.job
    || application?.jobId
    || ''
);

const formatSalary = (salary) => {
    const salaryText = asDisplayText(salary).trim();
    return salaryText || 'Salary not specified';
};

const PortalHomeFeed = ({
    mode = 'candidate',
    currentUser,
    profileData,
    companyData,
    jobs = [],
    switchSection,
    onRefresh
}) => {
    const safeJobs = useMemo(
        () => (Array.isArray(jobs)
            ? jobs
                .filter((job) => job && typeof job === 'object')
                .map((job, index) => {
                    try {
                        return normalizeHomeJobForDisplay(job, index);
                    } catch (error) {
                        console.warn('Skipping malformed home job record:', error);
                        return null;
                    }
                })
                .filter(Boolean)
            : []),
        [jobs]
    );
    const candidateTabs = [
        { id: 'work-news', label: 'Work News' },
        { id: 'job-posts', label: 'Job Posts' },
        { id: 'talent-stories', label: 'Talent Stories' },
        { id: 'create-story', label: 'Create a story' },
        { id: 'my-feed', label: 'My feed' }
    ];
    const employerTabs = [
        { id: 'talent-stories', label: 'Talent Stories' },
        { id: 'work-news', label: 'Work News' },
        { id: 'create-post', label: 'Create Post' },
        { id: 'my-company-posts', label: 'My News' },
        { id: 'my-job-posts', label: 'My Jobs' }
    ];
    const tabs = mode === 'employer' ? employerTabs : candidateTabs;
    const defaultTab = mode === 'employer' ? 'talent-stories' : 'work-news';
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [workNewsPosts, setWorkNewsPosts] = useState([]);
    const [talentStories, setTalentStories] = useState([]);
    const [feedLoading, setFeedLoading] = useState(false);
    const [feedError, setFeedError] = useState('');
    const [tabsHidden, setTabsHidden] = useState(false);
    const [composerText, setComposerText] = useState('');
    const [composerMedia, setComposerMedia] = useState(null);
    const [composerAudience, setComposerAudience] = useState('everyone');
    const [commentDrafts, setCommentDrafts] = useState({});
    const [openReactionPostId, setOpenReactionPostId] = useState('');
    const [openCommentPostId, setOpenCommentPostId] = useState('');
    const [openSharePostId, setOpenSharePostId] = useState('');
    const [openOptionsPostId, setOpenOptionsPostId] = useState('');
    const [openJobOptionsId, setOpenJobOptionsId] = useState('');
    const [, setSavedPosts] = useState([]);
    const [blockedFeedAuthors, setBlockedFeedAuthors] = useState([]);
    const [feedFriends, setFeedFriends] = useState([]);
    const [shareStatus, setShareStatus] = useState('');
    const [sharingTargetId, setSharingTargetId] = useState('');
    const [visibleReactionTooltip, setVisibleReactionTooltip] = useState('');
    const [animatingReactionKey, setAnimatingReactionKey] = useState('');
    const [jobReachMap, setJobReachMap] = useState(readJobReachMap);
    const [homeJobLikeMap, setHomeJobLikeMap] = useState(readHomeJobLikeMap);
    const [selectedJob, setSelectedJob] = useState(null);
    const [selectedJobMode, setSelectedJobMode] = useState(mode);
    const [applyingHomeJobId, setApplyingHomeJobId] = useState('');
    const [appliedHomeJobIds, setAppliedHomeJobIds] = useState([]);
    const [bookmarkedHomeJobIds, setBookmarkedHomeJobIds] = useState([]);
    const [jobActionMessage, setJobActionMessage] = useState('');
    const [jobPage, setJobPage] = useState(1);
    const [homeJobLocationFilter, setHomeJobLocationFilter] = useState('');
    const [homeJobSalarySort, setHomeJobSalarySort] = useState('');
    const [activeDraftId, setActiveDraftId] = useState(null);
    const [savingApplicationDraft, setSavingApplicationDraft] = useState(false);
    const applicationResumeInputRef = useRef(null);
    const reactionTooltipTimerRef = useRef(null);
    const reactionCloseTimerRef = useRef(null);
    const feedScrollTopRef = useRef(0);
    const feedTouchRef = useRef({ y: 0, scrollTop: 0 });
    const pendingDeepLinkRef = useRef(null);
    const feedDraftTypingTimerRef = useRef(null);
    const feedDraftTypingTokenRef = useRef(0);
    const [applicationJob, setApplicationJob] = useState(null);
    const [applicationMessage, setApplicationMessage] = useState('');
    const [coverLetterText, setCoverLetterText] = useState('');
    const [applicationProfile, setApplicationProfile] = useState(() => createApplicationProfileDraft(profileData, currentUser));
    const [applicationResumeUpload, setApplicationResumeUpload] = useState(null);
    const [isPreparingResumeUpload, setIsPreparingResumeUpload] = useState(false);

    const viewerId = useMemo(
        () => getViewerId({ mode, currentUser, companyData, profileData }),
        [mode, currentUser, companyData, profileData]
    );
    const authorName = useMemo(
        () => getDisplayName({ mode, currentUser, companyData, profileData }),
        [mode, currentUser, companyData, profileData]
    );
    const authorAvatar = mode === 'employer'
        ? companyData?.logo
        : profileData?.profileImage;
    const candidateUserId = currentUser?.id || currentUser?._id || currentUser?.userId;

    useEffect(() => {
        setActiveTab(defaultTab);
    }, [defaultTab]);

    useEffect(() => {
        setSavedPosts(readStorageArray(getSavedPostsStorageKey(viewerId)));
        setBlockedFeedAuthors(readStorageArray(getBlockedFeedAuthorsStorageKey(viewerId)).map(String));
    }, [viewerId]);

    useEffect(() => {
        if (!openReactionPostId && !openCommentPostId && !openSharePostId && !openOptionsPostId && !openJobOptionsId) {
            return undefined;
        }

        const closeOpenPostActions = (event) => {
            if (
                event.target.closest?.('.portal-post-action-cluster') ||
                event.target.closest?.('.portal-comment-row') ||
                event.target.closest?.('.portal-post-options-wrap')
            ) {
                return;
            }

            if (reactionCloseTimerRef.current) {
                window.clearTimeout(reactionCloseTimerRef.current);
                reactionCloseTimerRef.current = null;
            }

            setOpenReactionPostId('');
            setOpenCommentPostId('');
            setOpenSharePostId('');
            setOpenOptionsPostId('');
            setOpenJobOptionsId('');
            setAnimatingReactionKey('');
        };

        document.addEventListener('mousedown', closeOpenPostActions);
        document.addEventListener('touchstart', closeOpenPostActions);

        return () => {
            document.removeEventListener('mousedown', closeOpenPostActions);
            document.removeEventListener('touchstart', closeOpenPostActions);
        };
    }, [openReactionPostId, openCommentPostId, openSharePostId, openOptionsPostId, openJobOptionsId]);

    useEffect(() => {
        if (mode !== 'candidate' || !candidateUserId) {
            setFeedFriends([]);
            return;
        }

        let isMounted = true;

        const fetchFeedFriends = async () => {
            try {
                const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
                const response = await fetch(apiUrl(`/api/candidate-connections/user/${candidateUserId}`), {
                    headers: {
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                    }
                });
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to load friends');
                }

                if (!isMounted) {
                    return;
                }

                const friends = (Array.isArray(data.friends) ? data.friends : [])
                    .map((connection) => {
                        const peer = connection?.peer || {};
                        return {
                            id: String(peer.candidateId || peer.userId || connection._id || ''),
                            candidateId: peer.candidateId || '',
                            userId: peer.userId || '',
                            name: peer.name || 'Candidate',
                            jumptakeId: peer.jumptakeId || '',
                            profileImage: peer.profileImage || ''
                        };
                    })
                    .filter((friend) => friend.id);

                setFeedFriends(friends);
            } catch (error) {
                console.error('Error loading feed friends:', error);
                if (isMounted) {
                    setFeedFriends([]);
                }
            }
        };

        fetchFeedFriends();

        return () => {
            isMounted = false;
        };
    }, [mode, candidateUserId]);

    useEffect(() => {
        setJobPage(1);
    }, [activeTab, safeJobs.length]);

    const availableHomeJobLocations = useMemo(() => (
        [...new Set(
            safeJobs
                .map((job) => asDisplayText(job.location).trim())
                .filter(Boolean)
        )].sort((a, b) => a.localeCompare(b))
    ), [safeJobs]);

    const filteredHomeJobs = useMemo(() => {
        const locationFilter = homeJobLocationFilter.trim().toLowerCase();
        const visibleJobs = safeJobs.filter((job) => {
            const companyKey = String(job?.companyId || job?.company?._id || job?.companyName || '');
            return !companyKey || !blockedFeedAuthors.includes(companyKey);
        });
        const filteredJobs = locationFilter
            ? visibleJobs.filter((job) => asDisplayText(job.location).trim().toLowerCase() === locationFilter)
            : visibleJobs;
        const sortedJobs = [...filteredJobs];

        if (homeJobSalarySort === 'salary-high') {
            sortedJobs.sort((a, b) => (getSalarySortValue(b.salary) ?? -Infinity) - (getSalarySortValue(a.salary) ?? -Infinity));
        } else if (homeJobSalarySort === 'salary-low') {
            sortedJobs.sort((a, b) => (getSalarySortValue(a.salary) ?? Infinity) - (getSalarySortValue(b.salary) ?? Infinity));
        }

        return sortedJobs;
    }, [safeJobs, homeJobLocationFilter, homeJobSalarySort, blockedFeedAuthors]);

    useEffect(() => {
        setJobPage(1);
    }, [homeJobLocationFilter, homeJobSalarySort]);

    useEffect(() => {
        let isMounted = true;

        const loadFeedPosts = async () => {
            setFeedLoading(true);
            setFeedError('');

            try {
                const [workResponse, talentResponse] = await Promise.all([
                    fetch(apiUrl('/api/feed-posts?type=work-news')),
                    fetch(apiUrl('/api/feed-posts?type=talent-story'))
                ]);

                if (!workResponse.ok || !talentResponse.ok) {
                    throw new Error('Failed to load MongoDB feed posts');
                }

                const [workPosts, talentPosts] = await Promise.all([
                    workResponse.json(),
                    talentResponse.json()
                ]);

                if (!isMounted) {
                    return;
                }

                setWorkNewsPosts(Array.isArray(workPosts) ? workPosts : []);
                setTalentStories(Array.isArray(talentPosts) ? talentPosts : []);

                if (typeof window !== 'undefined') {
                    localStorage.removeItem(WORK_NEWS_STORAGE_KEY);
                    localStorage.removeItem(TALENT_STORIES_STORAGE_KEY);
                }
            } catch (error) {
                console.error('Error loading live feed posts:', error);
                if (!isMounted) {
                    return;
                }
                setFeedError('Live feed is temporarily unavailable. Please check the API and MongoDB connection.');
            } finally {
                if (isMounted) {
                    setFeedLoading(false);
                }
            }
        };

        loadFeedPosts();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        if (mode !== 'candidate') {
            setBookmarkedHomeJobIds([]);
            return;
        }

        const userId = currentUser?.id || currentUser?._id || currentUser?.userId;
        if (!userId) {
            setBookmarkedHomeJobIds([]);
            return;
        }

        let isMounted = true;

        const fetchAppliedHomeJobs = async () => {
            try {
                const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
                const response = await fetch(apiUrl(`/api/applications/user/${userId}`), {
                    headers: {
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch applied jobs');
                }

                const data = await response.json();
                if (!isMounted) {
                    return;
                }

                const appliedIds = [...new Set(
                    (Array.isArray(data) ? data : [])
                        .filter((application) => String(application?.status || '').toLowerCase() !== 'withdrawn')
                        .map(getApplicationJobId)
                        .filter(Boolean)
                )];

                setAppliedHomeJobIds(appliedIds);
            } catch (error) {
                console.error('Error fetching applied jobs for home feed:', error);
            }
        };

        fetchAppliedHomeJobs();

        return () => {
            isMounted = false;
        };
    }, [mode, currentUser]);

    useEffect(() => {
        if (mode !== 'candidate') {
            setBookmarkedHomeJobIds([]);
            return;
        }

        const userId = currentUser?.id || currentUser?._id || currentUser?.userId;
        if (!userId) {
            setBookmarkedHomeJobIds([]);
            return;
        }

        let isMounted = true;

        const fetchBookmarkedHomeJobs = async () => {
            try {
                const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
                const response = await fetch(apiUrl(`/api/job-bookmarks/user/${userId}`), {
                    headers: {
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch bookmarked jobs');
                }

                const data = await response.json();
                if (!isMounted) {
                    return;
                }

                const bookmarkedIds = [...new Set((Array.isArray(data) ? data : [])
                    .map((bookmark) => String(bookmark?.job?._id || bookmark?.job || bookmark?.jobId || bookmark?._id || ''))
                    .filter(Boolean))];

                setBookmarkedHomeJobIds(bookmarkedIds);
            } catch (error) {
                console.error('Error fetching bookmarked jobs for home feed:', error);
            }
        };

        fetchBookmarkedHomeJobs();

        return () => {
            isMounted = false;
        };
    }, [mode, currentUser]);

    const friendIds = useMemo(() => {
        if (typeof window === 'undefined') {
            return [];
        }

        const possibleKeys = [
            'jumptakeFriends',
            `jumptakeFriends:${viewerId}`,
            'jumptakeCandidateFriends'
        ];

        const cachedFriendIds = possibleKeys.flatMap((key) => {
            try {
                const value = JSON.parse(localStorage.getItem(key) || '[]');
                return Array.isArray(value)
                    ? value.map((item) => String(item?.id || item?._id || item?.userId || item)).filter(Boolean)
                    : [];
            } catch (error) {
                return [];
            }
        });

        return [...new Set([
            ...cachedFriendIds,
            ...feedFriends.map((friend) => String(friend.userId || friend.id)).filter(Boolean)
        ])];
    }, [viewerId, feedFriends]);

    const canViewPost = (post) => {
        if (!post || typeof post !== 'object') {
            return false;
        }

        const hiddenBy = Array.isArray(post.hiddenBy) ? post.hiddenBy : [];
        if (hiddenBy.includes(viewerId)) {
            return false;
        }

        if (blockedFeedAuthors.includes(String(post.authorId || ''))) {
            return false;
        }

        if (String(post.authorId) === viewerId) {
            return true;
        }

        const audience = post.audience || 'everyone';
        if (audience === 'only-me') {
            return false;
        }

        if (audience === 'friends') {
            return friendIds.includes(String(post.authorId));
        }

        return true;
    };

    useEffect(() => {
        setTabsHidden(false);
        feedScrollTopRef.current = 0;
    }, [activeTab]);

    useEffect(() => {
        const key = activeTab === 'work-news' || activeTab === 'my-company-posts'
            ? WORK_NEWS_STORAGE_KEY
            : activeTab === 'talent-stories' || activeTab === 'my-feed'
                ? TALENT_STORIES_STORAGE_KEY
                : '';

        if (!key) {
            return;
        }

        const sourcePosts = key === WORK_NEWS_STORAGE_KEY ? workNewsPosts : talentStories;
        let changed = false;
        const nextPosts = sourcePosts.filter((post) => post && typeof post === 'object').map((post) => {
            const seenBy = Array.isArray(post.seenBy) ? post.seenBy : [];
            if (seenBy.includes(viewerId)) {
                return post;
            }
            changed = true;
            return {
                ...post,
                seenBy: [...seenBy, viewerId],
                reach: Number(post.reach || 0) + 1
            };
        });

        if (!changed) {
            return;
        }

        if (key === WORK_NEWS_STORAGE_KEY) {
            setWorkNewsPosts(nextPosts);
        } else {
            setTalentStories(nextPosts);
        }
    }, [activeTab, viewerId, workNewsPosts, talentStories]);

    const persistPost = async (post) => {
        const postId = post?._id || post?.id;
        if (!postId) {
            return;
        }

        try {
            await fetch(apiUrl(`/api/feed-posts/${postId}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(post)
            });
        } catch (error) {
            console.error('Could not save feed post update:', error);
        }
    };

    const deleteFeedPostRecord = async (post) => {
        const postId = post?._id || post?.id;
        if (!postId || String(postId).startsWith(`${post.type || 'post'}-`)) {
            return;
        }

        try {
            await fetch(apiUrl(`/api/feed-posts/${postId}`), {
                method: 'DELETE'
            });
        } catch (error) {
            console.error('Could not delete feed post:', error);
        }
    };

    const updatePosts = (key, updater) => {
        const setPosts = key === WORK_NEWS_STORAGE_KEY ? setWorkNewsPosts : setTalentStories;

        setPosts((currentPosts) => {
            const nextPosts = updater(currentPosts);

            nextPosts.forEach((post) => {
                const previousPost = currentPosts.find((item) => getPostKey(item) === getPostKey(post));
                if (previousPost && JSON.stringify(previousPost) !== JSON.stringify(post)) {
                    persistPost(post);
                }
            });

            return nextPosts;
        });
    };

    const handleDeletePost = (key, post) => {
        if (!window.confirm('Delete this post?')) {
            return;
        }

        const postKey = getPostKey(post);
        const setPosts = key === WORK_NEWS_STORAGE_KEY ? setWorkNewsPosts : setTalentStories;
        setPosts((currentPosts) => currentPosts.filter((item) => getPostKey(item) !== postKey));
        setOpenReactionPostId('');
        setOpenCommentPostId('');
        setOpenSharePostId('');
        deleteFeedPostRecord(post);
    };

    const savePostSnapshot = (snapshot) => {
        setSavedPosts((currentSavedPosts) => {
            const nextSavedPosts = [
                snapshot,
                ...currentSavedPosts.filter((item) => item.id !== snapshot.id)
            ].slice(0, 80);

            writeStorageArray(getSavedPostsStorageKey(viewerId), nextSavedPosts);
            return nextSavedPosts;
        });
        setShareStatus('Saved.');
    };

    const handleSavePost = (key, post) => {
        const postId = getPostKey(post);
        const tab = getPostTabFromStorageKey(key, activeTab);

        savePostSnapshot({
            id: `post:${postId}`,
            kind: 'post',
            sourceTab: tab,
            title: asDisplayText(post.authorName, 'JumpTake post'),
            subtitle: post.authorType === 'employer' ? 'Company update' : 'Talent story',
            body: asDisplayText(post.body, 'Shared a JumpTake post'),
            authorName: asDisplayText(post.authorName, 'JumpTake user'),
            authorAvatar: post.authorAvatar || '',
            createdAt: post.createdAt || new Date().toISOString(),
            link: getFeedShareUrl({ kind: 'post', id: postId, tab, portal: mode })
        });
        setOpenOptionsPostId('');
    };

    const handleHidePost = (key, post) => {
        const postId = getPostKey(post);
        updatePosts(key, (posts) => posts.map((item) => (
            getPostKey(item) === postId
                ? {
                    ...item,
                    hiddenBy: [...new Set([...(Array.isArray(item.hiddenBy) ? item.hiddenBy : []), viewerId])]
                }
                : item
        )));
        setOpenOptionsPostId('');
    };

    const handleBlockPostOwner = (post) => {
        const authorId = String(post?.authorId || '');
        if (!authorId || authorId === viewerId) {
            setOpenOptionsPostId('');
            return;
        }

        setBlockedFeedAuthors((currentBlocked) => {
            const nextBlocked = [...new Set([...currentBlocked, authorId])];
            writeStorageArray(getBlockedFeedAuthorsStorageKey(viewerId), nextBlocked);
            return nextBlocked;
        });
        setOpenOptionsPostId('');
        setShareStatus('User blocked from your feed.');
    };

    const handleReportPost = (post) => {
        setOpenOptionsPostId('');
        setShareStatus(`${asDisplayText(post?.authorName, 'Post')} reported.`);
    };

    const handleSaveJobPost = (job, event) => {
        event?.stopPropagation();
        const jobId = getJobKey(job);
        savePostSnapshot({
            id: `job:${jobId}`,
            kind: 'job',
            sourceTab: 'job-posts',
            title: asDisplayText(job.title, 'Job post'),
            subtitle: asDisplayText(job.companyName, 'Company'),
            body: asDisplayText(job.description, 'JumpTake job post'),
            authorName: asDisplayText(job.companyName, 'Company'),
            authorAvatar: job.companyLogo || '',
            createdAt: job.createdAt || new Date().toISOString(),
            link: getFeedShareUrl({ kind: 'job', id: jobId, portal: mode })
        });
        setOpenJobOptionsId('');
    };

    const handleReportJobPost = (job, event) => {
        event?.stopPropagation();
        setOpenJobOptionsId('');
        setJobActionMessage(`${asDisplayText(job?.title, 'Job')} reported.`);
    };

    const handleBlockJobPost = (job, event) => {
        event?.stopPropagation();
        const companyId = String(job?.companyId || job?.company?._id || job?.companyName || '');
        if (companyId) {
            setBlockedFeedAuthors((currentBlocked) => {
                const nextBlocked = [...new Set([...currentBlocked, companyId])];
                writeStorageArray(getBlockedFeedAuthorsStorageKey(viewerId), nextBlocked);
                return nextBlocked;
            });
        }
        setOpenJobOptionsId('');
        setJobActionMessage('Job owner blocked from your feed.');
    };

    const handleDeleteHomeJob = async (job, event) => {
        event?.stopPropagation();
        const jobId = job?._id || job?.id;
        if (!jobId || !window.confirm('Delete this job post?')) {
            return;
        }

        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('employerToken') : '';
            const response = await fetch(apiUrl(`/api/jobs/${jobId}`), {
                method: 'DELETE',
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || data.message || 'Could not delete job post.');
            }
            onRefresh?.();
        } catch (error) {
            setFeedError(error.message || 'Could not delete job post.');
        }
    };

    const handleMediaChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        try {
            const dataUrl = await readFileAsDataUrl(file);
            setComposerMedia({
                dataUrl,
                type: file.type.startsWith('video/') ? 'video' : 'image',
                name: file.name
            });
        } catch (error) {
            console.error('Could not attach post media:', error);
        }
    };

    const handleCreatePost = async () => {
        const body = composerText.trim();
        if (!body && !composerMedia) {
            return;
        }

        const isCompanyPost = mode === 'employer';
        const key = isCompanyPost ? WORK_NEWS_STORAGE_KEY : TALENT_STORIES_STORAGE_KEY;
        const nextPost = createPost({
            type: isCompanyPost ? 'work-news' : 'talent-story',
            body,
            viewerId,
            authorName,
            authorType: mode,
            authorAvatar,
            media: composerMedia,
            audience: composerAudience
        });

        try {
            const response = await fetch(apiUrl('/api/feed-posts'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nextPost)
            });
            const savedPost = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(savedPost.error || savedPost.message || 'Could not publish to MongoDB.');
            }

            updatePosts(key, (posts) => [savedPost, ...posts]);
            setComposerText('');
            setComposerMedia(null);
            setComposerAudience('everyone');
            setFeedError('');
            setActiveTab(isCompanyPost ? 'my-company-posts' : 'my-feed');
        } catch (error) {
            console.error('Could not publish live feed post:', error);
            setFeedError(error.message || 'Could not publish to the live MongoDB feed. Please try again.');
        }
    };

    const recordJobReach = (job) => {
        const key = getJobKey(job);
        setJobReachMap((previousMap) => {
            const nextMap = {
                ...previousMap,
                [key]: Number(previousMap[key] || job?.reach || 0) + 1
            };

            if (typeof window !== 'undefined') {
                localStorage.setItem(JOB_REACH_STORAGE_KEY, JSON.stringify(nextMap));
            }

            return nextMap;
        });
    };

    const openJobModal = (job, modalMode = mode) => {
        recordJobReach(job);
        setSelectedJob(job);
        setSelectedJobMode(modalMode);
        setJobActionMessage('');
    };

    const closeJobModal = () => {
        setSelectedJob(null);
        setApplicationJob(null);
        setApplicationMessage('');
        setCoverLetterText('');
        setApplicationResumeUpload(null);
        setApplicationProfile(createApplicationProfileDraft(profileData, currentUser));
        setActiveDraftId(null);
        setSavingApplicationDraft(false);
        setJobActionMessage('');
    };

    const hasAppliedToJob = (job) => {
        const key = getJobKey(job);
        const possibleIds = [
            key,
            String(job?._id || ''),
            String(job?.id || ''),
            String(job?.jobNumber || '')
        ].filter(Boolean);

        if (possibleIds.some((id) => appliedHomeJobIds.includes(id))) {
            return true;
        }

        return normalizeJobApplications(job).some((application) => getApplicationUserId(application) === viewerId);
    };

    const isHomeJobBookmarked = (job) => {
        const possibleIds = [
            String(job?._id || ''),
            String(job?.id || ''),
            String(job?.jobNumber || ''),
            getJobKey(job)
        ].filter(Boolean);

        return possibleIds.some((id) => bookmarkedHomeJobIds.includes(id));
    };

    const getHomeJobLikeEntry = (job) => {
        const key = getJobKey(job);
        const entry = homeJobLikeMap[key];
        return entry && typeof entry === 'object' ? entry : { count: 0, likedBy: [] };
    };

    const isHomeJobLiked = (job) => {
        const entry = getHomeJobLikeEntry(job);
        return Array.isArray(entry.likedBy) && entry.likedBy.map(String).includes(viewerId);
    };

    const getHomeJobLikeCount = (job) => {
        const entry = getHomeJobLikeEntry(job);
        return Number(entry.count || 0) || 0;
    };

    const handleToggleHomeJobLike = (job, event) => {
        event?.stopPropagation();
        const key = getJobKey(job);

        if (!key) {
            return;
        }

        setHomeJobLikeMap((previousMap) => {
            const previousEntry = previousMap[key] && typeof previousMap[key] === 'object'
                ? previousMap[key]
                : { count: 0, likedBy: [] };
            const previousLikedBy = Array.isArray(previousEntry.likedBy)
                ? previousEntry.likedBy.map(String)
                : [];
            const alreadyLiked = previousLikedBy.includes(viewerId);
            const nextLikedBy = alreadyLiked
                ? previousLikedBy.filter((id) => id !== viewerId)
                : [...previousLikedBy, viewerId];
            const nextMap = {
                ...previousMap,
                [key]: {
                    count: Math.max(0, Number(previousEntry.count || 0) + (alreadyLiked ? -1 : 1)),
                    likedBy: nextLikedBy
                }
            };

            if (typeof window !== 'undefined') {
                localStorage.setItem(HOME_JOB_LIKE_STORAGE_KEY, JSON.stringify(nextMap));
            }

            return nextMap;
        });
    };

    const handleToggleHomeJobBookmark = async (job, event) => {
        event?.stopPropagation();

        const userId = currentUser?.id || currentUser?._id || currentUser?.userId;
        const jobId = job?._id || job?.id;

        if (!userId || !jobId) {
            setJobActionMessage('Please log in again before bookmarking this job.');
            return;
        }

        const normalizedJobId = String(jobId);
        const alreadyBookmarked = isHomeJobBookmarked(job);

        setBookmarkedHomeJobIds((previousIds) => (
            alreadyBookmarked
                ? previousIds.filter((id) => id !== normalizedJobId)
                : [...new Set([...previousIds, normalizedJobId])]
        ));

        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
            const response = await fetch(
                alreadyBookmarked
                    ? apiUrl(`/api/job-bookmarks/user/${userId}/job/${jobId}`)
                    : apiUrl('/api/job-bookmarks'),
                {
                    method: alreadyBookmarked ? 'DELETE' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                    },
                    ...(alreadyBookmarked ? {} : { body: JSON.stringify({ userId, jobId }) })
                }
            );

            if (!response.ok) {
                throw new Error('Bookmark request failed');
            }
        } catch (error) {
            console.error('Error updating home job bookmark:', error);
            setBookmarkedHomeJobIds((previousIds) => (
                alreadyBookmarked
                    ? [...new Set([...previousIds, normalizedJobId])]
                    : previousIds.filter((id) => id !== normalizedJobId)
            ));
            setJobActionMessage('Could not update this bookmark. Please try again.');
        }
    };

    const openApplicationWorkspace = (job, event) => {
        event?.stopPropagation();

        if (!job?._id || hasAppliedToJob(job)) {
            return;
        }

        const applicationLink = normalizeExternalUrl(job.applicationLink);

        if (applicationLink && typeof window !== 'undefined') {
            window.open(applicationLink, '_blank', 'noopener,noreferrer');
            return;
        }

        if (!currentUser?.id && !currentUser?._id) {
            setJobActionMessage('Please log in again before applying.');
            return;
        }

        setSelectedJob(job);
        setSelectedJobMode('candidate');
        setApplicationJob(job);
        setActiveDraftId(null);
        setApplicationMessage(`I would like to apply for ${asDisplayText(job.title, 'this role')}.`);
        setCoverLetterText(createCoverLetterTemplate(profileData, job, currentUser));
        setApplicationProfile(createApplicationProfileDraft(profileData, currentUser));
        setApplicationResumeUpload(null);
        setJobActionMessage('');
    };

    const openDraftApplicationWorkspace = async (draftId) => {
        const userId = currentUser?.id || currentUser?._id || currentUser?.userId;

        if (!draftId || !userId) {
            return;
        }

        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
            const response = await fetch(apiUrl(`/api/draft-applications/user/${userId}`), {
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch draft applications');
            }

            const drafts = await response.json();
            const selectedDraft = (Array.isArray(drafts) ? drafts : []).find((draft) => String(draft._id) === String(draftId));

            if (!selectedDraft?.job) {
                return;
            }

            const draftJob = normalizeHomeJobForDisplay(selectedDraft.job);
            const matchingIndex = safeJobs.findIndex((job) => [
                String(job?._id || ''),
                String(job?.id || ''),
                String(job?.jobNumber || ''),
                getJobKey(job)
            ].filter(Boolean).includes(String(draftJob._id || draftJob.id || selectedDraft.job?._id || '')));
            const jobForDraft = matchingIndex >= 0 ? safeJobs[matchingIndex] : draftJob;

            setActiveTab('job-posts');
            setHomeJobLocationFilter('');
            setHomeJobSalarySort('');
            if (matchingIndex >= 0) {
                setJobPage(Math.floor(matchingIndex / HOME_JOB_PAGE_SIZE) + 1);
            }
            setSelectedJob(jobForDraft);
            setSelectedJobMode('candidate');
            setApplicationJob(jobForDraft);
            setActiveDraftId(selectedDraft._id);
            setApplicationMessage(selectedDraft.message || `I would like to apply for ${asDisplayText(jobForDraft.title, 'this role')}.`);
            setCoverLetterText(htmlToPlainText(selectedDraft.coverLetterHtml) || createCoverLetterTemplate(profileData, jobForDraft, currentUser));
            setApplicationProfile(createApplicationProfileDraft(selectedDraft.profileSnapshot || profileData, currentUser));
            setApplicationResumeUpload(selectedDraft.uploadedResume || null);
            setJobActionMessage('Draft application opened for editing.');
        } catch (draftError) {
            console.error('Error opening home feed draft application:', draftError);
            setJobActionMessage(draftError.message || 'Could not open that draft application.');
        }
    };

    const handleCopyJobShare = async (job, event) => {
        event?.stopPropagation();
        const jobId = getJobKey(job);
        const jobUrl = getFeedShareUrl({ kind: 'job', id: jobId, portal: mode });
        const jobText = [
            asDisplayText(job.title, 'JumpTake job post'),
            asDisplayText(job.companyName, 'Company'),
            jobUrl
        ].filter(Boolean).join('\n\n');

        try {
            if (navigator.share) {
                await navigator.share({ text: jobText, url: jobUrl });
            } else if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(jobUrl || jobText);
            }

            recordJobReach(job);
            setJobActionMessage('Job link copied.');
        } catch (error) {
            setJobActionMessage('Could not share this job post.');
        }
    };

    const openJobModalRef = useRef(openJobModal);
    const openApplicationWorkspaceRef = useRef(openApplicationWorkspace);
    const openDraftApplicationWorkspaceRef = useRef(openDraftApplicationWorkspace);

    useEffect(() => {
        openJobModalRef.current = openJobModal;
        openApplicationWorkspaceRef.current = openApplicationWorkspace;
        openDraftApplicationWorkspaceRef.current = openDraftApplicationWorkspace;
    });

    useEffect(() => () => {
        if (reactionTooltipTimerRef.current) {
            window.clearTimeout(reactionTooltipTimerRef.current);
        }
        if (reactionCloseTimerRef.current) {
            window.clearTimeout(reactionCloseTimerRef.current);
        }
        if (feedDraftTypingTimerRef.current) {
            window.clearTimeout(feedDraftTypingTimerRef.current);
        }
        feedDraftTypingTokenRef.current += 1;
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        const tabIds = mode === 'employer'
            ? ['talent-stories', 'work-news', 'create-post', 'my-company-posts', 'my-job-posts']
            : ['work-news', 'job-posts', 'talent-stories', 'create-story', 'my-feed'];

        const openRequestedJob = (request = {}) => {
            if (request.mode && request.mode !== mode) {
                return;
            }

            const requestedTab = request.tab || (request.jobId ? 'job-posts' : defaultTab);
            if (tabIds.includes(requestedTab)) {
                setActiveTab(requestedTab);
            }

            if (requestedTab !== 'job-posts' || !request.jobId || !safeJobs.length) {
                return;
            }

            const requestedId = String(request.jobId);
            const matchIndex = safeJobs.findIndex((job) => [
                String(job?._id || ''),
                String(job?.id || ''),
                String(job?.jobNumber || ''),
                getJobKey(job)
            ].filter(Boolean).includes(requestedId));

            if (matchIndex < 0) {
                return;
            }

            const matchedJob = safeJobs[matchIndex];
            setHomeJobLocationFilter('');
            setHomeJobSalarySort('');
            setJobPage(Math.floor(matchIndex / HOME_JOB_PAGE_SIZE) + 1);

            const scheduleFrame = window.requestAnimationFrame || ((callback) => window.setTimeout(callback, 0));
            scheduleFrame(() => {
                if (request.action === 'apply') {
                    openApplicationWorkspaceRef.current(matchedJob);
                } else {
                    openJobModalRef.current(matchedJob, 'candidate');
                }
            });
        };

        const typeFeedDraft = (text = '') => {
            if (feedDraftTypingTimerRef.current) {
                window.clearTimeout(feedDraftTypingTimerRef.current);
            }

            feedDraftTypingTokenRef.current += 1;
            const typingToken = feedDraftTypingTokenRef.current;
            const characters = Array.from(String(text || '').trim());
            const chunkSize = Math.max(2, Math.ceil(characters.length / 140));
            let cursor = 0;

            setComposerText('');

            const typeNextChunk = () => {
                if (typingToken !== feedDraftTypingTokenRef.current) {
                    return;
                }

                cursor = Math.min(characters.length, cursor + chunkSize);
                setComposerText(characters.slice(0, cursor).join(''));

                if (cursor < characters.length) {
                    feedDraftTypingTimerRef.current = window.setTimeout(typeNextChunk, 22);
                    return;
                }

                feedDraftTypingTimerRef.current = null;
            };

            feedDraftTypingTimerRef.current = window.setTimeout(typeNextChunk, 260);
        };

        const openFeedDraft = (draft = {}) => {
            if (draft.mode && draft.mode !== mode) {
                return;
            }

            const requestedTab = draft.tab || (mode === 'employer' ? 'create-post' : 'create-story');
            if (!tabIds.includes(requestedTab)) {
                return;
            }

            setActiveTab(requestedTab);
            typeFeedDraft(draft.text || '');
            setComposerMedia(null);
            setFeedError('');
        };

        const readStoredRequest = () => {
            const storedActiveDraftId = localStorage.getItem('jumptakeActiveDraftId');
            if (storedActiveDraftId) {
                localStorage.removeItem('jumptakeActiveDraftId');
                localStorage.removeItem('jumptakeActiveJobReturnSection');
                openDraftApplicationWorkspaceRef.current(storedActiveDraftId);
                return;
            }

            try {
                const storedRequest = JSON.parse(sessionStorage.getItem('jumptakeHomeFeedRequest') || 'null');
                if (storedRequest) {
                    sessionStorage.removeItem('jumptakeHomeFeedRequest');
                    openRequestedJob(storedRequest);
                }
            } catch (error) {
                sessionStorage.removeItem('jumptakeHomeFeedRequest');
            }

            try {
                const storedDraft = JSON.parse(sessionStorage.getItem('jumptakeFeedAiDraft') || 'null');
                if (storedDraft) {
                    sessionStorage.removeItem('jumptakeFeedAiDraft');
                    openFeedDraft(storedDraft);
                }
            } catch (error) {
                sessionStorage.removeItem('jumptakeFeedAiDraft');
            }
        };

        const handleHomeFeedRequest = (event) => {
            openRequestedJob(event.detail || {});
        };

        const handleFeedDraft = (event) => {
            openFeedDraft(event.detail || {});
        };

        readStoredRequest();
        window.addEventListener('jumptake-home-feed-request', handleHomeFeedRequest);
        window.addEventListener('jumptake-feed-ai-draft', handleFeedDraft);

        return () => {
            window.removeEventListener('jumptake-home-feed-request', handleHomeFeedRequest);
            window.removeEventListener('jumptake-feed-ai-draft', handleFeedDraft);
        };
    }, [defaultTab, mode, safeJobs]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const params = new URLSearchParams(window.location.search);
        const linkedPostId = params.get('jtPost');
        const linkedJobId = params.get('jtJob');
        const linkedTab = params.get('jtTab');

        if (linkedPostId) {
            pendingDeepLinkRef.current = { type: 'post', id: linkedPostId };
            const allowedTabs = mode === 'employer'
                ? ['talent-stories', 'work-news', 'create-post', 'my-company-posts', 'my-job-posts']
                : ['work-news', 'job-posts', 'talent-stories', 'create-story', 'my-feed'];
            if (linkedTab && allowedTabs.includes(linkedTab)) {
                setActiveTab(linkedTab);
            }
            return;
        }

        if (linkedJobId) {
            pendingDeepLinkRef.current = { type: 'job', id: linkedJobId };
            setActiveTab('job-posts');
        }
    }, [mode]);

    useEffect(() => {
        if (typeof window === 'undefined' || !pendingDeepLinkRef.current) {
            return;
        }

        const deepLink = pendingDeepLinkRef.current;
        const selectorId = String(deepLink.id).replace(/"/g, '\\"');
        if (deepLink.type === 'job') {
            const matchIndex = filteredHomeJobs.findIndex((job) => [
                String(job?._id || ''),
                String(job?.id || ''),
                String(job?.jobNumber || ''),
                getJobKey(job)
            ].filter(Boolean).includes(String(deepLink.id)));
            if (matchIndex >= 0) {
                const nextPage = Math.floor(matchIndex / HOME_JOB_PAGE_SIZE) + 1;
                if (nextPage !== jobPage) {
                    setJobPage(nextPage);
                    return;
                }
            }
        }

        const selector = deepLink.type === 'job'
            ? `[data-job-id="${selectorId}"]`
            : `[data-post-id="${selectorId}"]`;
        const scheduleFrame = window.requestAnimationFrame || ((callback) => window.setTimeout(callback, 0));

        scheduleFrame(() => {
            const target = document.querySelector(selector);
            if (!target) {
                return;
            }

            target.scrollIntoView({ block: 'center', behavior: 'smooth' });
            target.classList.add('portal-deep-link-target');
            window.setTimeout(() => target.classList.remove('portal-deep-link-target'), 1800);
            pendingDeepLinkRef.current = null;

            if (deepLink.type === 'job') {
                const matchedJob = safeJobs.find((job) => getJobKey(job) === deepLink.id);
                if (matchedJob) {
                    openJobModalRef.current(matchedJob, 'candidate');
                }
            }
        });
    }, [activeTab, workNewsPosts, talentStories, filteredHomeJobs, safeJobs, jobPage]);

    const handleApplicationProfileChange = (event) => {
        const { name, value } = event.target;
        setApplicationProfile((previousProfile) => ({
            ...previousProfile,
            [name]: value
        }));
    };

    const handleApplicationResumeUpload = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file) {
            return;
        }

        try {
            setIsPreparingResumeUpload(true);
            const mimeType = file.type || '';
            const isSupportedFile = (
                mimeType === 'application/pdf'
                || mimeType === 'application/msword'
                || mimeType.includes('officedocument.wordprocessingml.document')
                || mimeType === 'text/plain'
                || /\.pdf$/i.test(file.name)
                || /\.doc$/i.test(file.name)
                || /\.docx$/i.test(file.name)
                || /\.txt$/i.test(file.name)
            );

            if (!isSupportedFile) {
                throw new Error('Upload a PDF, DOC, DOCX, or TXT resume.');
            }

            const dataUrl = await readResumeFileAsDataUrl(file);
            setApplicationResumeUpload({
                fileName: file.name,
                mimeType,
                dataUrl,
                source: 'uploaded-resume'
            });
            setJobActionMessage('Uploaded resume attached to this application.');
        } catch (error) {
            setJobActionMessage(error.message || 'Could not attach that resume.');
        } finally {
            setIsPreparingResumeUpload(false);
        }
    };

    const handleApplyUsingSavedResume = () => {
        try {
            const userId = currentUser?.id || currentUser?._id || currentUser?.userId || viewerId || 'guest';
            const savedRecords = JSON.parse(localStorage.getItem(`${RESUME_PLAYGROUND_STORAGE_KEY}${userId}`) || '[]');
            const resumes = Array.isArray(savedRecords) ? savedRecords.filter((item) => item?.html) : [];

            if (!resumes.length) {
                setJobActionMessage('No saved resumes found in Resume Playground yet.');
                return;
            }

            const optionsText = resumes
                .map((resume, index) => `${index + 1}. ${resume.name || `Saved Resume ${index + 1}`}`)
                .join('\n');
            const selectedValue = window.prompt(`Choose a saved resume by number:\n\n${optionsText}`, '1');

            if (!selectedValue) {
                return;
            }

            const selectedResume = resumes[Number(selectedValue) - 1];
            const previewPayload = buildSavedResumePreview(selectedResume);

            if (!previewPayload) {
                throw new Error('Saved resume selection was not valid.');
            }

            setApplicationResumeUpload(previewPayload);
            setJobActionMessage(`Saved resume "${selectedResume.name || 'Saved Resume'}" attached to this application.`);
        } catch (error) {
            setJobActionMessage(error.message || 'Could not attach saved resume.');
        }
    };

    const handleApplyWithProfileSnapshot = () => {
        setApplicationResumeUpload(null);
        setApplicationProfile(createApplicationProfileDraft(profileData, currentUser));
        setJobActionMessage('Profile snapshot selected for this application.');
    };

    const handleSaveDraft = async () => {
        if (!applicationJob?._id) {
            return;
        }

        const userId = currentUser?.id || currentUser?._id || currentUser?.userId;
        if (!userId) {
            setJobActionMessage('Please log in again before saving this draft.');
            return;
        }

        setSavingApplicationDraft(true);
        setJobActionMessage('');

        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
            const response = await fetch(apiUrl('/api/draft-applications'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    draftId: activeDraftId,
                    jobId: applicationJob._id,
                    userId,
                    message: applicationMessage,
                    coverLetterHtml: createCoverLetterHtml(coverLetterText),
                    profileSnapshot: prepareApplicationProfileSnapshot(applicationProfile),
                    uploadedResume: applicationResumeUpload
                })
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || data.message || 'Could not save draft application.');
            }

            setActiveDraftId(data._id || activeDraftId);
            setApplicationJob(null);
            setJobActionMessage('Draft application saved successfully.');
            onRefresh?.();
        } catch (error) {
            setJobActionMessage(error.message || 'Could not save draft application.');
        } finally {
            setSavingApplicationDraft(false);
        }
    };

    const handleApplyToJob = async (job, event) => {
        event?.stopPropagation();

        if (!job?._id || hasAppliedToJob(job)) {
            return;
        }

        if (!currentUser?.id && !currentUser?._id && !currentUser?.userId) {
            setJobActionMessage('Please log in again before applying.');
            return;
        }

        if (!applicationMessage.trim()) {
            setJobActionMessage('Please include a message with your application.');
            return;
        }

        const key = getJobKey(job);
        setApplyingHomeJobId(key);
        setJobActionMessage('');

        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
            const response = await fetch(apiUrl('/api/applications'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    jobId: job._id,
                    userId: currentUser.id || currentUser._id || currentUser.userId,
                    message: applicationMessage,
                    coverLetterHtml: createCoverLetterHtml(coverLetterText),
                    profileSnapshot: prepareApplicationProfileSnapshot(applicationProfile),
                    uploadedResume: applicationResumeUpload,
                    draftId: activeDraftId
                })
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || data.message || 'Could not submit application.');
            }

            setAppliedHomeJobIds((previousIds) => (
                [...new Set([
                    ...previousIds,
                    key,
                    String(job?._id || ''),
                    String(job?.id || ''),
                    String(job?.jobNumber || '')
                ].filter(Boolean))]
            ));
            setApplicationJob(null);
            setApplicationMessage('');
            setCoverLetterText('');
            setApplicationResumeUpload(null);
            setApplicationProfile(createApplicationProfileDraft(profileData, currentUser));
            setActiveDraftId(null);
            setJobActionMessage('Application submitted successfully.');
            onRefresh?.();
        } catch (error) {
            setJobActionMessage(error.message || 'Could not submit application.');
        } finally {
            setApplyingHomeJobId('');
        }
    };

    const handleReact = (key, postId, reaction) => {
        const tooltipKey = `${postId}:${reaction}`;
        const reactionAnimationKey = `${postId}:${reaction}`;

        if (reactionTooltipTimerRef.current) {
            window.clearTimeout(reactionTooltipTimerRef.current);
        }
        if (reactionCloseTimerRef.current) {
            window.clearTimeout(reactionCloseTimerRef.current);
            reactionCloseTimerRef.current = null;
        }

        setVisibleReactionTooltip(tooltipKey);
        setAnimatingReactionKey(reactionAnimationKey);
        reactionTooltipTimerRef.current = window.setTimeout(() => {
            setVisibleReactionTooltip('');
            reactionTooltipTimerRef.current = null;
        }, 760);

        if (reaction === 'Hide') {
            updatePosts(key, (posts) => posts.map((post) => (
                getPostKey(post) === postId
                    ? {
                        ...post,
                        hiddenBy: [...new Set([...(Array.isArray(post.hiddenBy) ? post.hiddenBy : []), viewerId])]
                    }
                    : post
            )));

            const undo = window.confirm('Post hidden from your feed. Undo hide?');
            if (undo) {
                updatePosts(key, (posts) => posts.map((post) => (
                    getPostKey(post) === postId
                        ? {
                            ...post,
                            hiddenBy: (Array.isArray(post.hiddenBy) ? post.hiddenBy : []).filter((id) => id !== viewerId)
                        }
                        : post
                )));
            }

            setOpenReactionPostId('');
            setAnimatingReactionKey('');
            return;
        }

        updatePosts(key, (posts) => posts.map((post) => (
            getPostKey(post) === postId
                ? (() => {
                    const previousReactions = normalizeViewerReactions(getViewerReaction(post, viewerId));
                    const hasReaction = previousReactions.includes(reaction);
                    const nextReactions = hasReaction
                        ? previousReactions.filter((item) => item !== reaction)
                        : [...previousReactions, reaction].slice(-3);
                    const nextReactionsByUser = { ...(post.reactionsByUser || {}) };

                    if (nextReactions.length) {
                        nextReactionsByUser[viewerId] = nextReactions;
                    } else {
                        delete nextReactionsByUser[viewerId];
                    }

                    return {
                        ...post,
                        reactionsByUser: nextReactionsByUser,
                        reactions: adjustReactionCounts(post.reactions, previousReactions, nextReactions)
                    };
                })()
                : post
        )));
        reactionCloseTimerRef.current = window.setTimeout(() => {
            setOpenReactionPostId('');
            setAnimatingReactionKey('');
            reactionCloseTimerRef.current = null;
        }, 760);
    };

    const handleComment = (key, postId) => {
        const text = String(commentDrafts[postId] || '').trim();
        if (!text) {
            return;
        }

        const mentions = Array.from(text.matchAll(/@([\w.-]+)/g)).map((match) => match[1]);
        updatePosts(key, (posts) => posts.map((post) => (
            getPostKey(post) === postId
                ? {
                    ...post,
                    reach: Number(post.reach || 0) + mentions.length,
                    comments: [
                        ...(Array.isArray(post.comments) ? post.comments : []),
                        {
                            id: `comment-${Date.now()}`,
                            authorId: viewerId,
                            authorName,
                            authorType: mode,
                            authorAvatar,
                            text,
                            mentions,
                            createdAt: new Date().toISOString()
                        }
                    ]
                }
                : post
        )));
        setCommentDrafts((drafts) => ({ ...drafts, [postId]: '' }));
        setOpenCommentPostId('');
    };

    const handleCopyPostShare = async (key, post) => {
        const postId = getPostKey(post);
        const tab = getPostTabFromStorageKey(key, activeTab);
        const postUrl = getFeedShareUrl({ kind: 'post', id: postId, tab, portal: mode });
        const postText = [
            asDisplayText(post.authorName, 'JumpTake user'),
            asDisplayText(post.body, 'Shared a JumpTake post'),
            postUrl
        ].filter(Boolean).join('\n\n');

        try {
            if (navigator.share) {
                await navigator.share({ text: postText, url: postUrl });
            } else if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(postUrl || postText);
            }

            updatePosts(key, (posts) => posts.map((item) => (
                getPostKey(item) === postId
                    ? { ...item, reach: Number(item.reach || 0) + 1 }
                    : item
            )));
            setShareStatus('Post link copied.');
        } catch (error) {
            setShareStatus('Could not open sharing. Try again.');
        }
    };

    const handleShareToFriend = async (key, post, friend) => {
        const postId = getPostKey(post);
        if (!friend?.candidateId || !candidateUserId) {
            setShareStatus('This friend cannot receive messages yet.');
            return;
        }

        setSharingTargetId(friend.id);
        setShareStatus('');

        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
            const postText = asDisplayText(post.body, 'a JumpTake post');
            const postUrl = getFeedShareUrl({
                kind: 'post',
                id: postId,
                tab: getPostTabFromStorageKey(key, activeTab),
                portal: mode
            });
            const bodyHtml = [
                `<p>${escapeHtml(authorName)} shared a JumpTake post with you.</p>`,
                `<p>${escapeHtml(postText)}</p>`,
                postUrl ? `<p><a href="${escapeHtml(postUrl)}">${escapeHtml(postUrl)}</a></p>` : ''
            ].join('');

            const response = await fetch(apiUrl('/api/messages/candidate-direct'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    senderUserId: candidateUserId,
                    recipientCandidateId: friend.candidateId,
                    bodyHtml
                })
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || 'Could not share this post.');
            }

            updatePosts(key, (posts) => posts.map((item) => (
                getPostKey(item) === postId
                    ? {
                        ...item,
                        reach: Number(item.reach || 0) + 1,
                        comments: [
                            ...(Array.isArray(item.comments) ? item.comments : []),
                            {
                                id: `share-${Date.now()}`,
                                authorId: viewerId,
                                authorName,
                                authorType: mode,
                                authorAvatar,
                                text: `Shared with @${friend.jumptakeId || friend.name}`,
                                mentions: [friend.jumptakeId || friend.name],
                                createdAt: new Date().toISOString()
                            }
                        ]
                    }
                    : item
            )));

            setShareStatus(`Shared with ${friend.name}.`);
            setOpenSharePostId('');
        } catch (error) {
            setShareStatus(error.message || 'Could not share this post.');
        } finally {
            setSharingTargetId('');
        }
    };

    const handleHorizontalRailWheel = useCallback((event) => {
        const scroller = event.currentTarget;

        if (!scroller || scroller.scrollWidth <= scroller.clientWidth + 1) {
            return;
        }

        const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;

        if (!delta) {
            return;
        }

        const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
        const nextScrollLeft = Math.max(0, Math.min(maxScrollLeft, scroller.scrollLeft + delta));

        if (nextScrollLeft === scroller.scrollLeft) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        scroller.scrollLeft = nextScrollLeft;
    }, []);

    const handleFeedScroll = useCallback((event) => {
        const nextScrollTop = event.currentTarget.scrollTop;
        const previousScrollTop = feedScrollTopRef.current;
        const delta = nextScrollTop - previousScrollTop;

        if (Math.abs(delta) < 8) {
            return;
        }

        setTabsHidden(nextScrollTop > 12 && delta > 0);
        feedScrollTopRef.current = nextScrollTop;
    }, []);

    const shouldUseControlledFeedTouch = useCallback((event) => {
        if (typeof window === 'undefined' || window.innerWidth > 768 || !event.touches?.length) {
            return false;
        }

        const target = event.target;
        if (!target?.closest) {
            return true;
        }

        return !target.closest('input, textarea, select, [contenteditable="true"], .portal-home-tabs, .portal-reaction-rail');
    }, []);

    const handleFeedTouchStart = useCallback((event) => {
        if (!shouldUseControlledFeedTouch(event)) {
            return;
        }

        feedTouchRef.current = {
            y: event.touches[0].clientY,
            scrollTop: event.currentTarget.scrollTop
        };
    }, [shouldUseControlledFeedTouch]);

    const handleFeedTouchMove = useCallback((event) => {
        if (!shouldUseControlledFeedTouch(event)) {
            return;
        }

        const delta = feedTouchRef.current.y - event.touches[0].clientY;
        const cappedDelta = Math.max(
            -MOBILE_FEED_MAX_TOUCH_SCROLL,
            Math.min(MOBILE_FEED_MAX_TOUCH_SCROLL, delta * MOBILE_FEED_TOUCH_SCROLL_RATIO)
        );
        const scroller = event.currentTarget;
        const maxScrollTop = Math.max(scroller.scrollHeight - scroller.clientHeight, 0);
        const nextScrollTop = Math.max(
            0,
            Math.min(maxScrollTop, feedTouchRef.current.scrollTop + cappedDelta)
        );

        if (event.cancelable) {
            event.preventDefault();
        }

        if (typeof scroller.scrollTo === 'function') {
            scroller.scrollTo({ top: nextScrollTop, behavior: 'smooth' });
        } else {
            scroller.scrollTop = nextScrollTop;
        }

        feedScrollTopRef.current = nextScrollTop;

        if (Math.abs(cappedDelta) > 12) {
            setTabsHidden(nextScrollTop > 12 && cappedDelta > 0);
        }
    }, [shouldUseControlledFeedTouch]);

    const handleFeedTouchEnd = useCallback((event) => {
        feedTouchRef.current = {
            y: 0,
            scrollTop: event.currentTarget.scrollTop
        };
        feedScrollTopRef.current = event.currentTarget.scrollTop;
    }, []);

    const renderPostList = (posts, key, kind) => {
        const safePosts = Array.isArray(posts)
            ? posts
                .filter((post) => post && typeof post === 'object')
                .map((post, index) => normalizePostForDisplay(post, index))
            : [];
        const visiblePosts = safePosts.filter(canViewPost);

        if (!visiblePosts.length) {
            return (
                <div className="portal-feed-empty">
                    No posts here yet. The feed will fill up when people start sharing updates.
                </div>
            );
        }

        return (
            <div className="portal-social-list">
                {visiblePosts.map((post, postIndex) => {
                    const postKey = getPostKey(post, postIndex);
                    const postComments = post.comments;
                    const selectedReactions = normalizeViewerReactions(getViewerReaction(post, viewerId));
                    const selectedReaction = selectedReactions[selectedReactions.length - 1] || '';
                    const isReactionMenuOpen = openReactionPostId === postKey;
                    const isCommentOpen = openCommentPostId === postKey;
                    const isShareOpen = openSharePostId === postKey;
                    const isOptionsOpen = openOptionsPostId === postKey;
                    const hasViewerComment = postComments.some((comment) => String(comment.authorId || '') === viewerId);
                    const reactionTotal = getTotalReactionCount(post);
                    const commentTotal = postComments.length;
                    const canDeletePost = String(post.authorId) === viewerId
                        && ['my-feed', 'my-company-posts'].includes(activeTab);

                    return (
                    <article key={postKey} className="portal-social-post-card" data-post-id={postKey}>
                        <div className="portal-social-post-header">
                            <div className={`portal-post-avatar ${post.authorAvatar ? '' : 'has-default-profile-icon'}`}>
                                {post.authorAvatar ? (
                                    <img src={post.authorAvatar} alt={asDisplayText(post.authorName, 'Post author')} />
                                ) : (
                                    <span className="portal-default-profile-icon"><DefaultProfileIcon /></span>
                                )}
                            </div>
                            <div className="portal-post-title-block">
                                <h3 className="portal-post-author-name">{asDisplayText(post.authorName, 'Unknown author')}</h3>
                                <p>{post.authorType === 'employer' ? 'Company update' : 'Talent story'} - {safeDateLabel(post.createdAt)}</p>
                                {post.audience && post.audience !== 'everyone' && (
                                    <small className="portal-audience-pill">{post.audience === 'only-me' ? 'Only me' : 'Friends only'}</small>
                                )}
                            </div>
                            <div className="portal-post-header-actions">
                                <span className="portal-post-options-wrap">
                                    <button
                                        type="button"
                                        className="portal-post-options-button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setOpenOptionsPostId((openId) => (openId === postKey ? '' : postKey));
                                            setOpenReactionPostId('');
                                            setOpenCommentPostId('');
                                            setOpenSharePostId('');
                                        }}
                                        aria-expanded={isOptionsOpen}
                                        aria-label="Post options"
                                        title="Post options"
                                    >
                                        <MoreOptionsIcon />
                                    </button>
                                    {isOptionsOpen && (
                                        <span className="portal-post-options-menu" role="menu">
                                            <button type="button" onClick={() => handleSavePost(key, post)} role="menuitem">Save post</button>
                                            <button type="button" onClick={() => handleReportPost(post)} role="menuitem">Report</button>
                                            <button type="button" onClick={() => handleHidePost(key, post)} role="menuitem">Hide post</button>
                                            <button type="button" onClick={() => handleBlockPostOwner(post)} role="menuitem">Block user</button>
                                        </span>
                                    )}
                                </span>
                            </div>
                            <span className="portal-post-reach">{formatCompactCount(post.reach || 0)} reach</span>
                        </div>
                        {asDisplayText(post.body) && <p className="portal-post-body">{asDisplayText(post.body)}</p>}
                        {post.media?.dataUrl && (
                            <div className="portal-post-media">
                                {post.media.type === 'video' ? (
                                    <video src={post.media.dataUrl} controls playsInline />
                                ) : (
                                    <img src={post.media.dataUrl} alt={post.media.name} />
                                )}
                            </div>
                        )}
                        <div className="portal-post-action-cluster">
                            {isReactionMenuOpen && (
                                <ul className="portal-post-reactions portal-reaction-rail example-1 is-popover" aria-label="Post reactions" onWheelCapture={handleHorizontalRailWheel}>
                                    {reactionLabels[kind].map((reaction) => {
                                        const isActiveReaction = selectedReactions.includes(reaction);
                                        const isAnimatingReaction = animatingReactionKey === `${postKey}:${reaction}`;
                                        return (
                                            <li key={reaction} className="portal-reaction-item icon-content">
                                                <button
                                                    type="button"
                                                    className={`portal-reaction-button portal-reaction-icon-button link reaction-${reaction.toLowerCase()} ${isActiveReaction ? 'active' : ''} ${isAnimatingReaction ? 'is-click-animating' : ''} ${visibleReactionTooltip === `${postKey}:${reaction}` ? 'tooltip-visible' : ''}`}
                                                    onClick={() => handleReact(key, postKey, reaction)}
                                                    aria-pressed={isActiveReaction}
                                                    aria-label={`${reaction} reaction`}
                                                >
                                                    <ReactionIcon name={reaction} />
                                                    <ReactionTooltip>{reaction}</ReactionTooltip>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                            <div className="portal-post-action-row">
                                <button
                                    type="button"
                                    className={`portal-reaction-trigger ${selectedReaction ? `has-reaction reaction-${selectedReaction.toLowerCase()}` : ''}`}
                                    onClick={() => {
                                        setOpenReactionPostId((openId) => (openId === postKey ? '' : postKey));
                                        setOpenCommentPostId('');
                                        setOpenSharePostId('');
                                        setOpenOptionsPostId('');
                                        setAnimatingReactionKey('');
                                    }}
                                    aria-expanded={isReactionMenuOpen}
                                    aria-label="Choose reaction"
                                >
                                    {selectedReaction ? (
                                        <ReactionIcon name={selectedReaction} />
                                    ) : (
                                        <img src={reactionButtonIcon} alt="" />
                                    )}
                                </button>
                                {reactionTotal > 0 && (
                                    <span className="portal-reaction-trigger-count" aria-label={`${reactionTotal} reactions`}>
                                        {formatCompactCount(reactionTotal)}
                                    </span>
                                )}
                                <button
                                    type="button"
                                    className={`portal-comment-toggle ${hasViewerComment ? 'active' : ''}`}
                                    onClick={() => {
                                        setOpenCommentPostId((openId) => (openId === postKey ? '' : postKey));
                                        setOpenReactionPostId('');
                                        setOpenSharePostId('');
                                        setOpenOptionsPostId('');
                                    }}
                                    aria-expanded={isCommentOpen}
                                    aria-label="Comment"
                                    title="Comment"
                                >
                                    <ReactionIcon name="Comment" />
                                </button>
                                {commentTotal > 0 && (
                                    <span className="portal-comment-trigger-count" aria-label={`${commentTotal} comments`}>
                                        {formatCompactCount(commentTotal)}
                                    </span>
                                )}
                                <button
                                    type="button"
                                    className={`portal-share-toggle ${isShareOpen ? 'active' : ''}`}
                                    onClick={() => {
                                        setOpenSharePostId((openId) => (openId === postKey ? '' : postKey));
                                        setOpenReactionPostId('');
                                        setOpenCommentPostId('');
                                        setOpenOptionsPostId('');
                                        setShareStatus('');
                                    }}
                                    aria-expanded={isShareOpen}
                                    aria-label="Share post"
                                    title="Share"
                                >
                                    <SharePostIcon />
                                </button>
                                {canDeletePost && (
                                    <button
                                        type="button"
                                        className="portal-post-delete-toggle"
                                        onClick={() => handleDeletePost(key, post)}
                                        aria-label="Delete post"
                                        title="Delete post"
                                    >
                                        <DeletePostIcon />
                                    </button>
                                )}
                                {isShareOpen && (
                                    <div className="portal-share-picker" role="dialog" aria-label="Share post with friend">
                                        <strong>Share post</strong>
                                        <button
                                            type="button"
                                            className="portal-share-friend portal-share-copy-button"
                                            onClick={() => handleCopyPostShare(key, post)}
                                        >
                                            <span className="portal-share-friend-avatar">
                                                <SharePostIcon />
                                            </span>
                                            <span>
                                                <span className="portal-share-friend-name">Copy or share post</span>
                                                <small>Use your device share tools</small>
                                            </span>
                                        </button>
                                        {mode === 'candidate' && feedFriends.length ? (
                                            <div className="portal-share-friend-list">
                                                {feedFriends.map((friend) => (
                                                    <button
                                                        key={friend.id}
                                                        type="button"
                                                        className="portal-share-friend"
                                                        onClick={() => handleShareToFriend(key, post, friend)}
                                                        disabled={sharingTargetId === friend.id}
                                                    >
                                                        <span className="portal-share-friend-avatar">
                                                            {friend.profileImage ? <img src={friend.profileImage} alt="" /> : <DefaultProfileIcon />}
                                                        </span>
                                                        <span>
                                                            <span className="portal-share-friend-name">{friend.name}</span>
                                                            {friend.jumptakeId ? <small>{friend.jumptakeId}</small> : null}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : mode === 'candidate' ? (
                                            <p>No friends to share with yet.</p>
                                        ) : null}
                                        {shareStatus && <p className="portal-share-status">{shareStatus}</p>}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="portal-post-comments">
                            {postComments.slice(-3).map((comment, commentIndex) => (
                                <div key={comment.id || `comment-${commentIndex}`} className="portal-comment-item">
                                    <div className={`portal-comment-avatar ${comment.authorAvatar ? '' : 'has-default-profile-icon'}`}>
                                        {comment.authorAvatar ? (
                                            <img src={comment.authorAvatar} alt={asDisplayText(comment.authorName, 'Comment author')} />
                                        ) : (
                                            <span className="portal-default-profile-icon"><DefaultProfileIcon /></span>
                                        )}
                                    </div>
                                    <p>
                                        <strong className="portal-comment-name">{asDisplayText(comment.authorName, 'User')}</strong>: {asDisplayText(comment.text)}
                                    </p>
                                </div>
                            ))}
                            {isCommentOpen && (
                                <div className="portal-comment-row is-open">
                                    <input
                                        type="text"
                                        value={commentDrafts[postKey] || ''}
                                        placeholder="Comment or mention with @JumpTakeID..."
                                        onChange={(event) => setCommentDrafts((drafts) => ({ ...drafts, [postKey]: event.target.value }))}
                                    />
                                    <button type="button" className="portal-comment-button" onClick={() => handleComment(key, postKey)} aria-label="Post comment">
                                        <ReactionIcon name="Comment" />
                                        <span>Post</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </article>
                );
                })}
            </div>
        );
    };

    const renderComposer = () => (
        <div className="portal-post-composer">
            <h3>{mode === 'employer' ? 'Create a company post' : 'Create a talent story'}</h3>
            <p>
                {mode === 'employer'
                    ? 'Share company news, hiring updates, wins, challenges, or announcements to Work News.'
                    : 'Share a career story, project, job-market thought, invention, social work, or anything useful to the talent community.'}
            </p>
            <textarea
                value={composerText}
                onChange={(event) => setComposerText(event.target.value)}
                placeholder="Write your post..."
            />
            <div className="portal-composer-tools">
                <label className="portal-audience-select">
                    Audience
                    <select value={composerAudience} onChange={(event) => setComposerAudience(event.target.value)}>
                        <option value="everyone">Everyone</option>
                        <option value="friends">Friends only</option>
                        <option value="only-me">Only me</option>
                    </select>
                </label>
                <div className="portal-post-media-picker">
                    <label>
                        Add media
                        <input type="file" accept="image/*,video/*" onChange={handleMediaChange} />
                    </label>
                    {composerMedia && (
                        <button type="button" className="portal-media-clear-button" onClick={() => setComposerMedia(null)}>
                            Remove {composerMedia.type}
                        </button>
                    )}
                </div>
            </div>
            {composerMedia?.dataUrl && (
                <div className="portal-post-media portal-post-media-preview">
                    {composerMedia.type === 'video' ? (
                        <video src={composerMedia.dataUrl} controls playsInline />
                    ) : (
                        <img src={composerMedia.dataUrl} alt={composerMedia.name || 'Selected attachment'} />
                    )}
                </div>
            )}
            <button type="button" className="settings-button primary portal-publish-button" onClick={handleCreatePost}>
                Publish
            </button>
        </div>
    );

    const renderJobMeta = (job, { compact = false } = {}) => (
        <div className={`portal-job-meta-icons ${compact ? 'compact' : ''}`}>
            <span className="portal-job-meta-chip">
                <SimpleIcon path={jobMetaIconPaths.jobNumber} />
                <span>Job Number: {asDisplayText(job.jobNumber, 'Not assigned')}</span>
            </span>
            <span className="portal-job-meta-chip">
                <SimpleIcon path={jobMetaIconPaths.location} />
                <span>{asDisplayText(job.location, 'Location not set')}</span>
            </span>
            <span className="portal-job-meta-chip">
                <SimpleIcon path={jobMetaIconPaths.jobType} />
                <span>{asDisplayText(job.jobType, 'Job type not set')}</span>
            </span>
            <span className="portal-job-meta-chip">
                <span className="portal-job-salary-symbol" aria-hidden="true">£</span>
                <span>{formatSalary(job.salary)}</span>
            </span>
        </div>
    );

    const renderCandidateJobPosts = () => {
        const totalPages = Math.max(1, Math.ceil(filteredHomeJobs.length / HOME_JOB_PAGE_SIZE));
        const currentPage = Math.min(jobPage, totalPages);
        const pageStart = (currentPage - 1) * HOME_JOB_PAGE_SIZE;
        const visibleJobs = filteredHomeJobs.slice(pageStart, pageStart + HOME_JOB_PAGE_SIZE);

        return (
            <div className="portal-candidate-job-list">
                {safeJobs.length > 0 && (
                    <div className="portal-job-filter-bar" aria-label="Filter job posts">
                        <label>
                            <PortalActionIcon type="filter" />
                            <span>Location</span>
                            <select value={homeJobLocationFilter} onChange={(event) => setHomeJobLocationFilter(event.target.value)}>
                                <option value="">All locations</option>
                                {availableHomeJobLocations.map((location) => (
                                    <option key={location} value={location}>{location}</option>
                                ))}
                            </select>
                        </label>
                        <label>
                            <PortalActionIcon type="filter" />
                            <span>Salary</span>
                            <select value={homeJobSalarySort} onChange={(event) => setHomeJobSalarySort(event.target.value)}>
                                <option value="">Default</option>
                                <option value="salary-high">Highest salary</option>
                                <option value="salary-low">Lowest salary</option>
                            </select>
                        </label>
                        {(homeJobLocationFilter || homeJobSalarySort) && (
                            <button
                                type="button"
                                className="portal-job-filter-clear"
                                onClick={() => {
                                    setHomeJobLocationFilter('');
                                    setHomeJobSalarySort('');
                                }}
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                )}
                {safeJobs.length === 0 ? (
                    <div className="portal-feed-empty">No job posts yet. New company posts will appear here.</div>
                ) : filteredHomeJobs.length === 0 ? (
                    <div className="portal-feed-empty">No job posts match those filters.</div>
                ) : visibleJobs.map((job, index) => {
                const applications = normalizeJobApplications(job);
                const key = getJobKey(job) || `job-${pageStart + index}`;
                const jobSkills = Array.isArray(job.skills) ? job.skills : [];
                const jobRequirements = Array.isArray(job.requirements) ? job.requirements : [];
                const displaySkills = (jobSkills.length ? jobSkills : jobRequirements).slice(0, 3);
                const fit = calculateCandidateFit(job, profileData);
                const bookmarked = isHomeJobBookmarked(job);
                const statItems = [
                    { key: 'reach', label: 'reach', value: Number(jobReachMap[key] || job.reach || 0) || 0 },
                    { key: 'applicants', label: 'applicants', value: Number(job.applicationCount || applications.length || 0) || 0 },
                    { key: 'hired', label: 'hired', value: countApplicationsByStatus(job, ['hired']) },
                    { key: 'fit', label: 'fit for you', value: `${fit}%` }
                ];

                return (
                    <article
                        key={key}
                        className="portal-candidate-job-card"
                        data-job-id={key}
                        role="button"
                        tabIndex={0}
                        onClick={() => openJobModal(job, 'candidate')}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                openJobModal(job, 'candidate');
                            }
                        }}
                    >
                        <div className="portal-post-options-wrap portal-job-card-options">
                            <button
                                type="button"
                                className="portal-post-options-button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setOpenJobOptionsId((openId) => (openId === key ? '' : key));
                                    setOpenReactionPostId('');
                                    setOpenCommentPostId('');
                                    setOpenSharePostId('');
                                }}
                                aria-expanded={openJobOptionsId === key}
                                aria-label="Job options"
                                title="Job options"
                            >
                                <MoreOptionsIcon />
                            </button>
                            {openJobOptionsId === key && (
                                <span className="portal-post-options-menu portal-job-options-menu" role="menu">
                                    <button type="button" onClick={(event) => handleSaveJobPost(job, event)} role="menuitem">Save job</button>
                                    <button type="button" onClick={(event) => handleReportJobPost(job, event)} role="menuitem">Report job</button>
                                    <button type="button" onClick={(event) => handleBlockJobPost(job, event)} role="menuitem">Block job</button>
                                </span>
                            )}
                        </div>
                        <div className="portal-candidate-job-header">
                            <div className={`portal-job-company-avatar ${job.companyLogo ? '' : 'has-default-profile-icon'}`}>
                                {job.companyLogo ? (
                                    <img src={job.companyLogo} alt={job.companyName} />
                                ) : (
                                    <span className="portal-default-profile-icon"><DefaultProfileIcon /></span>
                                )}
                            </div>
                            <div>
                                <h3>{job.title}</h3>
                                <p>{job.companyName}</p>
                            </div>
                        </div>

                        {renderJobMeta(job, { compact: true })}

                        <p className="portal-candidate-job-description">{job.description}</p>

                        {displaySkills.length > 0 && (
                            <div className="portal-candidate-job-skills">
                                <strong>Required skills:</strong>
                                {displaySkills.slice(0, 8).map((skill, skillIndex) => (
                                    <span key={`${key}-skill-${skillIndex}`}>{skill}</span>
                                ))}
                            </div>
                        )}

                        <div className="portal-candidate-job-stats">
                            {statItems.map((item) => (
                                <span key={item.key} className={`portal-candidate-job-stat portal-candidate-job-stat-${item.key}`}>
                                    <strong>{item.value}</strong>
                                    {item.label}
                                </span>
                            ))}
                        </div>

                        <div className="portal-candidate-job-action-row">
                            <div className="job-post-action-reactions" aria-label="Job reactions">
                                <button
                                    type="button"
                                    className={`job-post-reaction-button job-post-like-reaction reaction-like ${isHomeJobLiked(job) ? 'active' : ''}`}
                                    onClick={(event) => handleToggleHomeJobLike(job, event)}
                                    aria-pressed={isHomeJobLiked(job)}
                                    aria-label="Like job post"
                                    title="Like"
                                >
                                    <ReactionIcon name="Like" />
                                    <ReactionTooltip>Like</ReactionTooltip>
                                </button>
                                {getHomeJobLikeCount(job) > 0 && (
                                    <span className="job-post-action-count" aria-label={`${getHomeJobLikeCount(job)} likes`}>
                                        {formatCompactCount(getHomeJobLikeCount(job))}
                                    </span>
                                )}
                                <button
                                    type="button"
                                    className={`job-post-reaction-button job-post-bookmark-reaction reaction-bookmark ${bookmarked ? 'active' : ''}`}
                                    onClick={(event) => handleToggleHomeJobBookmark(job, event)}
                                    aria-pressed={bookmarked}
                                    aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark job'}
                                    title={bookmarked ? 'Remove bookmark' : 'Bookmark job'}
                                >
                                    <SimpleIcon path={utilityIconPaths.starFill} />
                                    <ReactionTooltip>{bookmarked ? 'Remove bookmark' : 'Bookmark'}</ReactionTooltip>
                                </button>
                                {bookmarked && (
                                    <span className="job-post-action-count" aria-label="1 bookmark">1</span>
                                )}
                                <button
                                    type="button"
                                    className="job-post-reaction-button job-post-share-reaction"
                                    onClick={(event) => handleCopyJobShare(job, event)}
                                    aria-label="Share job post"
                                    title="Share"
                                >
                                    <SharePostIcon />
                                    <ReactionTooltip>Share</ReactionTooltip>
                                </button>
                            </div>
                            <button
                                type="button"
                                className="portal-view-job-button"
                                onClick={(event) => openApplicationWorkspace(job, event)}
                                disabled={applyingHomeJobId === key || hasAppliedToJob(job)}
                            >
                                {hasAppliedToJob(job)
                                    ? 'Applied'
                                    : applyingHomeJobId === key
                                        ? 'Applying...'
                                        : 'Apply Now'}
                            </button>
                        </div>

                        <div className="portal-candidate-job-footer">
                            <span className="portal-candidate-job-posted-date">Posted: {safeDateLabel(job.createdAt)}</span>
                        </div>
                    </article>
                );
                })}

                {filteredHomeJobs.length > HOME_JOB_PAGE_SIZE && (
                    <div className="portal-home-job-pagination" aria-label="Job post pages">
                        <button
                            type="button"
                            className="portal-home-page-button"
                            onClick={() => setJobPage((page) => Math.max(1, page - 1))}
                            disabled={currentPage <= 1}
                            aria-label="Previous job posts page"
                        >
                            <SimpleIcon path={utilityIconPaths.chevronDoubleLeft} />
                        </button>
                        <span>Page {currentPage} of {totalPages}</span>
                        <button
                            type="button"
                            className="portal-home-page-button portal-home-page-button-next"
                            onClick={() => setJobPage((page) => Math.min(totalPages, page + 1))}
                            disabled={currentPage >= totalPages}
                            aria-label="Next job posts page"
                        >
                            <SimpleIcon path={utilityIconPaths.chevronDoubleRight} />
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const renderMyJobPosts = () => (
        <div className="portal-job-posts-summary">
            {safeJobs.length === 0 ? (
                <div className="portal-feed-empty">No company job posts yet.</div>
            ) : safeJobs.map((job) => {
                const applications = normalizeJobApplications(job);
                const key = getJobKey(job);
                const statItems = [
                    { key: 'reach', label: 'Reach', value: Number(jobReachMap[key] || job.reach || 0) },
                    { key: 'applicants', label: 'Applicants', value: Number(job.applicationCount || applications.length || 0) },
                    { key: 'hired', label: 'Hired', value: countApplicationsByStatus(job, ['hired']) },
                    { key: 'rejected', label: 'Rejected', value: countApplicationsByStatus(job, ['reject']) },
                    { key: 'hold', label: 'On hold', value: countApplicationsByStatus(job, ['hold']) },
                    { key: 'assessment', label: 'Assessment', value: countApplicationsByStatus(job, ['assessment']) },
                    { key: 'interview', label: 'Interview', value: countApplicationsByStatus(job, ['interview']) }
                ];
                return (
                    <article key={key} className="portal-job-summary-card">
                        <div>
                            <h3>{asDisplayText(job.title, 'Untitled job')}</h3>
                            <p>{asDisplayText(job.location, 'Location not set')} - {asDisplayText(job.jobType, 'Job type not set')}</p>
                            <div className="portal-job-summary-actions">
                                <button
                                    type="button"
                                    className="portal-view-job-button"
                                    onClick={() => openJobModal(job, 'employer')}
                                >
                                    View Job Post
                                </button>
                                <button
                                    type="button"
                                    className="portal-job-delete-button"
                                    onClick={(event) => handleDeleteHomeJob(job, event)}
                                    aria-label="Delete job post"
                                    title="Delete job post"
                                >
                                    <DeletePostIcon />
                                </button>
                            </div>
                        </div>
                        <div className="portal-job-stats-grid">
                            {statItems.map((item) => (
                                <span key={item.key} className={`portal-job-stat portal-job-stat-${item.key}`}>
                                    <SimpleIcon path={statIconPaths[item.key]} />
                                    <strong>{item.value}</strong>
                                    {item.label}
                                </span>
                            ))}
                        </div>
                    </article>
                );
            })}
        </div>
    );

    const renderApplicationWorkspace = () => {
        if (!applicationJob) {
            return null;
        }

        return (
            <section className="portal-application-workspace" aria-label="Apply to this job">
                <input
                    ref={applicationResumeInputRef}
                    type="file"
                    className="profile-resume-input"
                    accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    onChange={handleApplicationResumeUpload}
                />
                <div className="application-form-section">
                    <h4>Cover Letter</h4>
                    <textarea
                        value={coverLetterText}
                        onChange={(event) => setCoverLetterText(event.target.value)}
                        className="application-message portal-cover-letter-textarea"
                        rows="7"
                        disabled={Boolean(applyingHomeJobId)}
                    />
                </div>
                <div className="application-form-section">
                    <h4>Message</h4>
                    <textarea
                        value={applicationMessage}
                        onChange={(event) => setApplicationMessage(event.target.value)}
                        placeholder="Include a message with your application..."
                        className="application-message"
                        rows="4"
                        disabled={Boolean(applyingHomeJobId)}
                    />
                </div>
                <div className="application-form-section">
                    <h4>{applicationResumeUpload?.dataUrl ? 'Resume Preview' : 'Profile Snapshot'}</h4>
                    {applicationResumeUpload ? (
                        <>
                            <p className="application-resume-upload-note">
                                This resume will be sent with your application.
                            </p>
                            <ResumeFilePreview resume={applicationResumeUpload} />
                        </>
                    ) : (
                        <div className="application-profile-grid">
                            <label className="application-profile-field">
                                <span>Full Name</span>
                                <input type="text" name="name" value={applicationProfile.name} onChange={handleApplicationProfileChange} disabled={Boolean(applyingHomeJobId)} />
                            </label>
                            <label className="application-profile-field">
                                <span>Email</span>
                                <input type="email" name="email" value={applicationProfile.email} onChange={handleApplicationProfileChange} disabled={Boolean(applyingHomeJobId)} />
                            </label>
                            <label className="application-profile-field application-profile-field-full">
                                <span>Skills</span>
                                <input type="text" name="skills" value={applicationProfile.skills} onChange={handleApplicationProfileChange} disabled={Boolean(applyingHomeJobId)} />
                            </label>
                            <label className="application-profile-field">
                                <span>Interests</span>
                                <input type="text" name="interests" value={applicationProfile.interests} onChange={handleApplicationProfileChange} disabled={Boolean(applyingHomeJobId)} />
                            </label>
                            <label className="application-profile-field">
                                <span>Hobbies</span>
                                <input type="text" name="hobbies" value={applicationProfile.hobbies} onChange={handleApplicationProfileChange} disabled={Boolean(applyingHomeJobId)} />
                            </label>
                            <label className="application-profile-field application-profile-field-full">
                                <span>Education</span>
                                <textarea name="education" value={applicationProfile.education} onChange={handleApplicationProfileChange} rows="3" disabled={Boolean(applyingHomeJobId)} />
                            </label>
                            <label className="application-profile-field application-profile-field-full">
                                <span>Experience</span>
                                <textarea name="experience" value={applicationProfile.experience} onChange={handleApplicationProfileChange} rows="4" disabled={Boolean(applyingHomeJobId)} />
                            </label>
                            <label className="application-profile-field application-profile-field-full">
                                <span>Achievements</span>
                                <textarea name="achievements" value={applicationProfile.achievements} onChange={handleApplicationProfileChange} rows="3" disabled={Boolean(applyingHomeJobId)} />
                            </label>
                        </div>
                    )}
                </div>
                <div className="portal-application-actions">
                    <button
                        type="button"
                        className="portal-view-job-button"
                        onClick={(event) => handleApplyToJob(applicationJob, event)}
                        disabled={Boolean(applyingHomeJobId) || savingApplicationDraft || hasAppliedToJob(applicationJob)}
                    >
                        <PortalActionIcon type="submit" />
                        {applyingHomeJobId ? 'Submitting...' : hasAppliedToJob(applicationJob) ? 'Applied' : 'Submit Application'}
                    </button>
                    <button
                        type="button"
                        className="portal-view-job-button secondary"
                        onClick={() => applicationResumeInputRef.current?.click()}
                        disabled={Boolean(applyingHomeJobId) || savingApplicationDraft || isPreparingResumeUpload}
                    >
                        <PortalActionIcon type="upload" />
                        {isPreparingResumeUpload ? 'Reading Resume...' : applicationResumeUpload ? 'Change Uploaded Resume' : 'Apply with Uploaded Resume'}
                    </button>
                    <button
                        type="button"
                        className="portal-view-job-button secondary"
                        onClick={handleApplyUsingSavedResume}
                        disabled={Boolean(applyingHomeJobId) || savingApplicationDraft || isPreparingResumeUpload}
                    >
                        <PortalActionIcon type="resume" />
                        Apply with Saved Resume
                    </button>
                    <button
                        type="button"
                        className="portal-view-job-button secondary"
                        onClick={handleApplyWithProfileSnapshot}
                        disabled={Boolean(applyingHomeJobId) || savingApplicationDraft}
                    >
                        <PortalActionIcon type="profile" />
                        Apply with Profile Snapshot
                    </button>
                    <button
                        type="button"
                        className="portal-view-job-button secondary portal-save-draft-button"
                        onClick={handleSaveDraft}
                        disabled={Boolean(applyingHomeJobId) || savingApplicationDraft}
                    >
                        <PortalActionIcon type="draft" />
                        {savingApplicationDraft ? 'Saving Draft...' : 'Save as Draft'}
                    </button>
                    <button
                        type="button"
                        className="portal-view-job-button secondary"
                        onClick={() => {
                            setApplicationJob(null);
                            setApplicationMessage('');
                            setCoverLetterText('');
                            setApplicationResumeUpload(null);
                            setApplicationProfile(createApplicationProfileDraft(profileData, currentUser));
                            setActiveDraftId(null);
                            setJobActionMessage('');
                        }}
                        disabled={Boolean(applyingHomeJobId) || savingApplicationDraft}
                    >
                        <PortalActionIcon type="cancel" />
                        Cancel
                    </button>
                </div>
            </section>
        );
    };

    const renderJobDetailsModal = () => {
        if (!selectedJob) {
            return null;
        }

        const key = getJobKey(selectedJob);
        const applications = normalizeJobApplications(selectedJob);
        const fit = calculateCandidateFit(selectedJob, profileData);
        const statItems = selectedJobMode === 'employer'
            ? [
                { key: 'reach', label: 'Reach', value: Number(jobReachMap[key] || selectedJob.reach || 0) },
                { key: 'applicants', label: 'Applicants', value: Number(selectedJob.applicationCount || applications.length || 0) },
                { key: 'hired', label: 'Hired', value: countApplicationsByStatus(selectedJob, ['hired']) },
                { key: 'rejected', label: 'Rejected', value: countApplicationsByStatus(selectedJob, ['reject']) },
                { key: 'hold', label: 'On hold', value: countApplicationsByStatus(selectedJob, ['hold']) },
                { key: 'assessment', label: 'Assessment', value: countApplicationsByStatus(selectedJob, ['assessment']) },
                { key: 'interview', label: 'Interview', value: countApplicationsByStatus(selectedJob, ['interview']) }
            ]
            : [
                { key: 'reach', label: 'reach', value: Number(jobReachMap[key] || selectedJob.reach || 0) || 0 },
                { key: 'applicants', label: 'applicants', value: Number(selectedJob.applicationCount || applications.length || 0) || 0 },
                { key: 'hired', label: 'hired', value: countApplicationsByStatus(selectedJob, ['hired']) },
                { key: 'fit', label: 'fit for you', value: `${fit}%` }
            ];
        const selectedJobSkills = Array.isArray(selectedJob.skills) ? selectedJob.skills : [];
        const selectedJobRequirements = Array.isArray(selectedJob.requirements) ? selectedJob.requirements : [];
        const modalSkills = selectedJobSkills.length ? selectedJobSkills : selectedJobRequirements;
        const modalMarkup = (
            <div className="portal-job-modal-backdrop" role="presentation" onClick={closeJobModal}>
                <article className="portal-job-modal" role="dialog" aria-modal="true" aria-label={`${selectedJob.title} job details`} onClick={(event) => event.stopPropagation()}>
                    <div className="portal-candidate-job-header portal-job-modal-header">
                        <div className={`portal-job-company-avatar ${selectedJob.companyLogo ? '' : 'has-default-profile-icon'}`}>
                            {selectedJob.companyLogo ? (
                                <img src={selectedJob.companyLogo} alt={selectedJob.companyName} />
                            ) : (
                                <span className="portal-default-profile-icon"><DefaultProfileIcon /></span>
                            )}
                        </div>
                        <div>
                            <h3>{selectedJob.title}</h3>
                            <p>{selectedJob.companyName}</p>
                        </div>
                    </div>

                    {renderJobMeta(selectedJob)}

                    <div className="portal-candidate-job-stats portal-job-modal-stats">
                        {statItems.map((item) => (
                            <span key={item.key} className={`portal-candidate-job-stat portal-candidate-job-stat-${item.key}`}>
                                {statIconPaths[item.key] && <SimpleIcon path={statIconPaths[item.key]} />}
                                <strong>{item.value}</strong>
                                {item.label}
                            </span>
                        ))}
                    </div>

                    <section className="portal-job-modal-section">
                        <h4>Description</h4>
                        <p>{asDisplayText(selectedJob.description, 'No description added.')}</p>
                    </section>

                    {modalSkills.length > 0 && (
                        <section className="portal-job-modal-section">
                            <h4>Skills</h4>
                            <div className="portal-candidate-job-skills">
                                <strong>Required skills:</strong>
                                {modalSkills.map((skill, index) => (
                                    <span key={`${key}-modal-skill-${index}`}>{skill}</span>
                                ))}
                            </div>
                        </section>
                    )}

                    {selectedJobRequirements.length > 0 && (
                        <section className="portal-job-modal-section">
                            <h4>Requirements</h4>
                            <ul>
                                {selectedJobRequirements.map((requirement, index) => (
                                    <li key={`${key}-requirement-${index}`}>{requirement}</li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {jobActionMessage && (
                        <p className="portal-job-action-message">{jobActionMessage}</p>
                    )}

                    {renderApplicationWorkspace()}

                    {!applicationJob && (
                        <div className="portal-job-modal-actions">
                            {selectedJobMode === 'employer' ? (
                                <button
                                    type="button"
                                    className="portal-view-job-button"
                                    onClick={() => {
                                        closeJobModal();
                                        switchSection?.('manage-jobs');
                                    }}
                                >
                                    Go to Manage Jobs
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="portal-view-job-button"
                                    onClick={(event) => openApplicationWorkspace(selectedJob, event)}
                                    disabled={applyingHomeJobId === key || hasAppliedToJob(selectedJob)}
                                >
                                    {hasAppliedToJob(selectedJob)
                                        ? 'Applied'
                                        : applyingHomeJobId === key
                                            ? 'Applying...'
                                            : 'Apply Now'}
                                </button>
                            )}
                            <button type="button" className="portal-view-job-button secondary portal-icon-close-button" onClick={closeJobModal} aria-label="Close job details">
                                <PortalCloseIcon />
                            </button>
                        </div>
                    )}
                </article>
            </div>
        );

        return typeof document !== 'undefined'
            ? createPortal(modalMarkup, document.body)
            : modalMarkup;
    };

    const ownTalentStories = talentStories.filter((post) => String(post.authorId) === viewerId);
    const ownCompanyPosts = workNewsPosts.filter((post) => String(post.authorId) === viewerId);
    return (
        <div className={`portal-home-feed portal-home-feed-${mode} ${tabsHidden ? 'is-tabs-hidden' : ''}`}>
            {feedError ? <div className="notification-message error">{feedError}</div> : null}
            <div className="portal-home-tabs" aria-label={`${mode} home sections`}>
                {tabs.map((tab) => {
                    const tabPath = mode === 'candidate' && tab.id === 'talent-stories'
                        ? tabIconPaths['candidate-talent-stories']
                        : tabIconPaths[tab.id];

                    return (
                        <button
                            key={tab.id}
                            type="button"
                            className={`portal-home-tab portal-home-tab-${tab.id} ${activeTab === tab.id ? 'active' : ''}`}
                            style={{ '--tab-accent': tabAccentColors[tab.id] || '#d17842' }}
                            onClick={() => setActiveTab(tab.id)}
                            title={tab.label}
                        >
                            <SimpleIcon path={tabPath || tabIconPaths['work-news']} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            <div
                className="portal-home-feed-scroll"
                onScroll={handleFeedScroll}
                onTouchStart={handleFeedTouchStart}
                onTouchMove={handleFeedTouchMove}
                onTouchEnd={handleFeedTouchEnd}
                onTouchCancel={handleFeedTouchEnd}
            >
                {feedLoading ? <div className="loading-spinner">Loading live feed...</div> : null}
                {activeTab === 'work-news' && renderPostList(workNewsPosts, WORK_NEWS_STORAGE_KEY, 'work')}
                {activeTab === 'job-posts' && renderCandidateJobPosts()}
                {activeTab === 'talent-stories' && renderPostList(talentStories, TALENT_STORIES_STORAGE_KEY, 'talent')}
                {(activeTab === 'create-story' || activeTab === 'create-post') && renderComposer()}
                {activeTab === 'my-feed' && renderPostList(ownTalentStories, TALENT_STORIES_STORAGE_KEY, 'talent')}
                {activeTab === 'my-company-posts' && renderPostList(ownCompanyPosts, WORK_NEWS_STORAGE_KEY, 'work')}
                {activeTab === 'my-job-posts' && renderMyJobPosts()}
            </div>
            {renderJobDetailsModal()}
        </div>
    );
};

export default PortalHomeFeed;

