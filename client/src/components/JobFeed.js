import React, { useState, useEffect } from 'react';

const JobFeed = ({ jobs, error, userId, onRefresh, jobSeekerData }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [applyingToJobId, setApplyingToJobId] = useState(null);
    const [applicationMessage, setApplicationMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [recommendedJobs, setRecommendedJobs] = useState([]);
    const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
    const [activeTab, setActiveTab] = useState('all'); 
    
    
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
        if (jobSeekerData && jobSeekerData.skills && jobSeekerData.skills.length > 0) {
            fetchRecommendedJobs();
        }
    }, [jobSeekerData, jobs]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (previewJob && event.target.classList.contains('job-preview-overlay')) {
                setPreviewJob(null);
            }
        }
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [previewJob]);

    useEffect(() => {
        if (previewJob) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [previewJob]);

    const fetchRecommendedJobs = async () => {
        if (!jobSeekerData || !jobSeekerData._id) {
            return;
        }

        setIsLoadingRecommendations(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/jobs/recommendations/${jobSeekerData._id}`, {
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
    
    const handleJobClick = (job) => {
        if (applyingToJobId === job._id) {
            return; 
        }
        setPreviewJob(job);
    };
    
    const handleApplyClick = (jobId, event) => {
        if (event) {
            event.stopPropagation(); 
        }
        setApplyingToJobId(jobId);
        setApplicationMessage('');
        setPreviewJob(null); 
    };
    
    const handleCancelApplication = () => {
        setApplyingToJobId(null);
        setApplicationMessage('');
    };
    
    const handleApplySubmit = async (jobId) => {
        if (!applicationMessage.trim()) {
            setMessage('Please include a message with your application');
            return;
        }
        
        setIsSubmitting(true);
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/applications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    jobId,
                    userId,
                    message: applicationMessage
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to submit application');
            }
            
            setMessage('Application submitted successfully!');
            setApplyingToJobId(null);
            setApplicationMessage('');
            
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

    const closePreview = () => {
        setPreviewJob(null);
    };

    const getMatchScore = (job) => {
        if (!jobSeekerData || !jobSeekerData.skills || !job.skills) return 0;
        
        const userSkills = jobSeekerData.skills;
        const jobSkills = job.skills;
        
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
                    {jobSeekerData && jobSeekerData.skills && jobSeekerData.skills.length > 0 && (
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
                        displayedJobs.map(job => {
                            const matchScore = getMatchScore(job);
                            const hasMatchScore = activeTab === 'all' && matchScore > 0 && jobSeekerData && jobSeekerData.skills;
                            
                            return (
                                <div 
                                    className={`job-card ${hasMatchScore ? 'has-match' : ''}`} 
                                    key={job._id}
                                    onClick={() => handleJobClick(job)}
                                >
                                    {applyingToJobId === job._id ? (
                                        <div className="application-form" onClick={e => e.stopPropagation()}>
                                            <h3>Apply to: {job.title}</h3>
                                            <textarea
                                                value={applicationMessage}
                                                onChange={(e) => setApplicationMessage(e.target.value)}
                                                placeholder="Include a message with your application..."
                                                className="application-message"
                                                rows="5"
                                            />
                                            <div className="application-buttons">
                                                <button 
                                                    className="submit-application-button"
                                                    onClick={() => handleApplySubmit(job._id)}
                                                    disabled={isSubmitting}
                                                >
                                                    {isSubmitting ? 'Submitting...' : 'Submit Application'}
                                                </button>
                                                <button 
                                                    className="secondary-button"
                                                    onClick={handleCancelApplication}
                                                    disabled={isSubmitting}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="job-card-header">
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
                                                <p className="job-location">{job.location}</p>
                                                <p className="job-type">{job.jobType}</p>
                                                {job.salary && <p className="job-salary">{job.salary}</p>}
                                                <p className="job-description">{job.description.substring(0, 150)}...</p>
                                                
                                                {job.skills && job.skills.length > 0 && (
                                                    <div className="job-skills">
                                                        <strong>Skills:</strong> 
                                                        <div className="skill-tags">
                                                            {job.skills.map((skill, index) => {
                                                                const isMatch = jobSeekerData && 
                                                                    Array.isArray(jobSeekerData.skills) && 
                                                                    jobSeekerData.skills.some(s => 
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
                                                    onClick={(e) => handleApplyClick(job._id, e)}
                                                >
                                                    Apply Now
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="no-jobs-message">
                            <h3>No job listings available at this time</h3>
                            <p>Please check back later for new opportunities or try a different search.</p>
                        </div>
                    )}
                </div>
            )}

            {previewJob && (
                <div className="job-preview-overlay">
                    <div className="job-preview-modal" onClick={(e) => e.stopPropagation()}>
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
                                            const isMatch = jobSeekerData && 
                                                Array.isArray(jobSeekerData.skills) && 
                                                jobSeekerData.skills.some(s => 
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
                        
                        <div className="job-preview-actions">
                            <button 
                                className="preview-apply-button" 
                                onClick={(e) => handleApplyClick(previewJob._id, e)}
                            >
                                Apply for this Job
                            </button>
                            <div className="preview-post-date">
                                Posted: {new Date(previewJob.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobFeed;