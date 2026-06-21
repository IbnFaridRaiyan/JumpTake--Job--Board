import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { createSquareProfileImage } from '../utils/profileImages';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const STORAGE_PREFIX = 'jumptakeResumePlayground:';
const DOCUMENT_STORAGE_PREFIX = 'jumptakeDocumentPlayground:';
const A4_PAGE_WIDTH = 794;
const A4_PAGE_HEIGHT = 1123;
const A4_PAGE_GAP = 56;
const RULER_SIZE = 34;
const A4_TOP_PADDING = 48;
const A4_RIGHT_PADDING = 56;
const A4_BOTTOM_PADDING = 48;
const A4_LEFT_PADDING = 56;
const DEFAULT_EDITOR_MARGINS = {
    top: A4_TOP_PADDING,
    left: A4_LEFT_PADDING
};
const DEFAULT_TEXT_COLOR = '#000000';
const MIN_TOP_MARGIN = 24;
const MIN_LEFT_MARGIN = 24;
const MAX_TOP_MARGIN = A4_PAGE_HEIGHT - A4_BOTTOM_PADDING;
const MAX_LEFT_MARGIN = A4_PAGE_WIDTH - A4_RIGHT_PADDING;

const cloneMargins = (margins = DEFAULT_EDITOR_MARGINS) => ({
    top: Number.isFinite(margins?.top) ? margins.top : DEFAULT_EDITOR_MARGINS.top,
    left: Number.isFinite(margins?.left) ? margins.left : DEFAULT_EDITOR_MARGINS.left
});

const createPageMargins = (pageCount = 1, sourceMargins = []) => Array.from(
    { length: Math.max(1, pageCount) },
    (_, index) => cloneMargins(sourceMargins[index] || sourceMargins[0] || DEFAULT_EDITOR_MARGINS)
);

const FONT_OPTIONS = [
    'Arial',
    'Calibri',
    'Georgia',
    'Times New Roman',
    'Helvetica',
    'Lexend',
    'Share Tech'
];

const FONT_SIZE_OPTIONS = [
    { label: '10', value: '2' },
    { label: '12', value: '3' },
    { label: '14', value: '4' },
    { label: '18', value: '5' },
    { label: '24', value: '6' }
];

const escapeHtml = (value = '') => (
    String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
);

const stripHtml = (value = '') => (
    String(value)
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|li|h1|h2|h3|h4|h5|h6|tr)>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\u00a0/g, ' ')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim()
);

const plainTextToHtml = (text = '') => {
    const normalized = String(text || '').replace(/\r\n/g, '\n').trim();
    if (!normalized) {
        return '<p></p>';
    }

    return normalized
        .split(/\n\s*\n/)
        .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br />')}</p>`)
        .join('');
};

const createResumeId = () => (
    `resume-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const ATS_REQUIRED_WEIGHTS = {
    header: 24,
    summary: 14,
    experience: 24,
    education: 20,
    skills: 18
};

const ATS_OPTIONAL_BONUSES = {
    projects: 4,
    languages: 2,
    certifications: 3,
    achievements: 3,
    interests: 1,
    hobbies: 1,
    bullets: 3,
    metrics: 5
};

const ATS_SCORE_STATES = {
    low: {
        label: 'Not ATS Friendly',
        colorClass: 'is-low'
    },
    medium: {
        label: 'Could be improved for ATS',
        colorClass: 'is-medium'
    },
    good: {
        label: 'Good for ATS Scan',
        colorClass: 'is-good'
    },
    excellent: {
        label: 'Excellent!',
        colorClass: 'is-excellent'
    }
};

const getAtsStateForScore = (score) => {
    if (score > 80) {
        return ATS_SCORE_STATES.excellent;
    }
    if (score >= 70) {
        return ATS_SCORE_STATES.good;
    }
    if (score >= 30) {
        return ATS_SCORE_STATES.medium;
    }
    return ATS_SCORE_STATES.low;
};

const analyzeResumeForATS = (html = '') => {
    const plainText = stripHtml(html).replace(/\r/g, '').trim();
    const normalized = plainText.toLowerCase();
    const lines = plainText
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);
    const topLines = lines.slice(0, 6);

    const hasEmail = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(plainText);
    const hasPhone = /(?:\+\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}/.test(plainText);
    const hasLinkedIn = /linkedin|portfolio|github/i.test(normalized);
    const hasName = topLines.some((line) => (
        /^[A-Za-z][A-Za-z.' -]{2,40}$/.test(line)
        && line.split(/\s+/).length <= 5
        && !/(summary|experience|education|skills|projects|resume|profile|phone|email|location)/i.test(line)
    ));

    const hasSummary = /(summary|professional summary|profile|career objective|objective|about me)/i.test(normalized);
    const hasExperience = /(experience|employment|work history|professional experience)/i.test(normalized);
    const hasEducation = /(education|academic|qualification|degree|university|school)/i.test(normalized);
    const hasSkills = /(skills|technical skills|core competencies|competencies)/i.test(normalized);

    const hasProjects = /(projects|project experience|portfolio|case study|case studies)/i.test(normalized);
    const hasLanguages = /\blanguages?\b/i.test(normalized);
    const hasCertifications = /(certifications?|certificates?|training|courses?)/i.test(normalized);
    const hasAchievements = /(achievements?|awards?|strengths?|key achievements?)/i.test(normalized);
    const hasInterests = /\binterests?\b/i.test(normalized);
    const hasHobbies = /\bhobbies?\b/i.test(normalized);
    const hasBullets = /(^|\n)\s*[\u2022*-]\s+\S/m.test(plainText);
    const hasMetrics = /(\b\d+%|\b\d+\+|\$\s?\d|£\s?\d|\b\d+\s*(years?|months?|clients?|users?|projects?|team members?|sales?|revenue|people)\b)/i.test(plainText);

    let points = 0;
    const strengths = [];
    const improvements = [];
    const missingCritical = [];

    const headerSignals = [hasName, hasEmail, hasPhone, hasLinkedIn].filter(Boolean).length;
    const headerPoints = Math.round((headerSignals / 4) * ATS_REQUIRED_WEIGHTS.header);
    points += headerPoints;

    if (hasName && hasEmail && hasPhone) {
        strengths.push('Your resume includes strong core contact information near the top.');
    } else {
        if (!hasName) {
            missingCritical.push('Add your full name clearly at the top of the resume.');
        }
        if (!hasEmail) {
            missingCritical.push('Add an email address so ATS systems can identify your contact details.');
        }
        if (!hasPhone) {
            missingCritical.push('Add a phone number near the top of the resume.');
        }
    }

    if (hasSummary) {
        points += ATS_REQUIRED_WEIGHTS.summary;
        strengths.push('You included a summary/profile section, which helps ATS and recruiters understand your target role quickly.');
    } else {
        missingCritical.push('Add a short summary or profile section.');
    }

    if (hasExperience) {
        points += ATS_REQUIRED_WEIGHTS.experience;
        strengths.push('You included an experience section, which is one of the most important ATS signals.');
    } else {
        missingCritical.push('Add an experience or work history section.');
    }

    if (hasEducation) {
        points += ATS_REQUIRED_WEIGHTS.education;
        strengths.push('You included an education section.');
    } else {
        missingCritical.push('Add an education section.');
    }

    if (hasSkills) {
        points += ATS_REQUIRED_WEIGHTS.skills;
        strengths.push('You included a skills section, which helps keyword matching.');
    } else {
        missingCritical.push('Add a skills or core competencies section.');
    }

    let bonus = 0;
    if (hasProjects) bonus += ATS_OPTIONAL_BONUSES.projects;
    if (hasLanguages) bonus += ATS_OPTIONAL_BONUSES.languages;
    if (hasCertifications) bonus += ATS_OPTIONAL_BONUSES.certifications;
    if (hasAchievements) bonus += ATS_OPTIONAL_BONUSES.achievements;
    if (hasInterests) bonus += ATS_OPTIONAL_BONUSES.interests;
    if (hasHobbies) bonus += ATS_OPTIONAL_BONUSES.hobbies;
    if (hasBullets) {
        bonus += ATS_OPTIONAL_BONUSES.bullets;
        strengths.push('Bullet points are present, which makes the resume easier for ATS and recruiters to scan.');
    } else {
        improvements.push('Use bullet points for responsibilities and achievements to improve scanability.');
    }
    if (hasMetrics) {
        bonus += ATS_OPTIONAL_BONUSES.metrics;
        strengths.push('You included measurable impact or numbers, which usually strengthens ATS and recruiter reviews.');
    } else {
        improvements.push('Add numbers, percentages, dates, or measurable achievements where possible.');
    }

    if (!hasLinkedIn) {
        improvements.push('Consider adding LinkedIn, portfolio, or GitHub details if relevant to your field.');
    }

    if (hasExperience && !/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\b20\d{2}\b|\b19\d{2}\b|present|current)/i.test(normalized)) {
        improvements.push('Add clearer dates to your experience section so ATS systems can understand your timeline.');
    }

    const baseScore = Math.round((points / Object.values(ATS_REQUIRED_WEIGHTS).reduce((sum, value) => sum + value, 0)) * 100);
    const score = Math.max(0, Math.min(100, baseScore + bonus));
    const state = getAtsStateForScore(score);

    if (score <= 30 && improvements.length === 0) {
        improvements.push('Add the main ATS-friendly sections first: contact info, summary, experience, education, and skills.');
    }
    if (score >= 70 && strengths.length === 0) {
        strengths.push('Your resume covers the main ATS-readable sections well.');
    }

    return {
        score,
        label: state.label,
        colorClass: state.colorClass,
        missingCritical,
        improvements,
        strengths,
        summary: plainText
    };
};

const getStorageKey = (userId, mode = 'resume') => `${mode === 'document' ? DOCUMENT_STORAGE_PREFIX : STORAGE_PREFIX}${userId || 'guest'}`;
const SIGNATURE_STROKE_COLORS = {
    black: '#111111',
    white: '#ffffff'
};

const createBlankEditorHtml = () => '<p style="color: #000000;"><br></p>';
const createBlankDocumentHtml = createBlankEditorHtml;

const normalizeResumeItems = (value) => {
    if (Array.isArray(value)) {
        return value
            .map((item) => {
                if (item && typeof item === 'object') {
                    return Object.values(item).filter(Boolean).join(' - ');
                }
                return String(item || '').trim();
            })
            .filter(Boolean);
    }

    if (typeof value === 'string') {
        return value
            .split(/\n|,/)
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [];
};

const renderResumeBullets = (items, fallback) => (
    (items.length ? items : [fallback])
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join('')
);

const getTailorProfile = (profileData, user, displayName) => {
    const email = profileData?.email || user?.email || '';
    const name = profileData?.name || user?.name || displayName || (email.includes('@') ? email.split('@')[0] : 'Your Name');
    const skills = normalizeResumeItems(profileData?.skills);
    const experience = normalizeResumeItems(profileData?.experience);
    const education = normalizeResumeItems(profileData?.education);
    const achievements = normalizeResumeItems(profileData?.achievements);
    const interests = normalizeResumeItems(profileData?.interests);
    const hobbies = normalizeResumeItems(profileData?.hobbies);

    return {
        name,
        email,
        phone: profileData?.phone || 'Phone',
        location: profileData?.location || 'Location',
        profileImage: profileData?.profileImage || '',
        skills,
        experience,
        education,
        achievements,
        interests,
        hobbies,
        summary: `${name} is a motivated candidate with experience across ${skills.slice(0, 4).join(', ') || 'relevant professional skills'}. Focused on delivering clear results, learning quickly, and contributing reliably in practical team environments.`
    };
};

const buildAtsResumeHtml = (profile, variantIndex = 0) => {
    const fonts = ["Georgia, 'Times New Roman', serif", 'Arial, Helvetica, sans-serif', "'Times New Roman', Times, serif"];
    const accent = ['#111111', '#1f2937', '#0f3d3a', '#334155', '#4b5563'][variantIndex % 5];
    const headerAlign = variantIndex % 2 === 0 ? 'center' : 'left';
    const safeName = escapeHtml(profile.name);
    const contact = [profile.location, profile.phone, profile.email].filter(Boolean).map(escapeHtml).join(' | ');

    return `
        <div data-resume-template-root="ats" style="font-family:${fonts[variantIndex % fonts.length]}; color:#111111; width:100%; max-width:100%; box-sizing:border-box; padding:0; font-size:${variantIndex % 3 === 0 ? '11px' : '11.5px'}; line-height:1.16; overflow-wrap:break-word;">
            <div style="text-align:${headerAlign}; margin-bottom:9px;">
                <div style="font-size:${variantIndex % 2 === 0 ? '21px' : '23px'}; font-weight:700; color:${accent}; letter-spacing:${variantIndex % 2 === 0 ? '0.01em' : '0'};">${safeName}</div>
                <div style="font-size:10.5px; margin-top:3px;">${contact || 'Location | Phone | Email'}</div>
            </div>
            <div style="font-weight:800; color:${accent}; text-transform:uppercase; border-bottom:1.5px solid ${accent}; margin-top:8px;">Professional Summary</div>
            <p style="margin:4px 0 7px;">${escapeHtml(profile.summary)}</p>

            <div style="font-weight:800; color:${accent}; text-transform:uppercase; border-bottom:1.5px solid ${accent}; margin-top:8px;">Core Skills</div>
            <p style="margin:4px 0 7px;">${escapeHtml((profile.skills.length ? profile.skills : ['Communication', 'Teamwork', 'Problem Solving']).join(' | '))}</p>

            <div style="font-weight:800; color:${accent}; text-transform:uppercase; border-bottom:1.5px solid ${accent}; margin-top:8px;">Professional Experience</div>
            <ul style="margin:4px 0 7px 16px; padding:0;">
                ${renderResumeBullets(profile.experience, 'Add your recent role, company, dates, responsibilities, and measurable achievements.')}
            </ul>

            <div style="font-weight:800; color:${accent}; text-transform:uppercase; border-bottom:1.5px solid ${accent}; margin-top:8px;">Projects & Achievements</div>
            <ul style="margin:4px 0 7px 16px; padding:0;">
                ${renderResumeBullets(profile.achievements, 'Add measurable achievements, awards, projects, or impact statements.')}
            </ul>

            <div style="font-weight:800; color:${accent}; text-transform:uppercase; border-bottom:1.5px solid ${accent}; margin-top:8px;">Education</div>
            <ul style="margin:4px 0 7px 16px; padding:0;">
                ${renderResumeBullets(profile.education, 'Add your institution, qualification, subjects, dates, and grade if relevant.')}
            </ul>

            <div style="font-weight:800; color:${accent}; text-transform:uppercase; border-bottom:1.5px solid ${accent}; margin-top:8px;">Additional</div>
            <p style="margin:4px 0 0;"><strong>Interests:</strong> ${escapeHtml((profile.interests.length ? profile.interests : ['Relevant interests']).join(', '))}</p>
            <p style="margin:2px 0 0;"><strong>Hobbies:</strong> ${escapeHtml((profile.hobbies.length ? profile.hobbies : ['Relevant hobbies']).join(', '))}</p>
        </div>
    `;
};

const buildGeneralResumeHtml = (profile, variantIndex = 0, photo = '') => {
    const themes = [
        ['#9b5724', '#f0a25a'], ['#0f766e', '#5eead4'], ['#1d4ed8', '#93c5fd'], ['#6d28d9', '#c4b5fd'], ['#be123c', '#fda4af'],
        ['#365314', '#bef264'], ['#374151', '#d1d5db'], ['#92400e', '#fcd34d'], ['#0f172a', '#38bdf8'], ['#7c2d12', '#fdba74']
    ];
    const [dark, light] = themes[variantIndex % themes.length];
    const imageMarkup = photo
        ? `<img src="${photo}" alt="${escapeHtml(profile.name)}" style="width:78px;height:78px;object-fit:cover;border-radius:${variantIndex % 2 ? '16px' : '50%'};border:3px solid #ffffff;margin:0 auto 12px;display:block;" />`
        : `<div style="width:72px;height:72px;border-radius:${variantIndex % 2 ? '16px' : '50%'};border:3px solid #ffffff;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;background:${light};color:${dark};font-size:26px;font-weight:800;">${escapeHtml(profile.name.charAt(0).toUpperCase() || 'Y')}</div>`;

    return `
        <div data-resume-template-root="general" style="font-family:Arial, Helvetica, sans-serif; display:grid; grid-template-columns:165px minmax(0,1fr); width:100%; max-width:100%; box-sizing:border-box; color:#111827; font-size:10.5px; line-height:1.22; overflow:hidden;">
            <aside style="background:${dark}; color:#ffffff; padding:18px 14px;">
                ${imageMarkup}
                <h3 style="letter-spacing:0.16em;font-size:11px;margin:12px 0 6px;">CONTACT</h3>
                <p style="font-size:9.5px;line-height:1.35;margin:0 0 12px;">${escapeHtml(profile.phone)}<br />${escapeHtml(profile.email || 'Email')}<br />${escapeHtml(profile.location)}</p>
                <h3 style="letter-spacing:0.16em;font-size:11px;margin:12px 0 6px;">EDUCATION</h3>
                <ul style="font-size:9.5px;line-height:1.28;margin:0 0 12px 13px;padding:0;">${renderResumeBullets(profile.education, 'Add education details')}</ul>
                <h3 style="letter-spacing:0.16em;font-size:11px;margin:12px 0 6px;">KEY SKILLS</h3>
                <ul style="font-size:9.5px;line-height:1.28;margin:0 0 12px 13px;padding:0;">${renderResumeBullets(profile.skills, 'Add key skills')}</ul>
            </aside>
            <main style="background:#ffffff;padding:26px 20px; min-width:0;">
                <div style="border-bottom:3px solid ${light};padding-bottom:9px;margin-bottom:11px;">
                    <h1 style="font-size:27px;line-height:1.02;margin:0;color:#111827;">${escapeHtml(profile.name)}</h1>
                    <p style="margin:5px 0 0;font-weight:700;color:${dark};">Professional Resume</p>
                </div>
                <h3 style="letter-spacing:0.16em;font-size:12px;margin:10px 0 5px;color:#111827;">ABOUT ME</h3>
                <p style="font-size:10.5px;line-height:1.32;margin:0 0 10px;">${escapeHtml(profile.summary)}</p>
                <h3 style="letter-spacing:0.16em;font-size:12px;margin:10px 0 5px;color:#111827;">PROFESSIONAL EXPERIENCE</h3>
                <ul style="font-size:10.5px;line-height:1.32;margin:0 0 10px 15px;padding:0;">${renderResumeBullets(profile.experience, 'Add professional experience and measurable achievements')}</ul>
                <h3 style="letter-spacing:0.16em;font-size:12px;margin:10px 0 5px;color:#111827;">ACHIEVEMENTS</h3>
                <ul style="font-size:10.5px;line-height:1.32;margin:0 0 10px 15px;padding:0;">${renderResumeBullets(profile.achievements, 'Add achievements, projects, certifications, or awards')}</ul>
                <h3 style="letter-spacing:0.16em;font-size:12px;margin:10px 0 5px;color:#111827;">INTERESTS</h3>
                <p style="font-size:10.5px;line-height:1.32;margin:0;">${escapeHtml([...profile.interests, ...profile.hobbies].join(', ') || 'Add relevant interests and hobbies')}</p>
            </main>
        </div>
    `;
};

const buildAiTailorTemplates = (profile, type = 'ats', photo = '') => (
    Array.from({ length: 10 }, (_, index) => ({
        id: `${type}-tailored-${index + 1}`,
        category: type,
        label: `${type === 'ats' ? 'ATS Friendly' : 'General'} Style ${index + 1}`,
        description: type === 'ats'
            ? 'ATS-readable structure using your profile sections.'
            : 'Designed resume with section color blocks and optional photo.',
        html: type === 'ats'
            ? buildAtsResumeHtml(profile, index)
            : buildGeneralResumeHtml(profile, index, photo)
    }))
);

const buildDocumentTemplateHtml = (label, index) => {
    const accents = ['#0f766e', '#1d4ed8', '#7c2d12', '#6d28d9', '#be123c', '#365314', '#0f172a', '#92400e', '#991b1b', '#047857'];
    const accent = accents[index % accents.length];
    const date = new Date().toLocaleDateString();
    const title = label.toUpperCase();
    const bodyMap = {
        'Candidate Hired Announcement': 'We are pleased to confirm that the candidate has been selected for the role. This document records the official hiring announcement, start details, and next steps.',
        'Candidate Rejection Notice': 'Thank you for your interest and time throughout the recruitment process. After careful review, we will not be progressing your application for this role.',
        Contract: 'This agreement outlines the role, responsibilities, working schedule, compensation, confidentiality terms, and acceptance requirements between the company and the candidate.',
        Timetable: 'Use this timetable to organise interviews, onboarding sessions, meetings, deadlines, and important operational dates.',
        Rota: 'This rota document sets out the working shifts, assigned team members, dates, and coverage notes for the selected period.',
        Plans: 'This planning document records objectives, milestones, responsibilities, risks, timelines, and expected outcomes.',
        Invitation: 'You are invited to attend the scheduled session. Please review the details below and confirm your availability.',
        'Random Document': 'Use this flexible document template for notes, announcements, internal memos, short reports, or general business communication.',
        'Expelling Job': 'This document records the removal or closure of a job post, including reason, effective date, and internal notes.',
        'Congratulating Template': 'Congratulations on this achievement. This document recognises the recipient and records the reason for the acknowledgement.'
    };

    return `
        <div data-document-template-root="jumptake" style="font-family:Arial, sans-serif;color:#111827;background:#ffffff;min-height:930px;padding:38px;box-sizing:border-box;">
            <header style="display:flex;align-items:center;gap:18px;border-bottom:4px solid ${accent};padding-bottom:16px;margin-bottom:28px;">
                <div style="width:74px;height:74px;border-radius:18px;background:${accent};color:#ffffff;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;">JT</div>
                <div>
                    <h1 style="margin:0;font-size:24px;letter-spacing:.04em;color:${accent};">${title}</h1>
                    <p style="margin:6px 0 0;font-size:12px;color:#334155;">Generated by JumpTake • ${date}</p>
                </div>
            </header>
            <section style="border:1px solid #d7dee8;border-radius:16px;padding:22px;margin-bottom:22px;">
                <h2 style="font-size:15px;margin:0 0 10px;color:${accent};">Document Summary</h2>
                <p style="font-size:12px;line-height:1.55;margin:0;">${escapeHtml(bodyMap[label] || bodyMap['Random Document'])}</p>
            </section>
            <section style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:22px;">
                <div style="border-left:5px solid ${accent};background:#f8fafc;padding:14px;">
                    <strong>Prepared For</strong>
                    <p style="margin:6px 0 0;">Candidate / Recipient Name</p>
                </div>
                <div style="border-left:5px solid ${accent};background:#f8fafc;padding:14px;">
                    <strong>Prepared By</strong>
                    <p style="margin:6px 0 0;">Company / Department Name</p>
                </div>
            </section>
            <section style="font-size:12px;line-height:1.6;">
                <h2 style="font-size:15px;color:${accent};border-bottom:1px solid #cbd5e1;padding-bottom:6px;">Details</h2>
                <ul>
                    <li>Add key dates, responsibilities, or terms here.</li>
                    <li>Add supporting notes, links, or policy references here.</li>
                    <li>Edit every line directly inside the JumpTake document editor.</li>
                </ul>
            </section>
            <footer style="margin-top:44px;display:flex;gap:48px;font-size:12px;">
                <div style="flex:1;border-top:1px solid #111827;padding-top:8px;">Authorised Signature</div>
                <div style="flex:1;border-top:1px solid #111827;padding-top:8px;">Date</div>
            </footer>
        </div>
    `;
};

const buildDocumentTemplates = () => [
    'Candidate Hired Announcement',
    'Candidate Rejection Notice',
    'Contract',
    'Timetable',
    'Rota',
    'Plans',
    'Invitation',
    'Random Document',
    'Expelling Job',
    'Congratulating Template'
].map((label, index) => ({
    id: `document-template-${index + 1}`,
    label,
    description: `Editable JumpTake document template for ${label.toLowerCase()}.`,
    category: 'document',
    html: buildDocumentTemplateHtml(label, index)
}));

const createTemplateLibrary = (name = 'YOUR NAME', email = 'Email') => {
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);

    return [
        {
            id: 'ats-1',
            category: 'ats',
            label: 'ATS Friendly 1',
            description: 'Classic centered layout with clear section dividers.',
            html: `
                <div style="font-family: Georgia, 'Times New Roman', serif; color: #111827; padding: 42px 52px; min-height: 100%;">
                    <div style="text-align: center;">
                        <div style="font-size: 28px; font-weight: 700; letter-spacing: 0.04em;">${safeName}</div>
                        <div style="font-size: 15px; color: #9ca3af; margin-top: 6px;">The role you are applying for?</div>
                        <div style="font-size: 13px; color: #9ca3af; margin-top: 6px;">Phone • ${safeEmail} • LinkedIn/Portfolio • Location</div>
                    </div>
                    <div style="margin-top: 28px; text-align: center; font-size: 15px; font-weight: 700;">Summary</div>
                    <div style="border-top: 1px solid #111827; margin-top: 6px; padding-top: 10px; color: #9ca3af; font-size: 13px;">Briefly explain why you're a great fit for the role - use the AI assistant to tailor this summary for each job posting.</div>
                    <div style="margin-top: 26px; text-align: center; font-size: 15px; font-weight: 700;">Experience</div>
                    <div style="border-top: 1px solid #111827; margin-top: 6px; padding-top: 10px;">
                        <p style="margin: 0 0 8px;"><strong>Company Name</strong><span style="float: right; color: #9ca3af;">Location</span></p>
                        <p style="margin: 0 0 6px;">Title <span style="float: right; color: #9ca3af;">Date period</span></p>
                        <ul style="margin: 0 0 20px 18px;">
                            <li>Highlight your accomplishments, using numbers if possible.</li>
                        </ul>
                        <p style="margin: 0 0 8px;"><strong>Company Name</strong><span style="float: right; color: #9ca3af;">Location</span></p>
                        <p style="margin: 0 0 6px;">Title <span style="float: right; color: #9ca3af;">Date period</span></p>
                        <ul style="margin: 0 0 20px 18px;">
                            <li>Highlight your accomplishments, using numbers if possible.</li>
                        </ul>
                    </div>
                    <div style="margin-top: 18px; text-align: center; font-size: 15px; font-weight: 700;">Skills</div>
                    <div style="border-top: 1px solid #111827; margin-top: 6px; padding-top: 10px;">Your Skill</div>
                    <div style="margin-top: 22px; text-align: center; font-size: 15px; font-weight: 700;">Education</div>
                    <div style="border-top: 1px solid #111827; margin-top: 6px; padding-top: 10px;">
                        <p style="margin: 0 0 6px;"><strong>School or University</strong><span style="float: right; color: #9ca3af;">Location</span></p>
                        <p style="margin: 0;">Degree and Field of Study <span style="float: right; color: #9ca3af;">Date period</span></p>
                    </div>
                </div>
            `
        },
        {
            id: 'ats-2',
            category: 'ats',
            label: 'ATS Friendly 2',
            description: 'Clean left-aligned structure with strong headings.',
            html: `
                <div style="font-family: Arial, sans-serif; color: #6b7280; padding: 42px 50px; min-height: 100%;">
                    <div style="font-size: 34px; font-weight: 700; color: #6b7280;">${safeName}</div>
                    <div style="font-size: 18px; color: #9ca3af;">The role you are applying for?</div>
                    <div style="font-size: 13px; margin-top: 8px;">Phone &nbsp; ${safeEmail} &nbsp; LinkedIn/Portfolio &nbsp; Location</div>
                    <div style="margin-top: 26px; font-size: 14px; font-weight: 800; text-transform: uppercase; color: #6b7280;">Summary</div>
                    <p style="margin-top: 8px;">Briefly explain why you're a great fit for the role - use the AI assistant to tailor this summary for each job posting.</p>
                    <div style="margin-top: 20px; font-size: 14px; font-weight: 800; text-transform: uppercase; color: #6b7280;">Experience</div>
                    <div style="margin-top: 10px;">
                        <p style="margin: 0; font-size: 18px; color: #6b7280;">Title <span style="float: right; font-size: 13px;">Location</span></p>
                        <p style="margin: 0; color: #b4b8de;">Company Name <span style="float: right; color: #9ca3af;">Date period</span></p>
                        <ul style="margin: 8px 0 18px 18px; color: #9ca3af;">
                            <li>Highlight your accomplishments, using numbers if possible.</li>
                        </ul>
                        <p style="margin: 0; font-size: 18px; color: #6b7280;">Title <span style="float: right; font-size: 13px;">Location</span></p>
                        <p style="margin: 0; color: #b4b8de;">Company Name <span style="float: right; color: #9ca3af;">Date period</span></p>
                        <ul style="margin: 8px 0 18px 18px; color: #9ca3af;">
                            <li>Highlight your accomplishments, using numbers if possible.</li>
                        </ul>
                    </div>
                    <div style="margin-top: 20px; font-size: 14px; font-weight: 800; text-transform: uppercase; color: #6b7280;">Education</div>
                    <p style="margin: 8px 0 0; font-size: 18px; color: #6b7280;">Degree and Field of Study <span style="float: right; font-size: 13px;">Location</span></p>
                    <p style="margin: 0; color: #9ca3af;">School or University <span style="float: right;">Date period</span></p>
                    <div style="margin-top: 20px; font-size: 14px; font-weight: 800; text-transform: uppercase; color: #6b7280;">Skills</div>
                    <p style="margin-top: 8px;">Your Skill</p>
                </div>
            `
        },
        {
            id: 'ats-3',
            category: 'ats',
            label: 'ATS Friendly 3',
            description: 'Elegant ATS structure with achievements near the top.',
            html: `
                <div style="font-family: Georgia, 'Times New Roman', serif; color: #111827; padding: 42px 52px; min-height: 100%;">
                    <div style="text-align: center;">
                        <div style="font-size: 26px; font-weight: 700; letter-spacing: 0.04em;">${safeName}</div>
                        <div style="font-size: 15px; color: #9ca3af; margin-top: 6px;">The role you are applying for?</div>
                        <div style="font-size: 13px; color: #9ca3af; margin-top: 6px;">Phone • ${safeEmail} • LinkedIn/Portfolio • Location</div>
                    </div>
                    <div style="margin-top: 24px; text-align: center; font-size: 15px; font-weight: 700;">Summary</div>
                    <div style="border-top: 1px solid #111827; margin-top: 6px; padding-top: 10px; color: #9ca3af; font-size: 13px;">Briefly explain why you're a great fit for the role - use the AI assistant to tailor this summary for each job posting.</div>
                    <div style="margin-top: 22px; text-align: center; font-size: 15px; font-weight: 700;">Key Achievements</div>
                    <div style="border-top: 1px solid #111827; margin-top: 6px; padding-top: 10px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; color: #9ca3af; font-size: 13px;">
                        <div><strong style="color: #9ca3af;">Your Achievement</strong><br />Describe what you did and the impact it had.</div>
                        <div><strong style="color: #9ca3af;">Your Achievement</strong><br />Describe what you did and the impact it had.</div>
                        <div><strong style="color: #9ca3af;">Your Achievement</strong><br />Describe what you did and the impact it had.</div>
                    </div>
                    <div style="margin-top: 22px; text-align: center; font-size: 15px; font-weight: 700;">Experience</div>
                    <div style="border-top: 1px solid #111827; margin-top: 6px; padding-top: 10px;">
                        <p style="margin: 0 0 8px; color: #b4b8de;">Company Name<span style="float: right; color: #9ca3af;">Location</span></p>
                        <p style="margin: 0 0 6px;">Title <span style="float: right; color: #9ca3af;">Date period</span></p>
                        <ul style="margin: 0 0 20px 18px;">
                            <li>Highlight your accomplishments, using numbers if possible.</li>
                        </ul>
                    </div>
                    <div style="margin-top: 18px; text-align: center; font-size: 15px; font-weight: 700;">Core Competencies</div>
                    <div style="border-top: 1px solid #111827; margin-top: 6px; padding-top: 10px;">Your Skill</div>
                    <div style="margin-top: 18px; text-align: center; font-size: 15px; font-weight: 700;">Education</div>
                    <div style="border-top: 1px solid #111827; margin-top: 6px; padding-top: 10px;">
                        <p style="margin: 0 0 6px; color: #b4b8de;">School or University<span style="float: right; color: #9ca3af;">Location</span></p>
                        <p style="margin: 0;">Degree and Field of Study <span style="float: right; color: #9ca3af;">Date period</span></p>
                    </div>
                </div>
            `
        },
        {
            id: 'general-1',
            category: 'general',
            label: 'General Resume 1',
            description: 'Balanced blue two-column professional layout.',
            html: `
                <div style="font-family: Arial, sans-serif; color: #6b7280; padding: 42px 48px; min-height: 100%;">
                    <div style="font-size: 34px; font-weight: 700; color: #7b93c3;">${safeName}</div>
                    <div style="font-size: 18px; color: #b6d9ff; margin-top: 2px;">The role you are applying for?</div>
                    <div style="font-size: 13px; color: #9ca3af; margin-top: 8px;">Phone &nbsp; ${safeEmail} &nbsp; LinkedIn/Portfolio &nbsp; Location</div>
                    <div style="display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(260px, 0.95fr); gap: 34px; margin-top: 28px;">
                        <div>
                            <div style="font-size: 14px; font-weight: 800; color: #123a8f; margin-bottom: 10px; border-bottom: 3px solid #123a8f; padding-bottom: 4px;">SUMMARY</div>
                            <p>Briefly explain why you're a great fit for the role - use the AI assistant to tailor this summary for each job posting.</p>
                            <div style="font-size: 14px; font-weight: 800; color: #123a8f; margin: 22px 0 10px; border-bottom: 3px solid #123a8f; padding-bottom: 4px;">EXPERIENCE</div>
                            <p style="margin: 0;"><strong>Title</strong></p>
                            <p style="margin: 0; color: #7aaef1;"><strong>Company Name</strong></p>
                            <p style="margin: 0 0 8px; font-size: 13px;">Date period • Location</p>
                            <ul style="margin: 0 0 18px 18px;">
                                <li>Highlight your accomplishments, using numbers if possible.</li>
                            </ul>
                            <div style="font-size: 14px; font-weight: 800; color: #123a8f; margin: 22px 0 10px; border-bottom: 3px solid #123a8f; padding-bottom: 4px;">EDUCATION</div>
                            <p style="margin: 0;"><strong>Degree and Field of Study</strong></p>
                            <p style="margin: 0; color: #7aaef1;"><strong>School or University</strong></p>
                            <p style="margin: 0; font-size: 13px;">Date period • Location</p>
                        </div>
                        <div>
                            <div style="font-size: 14px; font-weight: 800; color: #123a8f; margin-bottom: 10px; border-bottom: 3px solid #123a8f; padding-bottom: 4px;">STRENGTHS</div>
                            <p style="margin: 0 0 12px;"><strong>Your Strength</strong><br />Explain how it benefits your work.</p>
                            <p style="margin: 0 0 12px;"><strong>Your Strength</strong><br />Explain how it benefits your work.</p>
                            <div style="font-size: 14px; font-weight: 800; color: #123a8f; margin: 22px 0 10px; border-bottom: 3px solid #123a8f; padding-bottom: 4px;">SKILLS</div>
                            <p>Your Skill</p>
                            <div style="font-size: 14px; font-weight: 800; color: #123a8f; margin: 22px 0 10px; border-bottom: 3px solid #123a8f; padding-bottom: 4px;">CERTIFICATIONS</div>
                            <p style="margin: 0 0 10px;"><strong>Course Title</strong><br />Which institution provided the course?</p>
                            <div style="font-size: 14px; font-weight: 800; color: #123a8f; margin: 22px 0 10px; border-bottom: 3px solid #123a8f; padding-bottom: 4px;">LANGUAGES</div>
                            <p>Language — Native</p>
                            <p>Language — Proficient</p>
                        </div>
                    </div>
                </div>
            `
        },
        {
            id: 'general-2',
            category: 'general',
            label: 'General Resume 2',
            description: 'Modern light green layout with side highlights.',
            html: `
                <div style="font-family: Arial, sans-serif; color: #8a8a8a; padding: 42px 48px; min-height: 100%;">
                    <div style="font-size: 34px; font-weight: 700; color: #8a8a8a;">${safeName}</div>
                    <div style="font-size: 18px; color: #b8d9c3;">The role you are applying for?</div>
                    <div style="font-size: 13px; color: #b3b3b3; margin-top: 8px;">Phone &nbsp; ${safeEmail} &nbsp; LinkedIn/Portfolio &nbsp; Location</div>
                    <div style="display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(260px, 0.95fr); gap: 34px; margin-top: 28px;">
                        <div>
                            <div style="font-size: 14px; font-weight: 700; color: #55b77a;">SUMMARY</div>
                            <p>Briefly explain why you're a great fit for the role - use the AI assistant to tailor this summary for each job posting.</p>
                            <div style="font-size: 14px; font-weight: 700; color: #55b77a; margin-top: 20px;">EXPERIENCE</div>
                            <p style="margin: 8px 0 0;"><strong>Title</strong></p>
                            <p style="margin: 0;">Company Name &nbsp; Date period &nbsp; Location</p>
                            <ul style="margin: 8px 0 18px 18px;">
                                <li>Highlight your accomplishments, using numbers if possible.</li>
                            </ul>
                            <p style="margin: 8px 0 0;"><strong>Title</strong></p>
                            <p style="margin: 0;">Company Name &nbsp; Date period &nbsp; Location</p>
                            <ul style="margin: 8px 0 18px 18px;">
                                <li>Highlight your accomplishments, using numbers if possible.</li>
                            </ul>
                            <div style="font-size: 14px; font-weight: 700; color: #55b77a; margin-top: 20px;">EDUCATION</div>
                            <p style="margin: 8px 0 0;"><strong>Degree and Field of Study</strong></p>
                            <p style="margin: 0;">School or University &nbsp; Date period &nbsp; Location</p>
                        </div>
                        <div>
                            <div style="font-size: 14px; font-weight: 700; color: #55b77a;">STRENGTHS</div>
                            <p><strong>Your Strength</strong><br />Explain how it benefits your work.</p>
                            <p><strong>Your Strength</strong><br />Explain how it benefits your work.</p>
                            <div style="font-size: 14px; font-weight: 700; color: #55b77a; margin-top: 20px;">SKILLS</div>
                            <p>Your Skill</p>
                            <div style="font-size: 14px; font-weight: 700; color: #55b77a; margin-top: 20px;">PROJECTS</div>
                            <p><strong>Project Name</strong><br />URL<br />Short summary of your work</p>
                            <div style="font-size: 14px; font-weight: 700; color: #55b77a; margin-top: 20px;">HOW I SPLIT MY TIME</div>
                            <p>Writing code • Continuous education • Contributing to open source • Code review • Volunteering</p>
                        </div>
                    </div>
                </div>
            `
        },
        {
            id: 'general-3',
            category: 'general',
            label: 'General Resume 3',
            description: 'Statement layout with a bold sidebar for highlights.',
            html: `
                <div style="display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(260px, 0.85fr); min-height: 100%; font-family: Arial, sans-serif; color: #8a8a8a;">
                    <div style="padding: 42px 48px;">
                        <div style="font-size: 34px; font-weight: 700; color: #8a8a8a;">${safeName}</div>
                        <div style="font-size: 18px; color: #b8ecf0;">The role you are applying for?</div>
                        <div style="font-size: 13px; color: #b3b3b3; margin-top: 8px;">Phone &nbsp; ${safeEmail} &nbsp; LinkedIn/Portfolio &nbsp; Location</div>
                        <div style="font-size: 14px; margin-top: 28px; color: #1f2937;">SUMMARY</div>
                        <p>Briefly explain why you're a great fit for the role - use the AI assistant to tailor this summary for each job posting.</p>
                        <div style="font-size: 14px; margin-top: 18px; color: #1f2937;">EXPERIENCE</div>
                        <p style="margin: 8px 0 0;"><strong>Title</strong></p>
                        <p style="margin: 0; color: #7cd0d2;"><strong>Company Name</strong></p>
                        <p style="margin: 0 0 8px;">Date period <span style="float: right;">Location</span></p>
                        <ul style="margin: 8px 0 16px 18px;">
                            <li>Highlight your accomplishments, using numbers if possible.</li>
                        </ul>
                        <div style="font-size: 14px; margin-top: 18px; color: #1f2937;">EDUCATION</div>
                        <p style="margin: 8px 0 0;"><strong>Degree and Field of Study</strong></p>
                        <p style="margin: 0; color: #7cd0d2;"><strong>School or University</strong></p>
                        <p style="margin: 0;">Date period <span style="float: right;">Location</span></p>
                        <div style="font-size: 14px; margin-top: 18px; color: #1f2937;">LANGUAGES</div>
                        <p>Language — Native</p>
                        <p>Language — Advanced</p>
                    </div>
                    <div style="background: #2d7b7b; color: #e8f8f8; padding: 42px 32px;">
                        <div style="font-size: 14px; font-weight: 700; letter-spacing: 0.04em; border-bottom: 1px solid rgba(255,255,255,0.5); padding-bottom: 8px;">KEY ACHIEVEMENTS</div>
                        <p style="margin-top: 12px;"><strong>Your Achievement</strong><br />Describe what you did and the impact it had.</p>
                        <p><strong>Your Achievement</strong><br />Describe what you did and the impact it had.</p>
                        <div style="font-size: 14px; font-weight: 700; letter-spacing: 0.04em; border-bottom: 1px solid rgba(255,255,255,0.5); padding-bottom: 8px; margin-top: 22px;">SKILLS</div>
                        <p style="margin-top: 12px;">Your Skill</p>
                        <div style="font-size: 14px; font-weight: 700; letter-spacing: 0.04em; border-bottom: 1px solid rgba(255,255,255,0.5); padding-bottom: 8px; margin-top: 22px;">COURSES</div>
                        <p style="margin-top: 12px;"><strong>Course Title</strong><br />Which institution provided the course?</p>
                        <div style="font-size: 14px; font-weight: 700; letter-spacing: 0.04em; border-bottom: 1px solid rgba(255,255,255,0.5); padding-bottom: 8px; margin-top: 22px;">INTERESTS</div>
                        <p style="margin-top: 12px;"><strong>Career Interest / Passion</strong><br />What does the company have which makes it attractive for you?</p>
                    </div>
                </div>
            `
        }
    ];
};

const parseResumeFileToText = async (file) => {
    if (file.type === 'text/plain' || /\.txt$/i.test(file.name)) {
        return await file.text();
    }

    if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(new Uint8Array(buffer)).promise;
        let fullText = '';
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
            const page = await pdf.getPage(pageNumber);
            const content = await page.getTextContent();
            fullText += `${content.items.map((item) => item.str).join(' ')}\n\n`;
        }
        return fullText;
    }

    if (file.type.includes('officedocument.wordprocessingml') || /\.docx$/i.test(file.name)) {
        const buffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: buffer });
        return result.value;
    }

    if (file.type === 'application/msword' || /\.doc$/i.test(file.name)) {
        throw new Error('DOC files are not supported for editable conversion yet. Please upload PDF, DOCX, or TXT.');
    }

    throw new Error('Upload a PDF, DOCX, or TXT resume to convert it into editable content.');
};

const buildExportDocument = (title, html) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
        body {
            margin: 0;
            background: #f4f4f4;
            font-family: Arial, sans-serif;
        }
        .resume-export-page {
            width: ${A4_PAGE_WIDTH}px;
            min-height: ${A4_PAGE_HEIGHT}px;
            margin: 0 auto;
            background: #ffffff;
            color: #111827;
            box-sizing: border-box;
        }
        .resume-export-page table {
            width: 100%;
            border-collapse: collapse;
        }
        .resume-export-page td,
        .resume-export-page th {
            border: 1px solid #d1d5db;
            padding: 6px 8px;
        }
        .resume-playground-page-break {
            page-break-after: always;
            break-after: page;
            height: 0;
            border: 0;
            margin: 1.5rem 0;
        }
    </style>
</head>
<body>
    <div class="resume-export-page">${html}</div>
</body>
</html>
`;

const ResumePlayground = ({ user, onFooterBack, mode = 'resume' }) => {
    const isDocumentMode = mode === 'document';
    const userId = user?.id || 'guest';
    const displayEmail = typeof user?.email === 'string' ? user.email : '';
    const displayName = displayEmail.includes('@') ? displayEmail.split('@')[0] : (displayEmail || 'Your Name');
    const storageKey = getStorageKey(userId, mode);
    const resourceLabel = isDocumentMode ? 'Document' : 'Resume';
    const resourceLabelPlural = isDocumentMode ? 'documents' : 'resumes';
    const uploadInputRef = useRef(null);
    const aiPhotoInputRef = useRef(null);
    const editorCanvasRef = useRef(null);
    const editorRef = useRef(null);
    const selectionRef = useRef(null);
    const rulerDragRef = useRef(null);
    const mobilePinchRef = useRef(null);
    const signatureCanvasRef = useRef(null);
    const signatureDrawingRef = useRef(false);
    const textColorRef = useRef(DEFAULT_TEXT_COLOR);
    const manualTextInsertRef = useRef(false);

    const [activeTab, setActiveTab] = useState('create');
    const [createMode, setCreateMode] = useState('');
    const [editorSuspended, setEditorSuspended] = useState(false);
    const [savedResumes, setSavedResumes] = useState([]);
    const [editorResume, setEditorResume] = useState(null);
    const [editorPageCount, setEditorPageCount] = useState(1);
    const [editorPageMargins, setEditorPageMargins] = useState(() => createPageMargins(1));
    const [statusMessage, setStatusMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [uploading, setUploading] = useState(false);
    const [tailorStep, setTailorStep] = useState('');
    const [tailorTemplates, setTailorTemplates] = useState([]);
    const [tailorProfileData, setTailorProfileData] = useState(null);
    const [tailorPhoto, setTailorPhoto] = useState('');
    const [tailorPhotoProcessing, setTailorPhotoProcessing] = useState(false);
    const [spellcheckEnabled, setSpellcheckEnabled] = useState(true);
    const [textColor, setTextColor] = useState(DEFAULT_TEXT_COLOR);
    const [mobileEditorZoom, setMobileEditorZoom] = useState(0.46);
    const [editorMargins, setEditorMargins] = useState(DEFAULT_EDITOR_MARGINS);
    const [atsScanResult, setAtsScanResult] = useState(null);
    const [showAtsDetails, setShowAtsDetails] = useState(false);
    const [signatureDataUrl, setSignatureDataUrl] = useState('');
    const [signatureStrokeColor, setSignatureStrokeColor] = useState('black');
    const [isMobileViewport, setIsMobileViewport] = useState(() => (
        typeof window !== 'undefined' ? window.innerWidth <= 768 : false
    ));
    useEffect(() => {
        try {
            const stored = localStorage.getItem(storageKey);
            const parsed = stored ? JSON.parse(stored) : [];
            setSavedResumes(Array.isArray(parsed) ? parsed : []);
        } catch (error) {
            console.error('Failed to load saved resumes:', error);
            setSavedResumes([]);
        }
    }, [storageKey]);

    useEffect(() => {
        if (isDocumentMode || !userId) {
            return undefined;
        }

        let isMounted = true;
        const fetchTailorProfile = async () => {
            const token = localStorage.getItem('token');
            let storedUser = {};
            try {
                storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            } catch (error) {
                storedUser = {};
            }
            const jobSeekerId = user?.jobSeekerId || storedUser.jobSeekerId || localStorage.getItem('jobSeekerId') || localStorage.getItem('tempJobSeekerId');

            try {
                if (jobSeekerId) {
                    const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/job-seekers/${jobSeekerId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        if (isMounted) {
                            setTailorProfileData(data);
                        }
                        return;
                    }
                }

                const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/resume/analysis/${userId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (isMounted) {
                        setTailorProfileData(data);
                    }
                }
            } catch (error) {
                console.error('Failed to load profile data for AI tailoring:', error);
            }
        };

        fetchTailorProfile();

        return () => {
            isMounted = false;
        };
    }, [isDocumentMode, user, userId]);

    const persistResumes = (nextResumes) => {
        setSavedResumes(nextResumes);
        localStorage.setItem(storageKey, JSON.stringify(nextResumes));
    };

    const createResumeRecord = ({ name, html, source = 'scratch', templateId = '', templateCategory: nextCategory = '', textColor: nextTextColor = DEFAULT_TEXT_COLOR }) => {
        const now = new Date().toISOString();
        return {
            id: createResumeId(),
            name,
            html,
            margins: { ...DEFAULT_EDITOR_MARGINS },
            pageMargins: createPageMargins(1),
            textColor: nextTextColor,
            source,
            templateId,
            templateCategory: nextCategory,
            createdAt: now,
            updatedAt: now
        };
    };

    const clearMessages = () => {
        setStatusMessage('');
        setErrorMessage('');
    };

    const syncSignaturePreview = useCallback(() => {
        const canvas = signatureCanvasRef.current;
        if (!canvas) {
            return '';
        }

        const dataUrl = canvas.toDataURL('image/png');
        setSignatureDataUrl(dataUrl);
        return dataUrl;
    }, []);

    const clearSignature = useCallback(() => {
        const canvas = signatureCanvasRef.current;
        if (!canvas) {
            return;
        }

        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        setSignatureDataUrl('');
    }, []);

    useEffect(() => {
        if (!isDocumentMode) {
            return undefined;
        }

        const canvas = signatureCanvasRef.current;
        if (!canvas) {
            return undefined;
        }

        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.strokeStyle = SIGNATURE_STROKE_COLORS[signatureStrokeColor] || SIGNATURE_STROKE_COLORS.black;
        context.lineWidth = 2;
        context.lineCap = 'round';
        context.lineJoin = 'round';

        const getPoint = (event) => {
            const rect = canvas.getBoundingClientRect();
            return {
                x: ((event.clientX - rect.left) / rect.width) * canvas.width,
                y: ((event.clientY - rect.top) / rect.height) * canvas.height
            };
        };

        const handlePointerDown = (event) => {
            signatureDrawingRef.current = true;
            const point = getPoint(event);
            context.beginPath();
            context.moveTo(point.x, point.y);
        };

        const handlePointerMove = (event) => {
            if (!signatureDrawingRef.current) {
                return;
            }

            const point = getPoint(event);
            context.lineTo(point.x, point.y);
            context.stroke();
        };

        const stopDrawing = () => {
            if (!signatureDrawingRef.current) {
                return;
            }

            signatureDrawingRef.current = false;
            syncSignaturePreview();
        };

        canvas.addEventListener('pointerdown', handlePointerDown);
        canvas.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', stopDrawing);

        return () => {
            canvas.removeEventListener('pointerdown', handlePointerDown);
            canvas.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', stopDrawing);
        };
    }, [isDocumentMode, signatureStrokeColor, syncSignaturePreview]);

    const addSignatureToDocument = useCallback(() => {
        const dataUrl = signatureDataUrl || syncSignaturePreview();
        if (!dataUrl) {
            return;
        }

        insertHtml(`
            <div style="display:flex;justify-content:flex-end;margin:16px 0;">
                <img src="${dataUrl}" alt="Signature" style="max-width:180px;max-height:72px;object-fit:contain;" />
            </div>
            <p></p>
        `);
    }, [signatureDataUrl, syncSignaturePreview]);

    const updateMarginFromPointer = useCallback((dragState, clientX, clientY) => {
        if (!dragState?.rect) {
            return;
        }

        if (dragState.axis === 'horizontal') {
            const scaleX = dragState.rect.width > 0 ? dragState.rect.width / A4_PAGE_WIDTH : 1;
            const nextLeft = clamp((clientX - dragState.rect.left) / scaleX, MIN_LEFT_MARGIN, MAX_LEFT_MARGIN);
            setEditorPageMargins((current) => {
                const nextMargins = createPageMargins(Math.max(editorPageCount, current.length), current);
                nextMargins[dragState.pageIndex || 0] = {
                    ...nextMargins[dragState.pageIndex || 0],
                    left: Math.round(nextLeft)
                };
                return nextMargins;
            });

            if ((dragState.pageIndex || 0) === 0) {
                setEditorMargins((current) => ({ ...current, left: Math.round(nextLeft) }));
            }
            return;
        }

        if (dragState.axis === 'vertical') {
            const scaleY = dragState.rect.height > 0 ? dragState.rect.height / A4_PAGE_HEIGHT : 1;
            const nextTop = clamp((clientY - dragState.rect.top) / scaleY, MIN_TOP_MARGIN, MAX_TOP_MARGIN);
            setEditorPageMargins((current) => {
                const nextMargins = createPageMargins(Math.max(editorPageCount, current.length), current);
                nextMargins[dragState.pageIndex || 0] = {
                    ...nextMargins[dragState.pageIndex || 0],
                    top: Math.round(nextTop)
                };
                return nextMargins;
            });

            if ((dragState.pageIndex || 0) === 0) {
                setEditorMargins((current) => ({ ...current, top: Math.round(nextTop) }));
            }
        }
    }, [editorPageCount]);

    const startRulerDrag = useCallback((axis, pageIndex, event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        rulerDragRef.current = {
            axis,
            pageIndex,
            rect: event.currentTarget.getBoundingClientRect()
        };
        updateMarginFromPointer(rulerDragRef.current, event.clientX, event.clientY);
    }, [updateMarginFromPointer]);

    useEffect(() => {
        const handlePointerMove = (event) => {
            if (!rulerDragRef.current) {
                return;
            }

            event.preventDefault();
            updateMarginFromPointer(rulerDragRef.current, event.clientX, event.clientY);
        };

        const stopRulerDrag = () => {
            rulerDragRef.current = null;
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', stopRulerDrag);
        window.addEventListener('pointercancel', stopRulerDrag);

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', stopRulerDrag);
            window.removeEventListener('pointercancel', stopRulerDrag);
        };
    }, [updateMarginFromPointer]);

    const getPaginationHost = useCallback((root = editorRef.current) => {
        if (!root) {
            return null;
        }

        const meaningfulChildren = Array.from(root.childNodes).filter((node) => (
            !(node.nodeType === Node.TEXT_NODE && !node.textContent?.trim())
        ));

        if (
            meaningfulChildren.length === 1
            && meaningfulChildren[0].nodeType === Node.ELEMENT_NODE
            && meaningfulChildren[0].tagName === 'DIV'
            && !meaningfulChildren[0].classList.contains('resume-playground-page-break')
        ) {
            return meaningfulChildren[0];
        }

        return root;
    }, []);

    const normalizeEditorContent = useCallback(() => {
        const root = getPaginationHost();

        if (!root) {
            return;
        }
        const childNodes = Array.from(root.childNodes);

        childNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const rawText = node.textContent || '';

                if (!rawText.trim()) {
                    node.remove();
                    return;
                }

                const paragraph = document.createElement('p');
                paragraph.textContent = rawText;
                root.replaceChild(paragraph, node);
            }
        });

        if (!root.childNodes.length) {
            root.innerHTML = createBlankEditorHtml();
        }
    }, [getPaginationHost]);

    const createMeasurementContainer = useCallback(() => {
        const measurement = document.createElement('div');
        measurement.style.position = 'absolute';
        measurement.style.left = '-100000px';
        measurement.style.top = '0';
        measurement.style.visibility = 'hidden';
        measurement.style.pointerEvents = 'none';
        measurement.style.width = `${A4_PAGE_WIDTH}px`;
        measurement.style.padding = `${editorMargins.top}px ${A4_RIGHT_PADDING}px ${A4_BOTTOM_PADDING}px ${editorMargins.left}px`;
        measurement.style.boxSizing = 'border-box';
        measurement.style.background = '#ffffff';
        measurement.style.color = '#111827';
        measurement.style.fontFamily = "'Lexend', 'Share Tech', 'Segoe UI', sans-serif";
        measurement.style.lineHeight = '1.6';
        measurement.style.whiteSpace = 'normal';
        measurement.style.wordBreak = 'break-word';
        measurement.style.overflowWrap = 'anywhere';
        document.body.appendChild(measurement);
        return measurement;
    }, [editorMargins.left, editorMargins.top]);

    const splitTextBlockToFit = useCallback((node, measurement) => {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) {
            return null;
        }

        const tagName = node.tagName?.toUpperCase();
        if (!['P', 'DIV', 'LI'].includes(tagName)) {
            return null;
        }

        const text = node.textContent || '';
        if (!text.trim()) {
            return null;
        }

        const wordTokens = text.match(/\S+\s*/g) || [];
        const tokens = wordTokens.length > 1
            ? wordTokens
            : Array.from(text);
        if (tokens.length < 2) {
            return null;
        }

        const probe = node.cloneNode(false);
        probe.textContent = '';
        measurement.appendChild(probe);

        let fitText = '';
        let splitIndex = 0;

        for (let index = 0; index < tokens.length; index += 1) {
            probe.textContent += tokens[index];

            if (measurement.scrollHeight > A4_PAGE_HEIGHT) {
                break;
            }

            fitText += tokens[index];
            splitIndex = index + 1;
        }

        measurement.removeChild(probe);

        if (splitIndex <= 0 || splitIndex >= tokens.length) {
            return null;
        }

        const fittingNode = node.cloneNode(false);
        fittingNode.textContent = fitText.trimEnd();

        const overflowNode = node.cloneNode(false);
        overflowNode.textContent = tokens.slice(splitIndex).join('').trimStart();

        if (!fittingNode.textContent?.trim() || !overflowNode.textContent?.trim()) {
            return null;
        }

        return { fittingNode, overflowNode };
    }, []);

    const repaginateEditorContent = useCallback(() => {
        if (!editorRef.current) {
            return;
        }

        normalizeEditorContent();
        const root = getPaginationHost();

        if (!root) {
            return;
        }

        root.querySelectorAll('.resume-playground-page-break[data-break-type="auto"]').forEach((node) => node.remove());

        while (
            root.firstChild
            && root.firstChild.nodeType === Node.ELEMENT_NODE
            && root.firstChild.classList.contains('resume-playground-page-break')
        ) {
            const leadingBreak = root.firstChild;
            const nextSibling = leadingBreak.nextSibling;
            leadingBreak.remove();
            if (
                nextSibling
                && nextSibling.nodeType === Node.ELEMENT_NODE
                && nextSibling.tagName === 'P'
                && !nextSibling.textContent?.trim()
            ) {
                nextSibling.remove();
            }
        }

        const measurement = createMeasurementContainer();
        const nodes = Array.from(root.childNodes);
        let pages = 1;
        let currentPageIndex = 0;
        let blocksOnCurrentPage = 0;

        const getPageTopMargin = (pageIndex) => (editorPageMargins[pageIndex] || editorMargins).top;
        const getUsedHeight = () => Math.max(measurement.scrollHeight, getPageTopMargin(currentPageIndex) + A4_BOTTOM_PADDING);
        const createBreakHeight = (usedHeight, nextPageIndex = currentPageIndex + 1) => {
            const nextTopMargin = getPageTopMargin(nextPageIndex);
            return Math.max(nextTopMargin, (A4_PAGE_HEIGHT + A4_PAGE_GAP + nextTopMargin) - usedHeight);
        };

        nodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) {
                return;
            }

            if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('resume-playground-page-break')) {
                const usedHeight = getUsedHeight();
                node.style.height = `${createBreakHeight(usedHeight, pages)}px`;
                measurement.innerHTML = '';
                pages += 1;
                currentPageIndex = pages - 1;
                blocksOnCurrentPage = 0;
                return;
            }

            const usedBeforeAppend = getUsedHeight();
            const nodeClone = node.cloneNode(true);
            measurement.appendChild(nodeClone);

            if (measurement.scrollHeight > A4_PAGE_HEIGHT) {
                measurement.removeChild(nodeClone);

                if (blocksOnCurrentPage > 0) {
                    const splitResult = splitTextBlockToFit(node, measurement);

                    if (splitResult) {
                        const { fittingNode, overflowNode } = splitResult;
                        root.insertBefore(fittingNode, node);

                        const autoBreak = document.createElement('div');
                        autoBreak.className = 'resume-playground-page-break';
                        autoBreak.setAttribute('data-break-type', 'auto');
                        autoBreak.setAttribute('contenteditable', 'false');
                        autoBreak.style.height = `${createBreakHeight(getUsedHeight(), pages)}px`;
                        root.insertBefore(autoBreak, node);

                        node.replaceWith(overflowNode);

                        measurement.innerHTML = '';
                        measurement.appendChild(overflowNode.cloneNode(true));
                        pages += 1;
                        currentPageIndex = pages - 1;
                        blocksOnCurrentPage = 1;
                        return;
                    }
                }

                const autoBreak = document.createElement('div');
                autoBreak.className = 'resume-playground-page-break';
                autoBreak.setAttribute('data-break-type', 'auto');
                autoBreak.setAttribute('contenteditable', 'false');
                autoBreak.style.height = `${createBreakHeight(usedBeforeAppend, pages)}px`;
                root.insertBefore(autoBreak, node);

                measurement.innerHTML = '';
                measurement.appendChild(node.cloneNode(true));
                pages += 1;
                currentPageIndex = pages - 1;
                blocksOnCurrentPage = 1;
                return;
            }

            blocksOnCurrentPage += 1;
        });

        document.body.removeChild(measurement);
        setEditorPageCount(pages);
    }, [createMeasurementContainer, editorMargins, editorPageMargins, getPaginationHost, normalizeEditorContent, splitTextBlockToFit]);

    useEffect(() => {
        if (!editorRef.current || !editorResume) {
            return;
        }

        if (editorRef.current.innerHTML !== editorResume.html) {
            editorRef.current.innerHTML = editorResume.html;
        }

        window.requestAnimationFrame(() => {
            repaginateEditorContent();
        });
    }, [editorResume, repaginateEditorContent]);

    useEffect(() => {
        if (!editorResume || !editorRef.current) {
            return;
        }

        window.requestAnimationFrame(() => {
            repaginateEditorContent();
        });
    }, [editorMargins, editorPageMargins, editorResume, repaginateEditorContent]);

    useEffect(() => {
        setEditorPageMargins((current) => createPageMargins(editorPageCount, current));
    }, [editorPageCount]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        const handleResize = () => {
            setIsMobileViewport(window.innerWidth <= 768);
        };

        handleResize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    useEffect(() => {
        if (typeof document === 'undefined' || !editorResume || !isMobileViewport) {
            return undefined;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [editorResume, isMobileViewport]);

    const getTouchDistance = (touches) => {
        if (!touches || touches.length < 2) {
            return 0;
        }

        const [first, second] = touches;
        return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
    };

    const handleEditorCanvasTouchStart = (event) => {
        if (!isMobileViewport || event.touches.length !== 2) {
            return;
        }

        event.preventDefault();
        mobilePinchRef.current = {
            distance: getTouchDistance(event.touches),
            zoom: mobileEditorZoom
        };
    };

    const handleEditorCanvasTouchMove = (event) => {
        if (!isMobileViewport || event.touches.length !== 2 || !mobilePinchRef.current) {
            return;
        }

        event.preventDefault();
        const nextDistance = getTouchDistance(event.touches);
        if (!nextDistance || !mobilePinchRef.current.distance) {
            return;
        }

        const nextZoom = clamp(
            mobilePinchRef.current.zoom * (nextDistance / mobilePinchRef.current.distance),
            0.34,
            1.18
        );
        setMobileEditorZoom(Number(nextZoom.toFixed(3)));
    };

    const handleEditorCanvasTouchEnd = (event) => {
        if (event.touches.length < 2) {
            mobilePinchRef.current = null;
        }
    };

    const openEditor = (resume, nextTab = 'edit') => {
        setEditorResume(resume);
        setEditorSuspended(false);
        const nextTextColor = resume?.textColor || DEFAULT_TEXT_COLOR;
        textColorRef.current = nextTextColor;
        setTextColor(nextTextColor);
        setEditorMargins(resume?.margins ? { ...DEFAULT_EDITOR_MARGINS, ...resume.margins } : DEFAULT_EDITOR_MARGINS);
        setEditorPageMargins(
            Array.isArray(resume?.pageMargins) && resume.pageMargins.length
                ? resume.pageMargins.map((margin) => cloneMargins(margin))
                : createPageMargins(1, resume?.margins ? [{ ...DEFAULT_EDITOR_MARGINS, ...resume.margins }] : [])
        );
        setEditorPageCount(1);
        setAtsScanResult(null);
        setShowAtsDetails(false);
        setActiveTab(nextTab);
        clearMessages();
        window.requestAnimationFrame(() => {
            editorRef.current?.focus();
            window.getSelection()?.removeAllRanges();
            repaginateEditorContent();
        });
    };

    const saveSelection = () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || !editorRef.current) {
            return;
        }
        if (!editorRef.current.contains(selection.anchorNode)) {
            return;
        }
        selectionRef.current = selection.getRangeAt(0);
    };

    const restoreSelection = () => {
        if (!editorRef.current) {
            return;
        }

        editorRef.current.focus();

        if (!selectionRef.current) {
            return;
        }

        const selection = window.getSelection();
        if (!selection) {
            return;
        }

        selection.removeAllRanges();
        selection.addRange(selectionRef.current);
    };

    const applyTextColor = (color = textColor) => {
        if (!editorResume || typeof document.execCommand !== 'function') {
            return;
        }

        document.execCommand('styleWithCSS', false, true);
        document.execCommand('foreColor', false, color || DEFAULT_TEXT_COLOR);
    };

    const handleTextColorChange = (color) => {
        const nextColor = color || DEFAULT_TEXT_COLOR;
        textColorRef.current = nextColor;
        setTextColor(nextColor);
        setEditorResume((current) => current ? { ...current, textColor: nextColor } : current);
        saveSelection();
    };

    const maintainTextColorForTyping = (event) => {
        const inputType = event.nativeEvent?.inputType || '';
        const isTypingKey = event.key === 'Enter'
            || (event.key?.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey);
        const isTextInput = inputType.startsWith('insert');

        if (isTypingKey || isTextInput) {
            applyTextColor();
        }
    };

    const insertColoredText = (text) => {
        if (!editorResume || !text || !editorRef.current) {
            return;
        }

        const editor = editorRef.current;
        editor.focus();

        let selection = window.getSelection();
        let range = null;

        if (selection && selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
            range = selection.getRangeAt(0);
        } else {
            restoreSelection();
            selection = window.getSelection();
            if (selection && selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
                range = selection.getRangeAt(0);
            }
        }

        if (!range) {
            range = document.createRange();
            const paragraph = editor.querySelector('p') || editor;
            if (paragraph !== editor && paragraph.firstChild?.nodeName === 'BR') {
                range.setStart(paragraph, 0);
            } else {
                range.selectNodeContents(paragraph);
                range.collapse(false);
            }
            selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
        }

        const safeColor = textColorRef.current || textColor || DEFAULT_TEXT_COLOR;
        const fragment = document.createDocumentFragment();
        const parts = String(text).split(/(\r\n|\r|\n)/);
        let lastInsertedNode = null;

        parts.forEach((part) => {
            if (!part) {
                return;
            }

            if (/^(?:\r\n|\r|\n)$/.test(part)) {
                const br = document.createElement('br');
                fragment.appendChild(br);
                lastInsertedNode = br;
                return;
            }

            const span = document.createElement('span');
            span.className = 'resume-playground-typed-color';
            span.style.setProperty('--resume-typed-color', safeColor);
            span.style.color = safeColor;
            span.style.webkitTextFillColor = safeColor;
            span.textContent = part.replace(/ /g, '\u00a0');
            fragment.appendChild(span);
            lastInsertedNode = span;
        });

        if (!lastInsertedNode) {
            return;
        }

        manualTextInsertRef.current = true;
        range.deleteContents();
        range.insertNode(fragment);

        const nextRange = document.createRange();
        nextRange.setStartAfter(lastInsertedNode);
        nextRange.collapse(true);
        selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(nextRange);
        saveSelection();
        syncEditorResume();

        window.setTimeout(() => {
            manualTextInsertRef.current = false;
        }, 0);
    };

    const colorRecentlyInsertedText = (textLength = 1) => {
        if (!editorRef.current || textLength <= 0) {
            return false;
        }

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
            return false;
        }

        let textNode = selection.anchorNode;
        let offset = selection.anchorOffset;

        if (textNode?.nodeType === Node.ELEMENT_NODE && offset > 0) {
            const previousNode = textNode.childNodes[offset - 1];
            if (previousNode?.nodeType === Node.TEXT_NODE) {
                textNode = previousNode;
                offset = previousNode.textContent?.length || 0;
            }
        }

        if (!textNode || textNode.nodeType !== Node.TEXT_NODE || !editorRef.current.contains(textNode)) {
            return false;
        }

        const content = textNode.textContent || '';
        if (!content || offset <= 0) {
            return false;
        }

        const safeLength = Math.min(textLength, offset, content.length);
        const start = Math.max(0, offset - safeLength);
        const safeColor = textColorRef.current || textColor || DEFAULT_TEXT_COLOR;

        let coloredNode = textNode;
        if (start > 0) {
            coloredNode = textNode.splitText(start);
        }

        let trailingNode = null;
        if ((coloredNode.textContent || '').length > safeLength) {
            trailingNode = coloredNode.splitText(safeLength);
        }

        if (!coloredNode.textContent) {
            return false;
        }

        const wrapper = document.createElement('span');
        wrapper.className = 'resume-playground-typed-color';
        wrapper.style.setProperty('--resume-typed-color', safeColor);
        wrapper.style.color = safeColor;
        wrapper.style.webkitTextFillColor = safeColor;

        coloredNode.parentNode.insertBefore(wrapper, coloredNode);
        wrapper.appendChild(coloredNode);

        const nextRange = document.createRange();
        if (trailingNode) {
            nextRange.setStartBefore(trailingNode);
        } else {
            nextRange.setStartAfter(wrapper);
        }
        nextRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(nextRange);
        saveSelection();
        return true;
    };

    const handleEditorBeforeInput = (event) => {
        const nativeEvent = event.nativeEvent || {};
        const inputType = nativeEvent.inputType || '';
        const insertedText = nativeEvent.data || '';

        if (!editorResume) {
            return;
        }

        if ((inputType === 'insertText' || inputType === 'insertCompositionText') && insertedText) {
            event.preventDefault();
            insertColoredText(insertedText);
            return;
        }

        maintainTextColorForTyping(event);
    };

    const handleEditorInput = (event) => {
        const nativeEvent = event.nativeEvent || {};
        const inputType = nativeEvent.inputType || '';
        const insertedText = nativeEvent.data || '';

        if (manualTextInsertRef.current) {
            syncEditorResume();
            return;
        }

        if (inputType.startsWith('insert') && insertedText) {
            colorRecentlyInsertedText(insertedText.length);
        }

        syncEditorResume();
    };

    const handleEditorKeyDown = () => {
        saveSelection();
    };

    const syncEditorResume = () => {
        if (!editorRef.current || !editorResume) {
            return;
        }

        saveSelection();
        window.requestAnimationFrame(() => {
            repaginateEditorContent();
            setEditorResume((current) => (
                current
                    ? { ...current, html: editorRef.current.innerHTML }
                    : current
            ));
            saveSelection();
        });
    };

    const runCommand = (command, value = null) => {
        if (!editorResume || typeof document.execCommand !== 'function') {
            return;
        }

        restoreSelection();
        document.execCommand(command, false, value);
        syncEditorResume();
    };

    const insertHtml = (html) => {
        if (!editorResume) {
            return;
        }

        restoreSelection();
        document.execCommand('insertHTML', false, html);
        syncEditorResume();
    };

    const insertTable = () => {
        const rowInput = window.prompt('How many rows?', '3');
        const colInput = window.prompt('How many columns?', '2');
        const rows = Number(rowInput);
        const cols = Number(colInput);

        if (!rows || !cols || rows < 1 || cols < 1) {
            return;
        }

        const tableRows = Array.from({ length: rows }, () => (
            `<tr>${Array.from({ length: cols }, () => '<td>Cell</td>').join('')}</tr>`
        )).join('');

        insertHtml(`<table><tbody>${tableRows}</tbody></table><p></p>`);
    };

    const insertLink = () => {
        const href = window.prompt('Paste the link URL');
        if (!href) {
            return;
        }
        runCommand('createLink', href);
    };

    const insertPageBreak = () => {
        const paginationHost = getPaginationHost();

        if (!paginationHost || !editorResume) {
            return;
        }

        const pageBreakMarkup = document.createElement('div');
        pageBreakMarkup.innerHTML = '<div class="resume-playground-page-break" data-break-type="manual" contenteditable="false"></div><p></p>';
        paginationHost.append(...Array.from(pageBreakMarkup.childNodes));
        syncEditorResume();
        editorRef.current.focus();
    };

    const removeLastPageBreak = () => {
        const paginationHost = getPaginationHost();

        if (!paginationHost) {
            return;
        }

        const pageBreaks = paginationHost.querySelectorAll('.resume-playground-page-break[data-break-type="manual"]');
        const lastPageBreak = pageBreaks[pageBreaks.length - 1];

        if (!lastPageBreak) {
            return;
        }

        const nextSibling = lastPageBreak.nextSibling;
        if (nextSibling && nextSibling.nodeType === Node.ELEMENT_NODE && nextSibling.tagName === 'P' && !nextSibling.textContent?.trim()) {
            nextSibling.remove();
        }

        lastPageBreak.remove();
        syncEditorResume();
    };

    const insertShape = (shape) => {
        const shapes = {
            circle: '<div style="width:88px;height:88px;border:2px solid #111827;border-radius:999px;margin:16px auto;"></div><p></p>',
            square: '<div style="width:88px;height:88px;border:2px solid #111827;margin:16px auto;"></div><p></p>',
            rectangle: '<div style="width:140px;height:80px;border:2px solid #111827;margin:16px auto;"></div><p></p>',
            triangle: '<div style="width:0;height:0;border-left:48px solid transparent;border-right:48px solid transparent;border-bottom:84px solid #111827;margin:16px auto;"></div><p></p>',
            line: '<div style="width:100%;border-top:2px solid #111827;margin:18px 0;"></div><p></p>'
        };

        if (shapes[shape]) {
            insertHtml(shapes[shape]);
        }
    };

    const handleStartScratch = () => {
        setTailorStep('');
        setTailorTemplates([]);
        setCreateMode('scratch');
        openEditor(createResumeRecord({
            name: `${displayName} ${resourceLabel}`,
            html: isDocumentMode
                ? createBlankDocumentHtml()
                : createBlankEditorHtml(),
            source: 'scratch'
        }), 'create');
    };

    const getCurrentTailorProfile = () => getTailorProfile(tailorProfileData, user, displayName);

    const generateTailorTemplates = (type, photo = tailorPhoto) => {
        const profile = getCurrentTailorProfile();
        const nextTemplates = buildAiTailorTemplates(profile, type, type === 'general' ? photo : '');
        setTailorTemplates(nextTemplates);
        setTailorStep(type);
        setStatusMessage(`${nextTemplates.length} ${type === 'ats' ? 'ATS-friendly' : 'general'} resume styles are ready. Choose one to edit.`);
        setErrorMessage('');
    };

    const handleOpenTailor = () => {
        setCreateMode('ai-tailor');
        setTailorStep('choose');
        setTailorTemplates([]);
        clearMessages();
    };

    const handleOpenDocumentTemplates = () => {
        const templates = buildDocumentTemplates();
        setCreateMode('document-template');
        setTailorStep('document');
        setTailorTemplates(templates);
        setStatusMessage(`${templates.length} JumpTake document templates are ready. Choose one to edit.`);
        setErrorMessage('');
    };

    const handleGeneralTailorChoice = () => {
        setTailorStep('general-photo');
        setTailorTemplates([]);
        clearMessages();
    };

    const handleTailorPhotoUpload = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) {
            return;
        }

        setTailorPhotoProcessing(true);
        clearMessages();
        try {
            const imageDataUrl = await createSquareProfileImage(file);
            setTailorPhoto(imageDataUrl);
            generateTailorTemplates('general', imageDataUrl);
        } catch (error) {
            console.error('Failed to prepare resume photo:', error);
            setErrorMessage(error.message || 'Could not prepare that photo. Try another image or skip the photo.');
        } finally {
            setTailorPhotoProcessing(false);
        }
    };

    const handleSkipTailorPhoto = () => {
        setTailorPhoto('');
        generateTailorTemplates('general', '');
    };

    const handleUseTailorTemplate = (template) => {
        if (!template) {
            return;
        }

        const isDocumentTemplate = template.category === 'document';
        setCreateMode(isDocumentTemplate ? 'document-template' : 'ai-tailor');
        openEditor(createResumeRecord({
            name: `${displayName} ${template.label}`,
            html: template.html,
            source: isDocumentTemplate ? 'document-template' : 'ai-tailor',
            templateId: template.id,
            templateCategory: template.category,
            textColor: DEFAULT_TEXT_COLOR
        }), 'create');
        setTailorStep('');
        setTailorTemplates([]);
        setStatusMessage(`${template.label} opened in the editor. You can edit, save, export, or print it now.`);
    };

    const handleUploadResume = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) {
            return;
        }

        setUploading(true);
        clearMessages();
        try {
            const text = (await parseResumeFileToText(file)).trim();
            if (!text) {
                throw new Error('No readable text was found in that resume.');
            }

            const baseName = file.name.replace(/\.[^.]+$/, '') || `${displayName} ${resourceLabel}`;
            setCreateMode('upload');
            openEditor(createResumeRecord({
                name: baseName,
                html: plainTextToHtml(text),
                source: 'upload'
            }), 'edit');
            setStatusMessage(`${resourceLabel} converted into editable mode. You can now refine and save it.`);
        } catch (error) {
            console.error(`Error converting ${resourceLabel.toLowerCase()} for editing:`, error);
            setErrorMessage(error.message || `Could not convert that ${resourceLabel.toLowerCase()} into editable content.`);
        } finally {
            setUploading(false);
        }
    };

    const handleSaveResume = () => {
        if (!editorResume) {
            return;
        }

        const currentHtml = editorRef.current?.innerHTML || editorResume.html;
        const now = new Date().toISOString();
        const nextResume = {
            ...editorResume,
            html: currentHtml,
            margins: { ...editorMargins },
            pageMargins: createPageMargins(editorPageCount, editorPageMargins),
            textColor,
            updatedAt: now
        };

        setEditorResume(nextResume);
        persistResumes(
            savedResumes.some((resume) => resume.id === nextResume.id)
                ? savedResumes.map((resume) => (resume.id === nextResume.id ? nextResume : resume))
                : [nextResume, ...savedResumes]
        );
        setStatusMessage(`${resourceLabel} saved successfully.`);
        setErrorMessage('');
    };

    const handleRenameResume = (resume) => {
        const nextName = window.prompt(`Rename ${resourceLabel.toLowerCase()}`, resume.name);
        if (!nextName || !nextName.trim()) {
            return;
        }

        const updatedName = nextName.trim();
        const nextResumes = savedResumes.map((item) => (
            item.id === resume.id ? { ...item, name: updatedName, updatedAt: new Date().toISOString() } : item
        ));

        persistResumes(nextResumes);
        if (editorResume?.id === resume.id) {
            setEditorResume((current) => (current ? { ...current, name: updatedName } : current));
        }
        setStatusMessage(`${resourceLabel} renamed.`);
    };

    const handleDeleteResume = (resumeId) => {
        const nextResumes = savedResumes.filter((resume) => resume.id !== resumeId);
        persistResumes(nextResumes);
        if (editorResume?.id === resumeId) {
            setEditorResume(null);
        }
        setStatusMessage(`Saved ${resourceLabel.toLowerCase()} removed.`);
    };

    const handleDuplicateResume = (resume) => {
        const duplicatedResume = createResumeRecord({
            name: `${resume.name} Copy`,
            html: resume.html,
            source: resume.source,
            templateId: resume.templateId,
            templateCategory: resume.templateCategory,
            textColor: resume.textColor || DEFAULT_TEXT_COLOR
        });

        persistResumes([duplicatedResume, ...savedResumes]);
        setStatusMessage(`Saved ${resourceLabel.toLowerCase()} duplicated.`);
    };

    const handleDownloadDoc = (resume = editorResume) => {
        if (!resume) {
            return;
        }

        const html = editorRef.current && editorResume?.id === resume.id
            ? editorRef.current.innerHTML
            : resume.html;

        const blob = new Blob(
            ['\ufeff', buildExportDocument(resume.name, html)],
            { type: 'application/msword' }
        );
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${resume.name.replace(/[^\w\s-]/g, '').trim() || 'resume'}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    };

    const handlePrintResume = (resume = editorResume) => {
        if (!resume) {
            return;
        }

        const html = editorRef.current && editorResume?.id === resume.id
            ? editorRef.current.innerHTML
            : resume.html;

        const popup = window.open('', '_blank', 'width=1000,height=900');
        if (!popup) {
            setErrorMessage('Please allow popups to print or save this resume as PDF.');
            return;
        }

        popup.document.open();
        popup.document.write(buildExportDocument(resume.name, html));
        popup.document.close();
        popup.focus();
        popup.onload = () => popup.print();
    };

    const closeEditor = () => {
        setEditorResume(null);
        setEditorSuspended(false);
        setAtsScanResult(null);
        setShowAtsDetails(false);
        clearMessages();
    };

    const handleTabChange = (nextTab) => {
        setActiveTab(nextTab);
        clearMessages();

        if (editorResume && !isMobileViewport) {
            const currentHtml = editorRef.current?.innerHTML;
            if (currentHtml !== undefined) {
                setEditorResume((current) => current ? { ...current, html: currentHtml } : current);
            }
            setEditorSuspended(true);
        }
    };

    const editorStatusText = spellcheckEnabled
        ? 'Browser spellcheck is on while you edit.'
        : 'Browser spellcheck is off for this editor.';
    const editorPageStride = A4_PAGE_HEIGHT + A4_PAGE_GAP;
    const editorDocumentHeight = (editorPageCount * A4_PAGE_HEIGHT) + (Math.max(editorPageCount - 1, 0) * A4_PAGE_GAP);

    const handleAtsScan = useCallback(() => {
        const currentHtml = editorRef.current?.innerHTML || editorResume?.html || '';
        const result = analyzeResumeForATS(currentHtml);
        setAtsScanResult(result);
        return result;
    }, [editorResume]);

    const handleScoreDetailsToggle = useCallback(() => {
        if (!atsScanResult) {
            const result = handleAtsScan();
            setShowAtsDetails(Boolean(result));
            return;
        }

        setShowAtsDetails((current) => !current);
    }, [atsScanResult, handleAtsScan]);

    const renderIconButton = (label, icon, onClick, extraClassName = '') => (
        <button
            type="button"
            className={`resume-playground-tool-button resume-playground-icon-button ${extraClassName}`.trim()}
            title={label}
            aria-label={label}
            onMouseDown={(event) => event.preventDefault()}
            onClick={onClick}
        >
            <span aria-hidden="true">{icon}</span>
        </button>
    );

    const renderSavedResumeCard = (resume, showManagementActions = false) => (
        <article key={resume.id} className="resume-playground-saved-card">
            <div className="resume-playground-saved-preview">
                <div
                    className="resume-playground-saved-preview-scale"
                    dangerouslySetInnerHTML={{ __html: resume.html }}
                />
            </div>
            <div className="resume-playground-saved-copy">
                <h4>{resume.name}</h4>
                <p>Updated {new Date(resume.updatedAt).toLocaleString()}</p>
                <p className="resume-playground-saved-source">Source: {resume.source}</p>
                <p>{stripHtml(resume.html).slice(0, 120) || `Saved ${resourceLabel.toLowerCase()} session`}{stripHtml(resume.html).length > 120 ? '...' : ''}</p>
            </div>
            <div className="resume-playground-saved-actions">
                <button type="button" className="settings-button primary" onClick={() => openEditor(resume, 'edit')}>
                    {`Edit ${resourceLabel}`}
                </button>
                <button type="button" className="secondary-button" onClick={() => handleDownloadDoc(resume)}>
                    Export DOC
                </button>
                <button type="button" className="secondary-button" onClick={() => handlePrintResume(resume)}>
                    Print / Save PDF
                </button>
                {showManagementActions && (
                    <>
                        <button type="button" className="secondary-button" onClick={() => handleRenameResume(resume)}>
                            Rename
                        </button>
                        <button type="button" className="secondary-button" onClick={() => handleDuplicateResume(resume)}>
                            Duplicate
                        </button>
                        <button type="button" className="secondary-button resume-playground-danger-button" onClick={() => handleDeleteResume(resume.id)}>
                            Delete
                        </button>
                    </>
                )}
            </div>
        </article>
    );

    return (
        <div className="resume-playground-section">
            <div className="resume-playground-tabs">
                <button
                    type="button"
                    className={activeTab === 'create' ? 'is-active' : ''}
                    onClick={() => handleTabChange('create')}
                >
                    {isDocumentMode ? 'Create Document' : 'Create Resume'}
                </button>
                <button
                    type="button"
                    className={activeTab === 'edit' ? 'is-active' : ''}
                    onClick={() => handleTabChange('edit')}
                >
                    {isDocumentMode ? 'Edit Document' : 'Edit Resume'}
                </button>
                <button
                    type="button"
                    className={activeTab === 'saved' ? 'is-active' : ''}
                    onClick={() => handleTabChange('saved')}
                >
                    {isDocumentMode ? 'Saved Documents' : 'Saved Resumes'}
                </button>
            </div>

            {statusMessage && <div className="notification-message success">{statusMessage}</div>}
            {errorMessage && <div className="error-message">{errorMessage}</div>}

            {editorResume && !editorSuspended ? (
                (() => {
                    const atsPanel = !isDocumentMode && (
                        <aside className={`resume-playground-ats-panel ${atsScanResult?.colorClass || ''}${isMobileViewport ? ' resume-playground-ats-panel-mobile' : ''}`}>
                            <div className="resume-playground-ats-score-card">
                                <span className="resume-playground-ats-caption">ATS Readability</span>
                                <strong className="resume-playground-ats-score">
                                    {atsScanResult ? `${atsScanResult.score}%` : '--%'}
                                </strong>
                                <span className="resume-playground-ats-label">
                                    {atsScanResult ? atsScanResult.label : 'Run a scan to score this resume.'}
                                </span>
                            </div>

                            <div className="resume-playground-ats-actions">
                                <button
                                    type="button"
                                    className="resume-playground-ats-button"
                                    onClick={() => {
                                        handleAtsScan();
                                        setShowAtsDetails(false);
                                    }}
                                >
                                    ATS Scan
                                </button>
                                <button
                                    type="button"
                                    className="resume-playground-ats-button secondary"
                                    onClick={handleScoreDetailsToggle}
                                >
                                    Score Details
                                </button>
                            </div>
                        </aside>
                    );

                    const signaturePanel = isDocumentMode && (
                        <aside className={`resume-playground-ats-panel resume-playground-signature-panel${isMobileViewport ? ' resume-playground-ats-panel-mobile' : ''}`}>
                            <div className="resume-playground-signature-card">
                                <span className="resume-playground-ats-caption">Signature</span>
                                <div className="resume-playground-signature-color-actions">
                                    <button
                                        type="button"
                                        className={`resume-playground-signature-color-button${signatureStrokeColor === 'black' ? ' is-active' : ''}`}
                                        onClick={() => setSignatureStrokeColor('black')}
                                    >
                                        Black
                                    </button>
                                    <button
                                        type="button"
                                        className={`resume-playground-signature-color-button resume-playground-signature-color-button-light${signatureStrokeColor === 'white' ? ' is-active' : ''}`}
                                        onClick={() => setSignatureStrokeColor('white')}
                                    >
                                        White
                                    </button>
                                </div>
                                <canvas
                                    ref={signatureCanvasRef}
                                    className={`resume-playground-signature-canvas${signatureStrokeColor === 'white' ? ' is-light-signature' : ''}`}
                                    width="280"
                                    height="120"
                                />
                            </div>

                            <div className="resume-playground-ats-actions">
                                <button
                                    type="button"
                                    className="resume-playground-ats-button"
                                    onClick={addSignatureToDocument}
                                >
                                    Add to Document
                                </button>
                                <button
                                    type="button"
                                    className="resume-playground-ats-button secondary"
                                    onClick={clearSignature}
                                >
                                    Clear
                                </button>
                            </div>
                        </aside>
                    );

                    const shell = (
                        <div className="resume-playground-editor-shell">
                    <div className="resume-playground-editor-topbar">
                        <div className="resume-playground-editor-head">
                            <label className="resume-playground-name-field">
                                <span>{isDocumentMode ? 'Document Name' : 'Resume Name'}</span>
                                <input
                                    type="text"
                                    value={editorResume.name}
                                    onChange={(event) => setEditorResume((current) => (
                                        current ? { ...current, name: event.target.value } : current
                                    ))}
                                />
                            </label>
                            <p>{editorStatusText}</p>
                        </div>
                        <div className="resume-playground-editor-actions">
                            <button type="button" className="settings-button primary" onClick={handleSaveResume}>
                                {isDocumentMode ? 'Save Document' : 'Save Resume'}
                            </button>
                            <button type="button" className="secondary-button" onClick={() => handleDownloadDoc(editorResume)}>
                                Export DOC
                            </button>
                            <button type="button" className="secondary-button" onClick={() => handlePrintResume(editorResume)}>
                                Print / Save PDF
                            </button>
                            <button type="button" className="secondary-button resume-playground-close-editor-button" onClick={closeEditor}>
                                Close Editor
                            </button>
                        </div>
                        {isMobileViewport && (
                            <div className="resume-playground-editor-mobile-sidepanel">
                                {isDocumentMode ? signaturePanel : atsPanel}
                            </div>
                        )}
                    </div>

                    <div className="resume-playground-toolbar-shell">
                        <div className="resume-playground-toolbar">
                            {isMobileViewport ? (
                                <>
                                    <div className="resume-playground-toolbar-row resume-playground-toolbar-row-fixed">
                                        {renderIconButton('Undo', '↶', () => runCommand('undo'))}
                                        {renderIconButton('Redo', '↷', () => runCommand('redo'))}
                                        <select className="resume-playground-select" defaultValue="Arial" onChange={(event) => runCommand('fontName', event.target.value)}>
                                            {FONT_OPTIONS.map((font) => (
                                                <option key={font} value={font}>{font}</option>
                                            ))}
                                        </select>
                                        <select className="resume-playground-select" defaultValue="3" onChange={(event) => runCommand('fontSize', event.target.value)}>
                                            {FONT_SIZE_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                        {renderIconButton('Title', 'T1', () => runCommand('formatBlock', '<h1>'))}
                                        {renderIconButton('Header', 'H1', () => runCommand('formatBlock', '<h2>'))}
                                        {renderIconButton('Subtitle', 'H2', () => runCommand('formatBlock', '<h3>'))}
                                        {renderIconButton('Body', '¶', () => runCommand('formatBlock', '<p>'))}
                                        {renderIconButton('Bold', 'B', () => runCommand('bold'))}
                                        {renderIconButton('Italic', 'I', () => runCommand('italic'))}
                                        {renderIconButton('Underline', 'U', () => runCommand('underline'))}
                                        <label className="resume-playground-color-picker" title="Color" aria-label="Color">
                                            <span aria-hidden="true">🎨</span>
                                            <input type="color" value={textColor} onInput={(event) => handleTextColorChange(event.target.value)} onChange={(event) => handleTextColorChange(event.target.value)} />
                                        </label>
                                        {renderIconButton('Add New Page', '+', insertPageBreak)}
                                        {renderIconButton('Delete Last Page', '−', removeLastPageBreak)}
                                    </div>

                                    <div className="resume-playground-toolbar-row resume-playground-toolbar-row-scroll">
                                        {renderIconButton('Left', '⇤', () => runCommand('justifyLeft'))}
                                        {renderIconButton('Center', '≣', () => runCommand('justifyCenter'))}
                                        {renderIconButton('Right', '⇥', () => runCommand('justifyRight'))}
                                        {renderIconButton('Justify', '☰', () => runCommand('justifyFull'))}
                                        {renderIconButton('Bullets', '•≣', () => runCommand('insertUnorderedList'))}
                                        {renderIconButton('Numbers', '1≣', () => runCommand('insertOrderedList'))}
                                        {renderIconButton('Link', '🔗', insertLink)}
                                        {renderIconButton('Indent +', '⇢', () => runCommand('indent'))}
                                        {renderIconButton('Indent -', '⇠', () => runCommand('outdent'))}
                                        {renderIconButton('Table', '▦', insertTable)}
                                        {renderIconButton('Divider', '─', () => insertHtml('<hr />'))}
                                        {renderIconButton('Circle', '○', () => insertShape('circle'))}
                                        {renderIconButton('Square', '□', () => insertShape('square'))}
                                        {renderIconButton('Rectangle', '▭', () => insertShape('rectangle'))}
                                        {renderIconButton('Triangle', '△', () => insertShape('triangle'))}
                                        {renderIconButton('Line', '/', () => insertShape('line'))}
                                        {renderIconButton('Print', '🖨', () => handlePrintResume(editorResume))}
                                        {renderIconButton(spellcheckEnabled ? 'Spellcheck On' : 'Spellcheck Off', '✓', () => setSpellcheckEnabled((current) => !current), spellcheckEnabled ? 'is-active' : '')}
                                        {renderIconButton('Clear Format', 'Tx', () => runCommand('removeFormat'))}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="resume-playground-toolbar-row">
                                        <div className="resume-playground-toolbar-group">
                                            {renderIconButton('Undo', '↶', () => runCommand('undo'))}
                                            {renderIconButton('Redo', '↷', () => runCommand('redo'))}
                                        </div>

                                        <div className="resume-playground-toolbar-group resume-playground-toolbar-group-wide">
                                            <select className="resume-playground-select" defaultValue="Arial" onChange={(event) => runCommand('fontName', event.target.value)}>
                                                {FONT_OPTIONS.map((font) => (
                                                    <option key={font} value={font}>{font}</option>
                                                ))}
                                            </select>
                                            <select className="resume-playground-select" defaultValue="3" onChange={(event) => runCommand('fontSize', event.target.value)}>
                                                {FONT_SIZE_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="resume-playground-toolbar-group">
                                            {renderIconButton('Title', 'T1', () => runCommand('formatBlock', '<h1>'))}
                                            {renderIconButton('Header', 'H1', () => runCommand('formatBlock', '<h2>'))}
                                            {renderIconButton('Subtitle', 'H2', () => runCommand('formatBlock', '<h3>'))}
                                            {renderIconButton('Body', '¶', () => runCommand('formatBlock', '<p>'))}
                                        </div>

                                        <div className="resume-playground-toolbar-group">
                                            {renderIconButton('Bold', 'B', () => runCommand('bold'))}
                                            {renderIconButton('Italic', 'I', () => runCommand('italic'))}
                                            {renderIconButton('Underline', 'U', () => runCommand('underline'))}
                                            <label className="resume-playground-color-picker" title="Color" aria-label="Color">
                                                <span aria-hidden="true">🎨</span>
                                                <input type="color" value={textColor} onChange={(event) => handleTextColorChange(event.target.value)} />
                                            </label>
                                        </div>
                                    </div>

                                    <div className="resume-playground-toolbar-row">
                                        <div className="resume-playground-toolbar-group">
                                            {renderIconButton('Left', '⇤', () => runCommand('justifyLeft'))}
                                            {renderIconButton('Center', '≣', () => runCommand('justifyCenter'))}
                                            {renderIconButton('Right', '⇥', () => runCommand('justifyRight'))}
                                            {renderIconButton('Justify', '☰', () => runCommand('justifyFull'))}
                                        </div>

                                        <div className="resume-playground-toolbar-group">
                                            {renderIconButton('Indent +', '⇢', () => runCommand('indent'))}
                                            {renderIconButton('Indent -', '⇠', () => runCommand('outdent'))}
                                            {renderIconButton('Bullets', '•≣', () => runCommand('insertUnorderedList'))}
                                            {renderIconButton('Numbers', '1≣', () => runCommand('insertOrderedList'))}
                                        </div>

                                        <div className="resume-playground-toolbar-group">
                                            {renderIconButton('Table', '▦', insertTable)}
                                            {renderIconButton('Link', '🔗', insertLink)}
                                            {renderIconButton('Divider', '━', () => insertHtml('<hr />'))}
                                        </div>

                                        <div className="resume-playground-toolbar-group">
                                            {renderIconButton('Circle', '○', () => insertShape('circle'))}
                                            {renderIconButton('Square', '□', () => insertShape('square'))}
                                            {renderIconButton('Rectangle', '▭', () => insertShape('rectangle'))}
                                            {renderIconButton('Triangle', '△', () => insertShape('triangle'))}
                                            {renderIconButton('Line', '／', () => insertShape('line'))}
                                        </div>
                                    </div>

                                    <div className="resume-playground-toolbar-row">
                                        <div className="resume-playground-toolbar-group">
                                            {renderIconButton('Add New Page', '+', insertPageBreak)}
                                            {renderIconButton('Delete Last Page', '−', removeLastPageBreak)}
                                        </div>

                                        <div className="resume-playground-toolbar-group">
                                            {renderIconButton('Print', '🖨', () => handlePrintResume(editorResume))}
                                            {renderIconButton(spellcheckEnabled ? 'Spellcheck On' : 'Spellcheck Off', '✓', () => setSpellcheckEnabled((current) => !current), spellcheckEnabled ? 'is-active' : '')}
                                            {renderIconButton('Clear Format', 'Tx', () => runCommand('removeFormat'))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {!isMobileViewport && (isDocumentMode ? signaturePanel : atsPanel)}
                    </div>

                    {!isDocumentMode && showAtsDetails && atsScanResult && (
                        <div className="resume-playground-ats-details">
                            <div className="resume-playground-ats-details-section">
                                <h4>ATS score summary</h4>
                                <p>
                                    {atsScanResult.score}% — {atsScanResult.label}
                                </p>
                            </div>

                            {atsScanResult.missingCritical.length > 0 && (
                                <div className="resume-playground-ats-details-section">
                                    <h4>Important items missing</h4>
                                    <ul>
                                        {atsScanResult.missingCritical.map((item) => (
                                            <li key={item}>{item}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {atsScanResult.improvements.length > 0 && (
                                <div className="resume-playground-ats-details-section">
                                    <h4>What you can improve</h4>
                                    <ul>
                                        {atsScanResult.improvements.map((item) => (
                                            <li key={item}>{item}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {atsScanResult.strengths.length > 0 && (
                                <div className="resume-playground-ats-details-section">
                                    <h4>What is already working well</h4>
                                    <ul>
                                        {atsScanResult.strengths.map((item) => (
                                            <li key={item}>{item}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    <div
                        ref={editorCanvasRef}
                        className="resume-playground-editor-canvas"
                        onTouchStart={handleEditorCanvasTouchStart}
                        onTouchMove={handleEditorCanvasTouchMove}
                        onTouchEnd={handleEditorCanvasTouchEnd}
                        onTouchCancel={handleEditorCanvasTouchEnd}
                    >
                        <div
                            className="resume-playground-editor-workbench"
                            style={isMobileViewport ? { '--resume-mobile-editor-zoom': mobileEditorZoom } : undefined}
                        >
                            {Array.from({ length: editorPageCount }).map((_, index) => (
                                <React.Fragment key={`page-rulers-${index}`}>
                                    <div
                                        className="resume-playground-ruler resume-playground-ruler-horizontal"
                                        style={{ top: `${index * editorPageStride}px` }}
                                        onPointerDown={(event) => startRulerDrag('horizontal', index, event)}
                                    >
                                        <div className="resume-playground-ruler-ticks" />
                                        <div className="resume-playground-ruler-labels">
                                            {Array.from({ length: 7 }).map((__, labelIndex) => (
                                                <span key={`hr-${index}-${labelIndex}`}>{labelIndex + 1}</span>
                                            ))}
                                        </div>
                                        <div
                                            className="resume-playground-ruler-indicator resume-playground-ruler-indicator-horizontal"
                                            style={{ left: `${(editorPageMargins[index] || editorMargins).left}px` }}
                                        />
                                    </div>

                                    <div
                                        className="resume-playground-ruler resume-playground-ruler-vertical"
                                        style={{
                                            top: `${(index * editorPageStride) + RULER_SIZE}px`,
                                            height: `${A4_PAGE_HEIGHT}px`
                                        }}
                                        onPointerDown={(event) => startRulerDrag('vertical', index, event)}
                                    >
                                        <div className="resume-playground-ruler-ticks" />
                                        <div className="resume-playground-ruler-labels">
                                            {Array.from({ length: 9 }).map((__, labelIndex) => (
                                                <span key={`vr-${index}-${labelIndex}`}>{labelIndex + 1}</span>
                                            ))}
                                        </div>
                                        <div
                                            className="resume-playground-ruler-indicator resume-playground-ruler-indicator-vertical"
                                            style={{ top: `${(editorPageMargins[index] || editorMargins).top}px` }}
                                        />
                                    </div>
                                </React.Fragment>
                            ))}

                            <div className="resume-playground-editor-page-frame">
                                <div className="resume-playground-editor-pages-stack" style={{ minHeight: `${editorDocumentHeight}px`, width: `${A4_PAGE_WIDTH}px` }}>
                            {Array.from({ length: editorPageCount }).map((_, index) => (
                                <div
                                    key={`page-${index}`}
                                    className="resume-playground-editor-page-layer"
                                    style={{ top: `${index * editorPageStride}px`, height: `${A4_PAGE_HEIGHT}px` }}
                                />
                            ))}
                            <div
                                ref={editorRef}
                                className={`resume-playground-editor-document${editorResume?.source === 'scratch' || editorResume?.source === 'upload' ? ' is-plain-mode' : ''}${editorResume?.source === 'ai-tailor' ? ' is-ai-tailor-mode' : ''}`}
                                contentEditable
                                suppressContentEditableWarning
                                spellCheck={spellcheckEnabled}
                                style={{
                                    minHeight: `${editorDocumentHeight}px`,
                                    padding: `${editorMargins.top}px ${A4_RIGHT_PADDING}px ${A4_BOTTOM_PADDING}px ${editorMargins.left}px`,
                                    color: DEFAULT_TEXT_COLOR,
                                    WebkitTextFillColor: DEFAULT_TEXT_COLOR,
                                    caretColor: textColor
                                }}
                                onInput={handleEditorInput}
                                onBeforeInput={handleEditorBeforeInput}
                                onBlur={saveSelection}
                                onKeyDown={handleEditorKeyDown}
                                onKeyUp={saveSelection}
                                onMouseUp={saveSelection}
                                onFocus={saveSelection}
                            />
                                </div>
                            </div>
                        </div>
                    </div>
                        </div>
                    );

                    return isMobileViewport && typeof document !== 'undefined'
                        ? createPortal(
                            <div className="resume-playground-editor-mobile-overlay">
                                {shell}
                            </div>,
                            document.body
                        )
                        : shell;
                })()
            ) : (
                <>
                    {editorResume && editorSuspended && !isMobileViewport && (
                        <div className="resume-playground-open-session">
                            <span>{`${editorResume.name || resourceLabel} is still open.`}</span>
                            <button
                                type="button"
                                className="settings-button primary"
                                onClick={() => {
                                    setEditorSuspended(false);
                                    clearMessages();
                                }}
                            >
                                {`Return to ${resourceLabel} Editor`}
                            </button>
                        </div>
                    )}
                    {activeTab === 'create' && (
                        <div className="resume-playground-panel">
                            <div className="resume-playground-choice-grid">
                                <button type="button" className="resume-playground-choice-card" onClick={handleStartScratch}>
                                    <strong>Create from scratch</strong>
                                    <span>{`Open a full ${resourceLabel.toLowerCase()} editor and start with a clean page.`}</span>
                                </button>
                                <button
                                    type="button"
                                    className="resume-playground-choice-card"
                                    onClick={() => uploadInputRef.current?.click()}
                                >
                                    <strong>{`Upload ${resourceLabel.toLowerCase()} to edit`}</strong>
                                    <span>{`Convert a PDF, DOCX, or TXT ${resourceLabel.toLowerCase()} into editable content.`}</span>
                                </button>
                                {!isDocumentMode && (
                                    <button
                                        type="button"
                                        className="resume-playground-choice-card resume-playground-ai-choice-card"
                                        onClick={handleOpenTailor}
                                    >
                                        <strong>Let AI Tailor it?</strong>
                                        <span>Generate 10 ATS-friendly or designed resume styles from your profile, then edit your pick.</span>
                                    </button>
                                )}
                                {isDocumentMode && (
                                    <button
                                        type="button"
                                        className="resume-playground-choice-card resume-playground-ai-choice-card"
                                        onClick={handleOpenDocumentTemplates}
                                    >
                                        <strong>Let JumpTake Create</strong>
                                        <span>Choose from 10 editable company document templates, then refine the one you need.</span>
                                    </button>
                                )}
                            </div>

                            <input
                                ref={uploadInputRef}
                                type="file"
                                className="profile-resume-input"
                                accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                                onChange={handleUploadResume}
                            />
                            {!isDocumentMode && (
                                <input
                                    ref={aiPhotoInputRef}
                                    type="file"
                                    className="profile-resume-input"
                                    accept="image/*"
                                    onChange={handleTailorPhotoUpload}
                                />
                            )}

                            {uploading && (
                                <div className="resume-playground-uploading">
                                    {`Reading your ${resourceLabel.toLowerCase()} and converting it into editable content...`}
                                </div>
                            )}

                            {tailorStep && (
                                <div className="resume-playground-ai-tailor-panel">
                                    <div className="resume-playground-ai-tailor-header">
                                        <div>
                                            <h3>{isDocumentMode ? 'Let JumpTake Create' : 'Let AI Tailor it?'}</h3>
                                            <p>
                                                {isDocumentMode
                                                    ? 'Choose a document template, preview the layout, then open it in the editor.'
                                                    : 'Choose a resume type, preview 10 generated styles, then open the one you like in the editor.'}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            className="resume-playground-tool-button"
                                            onClick={() => {
                                                setTailorStep('');
                                                setTailorTemplates([]);
                                            }}
                                        >
                                            Close
                                        </button>
                                    </div>

                                    {!isDocumentMode && tailorStep === 'choose' && (
                                        <div className="resume-playground-choice-grid resume-playground-ai-choice-grid">
                                            <button type="button" className="resume-playground-choice-card" onClick={() => generateTailorTemplates('ats')}>
                                                <strong>Tailor ATS Friendly Resume</strong>
                                                <span>Simple readable layouts with clear sections, bullets, contact details, skills, experience, and education.</span>
                                            </button>
                                            <button type="button" className="resume-playground-choice-card" onClick={handleGeneralTailorChoice}>
                                                <strong>General Resume</strong>
                                                <span>Designed resume templates with color blocks and an optional photo, built from your profile sections.</span>
                                            </button>
                                        </div>
                                    )}

                                    {!isDocumentMode && tailorStep === 'general-photo' && (
                                        <div className="resume-playground-ai-photo-panel">
                                            <h4>Add a photo to the general resume?</h4>
                                            <p>You can upload a photo for the template preview, or skip it and use a clean initial badge instead.</p>
                                            <div className="resume-playground-ai-photo-actions">
                                                <button
                                                    type="button"
                                                    className="settings-button primary"
                                                    onClick={() => aiPhotoInputRef.current?.click()}
                                                    disabled={tailorPhotoProcessing}
                                                >
                                                    {tailorPhotoProcessing ? 'Preparing Photo...' : 'Upload Photo'}
                                                </button>
                                                <button type="button" className="settings-button secondary" onClick={handleSkipTailorPhoto}>
                                                    Skip Photo
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {tailorTemplates.length > 0 && (
                                        <div className="resume-playground-template-grid resume-playground-ai-template-grid">
                                            {tailorTemplates.map((template) => (
                                                <article className="resume-playground-template-card" key={template.id}>
                                                    <div className="resume-playground-template-preview">
                                                        <div
                                                            className="resume-playground-template-preview-scale"
                                                            dangerouslySetInnerHTML={{ __html: template.html }}
                                                        />
                                                    </div>
                                                    <div className="resume-playground-template-copy">
                                                        <h4>{template.label}</h4>
                                                        <p>{template.description}</p>
                                                    </div>
                                                    <div className="resume-playground-ai-template-actions">
                                                        <button type="button" className="settings-button primary" onClick={() => handleUseTailorTemplate(template)}>
                                                            Use This Style
                                                        </button>
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'edit' && (
                        <div className="resume-playground-panel">
                            <div className="resume-playground-edit-header">
                                <div>
                                    <h3>{`Edit a saved ${resourceLabel.toLowerCase()}`}</h3>
                                    <p>{`Open a saved session or upload a ${resourceLabel.toLowerCase()} file to convert it into editable content.`}</p>
                                </div>
                                <button type="button" className="settings-button primary" onClick={() => uploadInputRef.current?.click()}>
                                    {`Upload ${resourceLabel.toLowerCase()} to edit`}
                                </button>
                            </div>
                            <input
                                ref={uploadInputRef}
                                type="file"
                                className="profile-resume-input"
                                accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                                onChange={handleUploadResume}
                            />
                            {savedResumes.length > 0 ? (
                                <div className="resume-playground-saved-grid">
                                    {savedResumes.map((resume) => renderSavedResumeCard(resume))}
                                </div>
                            ) : (
                                <div className="resume-playground-empty">
                                    {`No saved ${resourceLabelPlural} yet. Start from scratch or upload a ${resourceLabel.toLowerCase()} to edit.`}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'saved' && (
                        <div className="resume-playground-panel">
                            <div className="resume-playground-edit-header">
                                <div>
                                    <h3>{`Saved ${resourceLabelPlural}`}</h3>
                                    <p>{`Rename, duplicate, reopen, export, or remove your saved ${resourceLabel.toLowerCase()} sessions.`}</p>
                                </div>
                            </div>
                            {savedResumes.length > 0 ? (
                                <div className="resume-playground-saved-grid">
                                    {savedResumes.map((resume) => renderSavedResumeCard(resume, true))}
                                </div>
                            ) : (
                                <div className="resume-playground-empty">
                                    {`You do not have any saved ${resourceLabelPlural} yet.`}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            <div className="page-footer-actions">
                <button className="back-button responsive-back-button" onClick={onFooterBack}>
                    Back
                </button>
            </div>
        </div>
    );
};

export default ResumePlayground;
