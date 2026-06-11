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
                            <p>Use Job Feed and Interested Job Suggession to tune recommendations around your preferred roles.</p>
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
