import React, { useEffect, useState } from 'react';

const StarLayer = ({ className }) => (
    <div className={className} aria-hidden="true">
        <div className="jt-space-star jt-star-position1"></div>
        <div className="jt-space-star jt-star-position2"></div>
        <div className="jt-space-star jt-star-position3"></div>
        <div className="jt-space-star jt-star-position4"></div>
        <div className="jt-space-star jt-star-position5"></div>
        <div className="jt-space-star jt-star-position6"></div>
        <div className="jt-space-star jt-star-position7"></div>
    </div>
);

const Astronaut = () => (
    <div className="jt-astronaut" aria-hidden="true">
        <div className="jt-schoolbag"></div>
        <div className="jt-head"></div>
        <div className="jt-body">
            <div className="jt-panel"></div>
        </div>
        <div className="jt-arm jt-arm-left"></div>
        <div className="jt-arm jt-arm-right"></div>
        <div className="jt-leg jt-leg-left"></div>
        <div className="jt-leg jt-leg-right"></div>
    </div>
);

const AboutJumpTake = ({ mode = 'candidate' }) => {
    const ratingStorageKey = `jumptake-about-rating-${mode}`;
    const [rating, setRating] = useState(0);

    useEffect(() => {
        const savedRating = Number(localStorage.getItem(ratingStorageKey) || 0);
        if (savedRating >= 1 && savedRating <= 5) {
            setRating(savedRating);
        }
    }, [ratingStorageKey]);

    const saveRating = (nextRating) => {
        setRating(nextRating);
        localStorage.setItem(ratingStorageKey, String(nextRating));
    };

    const tourItems = mode === 'employer'
        ? [
            ['Dashboard', 'See active listings, new applicants, and quick links into the hiring workspace.'],
            ['Post a Job', 'Create job listings with skills, requirements, responsibilities, salary, and company details.'],
            ['Manage Jobs', 'Open a posted job, view/edit it, review applicants, build assessments, invite candidates, and move people through hold, reject, hire, and interview lists.'],
            ['Make an Assessment', 'Create reusable assessments and save them to a job or to your general library.'],
            ['General Assessment', 'Send saved general assessments to selected jobs when you need them later.'],
            ['Talent Pool', 'Browse candidate profiles, bookmark candidates, like profiles, and contact people directly.'],
            ['Bookmarked Talents', 'Review saved candidates and remove bookmarks when they are no longer needed.'],
            ['Inbox', 'Open conversations, reply with formatted messages, and keep candidate communication in one place.'],
            ['Company Profile', 'Maintain public company information candidates see when they inspect your jobs.'],
            ['Application Tracking System', 'Check hiring analytics, application rates, job posting rates, and assessment activity.'],
            ['Settings', 'Update account, contact, security, and notification preferences.']
        ]
        : [
            ['Job Feed', 'Browse jobs, preview details, view companies, apply, and bookmark roles.'],
            ['Inbox', 'Open employer and candidate conversations, then reply from a messenger-style chat box.'],
            ['View Candidates', 'Browse other candidate profiles, bookmark them, like them, and send messages.'],
            ['Bookmarked Candidates', 'Return to saved candidate profiles and remove candidates from the list.'],
            ['My Applications', 'Track submitted applications, view details, and withdraw when needed.'],
            ['My Assessments', 'Complete assessment invitations sent by employers.'],
            ['Video Interviews', 'Review interview invitations and select available interview dates.'],
            ['Draft Applications', 'Resume unfinished applications.'],
            ['Bookmarked Jobs', 'Return to jobs saved from the feed.'],
            ['Job Preferences', 'Update job interests so recommendations match your preferred roles.'],
            ['Tailor Profile', 'Edit your complete education, experience, skills, achievements, and interests from the Home feed.'],
            ['Progress Check', 'View application, search, skill-match, employer-view, and response analytics.'],
            ['Settings', 'Update account, security, notifications, and contact preferences.']
        ];

    return (
        <div className="about-jumptake-section">
            <div className="about-space-corner">
                <StarLayer className="jt-box-of-star1" />
                <StarLayer className="jt-box-of-star2" />
                <StarLayer className="jt-box-of-star3" />
                <StarLayer className="jt-box-of-star4" />
                <Astronaut />
            </div>

            <div className="about-jumptake-content">
                <span className="about-jumptake-kicker">JumpTake Guide</span>
                <h2>About JumpTake</h2>
                <p>
                    JumpTake connects candidates and employers through job posts, applications,
                    assessments, interviews, bookmarks, and direct inbox messaging.
                </p>

                {mode === 'employer' ? (
                    <div className="about-guide-grid">
                        <article>
                            <h3>Post and manage jobs</h3>
                            <p>Create job listings, edit them anytime, and manage applicants from the Manage Jobs workspace.</p>
                        </article>
                        <article>
                            <h3>Assess candidates</h3>
                            <p>Build assessments, send invitations, review completed answers, and shortlist candidates for interviews.</p>
                        </article>
                        <article>
                            <h3>Keep track</h3>
                            <p>Use Talent Pool, Bookmarked Talents, Inbox, and status lists to organize hiring decisions.</p>
                        </article>
                    </div>
                ) : (
                    <div className="about-guide-grid">
                        <article>
                            <h3>Find matched jobs</h3>
                            <p>Use Job Feed and Job Preferences to tune recommendations around your preferred roles.</p>
                        </article>
                        <article>
                            <h3>Apply and follow up</h3>
                            <p>Submit applications, view status updates, complete assessments, and manage video interview invitations.</p>
                        </article>
                        <article>
                            <h3>Stay organized</h3>
                            <p>Bookmark jobs, check Inbox messages, update your profile, and adjust account settings from your dashboard.</p>
                        </article>
                    </div>
                )}

                <button
                    type="button"
                    className="settings-button primary about-tour-button"
                    onClick={() => window.dispatchEvent(new CustomEvent('jumptake-start-guided-tour', {
                        detail: { mode, sectionCount: tourItems.length }
                    }))}
                >
                    Give a tour
                </button>

                <div className="about-rating-card">
                    <h3>Rate this demo experience</h3>
                    <div className="rating" aria-label="Rate JumpTake">
                        {[5, 4, 3, 2, 1].map((value) => (
                            <React.Fragment key={value}>
                                <input
                                    type="radio"
                                    id={`about-rating-${mode}-${value}`}
                                    name={`about-rating-${mode}`}
                                    checked={rating === value}
                                    onChange={() => saveRating(value)}
                                />
                                <label htmlFor={`about-rating-${mode}-${value}`} aria-label={`${value} stars`}></label>
                            </React.Fragment>
                        ))}
                    </div>
                    {rating > 0 && <p className="about-rating-saved">Saved rating: {rating}/5</p>}
                </div>
            </div>

        </div>
    );
};

export default AboutJumpTake;
