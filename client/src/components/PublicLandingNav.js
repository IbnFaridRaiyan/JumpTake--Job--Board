import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import ProfileAvatar from './ProfileAvatar';
import SocialAuthButtons from './SocialAuthButtons';
import defaultJobPostAvatar from './media/default-job-post-avatar.png';
import logoDark from './media/logo4.png';
import { sendPasswordResetEmail, validateEmailAddress } from '../utils/emailVerification';
import { persistCandidateSession, persistEmployerSession } from '../utils/authStorage';

const PublicLandingIcon = ({ name, className = '' }) => {
    if (name === 'candidate') {
        return (
            <svg className={className || 'public-choice-icon public-choice-icon-candidate'} viewBox="0 0 16 16" aria-hidden="true">
                <path d="M8 3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M6 6.75v8.5a.75.75 0 0 0 1.5 0V10.5a.5.5 0 0 1 1 0v4.75a.75.75 0 0 0 1.5 0v-8.5a.25.25 0 1 1 .5 0v2.5a.75.75 0 0 0 1.5 0V6.5a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v2.75a.75.75 0 0 0 1.5 0v-2.5a.25.25 0 0 1 .5 0" />
            </svg>
        );
    }

    if (name === 'employer') {
        return (
            <svg className={className || 'public-choice-icon public-choice-icon-employer'} viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4 2.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5zm3.5-.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5zM4 5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5zM7.5 5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5zm2.5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5zM4.5 8a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5zm2.5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5zm3.5-.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5z" />
                <path d="M2 1a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1zm11 0H3v14h3v-2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V15h3z" />
            </svg>
        );
    }

    if (name === 'search') {
        return (
            <svg className={className || 'public-landing-icon public-landing-icon-search'} viewBox="0 0 24 24" aria-hidden="true">
                <path d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
            </svg>
        );
    }

    if (name === 'register') {
        return (
            <svg className={className || 'public-landing-icon public-landing-icon-register'} viewBox="0 0 16 16" aria-hidden="true">
                <path d="M6 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H1s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C9.516 10.68 8.289 10 6 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z" />
                <path d="M13.5 5a.5.5 0 0 1 .5.5V7h1.5a.5.5 0 0 1 0 1H14v1.5a.5.5 0 0 1-1 0V8h-1.5a.5.5 0 0 1 0-1H13V5.5a.5.5 0 0 1 .5-.5" />
            </svg>
        );
    }

    if (name === 'jobs') {
        return (
            <svg className={className || 'public-landing-icon public-landing-icon-jobs'} viewBox="0 0 16 16" aria-hidden="true">
                <path fillRule="evenodd" d="M2 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zM1 4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1zm7.5.5a.5.5 0 0 0-1 0v7a.5.5 0 0 0 1 0zM2 5.5a.5.5 0 0 1 .5-.5H6a.5.5 0 0 1 0 1H2.5a.5.5 0 0 1-.5-.5m0 2a.5.5 0 0 1 .5-.5H6a.5.5 0 0 1 0 1H2.5a.5.5 0 0 1-.5-.5m0 2a.5.5 0 0 1 .5-.5H6a.5.5 0 0 1 0 1H2.5a.5.5 0 0 1-.5-.5M10.5 5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5zM13 8h-2V6h2z" />
            </svg>
        );
    }

    return (
        <svg className={className || 'public-landing-icon public-landing-icon-home'} viewBox="0 0 24 24" aria-hidden="true">
            <path d="m4 12 8-8 8 8M6 10.5V19a1 1 0 0 0 1 1h3v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h3a1 1 0 0 0 1-1v-8.5" />
        </svg>
    );
};

const PublicAuthFieldIcon = ({ type }) => {
    if (type === 'password') {
        return (
            <svg className="public-auth-input-icon" viewBox="0 0 500 500" aria-hidden="true">
                <path d="M80 192V144C80 64.47 144.5 0 224 0C303.5 0 368 64.47 368 144V192H384C419.3 192 448 220.7 448 256V448C448 483.3 419.3 512 384 512H64C28.65 512 0 483.3 0 448V256C0 220.7 28.65 192 64 192H80zM144 192H304V144C304 99.82 268.2 64 224 64C179.8 64 144 99.82 144 144V192z" />
            </svg>
        );
    }

    return (
        <svg className="public-auth-input-icon" viewBox="0 0 500 500" aria-hidden="true">
            <path d="M207.8 20.73c-93.45 18.32-168.7 93.66-187 187.1c-27.64 140.9 68.65 266.2 199.1 285.1c19.01 2.888 36.17-12.26 36.17-31.49l.0001-.6631c0-15.74-11.44-28.88-26.84-31.24c-84.35-12.98-149.2-86.13-149.2-174.2c0-102.9 88.61-185.5 193.4-175.4c91.54 8.869 158.6 91.25 158.6 183.2l0 16.16c0 22.09-17.94 40.05-40 40.05s-40.01-17.96-40.01-40.05v-120.1c0-8.847-7.161-16.02-16.01-16.02l-31.98 .0036c-7.299 0-13.2 4.992-15.12 11.68c-24.85-12.15-54.24-16.38-86.06-5.106c-38.75 13.73-68.12 48.91-73.72 89.64c-9.483 69.01 43.81 128 110.9 128c26.44 0 50.43-9.544 69.59-24.88c24 31.3 65.23 48.69 109.4 37.49C465.2 369.3 496 324.1 495.1 277.2V256.3C495.1 107.1 361.2-9.332 207.8 20.73zM239.1 304.3c-26.47 0-48-21.56-48-48.05s21.53-48.05 48-48.05s48 21.56 48 48.05S266.5 304.3 239.1 304.3z" />
        </svg>
    );
};

const BackArrowButton = ({ onClick, label = 'Back' }) => (
    <button type="button" className="public-auth-arrow-button" onClick={onClick} aria-label={label} title={label}>
        <svg viewBox="0 0 16 16" aria-hidden="true">
            <path
                fillRule="evenodd"
                d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"
            />
        </svg>
    </button>
);

const PublicSparkSearchIcon = () => (
    <svg className="public-ai-search-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M11.5 6C11.3949 6.00006 11.2925 5.96705 11.2073 5.90565C11.1221 5.84425 11.0583 5.75758 11.0251 5.65792L10.7623 4.86908C10.6623 4.57101 10.4288 4.33629 10.13 4.23693L9.34102 3.97354C9.24166 3.94019 9.1553 3.87649 9.09411 3.79142C9.03292 3.70635 9 3.60421 9 3.49943C9 3.39465 9.03292 3.29252 9.09411 3.20745C9.1553 3.12238 9.24166 3.05867 9.34102 3.02532L10.13 2.76193C10.4282 2.66191 10.663 2.42852 10.7623 2.12979L11.0258 1.34094C11.0591 1.24161 11.1229 1.15526 11.2079 1.09409C11.293 1.03291 11.3952 1 11.5 1C11.6048 1 11.707 1.03291 11.7921 1.09409C11.8771 1.15526 11.9409 1.24161 11.9742 1.34094L12.2377 2.12979C12.2868 2.27697 12.3695 2.4107 12.4792 2.52041C12.589 2.63013 12.7227 2.71281 12.87 2.76193L13.659 3.02532C13.7583 3.05867 13.8447 3.12238 13.9059 3.20745C13.9671 3.29252 14 3.39465 14 3.49943C14 3.60421 13.9671 3.70635 13.9059 3.79142C13.8447 3.87649 13.7583 3.94019 13.659 3.97354L12.87 4.23693C12.5718 4.33696 12.337 4.57034 12.2377 4.86908L11.9742 5.65792C11.9411 5.75747 11.8774 5.84406 11.7923 5.90545C11.7072 5.96684 11.6049 5.99992 11.5 6Z"
        />
        <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M6 13C5.85133 13.0001 5.7069 12.9504 5.58969 12.859C5.47247 12.7675 5.38921 12.6395 5.35313 12.4952L5.12388 11.5745C4.91418 10.7391 4.26198 10.0868 3.42674 9.87703L2.50619 9.64774C2.36169 9.61194 2.23333 9.52878 2.14159 9.41151C2.04985 9.29425 2 9.14964 2 9.00075C2 8.85185 2.04985 8.70724 2.14159 8.58998C2.23333 8.47272 2.36169 8.38955 2.50619 8.35376L3.42674 8.12446C4.26198 7.91473 4.91418 7.2624 5.12388 6.427L5.35313 5.50629C5.38892 5.36176 5.47207 5.23338 5.58931 5.14162C5.70655 5.04986 5.85113 5 6 5C6.14887 5 6.29345 5.04986 6.41069 5.14162C6.52793 5.23338 6.61108 5.36176 6.64687 5.50629L6.87612 6.427C6.97865 6.83721 7.19071 7.21184 7.48965 7.51082C7.78858 7.80981 8.16313 8.02192 8.57326 8.12446L9.49381 8.35376C9.63831 8.38955 9.76667 8.47272 9.85841 8.58998C9.95015 8.70724 10 8.85185 10 9.00075C10 9.14964 9.95015 9.29425 9.85841 9.41151C9.76667 9.52878 9.63831 9.61194 9.49381 9.64774L8.57326 9.87703C8.16313 9.97957 7.78858 10.1917 7.48965 10.4907C7.19071 10.7897 6.97865 11.1643 6.87612 11.5745L6.64687 12.4952C6.61079 12.6395 6.52753 12.7675 6.41031 12.859C6.2931 12.9504 6.14867 13.0001 6 13Z"
        />
        <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M13.5005 23C13.3376 23 13.1791 22.9469 13.049 22.8487C12.9189 22.7505 12.8243 22.6127 12.7795 22.456L11.9665 19.61C11.7915 18.9971 11.4631 18.4389 11.0124 17.9882C10.5616 17.5374 10.0035 17.209 9.39054 17.034L6.54454 16.221C6.38795 16.1761 6.25021 16.0815 6.15216 15.9514C6.05411 15.8214 6.00108 15.6629 6.00108 15.5C6.00108 15.3371 6.05411 15.1786 6.15216 15.0486C6.25021 14.9185 6.38795 14.8239 6.54454 14.779L9.39054 13.966C10.0035 13.791 10.5616 13.4626 11.0124 13.0118C11.4631 12.5611 11.7915 12.0029 11.9665 11.39L12.7795 8.544C12.8244 8.38741 12.919 8.24967 13.0491 8.15162C13.1792 8.05357 13.3376 8.00054 13.5005 8.00054C13.6634 8.00054 13.8219 8.05357 13.952 8.15162C14.0821 8.24967 14.1767 8.38741 14.2215 8.544L15.0345 11.39C15.2096 12.0029 15.538 12.5611 15.9887 13.0118C16.4394 13.4626 16.9976 13.791 17.6105 13.966L20.4565 14.779C20.6131 14.8239 20.7509 14.9185 20.8489 15.0486C20.947 15.1786 21 15.3371 21 15.5C21 15.6629 20.947 15.8214 20.8489 15.9514C20.7509 16.0815 20.6131 16.1761 20.4565 16.221L17.6105 17.034C16.9976 17.209 16.4394 17.5374 15.9887 17.9882C15.538 18.4389 15.2096 18.9971 15.0345 19.61L14.2215 22.456C14.1768 22.6127 14.0822 22.7505 13.9521 22.8487C13.822 22.9469 13.6635 23 13.5005 23Z"
        />
    </svg>
);

const PublicSettingsIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
            d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
        />
        <path
            d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
        />
    </svg>
);

const PublicTerminalIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
            d="M7 15L10 12L7 9M13 15H17M7.8 21H16.2C17.8802 21 18.7202 21 19.362 20.673C19.9265 20.3854 20.3854 19.9265 20.673 19.362C21 18.7202 21 17.8802 21 16.2V7.8C21 6.11984 21 5.27976 20.673 4.63803C20.3854 4.07354 19.9265 3.6146 19.362 3.32698C18.7202 3 17.8802 3 16.2 3H7.8C6.11984 3 5.27976 3 4.63803 3.32698C4.07354 3.6146 3.6146 4.07354 3.32698 4.63803C3 5.27976 3 6.11984 3 7.8V16.2C3 17.8802 3 18.7202 3.32698 19.362C3.6146 19.9265 4.07354 20.3854 4.63803 20.673C5.27976 21 6.11984 21 7.8 21Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const getPublicJobApplications = (job) => {
    if (Array.isArray(job?.applications)) {
        return job.applications;
    }

    if (Array.isArray(job?.applicants)) {
        return job.applicants;
    }

    return [];
};

const getPublicJobSkills = (job) => {
    if (!Array.isArray(job?.skills)) {
        return [];
    }

    return job.skills
        .flatMap((skill) => Array.isArray(skill) ? skill : [skill])
        .map((skill) => String(skill || '').trim())
        .filter(Boolean);
};

const getPublicJobLikeCount = (job) => {
    if (typeof job?.likes === 'number') {
        return job.likes;
    }

    if (Array.isArray(job?.likes)) {
        return job.likes.length;
    }

    return 0;
};

const formatAssistantTime = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const formatPublicSalary = (salary) => {
    if (salary === null || salary === undefined || salary === '') {
        return 'Salary not listed';
    }

    return String(salary);
};

const PublicLoginDialog = ({ apiBase, onClose, onOpenRegister, onSuccessCandidate, onSuccessEmployer }) => {
    const [mode, setMode] = useState('login');
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [resetEmail, setResetEmail] = useState('');
    const [message, setMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const resetState = () => {
        setMode('login');
        setIdentifier('');
        setPassword('');
        setResetEmail('');
        setMessage('');
        setIsSuccess(false);
    };

    const tryLogin = async ({ endpoint, payload }) => {
        const response = await fetch(`${apiBase}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            throw new Error('JumpTake login is warming up. Please try again in a moment.');
        }

        const data = await response.json();
        return { ok: response.ok, data };
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const trimmedIdentifier = identifier.trim();
        if (!trimmedIdentifier || !password) {
            setMessage('Please fill in every field.');
            setIsSuccess(false);
            return;
        }

        setIsLoading(true);
        setMessage('');
        setIsSuccess(false);

        try {
            const loginAttempts = trimmedIdentifier.includes('@')
                ? [
                    { type: 'candidate', endpoint: '/api/login', payload: { email: trimmedIdentifier, password } },
                    { type: 'employer', endpoint: '/api/employer/login', payload: { username: trimmedIdentifier, password } }
                ]
                : [
                    { type: 'employer', endpoint: '/api/employer/login', payload: { username: trimmedIdentifier, password } },
                    { type: 'candidate', endpoint: '/api/login', payload: { email: trimmedIdentifier, password } }
                ];

            let loggedInType = '';
            let data = null;
            let lastError = 'Login failed';

            for (const attempt of loginAttempts) {
                const result = await tryLogin(attempt);
                if (result.ok) {
                    loggedInType = attempt.type;
                    data = result.data;
                    break;
                }
                lastError = result.data?.error || lastError;
            }

            if (!loggedInType || !data) {
                throw new Error(lastError);
            }

            if (loggedInType === 'employer') {
                persistEmployerSession({
                    token: data.token,
                    employer: {
                        id: data.employer.id,
                        username: data.employer.username,
                        companyId: data.employer.companyId,
                        companyName: data.employer.companyName
                    }
                });
            } else {
                persistCandidateSession({
                    token: data.token,
                    user: {
                        id: data.user.id,
                        email: data.user.email,
                        jobSeekerId: data.user.jobSeekerId,
                        jobInterests: data.user.jobInterests || [],
                        jumptakeId: data.user.jumptakeId || null
                    }
                });
            }

            setIsSuccess(true);
            setMessage('Login successful!');

            window.setTimeout(() => {
                if (loggedInType === 'employer') {
                    onSuccessEmployer();
                } else {
                    onSuccessCandidate();
                }
            }, 650);
        } catch (error) {
            setMessage(error.message || 'Login failed');
            setIsSuccess(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async (event) => {
        event.preventDefault();

        const normalizedEmail = resetEmail.trim().toLowerCase();

        if (!validateEmailAddress(normalizedEmail)) {
            setMessage('Please enter a valid email address to receive a reset link.');
            setIsSuccess(false);
            return;
        }

        try {
            setIsLoading(true);
            setMessage('');
            setIsSuccess(false);

            const response = await fetch(`${apiBase}/api/password-reset/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: normalizedEmail,
                    accountType: 'candidate',
                    origin: window.location.origin
                })
            });

            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                throw new Error('JumpTake password reset is warming up. Please try again in a moment.');
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to prepare the password reset link.');
            }

            if (!data.resetUrl) {
                throw new Error('No password reset link was generated for this email address.');
            }

            await sendPasswordResetEmail({
                email: normalizedEmail,
                recipientName: data.recipientName || normalizedEmail.split('@')[0],
                resetUrl: data.resetUrl,
                accountType: 'candidate'
            });

            setMessage('A password reset link has been sent to your email.');
            setIsSuccess(true);
        } catch (error) {
            setMessage(error.message || 'Failed to send password reset email.');
            setIsSuccess(false);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="public-landing-modal-backdrop" role="presentation" onMouseDown={onClose}>
            <section className="public-auth-card" role="dialog" aria-modal="true" aria-label="Log in to JumpTake" onMouseDown={(event) => event.stopPropagation()}>
                <div className="public-auth-form-shell">
                    {mode === 'login' ? (
                        <form className="public-auth-form" onSubmit={handleSubmit}>
                            <h4 className="public-auth-heading">Log In!</h4>
                            <div className="public-auth-field">
                                <PublicAuthFieldIcon type="identifier" />
                                <input
                                    className="public-auth-input"
                                    placeholder="Email or Username"
                                    type="text"
                                    value={identifier}
                                    onChange={(event) => setIdentifier(event.target.value)}
                                />
                            </div>
                            <div className="public-auth-field">
                                <PublicAuthFieldIcon type="password" />
                                <input
                                    className="public-auth-input"
                                    placeholder="Password"
                                    type="password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                />
                            </div>
                            <button type="submit" className="public-auth-submit" disabled={isLoading}>
                                {isLoading ? 'Submitting...' : 'Login'}
                            </button>
                            <SocialAuthButtons role="candidate" onError={(errorMessage) => {
                                setMessage(errorMessage);
                                setIsSuccess(false);
                            }} />
                            <button
                                type="button"
                                className="public-auth-link"
                                onClick={() => {
                                    setMode('forgot');
                                    setResetEmail(identifier.includes('@') ? identifier : '');
                                    setMessage('');
                                    setIsSuccess(false);
                                }}
                            >
                                Forgot your password?
                            </button>
                            <button type="button" className="public-auth-secondary-link" onClick={onOpenRegister}>Sign up</button>
                        </form>
                    ) : (
                        <form className="public-auth-form" onSubmit={handleForgotPassword}>
                            <h4 className="public-auth-heading">Reset Password</h4>
                            <div className="public-auth-field">
                                <PublicAuthFieldIcon type="identifier" />
                                <input
                                    className="public-auth-input"
                                    placeholder="Candidate account email"
                                    type="email"
                                    value={resetEmail}
                                    onChange={(event) => setResetEmail(event.target.value)}
                                />
                            </div>
                            <button type="submit" className="public-auth-submit" disabled={isLoading}>
                                {isLoading ? 'Sending...' : 'Send Reset Link'}
                            </button>
                            <button
                                type="button"
                                className="public-auth-secondary-link"
                                onClick={() => {
                                    setMode('login');
                                    setMessage('');
                                    setIsSuccess(false);
                                }}
                            >
                                Back to login
                            </button>
                        </form>
                    )}
                    <BackArrowButton onClick={() => { resetState(); onClose(); }} label="Close login options" />
                    {message ? (
                        <p className={`public-auth-message ${isSuccess ? 'is-success' : 'is-error'}`}>{message}</p>
                    ) : null}
                </div>
            </section>
        </div>
    );
};

const PublicRegisterDialog = ({ onClose, onCandidate, onEmployer }) => (
    <div className="public-landing-modal-backdrop" role="presentation" onMouseDown={onClose}>
        <section className="public-auth-card is-register" role="dialog" aria-modal="true" aria-label="Create a JumpTake account" onMouseDown={(event) => event.stopPropagation()}>
            <div className="public-auth-form-shell">
                <h4 className="public-auth-heading">Join Us!</h4>
                <div className="public-auth-form public-auth-register-actions">
                    <button type="button" className="public-auth-submit" onClick={onCandidate}>Start as Candidate</button>
                    <button type="button" className="public-auth-submit" onClick={onEmployer}>Start as Employer</button>
                </div>
                <BackArrowButton onClick={onClose} label="Close account creation options" />
            </div>
        </section>
    </div>
);

const PublicLandingNav = () => {
    const navigate = useNavigate();
    const apiBase = useMemo(() => (
        process.env.REACT_APP_API_URL || (
            typeof window !== 'undefined' && window.location.hostname === 'localhost'
                ? 'http://localhost:5000'
                : ''
        )
    ), []);
    const [activeModal, setActiveModal] = useState('');
    const [jobs, setJobs] = useState([]);
    const [jobsLoading, setJobsLoading] = useState(false);
    const [jobsError, setJobsError] = useState('');
    const [assistantInput, setAssistantInput] = useState('');
    const [assistantLoading, setAssistantLoading] = useState(false);
    const [assistantMessages, setAssistantMessages] = useState([]);
    const [assistantSettingsOpen, setAssistantSettingsOpen] = useState(false);
    const visibleJobs = jobs;
    const assistantStarted = assistantMessages.length > 0;

    const clearPublicModalHash = () => {
        if (typeof window === 'undefined') {
            return;
        }

        if (['#login', '#register'].includes(window.location.hash.toLowerCase())) {
            window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
        }
    };

    const closeActiveModal = () => {
        setActiveModal('');
        clearPublicModalHash();
    };

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        const openModalFromHash = () => {
            const hash = window.location.hash.toLowerCase();

            if (hash === '#login') {
                setActiveModal('login-choice');
            } else if (hash === '#register') {
                setActiveModal('register-choice');
            }
        };

        openModalFromHash();
        window.addEventListener('hashchange', openModalFromHash);

        return () => window.removeEventListener('hashchange', openModalFromHash);
    }, []);

    useEffect(() => {
        if (activeModal === 'assistant') {
            setAssistantSettingsOpen(false);
        }
    }, [activeModal]);

    useEffect(() => {
        if (!activeModal || typeof document === 'undefined') {
            return undefined;
        }

        const previousBodyOverflow = document.body.style.overflow;
        const previousDocumentOverflow = document.documentElement.style.overflow;

        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousBodyOverflow;
            document.documentElement.style.overflow = previousDocumentOverflow;
        };
    }, [activeModal]);

    useEffect(() => {
        if (activeModal !== 'jobs' || jobs.length) {
            return;
        }

        const loadJobs = async () => {
            setJobsLoading(true);
            setJobsError('');
            try {
                const response = await fetch(`${apiBase}/api/jobs`);
                const contentType = response.headers.get('content-type') || '';
                if (!contentType.includes('application/json')) {
                    throw new Error('The job feed is waking up. Please try again in a moment.');
                }
                const data = await response.json();
                setJobs(Array.isArray(data) ? data.filter((job) => job.active !== false) : []);
            } catch (error) {
                setJobs([]);
                setJobsError(error.message || 'The job feed is waking up. Please try again in a moment.');
            } finally {
                setJobsLoading(false);
            }
        };

        loadJobs();
    }, [activeModal, apiBase, jobs.length]);

    const executeAction = (action) => {
        if (action === 'candidate-register') {
            setActiveModal('');
            navigate('/job-seeker');
        } else if (action === 'employer-register') {
            setActiveModal('');
            navigate('/company');
        } else if (action === 'candidate-login' || action === 'employer-login') {
            setActiveModal('login-choice');
        } else if (action === 'open-jobs') {
            setActiveModal('jobs');
        } else if (action === 'choose-register') {
            setActiveModal('register-choice');
        } else if (action === 'choose-login') {
            setActiveModal('login-choice');
        }
    };

    const askAssistant = async (event) => {
        event?.preventDefault();
        const question = assistantInput.trim();
        if (!question || assistantLoading) {
            return;
        }

        setAssistantInput('');
        setAssistantMessages((messages) => [...messages, { role: 'user', text: question, time: formatAssistantTime() }]);
        setAssistantLoading(true);
        setAssistantSettingsOpen(false);

        try {
            const response = await fetch(`${apiBase}/api/public-assistant`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: question,
                    history: assistantMessages.slice(-8).map(({ role, text }) => ({ role, text }))
                })
            });
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                throw new Error('JumpTake assistant is warming up. Please try again in a moment.');
            }
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'JumpTake assistant is unavailable.');
            }
            setAssistantMessages((messages) => [...messages, { role: 'assistant', text: data.answer, time: formatAssistantTime() }]);
            if (data.action) {
                window.setTimeout(() => executeAction(data.action), 350);
            }
        } catch (error) {
            setAssistantMessages((messages) => [...messages, { role: 'assistant', text: error.message, time: formatAssistantTime() }]);
        } finally {
            setAssistantLoading(false);
        }
    };

    const handleAssistantReplyKeyDown = (event) => {
        if (event.key !== 'Enter' || event.shiftKey || assistantLoading) {
            return;
        }

        event.preventDefault();
        askAssistant();
    };

    const clearAssistantChat = () => {
        setAssistantMessages([]);
        setAssistantInput('');
        setAssistantSettingsOpen(false);
    };

    const requireCandidateLogin = () => {
        setActiveModal('login-choice');
    };

    const handleCandidateLoginSuccess = () => {
        setActiveModal('');
        navigate('/home#candidate:home', { replace: true });
    };

    const handleEmployerLoginSuccess = () => {
        setActiveModal('');
        navigate('/employer-dashboard#employer:home', { replace: true });
    };

    const renderModal = (content) => {
        if (typeof document === 'undefined') {
            return content;
        }

        return createPortal(content, document.body);
    };

    return (
        <>
            <nav className="public-home-nav" aria-label="JumpTake public navigation">
                {[
                    { id: 'home', label: 'Login', icon: 'home', action: () => setActiveModal('login-choice') },
                    { id: 'assistant', label: 'Ask JumpTake', icon: 'search', action: () => setActiveModal('assistant') },
                    { id: 'register', label: 'Create account', icon: 'register', action: () => setActiveModal('register-choice') }
                ].map((item) => (
                    <button key={item.id} type="button" className="public-home-nav-button" onClick={item.action} aria-label={item.label} title={item.label}>
                        <PublicLandingIcon name={item.icon} />
                    </button>
                ))}
            </nav>

            {activeModal === 'login-choice' && renderModal(
                <PublicLoginDialog
                    apiBase={apiBase}
                    onClose={closeActiveModal}
                    onOpenRegister={() => setActiveModal('register-choice')}
                    onSuccessCandidate={handleCandidateLoginSuccess}
                    onSuccessEmployer={handleEmployerLoginSuccess}
                />
            )}

            {activeModal === 'register-choice' && renderModal(
                <PublicRegisterDialog
                    onClose={closeActiveModal}
                    onCandidate={() => executeAction('candidate-register')}
                    onEmployer={() => executeAction('employer-register')}
                />
            )}

            {activeModal === 'assistant' && renderModal(
                <div className="public-landing-modal-backdrop" role="presentation" onMouseDown={closeActiveModal}>
                    <section className={`public-assistant-dialog ${assistantStarted ? 'is-chatting' : 'is-launching'}`} role="dialog" aria-modal="true" aria-label="Ask JumpTake" onMouseDown={(event) => event.stopPropagation()}>
                        {!assistantStarted ? (
                            <form className="public-ai-launch-form" onSubmit={askAssistant}>
                                <div className="public-ai-launch-logo-wrap" aria-hidden="true">
                                    <img src={logoDark} alt="" className="public-ai-launch-logo" />
                                </div>
                                <div className="public-ai-launch-stage">
                                    <label className="public-ai-launch-input" htmlFor="public-ai-launch-textbox">
                                        <PublicSparkSearchIcon />
                                        <input
                                            id="public-ai-launch-textbox"
                                            className="public-ai-launch-textbox"
                                            value={assistantInput}
                                            onChange={(event) => setAssistantInput(event.target.value)}
                                            placeholder="Ask jumptake AI"
                                        />
                                    </label>
                                </div>
                                <div className="public-ai-launch-footer">
                                    <BackArrowButton onClick={closeActiveModal} label="Close JumpTake assistant" />
                                </div>
                            </form>
                        ) : (
                            <div className="public-ai-chat-card public-terminal-card">
                                <div className="public-terminal-wrap">
                                    <div className="public-terminal-head public-ai-chat-header">
                                        <div className="public-ai-chat-brand">
                                            <p className="public-terminal-title">
                                                <PublicTerminalIcon />
                                                <span>Jumptake chat</span>
                                            </p>
                                        </div>
                                        <div className="public-ai-chat-settings-wrap">
                                            <button
                                                type="button"
                                                className="public-ai-settings-button"
                                                aria-label="Chat settings"
                                                onClick={() => setAssistantSettingsOpen((open) => !open)}
                                            >
                                                <PublicSettingsIcon />
                                            </button>
                                            {assistantSettingsOpen ? (
                                                <div className="public-ai-settings-menu">
                                                    <button type="button" onClick={clearAssistantChat}>Clear chat</button>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="public-terminal-body public-terminal-chat-body">
                                        <ul className="public-ai-chat-messages">
                                            {assistantMessages.map((message, index) => (
                                                <li key={`${message.role}-${index}`} className={`public-ai-chat-row is-${message.role}`}>
                                                    <div className="public-ai-chat-time">{message.time}</div>
                                                    <div
                                                        className={`public-ai-chat-bubble is-${message.role}${message.role === 'assistant' && index === assistantMessages.length - 1 ? ' is-latest' : ''}`}
                                                    >
                                                        {message.text}
                                                    </div>
                                                </li>
                                            ))}
                                            {assistantLoading ? (
                                                <li className="public-ai-chat-row is-assistant">
                                                    <div className="public-ai-chat-bubble is-typing">
                                                        <span />
                                                        <span />
                                                        <span />
                                                    </div>
                                                </li>
                                            ) : null}
                                        </ul>
                                        <form className="public-ai-chat-reply" onSubmit={askAssistant}>
                                            <div className="public-ai-reply-row">
                                                <div className="public-ai-reply-field">
                                                    <PublicSparkSearchIcon />
                                                    <input
                                                        type="text"
                                                        value={assistantInput}
                                                        onChange={(event) => setAssistantInput(event.target.value)}
                                                        onKeyDown={handleAssistantReplyKeyDown}
                                                        enterKeyHint="send"
                                                        placeholder="Reply"
                                                    />
                                                </div>
                                            </div>
                                        </form>
                                        <div className="public-ai-chat-footer">
                                            <BackArrowButton onClick={closeActiveModal} label="Close JumpTake chat" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            )}

            {activeModal === 'jobs' && renderModal(
                <div className="public-landing-modal-backdrop" role="presentation" onMouseDown={closeActiveModal}>
                    <section className="public-jobs-dialog" role="dialog" aria-modal="true" aria-label="Public job feed" onMouseDown={(event) => event.stopPropagation()}>
                        <div className="public-jobs-hero">
                            <div className="public-jobs-hero-copy">
                                <p className="public-jobs-lead">
                                    <span className="public-jobs-lead-copy">Job Feed gets better</span>
                                    <span className="public-jobs-lead-highlight">If you are in it...</span>
                                </p>
                            </div>
                            <div className="public-jobs-hero-side">
                                <div className="public-jobs-hero-logo" aria-hidden="true">
                                    <img src={logoDark} alt="" className="public-jobs-hero-logo-image" />
                                </div>
                                <p className="public-jobs-join-copy">
                                    <button
                                        type="button"
                                        className="public-jobs-join-link"
                                        onClick={() => setActiveModal('register-choice')}
                                    >
                                        Join us now
                                    </button>
                                    <span className="public-jobs-join-tail">we love to connect</span>
                                </p>
                            </div>
                        </div>
                        <div className="public-jobs-list">
                            {jobsLoading && <p>Loading jobs...</p>}
                            {!jobsLoading && jobsError && <p>{jobsError}</p>}
                            {!jobsLoading && !jobsError && !jobs.length && <p>No active jobs are available right now.</p>}
                            {visibleJobs.map((job) => {
                                const applicationCount = getPublicJobApplications(job).length;
                                const likeCount = getPublicJobLikeCount(job);
                                const skills = getPublicJobSkills(job);
                                const description = String(job?.description || '').trim();
                                const companyName = job.company?.name || 'Company unavailable';
                                const location = job.location || 'Location not listed';
                                const jobType = job.jobType || 'Full-time';
                                const salary = formatPublicSalary(job.salary);
                                const postedDate = new Date(job.createdAt || Date.now()).toLocaleDateString();

                                return (
                                    <article
                                        className="public-job-feed-card public-job-feed-card-shell"
                                        key={job._id}
                                        onClick={requireCandidateLogin}
                                        role="button"
                                        tabIndex={0}
                                    >
                                        <div className="public-job-feed-card-content">
                                            <div className="job-card-header">
                                                <ProfileAvatar
                                                    imageSrc={job.company?.logo || defaultJobPostAvatar}
                                                    name={companyName || job.title}
                                                    className="job-company-logo"
                                                    imageClassName="profile-avatar-image"
                                                    alt={`${companyName || 'Company'} logo`}
                                                />
                                                <div className="job-card-header-text">
                                                    <h3>{job.title}</h3>
                                                    <p>{companyName}</p>
                                                </div>
                                            </div>

                                            <div className="job-card-body">
                                                <div className="public-job-feed-topline">
                                                    <span>{location}</span>
                                                    <span>{jobType}</span>
                                                    <span>{salary}</span>
                                                </div>
                                                <div className="job-card-meta public-job-feed-meta">
                                                    <span className="job-meta-row">Job Number: {job.jobNumber || 'Generating...'}</span>
                                                    <span className="job-meta-row">Posted: {postedDate}</span>
                                                </div>
                                                {description ? <p className="public-job-feed-description">{description}</p> : null}
                                                {skills.length ? (
                                                    <div className="public-job-feed-skills">
                                                        {skills.slice(0, 3).map((skill) => (
                                                            <span key={`${job._id}-${skill}`}>{skill}</span>
                                                        ))}
                                                    </div>
                                                ) : null}
                                            </div>

                                            <div className="job-card-stats public-job-feed-stats">
                                                <span>{likeCount} reach</span>
                                                <span>{applicationCount} applicants</span>
                                                <span>{job.hiredCount || 0} hired</span>
                                                <span>{job.fitScore || '0%'} fit for you</span>
                                            </div>

                                            <div className="job-card-reactions public-job-feed-reactions">
                                                <button
                                                    type="button"
                                                    className="job-card-like-button"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        requireCandidateLogin();
                                                    }}
                                                >
                                                    <span aria-hidden="true">{"\uD83D\uDC4D"}</span>
                                                    <span>{`Like ${likeCount}`}</span>
                                                </button>
                                            </div>

                                            <div className="job-card-footer">
                                                <div className="public-job-feed-actions">
                                                    <button
                                                        type="button"
                                                        className="public-job-feed-secondary-button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            requireCandidateLogin();
                                                        }}
                                                    >
                                                        View Job
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="apply-button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            requireCandidateLogin();
                                                        }}
                                                    >
                                                        Apply Now
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                        <div className="public-modal-footer">
                            <BackArrowButton onClick={closeActiveModal} label="Close job feed" />
                        </div>
                    </section>
                </div>
            )}
        </>
    );
};

export default PublicLandingNav;



