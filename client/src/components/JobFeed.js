import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const FONT_OPTIONS = [
    { label: 'Share Tech', value: 'Share Tech' },
    { label: 'Lexend', value: 'Lexend' },
    { label: 'Arial', value: 'Arial' },
    { label: 'Georgia', value: 'Georgia' },
    { label: 'Times New Roman', value: 'Times New Roman' }
];

const BLOCK_OPTIONS = [
    { label: 'Paragraph', value: '<p>' },
    { label: 'Heading', value: '<h3>' }
];

const escapeHtml = (value = '') => (
    String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
);

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
                if (typeof item === 'object' && item !== null) {
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

const normalizeSkillList = (value) => {
    if (Array.isArray(value)) {
        return value
            .map((item) => String(item).trim())
            .filter(Boolean);
    }

    if (typeof value === 'string') {
        return value
            .split(/[\n,;|]+/)
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [];
};

const createApplicationProfileDraft = (profileData, userData = {}) => ({
    name: profileData?.name || '',
    email: profileData?.email || userData?.email || '',
    skills: formatCommaSeparatedValue(profileData?.skills),
    interests: formatCommaSeparatedValue(profileData?.interests),
    hobbies: formatCommaSeparatedValue(profileData?.hobbies),
    education: formatMultilineValue(profileData?.education),
    experience: formatMultilineValue(profileData?.experience),
    achievements: formatMultilineValue(profileData?.achievements)
});

const prepareApplicationProfileSnapshot = (profileDraft) => ({
    name: profileDraft.name.trim(),
    email: profileDraft.email.trim(),
    skills: splitCommaSeparatedValue(profileDraft.skills),
    interests: splitCommaSeparatedValue(profileDraft.interests),
    hobbies: splitCommaSeparatedValue(profileDraft.hobbies),
    education: splitMultilineValue(profileDraft.education),
    experience: splitMultilineValue(profileDraft.experience),
    achievements: splitMultilineValue(profileDraft.achievements)
});

const createCoverLetterTemplate = (profileData, job, userData = {}) => {
    const applicantName = profileData?.name || userData?.email?.split('@')[0] || 'Candidate';
    const jobTitle = job?.title || 'this role';
    const companyName = job?.company?.name || 'your team';

    return [
        `<p>Dear Hiring Team,</p>`,
        `<p>I am excited to apply for the ${escapeHtml(jobTitle)} role at ${escapeHtml(companyName)}. My experience and skills align well with the opportunity, and I would love to contribute to your team.</p>`,
        `<p>Thank you for your time and consideration.</p>`,
        `<p>Sincerely,</p>`,
        `<p>${escapeHtml(applicantName)}</p>`
    ].join('');
};

const stripRichText = (html = '') => (
    html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|li|h3)>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
);

const RichTextEditor = ({ value, onChange, disabled = false }) => {
    const editorRef = useRef(null);
    const selectionRef = useRef(null);

    useEffect(() => {
        if (!editorRef.current) {
            return;
        }

        if (editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

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

    const syncEditorValue = () => {
        if (!editorRef.current) {
            return;
        }

        onChange(editorRef.current.innerHTML);
        saveSelection();
    };

    const runCommand = (command, commandValue = null) => {
        if (disabled || typeof document.execCommand !== 'function') {
            return;
        }

        restoreSelection();
        document.execCommand(command, false, commandValue);
        syncEditorValue();
    };

    return (
        <div className="rich-text-editor-shell">
            <div className="rich-text-toolbar">
                <select
                    className="rich-text-select"
                    defaultValue="Share Tech"
                    onChange={(event) => runCommand('fontName', event.target.value)}
                    disabled={disabled}
                >
                    {FONT_OPTIONS.map((fontOption) => (
                        <option key={fontOption.value} value={fontOption.value}>
                            {fontOption.label}
                        </option>
                    ))}
                </select>
                <select
                    className="rich-text-select"
                    defaultValue="<p>"
                    onChange={(event) => runCommand('formatBlock', event.target.value)}
                    disabled={disabled}
                >
                    {BLOCK_OPTIONS.map((blockOption) => (
                        <option key={blockOption.value} value={blockOption.value}>
                            {blockOption.label}
                        </option>
                    ))}
                </select>
                <button type="button" className="rich-text-tool-button" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('bold')} disabled={disabled}>B</button>
                <button type="button" className="rich-text-tool-button" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('italic')} disabled={disabled}>I</button>
                <button type="button" className="rich-text-tool-button" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('underline')} disabled={disabled}>U</button>
                <button type="button" className="rich-text-tool-button" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('justifyLeft')} disabled={disabled}>L</button>
                <button type="button" className="rich-text-tool-button" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('justifyCenter')} disabled={disabled}>C</button>
                <button type="button" className="rich-text-tool-button" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('justifyRight')} disabled={disabled}>R</button>
                <button type="button" className="rich-text-tool-button" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('insertUnorderedList')} disabled={disabled}>List</button>
            </div>
            <div className="rich-text-surface">
                <div
                    ref={editorRef}
                    className={`rich-text-editor ${!stripRichText(value) ? 'is-empty' : ''}`}
                    contentEditable={!disabled}
                    suppressContentEditableWarning
                    data-placeholder="Write your cover letter..."
                    onInput={syncEditorValue}
                    onBlur={saveSelection}
                    onKeyUp={saveSelection}
                    onMouseUp={saveSelection}
                />
            </div>
        </div>
    );
};

const JobFeed = ({ jobs, error, userId, onRefresh, jobSeekerData, currentUser, returnToSection }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [applyingToJobId, setApplyingToJobId] = useState(null);
    const [applicationJob, setApplicationJob] = useState(null);
    const [appliedJobIds, setAppliedJobIds] = useState([]);
    const [bookmarkedJobIds, setBookmarkedJobIds] = useState([]);
    const [applicationMessage, setApplicationMessage] = useState('');
    const [coverLetterHtml, setCoverLetterHtml] = useState('');
    const [applicationProfile, setApplicationProfile] = useState(() => createApplicationProfileDraft(jobSeekerData, currentUser));
    const [activeDraftId, setActiveDraftId] = useState(null);
    const [activeReturnSection, setActiveReturnSection] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [recommendedJobs, setRecommendedJobs] = useState([]);
    const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
    const [activeTab, setActiveTab] = useState('all'); 
    const [currentJobPage, setCurrentJobPage] = useState(1);
    const [isDesktopView, setIsDesktopView] = useState(() => (
        typeof window !== 'undefined' ? window.innerWidth > 768 : true
    ));

    const changeJobPage = (nextPage) => {
        setCurrentJobPage(nextPage);
        window.requestAnimationFrame(() => {
            const container = document.querySelector('.mobile-section-job-feed .job-feed-container, .job-feed-container');
            const scrollParent = container?.closest('.mobile-dashboard-section-panel, .main-content');
            if (scrollParent) {
                scrollParent.scrollTop = 0;
            }
            container?.scrollIntoView({ block: 'start', behavior: 'auto' });
        });
    };
    
    
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        jobType: '',
        location: '',
        salary: '',
        skills: []
    });
    const [availableLocations, setAvailableLocations] = useState([]);
    const [availableJobTypes, setAvailableJobTypes] = useState([]);
    const [availableSkills, setAvailableSkills] = useState([]);

    
    const [previewJob, setPreviewJob] = useState(null);
    const previewModalRef = useRef(null);
    const applicationModalRef = useRef(null);

    useEffect(() => {
        const dashboardSearch = sessionStorage.getItem('jumptakeCandidateJobSearch');
        if (dashboardSearch) {
            setSearchTerm(dashboardSearch);
            sessionStorage.removeItem('jumptakeCandidateJobSearch');
        }
    }, []);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [companyLoading, setCompanyLoading] = useState(false);
    const [companyError, setCompanyError] = useState('');
    const resolvedUser = currentUser || JSON.parse(localStorage.getItem('user') || '{}');
    const candidateSkills = normalizeSkillList(jobSeekerData?.skills);

    useEffect(() => {
        const handleResize = () => {
            setIsDesktopView(window.innerWidth > 768);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    useEffect(() => {
        if (jobs && jobs.length > 0) {
          
            const locations = [...new Set(jobs.map(job => job.location))];
            setAvailableLocations(locations);

           
            const jobTypes = [...new Set(jobs.map(job => job.jobType))];
            setAvailableJobTypes(jobTypes);

           
            const allSkills = jobs.reduce((acc, job) => {
                if (job.skills && Array.isArray(job.skills)) {
                    return [...acc, ...job.skills];
                }
                return acc;
            }, []);
            const uniqueSkills = [...new Set(allSkills)];
            setAvailableSkills(uniqueSkills);
        }
    }, [jobs]);

   
    useEffect(() => {
        if (candidateSkills.length > 0) {
            fetchRecommendedJobs();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [candidateSkills.length, jobSeekerData, jobs]);

    useEffect(() => {
        if (!userId) {
            setAppliedJobIds([]);
            setBookmarkedJobIds([]);
            return;
        }

        fetchAppliedJobs();
        fetchJobBookmarks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, jobs]);

    useEffect(() => {
        if (!userId || jobs.length === 0) {
            return;
        }

        const activeDraftStorageId = localStorage.getItem('jumptakeActiveDraftId');
        const activeJobId = localStorage.getItem('jumptakeActiveJobId');
        const activeJobAction = localStorage.getItem('jumptakeActiveJobAction') || 'preview';
        const storedReturnSection = localStorage.getItem('jumptakeActiveJobReturnSection');
        if (storedReturnSection) {
            setActiveReturnSection(storedReturnSection);
            localStorage.removeItem('jumptakeActiveJobReturnSection');
        }

        if (activeDraftStorageId) {
            openDraftFromStorage(activeDraftStorageId);
            localStorage.removeItem('jumptakeActiveDraftId');
            return;
        }

        if (activeJobId) {
            const matchingJob = jobs.find((job) => String(job._id) === String(activeJobId));
            if (matchingJob) {
                if (activeJobAction === 'apply') {
                    handleApplyClick(matchingJob);
                } else {
                    setPreviewJob(matchingJob);
                }
            }

            localStorage.removeItem('jumptakeActiveJobId');
            localStorage.removeItem('jumptakeActiveJobAction');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, jobs]);

    useEffect(() => {
        function handleClickOutside(event) {
            if ((previewJob || selectedCompany) && event.target.classList.contains('job-preview-overlay')) {
                closePreview();
            }
        }
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [previewJob, selectedCompany]);

    useEffect(() => {
        if (previewJob || selectedCompany || applicationJob) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [previewJob, selectedCompany, applicationJob]);

    useEffect(() => {
        if (!previewJob && !selectedCompany) {
            return;
        }

        requestAnimationFrame(() => {
            const modal = previewModalRef.current;
            if (!modal) {
                return;
            }

            modal.scrollTop = 0;
            modal.querySelectorAll('.job-preview-content, .candidate-job-preview-scroll-area')
                .forEach((element) => {
                    element.scrollTop = 0;
                });
        });
    }, [previewJob, selectedCompany]);

    useEffect(() => {
        if (!applicationJob) {
            return;
        }

        requestAnimationFrame(() => {
            const modal = applicationModalRef.current;
            if (!modal) {
                return;
            }

            modal.scrollTop = 0;
            modal.querySelectorAll('.application-workspace-body')
                .forEach((element) => {
                    element.scrollTop = 0;
                });
        });
    }, [applicationJob]);

    const fetchRecommendedJobs = async () => {
        if (!jobSeekerData || !jobSeekerData._id) {
            return;
        }

        setIsLoadingRecommendations(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/jobs/recommendations/${jobSeekerData._id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch job recommendations');
            }

            const data = await response.json();
            setRecommendedJobs(data);
        } catch (err) {
            console.error('Error fetching job recommendations:', err);
        } finally {
            setIsLoadingRecommendations(false);
        }
    };

    const fetchAppliedJobs = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/applications/user/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch applied jobs');
            }

            const data = await response.json();
            const uniqueAppliedJobIds = [...new Set(
                (Array.isArray(data) ? data : [])
                    .filter((application) => application?.status !== 'Withdrawn')
                    .map((application) => application?.job?._id || application?.job)
                    .filter(Boolean)
                    .map((jobId) => String(jobId))
            )];

            setAppliedJobIds(uniqueAppliedJobIds);
        } catch (err) {
            console.error('Error fetching applied jobs:', err);
        }
    };

    const fetchJobBookmarks = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/job-bookmarks/user/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch bookmarked jobs');
            }

            const data = await response.json();
            const bookmarkedIds = (Array.isArray(data) ? data : [])
                .map((bookmark) => bookmark?.job?._id || bookmark?.job)
                .filter(Boolean)
                .map((jobId) => String(jobId));

            setBookmarkedJobIds(bookmarkedIds);
        } catch (bookmarkError) {
            console.error('Error fetching job bookmarks:', bookmarkError);
        }
    };

    const handleFilterChange = (name, value) => {
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSkillToggle = (skill) => {
        setFilters(prev => {
            const updatedSkills = prev.skills.includes(skill)
                ? prev.skills.filter(s => s !== skill)
                : [...prev.skills, skill];
            
            return {
                ...prev,
                skills: updatedSkills
            };
        });
    };

    const clearFilters = () => {
        setFilters({
            jobType: '',
            location: '',
            salary: '',
            skills: []
        });
    };

    const filteredJobs = jobs.filter(job => {
      
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = (
            job.title.toLowerCase().includes(searchLower) ||
            job.company.name.toLowerCase().includes(searchLower) ||
            (job.jobNumber && job.jobNumber.toLowerCase().includes(searchLower)) ||
            job.location.toLowerCase().includes(searchLower) ||
            job.description.toLowerCase().includes(searchLower) ||
            (job.skills && job.skills.some(skill => skill.toLowerCase().includes(searchLower)))
        );

        if (!matchesSearch) return false;

       
        if (filters.jobType && job.jobType !== filters.jobType) return false;
        if (filters.location && job.location !== filters.location) return false;
        
        
        if (filters.salary && job.salary) {
            const salaryFilter = parseInt(filters.salary.replace(/[^0-9]/g, ''));
            const jobSalary = job.salary.match(/\d+/g);
            if (jobSalary) {
                const averageSalary = jobSalary.reduce((a, b) => parseInt(a) + parseInt(b), 0) / jobSalary.length;
                if (averageSalary < salaryFilter) return false;
            }
        }

      
        if (filters.skills.length > 0) {
            if (!job.skills || !Array.isArray(job.skills)) return false;
            
            return filters.skills.every(skill => 
                job.skills.some(jobSkill => jobSkill.toLowerCase() === skill.toLowerCase())
            );
        }

        return true;
    });

    
    const displayedJobs = activeTab === 'recommended' ? recommendedJobs : filteredJobs;
    const jobsPerPage = isDesktopView ? 5 : 3;
    const totalJobPages = Math.max(1, Math.ceil(displayedJobs.length / jobsPerPage));
    const pagedJobs = displayedJobs.slice((currentJobPage - 1) * jobsPerPage, currentJobPage * jobsPerPage);

    useEffect(() => {
        setCurrentJobPage(1);
    }, [activeTab, searchTerm, filters.jobType, filters.location, filters.salary, filters.skills.length, displayedJobs.length]);

    useEffect(() => {
        if (currentJobPage > totalJobPages) {
            setCurrentJobPage(totalJobPages);
        }
    }, [currentJobPage, totalJobPages]);
    
    const handleJobClick = (job) => {
        if (applyingToJobId === job._id) {
            return; 
        }
        setPreviewJob(job);
    };
    
    const handleApplyClick = (job, event) => {
        if (event) {
            event.stopPropagation(); 
        }

        if (!job || appliedJobIds.includes(String(job._id))) {
            return;
        }

        setApplyingToJobId(job._id);
        setApplicationJob(job);
        setActiveDraftId(null);
        setApplicationMessage('');
        setCoverLetterHtml(createCoverLetterTemplate(jobSeekerData, job, resolvedUser));
        setApplicationProfile(createApplicationProfileDraft(jobSeekerData, resolvedUser));
        setPreviewJob(null); 
    };
    
    const returnToOriginSection = () => {
        if (!activeReturnSection || !returnToSection) {
            return;
        }

        const nextSection = activeReturnSection;
        setActiveReturnSection(null);
        returnToSection(nextSection);
    };

    const handleCancelApplication = (options = {}) => {
        const shouldReturn = Object.prototype.hasOwnProperty.call(options, 'shouldReturn')
            ? options.shouldReturn
            : true;

        setApplyingToJobId(null);
        setApplicationJob(null);
        setApplicationMessage('');
        setCoverLetterHtml('');
        setActiveDraftId(null);
        setApplicationProfile(createApplicationProfileDraft(jobSeekerData, resolvedUser));

        if (shouldReturn) {
            returnToOriginSection();
        }
    };

    const openDraftFromStorage = async (draftId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/draft-applications/user/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
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

            setApplyingToJobId(selectedDraft.job._id);
            setApplicationJob(selectedDraft.job);
            setActiveDraftId(selectedDraft._id);
            setApplicationMessage(selectedDraft.message || '');
            setCoverLetterHtml(selectedDraft.coverLetterHtml || createCoverLetterTemplate(jobSeekerData, selectedDraft.job, resolvedUser));
            setApplicationProfile(createApplicationProfileDraft(selectedDraft.profileSnapshot || jobSeekerData, resolvedUser));
            setPreviewJob(null);
        } catch (draftError) {
            console.error('Error opening draft application:', draftError);
        }
    };

    const handleApplicationProfileChange = (event) => {
        const { name, value } = event.target;

        setApplicationProfile((prevState) => ({
            ...prevState,
            [name]: value
        }));
    };

    const handleSaveDraft = async () => {
        if (!applicationJob?._id) {
            return;
        }

        try {
            setIsSubmitting(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/draft-applications`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    draftId: activeDraftId,
                    jobId: applicationJob._id,
                    userId,
                    message: applicationMessage,
                    coverLetterHtml,
                    profileSnapshot: prepareApplicationProfileSnapshot(applicationProfile)
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to save draft application');
            }

            setActiveDraftId(data._id);
            setMessage('Draft application saved successfully!');
            handleCancelApplication();

            setTimeout(() => {
                setMessage('');
            }, 3000);
        } catch (draftError) {
            console.error('Error saving draft application:', draftError);
            setMessage(`Error: ${draftError.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleApplySubmit = async (jobId) => {
        if (!applicationMessage.trim()) {
            setMessage('Please include a message with your application');
            return;
        }
        
        setIsSubmitting(true);
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch((process.env.REACT_APP_API_URL || '') + '/api/applications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    jobId,
                    userId,
                    message: applicationMessage,
                    coverLetterHtml,
                    profileSnapshot: prepareApplicationProfileSnapshot(applicationProfile),
                    draftId: activeDraftId
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to submit application');
            }
            
            setMessage('Application submitted successfully!');
            setAppliedJobIds((prev) => (
                prev.includes(String(jobId)) ? prev : [...prev, String(jobId)]
            ));
            setApplyingToJobId(null);
            setApplicationJob(null);
            setApplicationMessage('');
            setCoverLetterHtml('');
            setActiveDraftId(null);
            setApplicationProfile(createApplicationProfileDraft(jobSeekerData, resolvedUser));
            returnToOriginSection();
            
            if (onRefresh) onRefresh();
            
            setTimeout(() => {
                setMessage('');
            }, 3000);
            
        } catch (error) {
            console.error('Error submitting application:', error);
            setMessage(`Error: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const closePreview = (options = {}) => {
        const shouldReturn = Object.prototype.hasOwnProperty.call(options, 'shouldReturn')
            ? options.shouldReturn
            : true;

        setPreviewJob(null);
        setSelectedCompany(null);
        setCompanyLoading(false);
        setCompanyError('');

        if (shouldReturn) {
            returnToOriginSection();
        }
    };

    const formatFoundedDate = (founded) => {
        if (!founded) {
            return 'Not specified';
        }

        if (/^\d{4}$/.test(founded)) {
            return `Founded in ${founded}`;
        }

        return founded;
    };

    const handleViewCompany = async () => {
        const companyId = previewJob?.company?._id;

        if (!companyId) {
            setCompanyError('Company profile is not available for this job.');
            return;
        }

        setCompanyLoading(true);
        setCompanyError('');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/companies/${companyId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch company profile');
            }

            const data = await response.json();
            setSelectedCompany(data);
        } catch (err) {
            console.error('Error fetching company profile:', err);
            setCompanyError('Failed to load company profile. Please try again later.');
        } finally {
            setCompanyLoading(false);
        }
    };

    const handleToggleBookmark = async (job, event) => {
        if (event) {
            event.stopPropagation();
        }

        if (!job?._id || !userId) {
            return;
        }

        const isBookmarked = bookmarkedJobIds.includes(String(job._id));
        const token = localStorage.getItem('token');

        try {
            if (isBookmarked) {
                const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/job-bookmarks/user/${userId}/job/${job._id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to remove bookmark');
                }

                setBookmarkedJobIds((prevState) => prevState.filter((jobId) => jobId !== String(job._id)));
            } else {
                const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/job-bookmarks`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        userId,
                        jobId: job._id
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to bookmark job');
                }

                setBookmarkedJobIds((prevState) => [...new Set([...prevState, String(job._id)])]);
            }
        } catch (bookmarkError) {
            console.error('Error toggling bookmark:', bookmarkError);
        }
    };

    const getMatchScore = (job) => {
        if (candidateSkills.length === 0 || !Array.isArray(job?.skills)) return 0;
        
        const userSkills = candidateSkills;
        const jobSkills = job.skills.map((skill) => String(skill).trim()).filter(Boolean);
        
        const matchingSkills = userSkills.filter(skill => 
            jobSkills.some(jobSkill => 
                jobSkill.toLowerCase() === skill.toLowerCase()
            )
        );
        
        return matchingSkills.length;
    };

    const formatList = (items) => {
        if (!items || items.length === 0) {
            return <p>None specified</p>;
        }

        return (
            <ul className="job-detail-list">
                {items.map((item, index) => (
                    <li key={index}>{item}</li>
                ))}
            </ul>
        );
    };
    
    return (
        <div className="job-feed-container">
            <div className="job-feed-header">
                <div className="job-feed-title">
                    <h2>Job Feed</h2>
                    {candidateSkills.length > 0 && (
                        <div className="job-feed-tabs">
                            <button 
                                className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
                                onClick={() => setActiveTab('all')}
                            >
                                All Jobs
                            </button>
                            <button 
                                className={`tab-button ${activeTab === 'recommended' ? 'active' : ''}`}
                                onClick={() => setActiveTab('recommended')}
                            >
                                Recommended For You
                                {recommendedJobs.length > 0 && (
                                    <span className="recommendation-count">{recommendedJobs.length}</span>
                                )}
                            </button>
                        </div>
                    )}
                </div>
                <div className="job-filter">
                    <div className="search-container">
                        <input 
                            type="text" 
                            placeholder="Search jobs by title, company, skills..." 
                            className="job-search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button 
                            className="filter-toggle-button"
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            {showFilters ? 'Hide Filters' : 'Show Filters'}
                        </button>
                    </div>
                    
                    {showFilters && (
                        <div className="advanced-filters">
                            <div className="filter-row">
                                <div className="filter-group">
                                    <label htmlFor="location-filter">Location:</label>
                                    <select
                                        id="location-filter"
                                        value={filters.location}
                                        onChange={(e) => handleFilterChange('location', e.target.value)}
                                    >
                                        <option value="">All Locations</option>
                                        {availableLocations.map((location, index) => (
                                            <option key={index} value={location}>{location}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="filter-group">
                                    <label htmlFor="jobType-filter">Job Type:</label>
                                    <select
                                        id="jobType-filter"
                                        value={filters.jobType}
                                        onChange={(e) => handleFilterChange('jobType', e.target.value)}
                                    >
                                        <option value="">All Job Types</option>
                                        {availableJobTypes.map((type, index) => (
                                            <option key={index} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="filter-group">
                                    <label htmlFor="salary-filter">Min Salary:</label>
                                    <select
                                        id="salary-filter"
                                        value={filters.salary}
                                        onChange={(e) => handleFilterChange('salary', e.target.value)}
                                    >
                                        <option value="">Any Salary</option>
                                        <option value="$40,000">$40,000+</option>
                                        <option value="$60,000">$60,000+</option>
                                        <option value="$80,000">$80,000+</option>
                                        <option value="$100,000">$100,000+</option>
                                        <option value="$150,000">$150,000+</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="skills-filter">
                                <label>Skills:</label>
                                <div className="skill-checkbox-container">
                                    {availableSkills.map((skill, index) => (
                                        <div className="skill-checkbox" key={index}>
                                            <input 
                                                type="checkbox"
                                                id={`skill-${index}`}
                                                checked={filters.skills.includes(skill)}
                                                onChange={() => handleSkillToggle(skill)}
                                            />
                                            <label htmlFor={`skill-${index}`}>{skill}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="filter-actions">
                                <button className="clear-filters-button" onClick={clearFilters}>
                                    Clear Filters
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {message && (
                <div className={`notification-message ${message.includes('Error') ? 'error' : 'success'}`}>
                    {message}
                </div>
            )}

            {error && <div className="error-message">{error}</div>}

            {isLoadingRecommendations && activeTab === 'recommended' ? (
                <div className="loading-recommendations">
                    <div className="loading-spinner"></div>
                    <p>Finding the best jobs for you...</p>
                </div>
            ) : activeTab === 'recommended' && recommendedJobs.length === 0 ? (
                <div className="no-recommendations">
                    <div className="empty-state-image">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                            <line x1="9" y1="9" x2="9.01" y2="9"></line>
                            <line x1="15" y1="9" x2="15.01" y2="9"></line>
                        </svg>
                    </div>
                    <h3>No job recommendations yet</h3>
                    <p>We're still learning about your skills and preferences</p>
                </div>
            ) : (
                <div className="job-list">
                    {displayedJobs.length > 0 ? (
                        pagedJobs.map(job => {
                            const matchScore = getMatchScore(job);
                            const hasMatchScore = activeTab === 'all' && matchScore > 0 && candidateSkills.length > 0;
                            const hasApplied = appliedJobIds.includes(String(job._id));
                            const isBookmarked = bookmarkedJobIds.includes(String(job._id));
                            
                            return (
                                <div 
                                    className={`job-card ${hasMatchScore ? 'has-match' : ''}`} 
                                    key={job._id}
                                    onClick={() => handleJobClick(job)}
                                >
                                    <div className="job-card-header">
                                        <button
                                            type="button"
                                            className={`bookmark-star-button ${isBookmarked ? 'active' : ''}`}
                                            onClick={(event) => handleToggleBookmark(job, event)}
                                            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark job'}
                                        >
                                            {isBookmarked ? '★' : '☆'}
                                        </button>
                                        <h3>{job.title}</h3>
                                        <span className="company-name">{job.company.name}</span>
                                        {hasMatchScore && (
                                            <div className="job-match">
                                                <span className="match-label">Skills Match</span>
                                                <span className="match-score">{matchScore}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="job-card-body">
                                        <p className="job-number">Job Number: {job.jobNumber || 'Generating...'}</p>
                                        <p className="job-location">{job.location}</p>
                                        <p className="job-type">{job.jobType}</p>
                                        {job.salary && <p className="job-salary">{job.salary}</p>}
                                        <p className="job-description">{job.description.substring(0, 150)}...</p>
                                        
                                        {job.skills && job.skills.length > 0 && (
                                            <div className="job-skills">
                                                <strong>Skills:</strong> 
                                                <div className="skill-tags">
                                                    {job.skills.map((skill, index) => {
                                                        const isMatch = candidateSkills.some(s => 
                                                                s.toLowerCase() === skill.toLowerCase()
                                                        );
                                                        
                                                        return (
                                                            <span 
                                                                key={index} 
                                                                className={`skill-tag ${isMatch ? 'skill-match' : ''}`}
                                                            >
                                                                {skill}
                                                                {isMatch && <span className="match-icon">✓</span>}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="job-card-footer">
                                        <span className="posted-date">Posted: {new Date(job.createdAt).toLocaleDateString()}</span>
                                        <button 
                                            className="apply-button"
                                            onClick={(e) => handleApplyClick(job, e)}
                                            disabled={hasApplied}
                                        >
                                            {hasApplied ? 'Applied' : 'Apply Now'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="no-jobs-message">
                            <h3>No job listings available at this time</h3>
                            <p>Please check back later for new opportunities or try a different search.</p>
                        </div>
                    )}
                    {displayedJobs.length > jobsPerPage && (
                        <div className="job-feed-pagination" aria-label="Job feed pages">
                            <button
                                type="button"
                                className="secondary-button"
                                onClick={() => changeJobPage(Math.max(1, currentJobPage - 1))}
                                disabled={currentJobPage === 1}
                            >
                                Previous
                            </button>
                            <span>Page {currentJobPage} of {totalJobPages}</span>
                            <button
                                type="button"
                                className="secondary-button"
                                onClick={() => changeJobPage(Math.min(totalJobPages, currentJobPage + 1))}
                                disabled={currentJobPage === totalJobPages}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            )}

            {(selectedCompany || previewJob) && createPortal(selectedCompany ? (
                <div className="job-preview-overlay">
                    <div className="job-preview-modal" ref={previewModalRef} onClick={(e) => e.stopPropagation()}>
                        <div className="job-preview-header">
                            <button className="preview-close-btn" onClick={closePreview}>Ã—</button>
                            <h2>{selectedCompany.name}</h2>
                            <div className="preview-company-info">
                                <span className="preview-company-name">
                                    {selectedCompany.industry || 'Industry not specified'}
                                </span>
                            </div>
                        </div>

                        <div className="job-preview-content">
                            <div className="preview-section">
                                <h3>Company Details</h3>
                                <p><strong>Founded:</strong> {formatFoundedDate(selectedCompany.founded)}</p>
                                <p><strong>Headquarters:</strong> {selectedCompany.headquarters || 'Not specified'}</p>
                                <p>
                                    <strong>Website:</strong>{' '}
                                    {selectedCompany.website ? (
                                        <a
                                            href={selectedCompany.website.startsWith('http')
                                                ? selectedCompany.website
                                                : `https://${selectedCompany.website}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="company-website-link"
                                        >
                                            {selectedCompany.website}
                                        </a>
                                    ) : (
                                        'Not specified'
                                    )}
                                </p>
                            </div>

                            <div className="preview-section">
                                <h3>About the Company</h3>
                                <p>{selectedCompany.description || 'No company description available.'}</p>
                            </div>
                        </div>

                        <div className="job-preview-actions">
                            <div className="preview-action-buttons">
                                <button
                                    className="preview-company-button"
                                    onClick={() => setSelectedCompany(null)}
                                >
                                    Back to Job
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : previewJob && (
                <div className="job-preview-overlay candidate-job-preview-overlay">
                    <div className="job-preview-modal candidate-job-preview-modal" ref={previewModalRef} onClick={(e) => e.stopPropagation()}>
                        <div className="mobile-job-preview-topbar">
                            <h2>{previewJob.title}</h2>
                            <button
                                type="button"
                                className="mobile-job-preview-close"
                                onClick={closePreview}
                                aria-label="Close job preview"
                            >
                                ×
                            </button>
                        </div>
                        <div className="job-preview-header">
                            <button className="preview-close-btn" onClick={closePreview}>×</button>
                            <h2>{previewJob.title}</h2>
                            <div className="preview-company-info">
                                <span className="preview-company-name">{previewJob.company.name}</span>
                                {previewJob.company.industry && (
                                    <span className="preview-company-industry">{previewJob.company.industry}</span>
                                )}
                            </div>
                            <div className="preview-job-meta">
                                <span className="preview-job-number">
                                    <i className="type-icon">#</i> {previewJob.jobNumber || 'Generating...'}
                                </span>
                                <span className="preview-job-location">
                                    <i className="location-icon">📍</i> {previewJob.location}
                                </span>
                                <span className="preview-job-type">
                                    <i className="type-icon">🕒</i> {previewJob.jobType}
                                </span>
                                {previewJob.salary && (
                                    <span className="preview-job-salary">
                                        <i className="salary-icon">💰</i> {previewJob.salary}
                                    </span>
                                )}
                            </div>
                        </div>
                        
                        <div className="job-preview-content">
                            <div className="candidate-job-preview-scroll-area">
                                <div className="candidate-job-preview-mobile-meta">
                                    <span><strong>Job Number:</strong> {previewJob.jobNumber || 'Generating...'}</span>
                                    <span><strong>Company:</strong> {previewJob.company.name}</span>
                                    <span><strong>Location:</strong> {previewJob.location || 'Not specified'}</span>
                                    <span><strong>Type:</strong> {previewJob.jobType || 'Not specified'}</span>
                                    {previewJob.salary && <span><strong>Salary:</strong> {previewJob.salary}</span>}
                                </div>
                            <div className="preview-section">
                                <h3>Description</h3>
                                <p>{previewJob.description}</p>
                            </div>

                            {previewJob.requirements && previewJob.requirements.length > 0 && (
                                <div className="preview-section">
                                    <h3>Requirements</h3>
                                    {formatList(previewJob.requirements)}
                                </div>
                            )}

                            {previewJob.responsibilities && previewJob.responsibilities.length > 0 && (
                                <div className="preview-section">
                                    <h3>Responsibilities</h3>
                                    {formatList(previewJob.responsibilities)}
                                </div>
                            )}
                            
                            {previewJob.skills && previewJob.skills.length > 0 && (
                                <div className="preview-section">
                                    <h3>Skills</h3>
                                    <div className="preview-skills">
                                        {previewJob.skills.map((skill, index) => {
                                            const isMatch = candidateSkills.some(s => 
                                                    s.toLowerCase() === skill.toLowerCase()
                                            );
                                            
                                            return (
                                                <span 
                                                    key={index} 
                                                    className={`skill-tag ${isMatch ? 'skill-match' : ''}`}
                                                >
                                                    {skill}
                                                    {isMatch && <span className="match-icon">✓</span>}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="preview-section">
                                <h3>About the Company</h3>
                                <p>
                                    {previewJob.company.description || 
                                     `${previewJob.company.name} is currently hiring for this position.`}
                                </p>
                                {previewJob.company.headquarters && (
                                    <p><strong>Headquarters:</strong> {previewJob.company.headquarters}</p>
                                )}
                                {previewJob.company.website && (
                                    <p>
                                        <strong>Website:</strong> 
                                        <a 
                                            href={previewJob.company.website.startsWith('http') ? 
                                                previewJob.company.website : 
                                                `https://${previewJob.company.website}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="company-website-link"
                                        >
                                            {previewJob.company.website}
                                        </a>
                                    </p>
                                )}
                            </div>
                            </div>
                            {companyError && <div className="error-message">{companyError}</div>}
                            <div className="job-preview-actions job-preview-actions-inline candidate-job-preview-actions">
                                <div className="preview-action-buttons">
                                    <button
                                        className="preview-company-button"
                                        onClick={handleViewCompany}
                                        disabled={companyLoading}
                                    >
                                        {companyLoading ? 'Opening...' : 'View Company'}
                                    </button>
                                    <button
                                        className="preview-apply-button"
                                        onClick={(e) => handleApplyClick(previewJob, e)}
                                        disabled={appliedJobIds.includes(String(previewJob._id))}
                                    >
                                        {appliedJobIds.includes(String(previewJob._id)) ? 'Applied' : 'Apply for this Job'}
                                    </button>
                                    <button
                                        className={`preview-bookmark-button ${bookmarkedJobIds.includes(String(previewJob._id)) ? 'active' : ''}`}
                                        onClick={(e) => handleToggleBookmark(previewJob, e)}
                                    >
                                        {bookmarkedJobIds.includes(String(previewJob._id)) ? 'Bookmarked' : 'Bookmark Job'}
                                    </button>
                                </div>
                                <div className="preview-post-date">
                                    Posted: {new Date(previewJob.createdAt).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ), document.body)}
            {applicationJob && createPortal((
                <div className="application-workspace-overlay" onClick={handleCancelApplication}>
                    <div className="application-workspace-modal" ref={applicationModalRef} onClick={(event) => event.stopPropagation()}>
                        <div className="application-workspace-header">
                            <div>
                                <h3>Apply to: {applicationJob.title}</h3>
                                <p>{applicationJob.company?.name || 'Company unavailable'}</p>
                            </div>
                            <button type="button" className="preview-close-btn" onClick={handleCancelApplication}>×</button>
                        </div>
                        <div className="application-workspace-body">
                            <div className="application-form-section">
                                <h4>Cover Letter</h4>
                                <RichTextEditor
                                    value={coverLetterHtml}
                                    onChange={setCoverLetterHtml}
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="application-form-section">
                                <h4>Message</h4>
                                <textarea
                                    value={applicationMessage}
                                    onChange={(e) => setApplicationMessage(e.target.value)}
                                    placeholder="Include a message with your application..."
                                    className="application-message"
                                    rows="5"
                                />
                            </div>
                            <div className="application-form-section">
                                <h4>Profile Snapshot</h4>
                                <div className="application-profile-grid">
                                    <label className="application-profile-field">
                                        <span>Full Name</span>
                                        <input type="text" name="name" value={applicationProfile.name} onChange={handleApplicationProfileChange} disabled={isSubmitting} />
                                    </label>
                                    <label className="application-profile-field">
                                        <span>Email</span>
                                        <input type="email" name="email" value={applicationProfile.email} onChange={handleApplicationProfileChange} disabled={isSubmitting} />
                                    </label>
                                    <label className="application-profile-field application-profile-field-full">
                                        <span>Skills</span>
                                        <input type="text" name="skills" value={applicationProfile.skills} onChange={handleApplicationProfileChange} disabled={isSubmitting} />
                                    </label>
                                    <label className="application-profile-field">
                                        <span>Interests</span>
                                        <input type="text" name="interests" value={applicationProfile.interests} onChange={handleApplicationProfileChange} disabled={isSubmitting} />
                                    </label>
                                    <label className="application-profile-field">
                                        <span>Hobbies</span>
                                        <input type="text" name="hobbies" value={applicationProfile.hobbies} onChange={handleApplicationProfileChange} disabled={isSubmitting} />
                                    </label>
                                    <label className="application-profile-field application-profile-field-full">
                                        <span>Education</span>
                                        <textarea name="education" value={applicationProfile.education} onChange={handleApplicationProfileChange} rows="4" disabled={isSubmitting} />
                                    </label>
                                    <label className="application-profile-field application-profile-field-full">
                                        <span>Experience</span>
                                        <textarea name="experience" value={applicationProfile.experience} onChange={handleApplicationProfileChange} rows="5" disabled={isSubmitting} />
                                    </label>
                                    <label className="application-profile-field application-profile-field-full">
                                        <span>Achievements</span>
                                        <textarea name="achievements" value={applicationProfile.achievements} onChange={handleApplicationProfileChange} rows="4" disabled={isSubmitting} />
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="application-workspace-actions">
                            <button className="submit-application-button" onClick={() => handleApplySubmit(applicationJob._id)} disabled={isSubmitting}>
                                {isSubmitting ? 'Submitting...' : 'Submit Application'}
                            </button>
                            <button className="secondary-button" onClick={handleSaveDraft} disabled={isSubmitting}>
                                {activeDraftId ? 'Update Draft' : 'Save Draft'}
                            </button>
                            <button className="secondary-button" onClick={handleCancelApplication} disabled={isSubmitting}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            ), document.body)}
        </div>
    );
};

export default JobFeed;
