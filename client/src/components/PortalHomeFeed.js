import React, { useEffect, useMemo, useState } from 'react';

const WORK_NEWS_STORAGE_KEY = 'jumptakeWorkNewsPosts';
const TALENT_STORIES_STORAGE_KEY = 'jumptakeTalentStoriesPosts';
const JOB_REACH_STORAGE_KEY = 'jumptakeJobReachMap';

const readStoredArray = (key) => {
    if (typeof window === 'undefined') {
        return [];
    }

    try {
        const parsed = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(parsed)
            ? parsed.filter((item) => item && typeof item === 'object')
            : [];
    } catch (error) {
        return [];
    }
};

const writeStoredArray = (key, value) => {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.setItem(key, JSON.stringify(value));
};

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

const getViewerId = ({ mode, currentUser, companyData, profileData }) => (
    String(
        currentUser?.id
        || currentUser?._id
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

const asDisplayText = (value, fallback = '') => {
    if (value === null || value === undefined) {
        return fallback;
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    return fallback;
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
    work: ['Like', 'Appreciate', 'Sad', 'Bad', 'Hide'],
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

const SimpleIcon = ({ path }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        {(Array.isArray(path) ? path : [path]).map((pathValue, index) => (
            <path key={index} d={pathValue} />
        ))}
    </svg>
);

const getReactionCount = (post, reaction) => Number(post.reactions?.[reaction] || 0);

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

const PortalHomeFeed = ({
    mode = 'candidate',
    currentUser,
    profileData,
    companyData,
    jobs = [],
    jobPosts = null
}) => {
    const safeJobs = useMemo(
        () => (Array.isArray(jobs) ? jobs.filter((job) => job && typeof job === 'object') : []),
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
        { id: 'my-company-posts', label: 'My Company Posts' },
        { id: 'my-job-posts', label: 'My Job Posts' }
    ];
    const tabs = mode === 'employer' ? employerTabs : candidateTabs;
    const defaultTab = mode === 'employer' ? 'talent-stories' : 'work-news';
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [workNewsPosts, setWorkNewsPosts] = useState(() => readStoredArray(WORK_NEWS_STORAGE_KEY));
    const [talentStories, setTalentStories] = useState(() => readStoredArray(TALENT_STORIES_STORAGE_KEY));
    const [composerText, setComposerText] = useState('');
    const [composerMedia, setComposerMedia] = useState(null);
    const [composerAudience, setComposerAudience] = useState('everyone');
    const [commentDrafts, setCommentDrafts] = useState({});
    const [expandedJobId, setExpandedJobId] = useState('');
    const [jobReachMap] = useState(readJobReachMap);

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

    useEffect(() => {
        setActiveTab(defaultTab);
    }, [defaultTab]);

    const friendIds = useMemo(() => {
        if (typeof window === 'undefined') {
            return [];
        }

        const possibleKeys = [
            'jumptakeFriends',
            `jumptakeFriends:${viewerId}`,
            'jumptakeCandidateFriends'
        ];

        return possibleKeys.flatMap((key) => {
            try {
                const value = JSON.parse(localStorage.getItem(key) || '[]');
                return Array.isArray(value)
                    ? value.map((item) => String(item?.id || item?._id || item?.userId || item)).filter(Boolean)
                    : [];
            } catch (error) {
                return [];
            }
        });
    }, [viewerId]);

    const canViewPost = (post) => {
        if (!post || typeof post !== 'object') {
            return false;
        }

        const hiddenBy = Array.isArray(post.hiddenBy) ? post.hiddenBy : [];
        if (hiddenBy.includes(viewerId)) {
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

        writeStoredArray(key, nextPosts);
        if (key === WORK_NEWS_STORAGE_KEY) {
            setWorkNewsPosts(nextPosts);
        } else {
            setTalentStories(nextPosts);
        }
    }, [activeTab, viewerId, workNewsPosts, talentStories]);

    const updatePosts = (key, updater) => {
        const currentPosts = key === WORK_NEWS_STORAGE_KEY ? workNewsPosts : talentStories;
        const nextPosts = updater(currentPosts);
        writeStoredArray(key, nextPosts);
        if (key === WORK_NEWS_STORAGE_KEY) {
            setWorkNewsPosts(nextPosts);
        } else {
            setTalentStories(nextPosts);
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

    const handleCreatePost = () => {
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

        updatePosts(key, (posts) => [nextPost, ...posts]);
        setComposerText('');
        setComposerMedia(null);
        setComposerAudience('everyone');
        setActiveTab(isCompanyPost ? 'my-company-posts' : 'my-feed');
    };

    const handleReact = (key, postId, reaction) => {
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
    };

    const handleShare = (postId) => {
        const target = window.prompt('Enter a candidate name or JumpTake ID to share this with:');
        if (!target) {
            return;
        }

        updatePosts(WORK_NEWS_STORAGE_KEY, (posts) => posts.map((post) => (
            getPostKey(post) === postId
                ? {
                    ...post,
                    reach: Number(post.reach || 0) + 1,
                    comments: [
                        ...(Array.isArray(post.comments) ? post.comments : []),
                        {
                            id: `share-${Date.now()}`,
                            authorId: viewerId,
                            authorName,
                            authorType: mode,
                            authorAvatar,
                            text: `Shared with @${target.trim()}`,
                            mentions: [target.trim()],
                            createdAt: new Date().toISOString()
                        }
                    ]
                }
                : post
        )));
    };

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

                    return (
                    <article key={postKey} className="portal-social-post-card">
                        <div className="portal-social-post-header">
                            <div className="portal-post-avatar">
                                {post.authorAvatar ? (
                                    <img src={post.authorAvatar} alt={asDisplayText(post.authorName, 'Post author')} />
                                ) : (
                                    <span>{asDisplayText(post.authorName, 'J').charAt(0).toUpperCase()}</span>
                                )}
                            </div>
                            <div>
                                <h3 className="portal-post-author-name">{asDisplayText(post.authorName, 'Unknown author')}</h3>
                                <p>{post.authorType === 'employer' ? 'Company update' : 'Talent story'} - {safeDateLabel(post.createdAt)}</p>
                                {post.audience && post.audience !== 'everyone' && (
                                    <small className="portal-audience-pill">{post.audience === 'only-me' ? 'Only me' : 'Friends only'}</small>
                                )}
                            </div>
                            <span className="portal-post-reach">{Number(post.reach || 0)} reach</span>
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
                        <div className="portal-post-reactions">
                            {reactionLabels[kind].map((reaction) => {
                                const selectedReactions = normalizeViewerReactions(getViewerReaction(post, viewerId));
                                const isActiveReaction = selectedReactions.includes(reaction);
                                return (
                                    <button
                                        key={reaction}
                                        type="button"
                                        className={`portal-reaction-button reaction-${reaction.toLowerCase()} ${isActiveReaction ? 'active' : ''}`}
                                        onClick={() => handleReact(key, postKey, reaction)}
                                        aria-pressed={isActiveReaction}
                                        aria-label={`${reaction} reaction`}
                                    >
                                        <ReactionIcon name={reaction} />
                                        <span className="portal-reaction-label">{reaction}</span>
                                        <span className="portal-reaction-count">{getReactionCount(post, reaction) || ''}</span>
                                    </button>
                                );
                            })}
                            {mode === 'candidate' && kind === 'work' && (
                                <button
                                    type="button"
                                    className="portal-glass-mini-button"
                                    onClick={() => handleShare(postKey)}
                                >
                                    Share with friend
                                </button>
                            )}
                        </div>
                        <div className="portal-post-comments">
                            {postComments.slice(-3).map((comment, commentIndex) => (
                                <div key={comment.id || `comment-${commentIndex}`} className="portal-comment-item">
                                    <div className="portal-comment-avatar">
                                        {comment.authorAvatar ? (
                                            <img src={comment.authorAvatar} alt={asDisplayText(comment.authorName, 'Comment author')} />
                                        ) : (
                                            <span>{asDisplayText(comment.authorName, 'J').charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <p>
                                        <strong className="portal-comment-name">{asDisplayText(comment.authorName, 'User')}</strong>: {asDisplayText(comment.text)}
                                    </p>
                                </div>
                            ))}
                            <div className="portal-comment-row">
                                <input
                                    type="text"
                                    value={commentDrafts[postKey] || ''}
                                    placeholder="Comment or mention with @JumpTakeID..."
                                    onChange={(event) => setCommentDrafts((drafts) => ({ ...drafts, [postKey]: event.target.value }))}
                                />
                                <button type="button" className="portal-comment-button" onClick={() => handleComment(key, postKey)} aria-label="Comment">
                                    <ReactionIcon name="Comment" />
                                    <span>Comment</span>
                                </button>
                            </div>
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
                    Add picture or video
                    <input type="file" accept="image/*,video/*" onChange={handleMediaChange} />
                </label>
                {composerMedia && (
                    <button type="button" className="portal-media-clear-button" onClick={() => setComposerMedia(null)}>
                        Remove {composerMedia.type}
                    </button>
                )}
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
            <button type="button" className="settings-button primary" onClick={handleCreatePost}>
                {mode === 'employer' ? 'Publish to Work News' : 'Publish to Talent Stories'}
            </button>
        </div>
    );

    const renderMyJobPosts = () => (
        <div className="portal-job-posts-summary">
            {safeJobs.length === 0 ? (
                <div className="portal-feed-empty">No company job posts yet.</div>
            ) : safeJobs.map((job) => {
                const applications = normalizeJobApplications(job);
                const key = getJobKey(job);
                const isExpanded = expandedJobId === key;
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
                            <button
                                type="button"
                                className="portal-view-job-button"
                                onClick={() => setExpandedJobId(isExpanded ? '' : key)}
                            >
                                {isExpanded ? 'Hide Job Post' : 'View Job Post'}
                            </button>
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
                        {isExpanded && (
                            <div className="portal-job-expanded-details">
                                <p><strong>Job Number:</strong> {asDisplayText(job.jobNumber, 'Not assigned')}</p>
                                <p><strong>Salary:</strong> {asDisplayText(job.salary, 'Not specified')}</p>
                                <p><strong>Description:</strong> {asDisplayText(job.description, 'No description added.')}</p>
                                {Array.isArray(job.skills) && job.skills.length > 0 && (
                                    <p><strong>Skills:</strong> {job.skills.join(', ')}</p>
                                )}
                                {Array.isArray(job.requirements) && job.requirements.length > 0 && (
                                    <p><strong>Requirements:</strong> {job.requirements.join(', ')}</p>
                                )}
                            </div>
                        )}
                    </article>
                );
            })}
        </div>
    );

    const ownTalentStories = talentStories.filter((post) => String(post.authorId) === viewerId);
    const ownCompanyPosts = workNewsPosts.filter((post) => String(post.authorId) === viewerId);
    return (
        <div className={`portal-home-feed portal-home-feed-${mode}`}>
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

            {activeTab === 'work-news' && renderPostList(workNewsPosts, WORK_NEWS_STORAGE_KEY, 'work')}
            {activeTab === 'job-posts' && jobPosts}
            {activeTab === 'talent-stories' && renderPostList(talentStories, TALENT_STORIES_STORAGE_KEY, 'talent')}
            {(activeTab === 'create-story' || activeTab === 'create-post') && renderComposer()}
            {activeTab === 'my-feed' && renderPostList(ownTalentStories, TALENT_STORIES_STORAGE_KEY, 'talent')}
            {activeTab === 'my-company-posts' && renderPostList(ownCompanyPosts, WORK_NEWS_STORAGE_KEY, 'work')}
            {activeTab === 'my-job-posts' && renderMyJobPosts()}
        </div>
    );
};

export default PortalHomeFeed;
