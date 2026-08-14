const compactText = (value = '', maxLength = 1200) => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
};

const asId = (value) => String(value || '').trim();

const isElementVisible = (element) => {
    if (!element || element.getAttribute('aria-hidden') === 'true') return false;
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
};

const getJobId = (job = {}) => asId(job._id || job.id || job.jobNumber);

const compactJob = (job = {}) => ({
    id: getJobId(job),
    title: compactText(job.title || job.role, 140),
    company: compactText(job.company?.name || job.companyName, 140),
    location: compactText(job.location, 140),
    jobType: compactText(job.jobType || job.type, 80),
    description: compactText(job.description || job.summary, 900),
    skills: (Array.isArray(job.skills) ? job.skills : []).slice(0, 12).map((skill) => compactText(skill, 100)),
    requirements: (Array.isArray(job.requirements) ? job.requirements : [job.requirements])
        .filter(Boolean)
        .slice(0, 10)
        .map((requirement) => compactText(requirement, 180))
});

const collectVisiblePosts = (scope) => (
    [...scope.querySelectorAll('.portal-social-post-card[data-post-id]')]
        .filter(isElementVisible)
        .slice(0, 8)
        .map((card) => ({
            id: asId(card.dataset.postId),
            author: compactText(card.querySelector('.portal-post-author-name')?.textContent, 100),
            type: compactText(card.querySelector('.portal-post-title-block p')?.textContent, 100),
            body: compactText(card.querySelector('.portal-post-body')?.textContent, 900)
        }))
);

const collectVisibleContacts = (scope) => (
    [...scope.querySelectorAll('[data-assistant-contact-id]')]
        .filter(isElementVisible)
        .slice(0, 12)
        .map((card) => ({
            id: asId(card.dataset.assistantContactId),
            userId: asId(card.dataset.assistantUserId),
            candidateId: asId(card.dataset.assistantCandidateId),
            name: compactText(card.dataset.assistantContactName || card.querySelector('h3, strong')?.textContent, 100),
            jumptakeId: compactText(card.dataset.assistantJumptakeId, 100)
        }))
);

const collectOpenDialog = () => {
    const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter(isElementVisible);
    const dialog = dialogs[dialogs.length - 1];
    if (!dialog) return null;
    return {
        label: compactText(dialog.getAttribute('aria-label') || dialog.querySelector('h1, h2, h3')?.textContent, 160),
        text: compactText(dialog.innerText, 1800)
    };
};

export const readAssistantPageContext = ({
    activeSection = '',
    lastUsedSection = '',
    lastUsedTitle = '',
    availablePages = [],
    jobs = [],
    contacts = []
} = {}) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return {
            activeSection,
            lastUsedSection,
            lastUsedTitle,
            availablePages,
            visibleJobs: [],
            visiblePosts: [],
            contacts: [],
            pageText: '',
            openDialog: null
        };
    }

    const activeShell = [...document.querySelectorAll('.portal-section-transition-shell')]
        .find((element) => element.dataset.section === activeSection && isElementVisible(element))
        || [...document.querySelectorAll('.portal-section-transition-shell.is-active-portal-section')].find(isElementVisible)
        || document.querySelector('.home-page main')
        || document.body;
    const visibleJobIds = new Set(
        [...activeShell.querySelectorAll('[data-job-id]')]
            .filter(isElementVisible)
            .map((element) => asId(element.dataset.jobId))
            .filter(Boolean)
    );
    const safeJobs = Array.isArray(jobs) ? jobs : [];
    const visibleJobs = safeJobs
        .filter((job) => visibleJobIds.has(getJobId(job)))
        .slice(0, 8)
        .map(compactJob);
    const fallbackJobs = activeSection === 'job-posts' && !visibleJobs.length
        ? safeJobs.slice(0, 6).map(compactJob)
        : visibleJobs;
    const domContacts = collectVisibleContacts(activeShell);
    const suppliedContacts = (Array.isArray(contacts) ? contacts : []).slice(0, 16).map((contact) => ({
        id: asId(contact.id || contact._id),
        userId: asId(contact.userId),
        candidateId: asId(contact.candidateId),
        name: compactText(contact.name || contact.title, 100),
        jumptakeId: compactText(contact.jumptakeId, 100)
    }));

    return {
        activeSection,
        activePageTitle: compactText(
            activeShell.querySelector('.section-header h1, .section-header h2, h1, h2')?.textContent
                || availablePages.find((page) => page.id === activeSection)?.title
                || activeSection,
            160
        ),
        lastUsedSection,
        lastUsedTitle,
        availablePages: (Array.isArray(availablePages) ? availablePages : []).slice(0, 40),
        visibleJobs: fallbackJobs,
        visiblePosts: collectVisiblePosts(activeShell),
        contacts: [...domContacts, ...suppliedContacts].filter((contact, index, list) => (
            list.findIndex((item) => item.id === contact.id && item.name === contact.name) === index
        )),
        pageText: compactText(activeShell.innerText, 4200),
        openDialog: collectOpenDialog()
    };
};

export default readAssistantPageContext;
