import React, { useState } from 'react';

const TermsAgreement = ({ accepted, onAcceptedChange, disabled = false }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="terms-agreement">
            <label className="gl-checkbox">
                <input
                    type="checkbox"
                    className="gl-checkbox__input"
                    checked={accepted}
                    onChange={(event) => onAcceptedChange(event.target.checked)}
                    disabled={disabled}
                />
                <span className="gl-checkbox__box" aria-hidden="true">
                    <svg className="gl-checkbox__check" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12.5 10 17l9-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </span>
                <span className="gl-checkbox__label">
                    <button
                        type="button"
                        className="terms-inline-button"
                        onClick={(event) => {
                            event.preventDefault();
                            setIsOpen(true);
                        }}
                    >
                        Terms and Conditions
                    </button>
                </span>
            </label>

            {isOpen && (
                <div className="terms-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="terms-modal-title">
                    <div className="terms-modal">
                        <div className="terms-modal-header">
                            <h2 id="terms-modal-title">Terms and Conditions</h2>
                            <button type="button" className="terms-modal-close" onClick={() => setIsOpen(false)} aria-label="Close terms">
                                ×
                            </button>
                        </div>
                        <div className="terms-modal-body">
                            <h3>1. User Agreement</h3>
                            <p>By accessing or using JumpTake, you agree to comply with these Terms and Conditions. If you do not agree, please do not use the platform.</p>

                            <h3>2. Privacy Policy</h3>
                            <p>Your privacy matters to us. Personal information collected through JumpTake is handled according to our Privacy Policy and used to provide account, job, application, assessment, and messaging features.</p>

                            <h3>3. Account Responsibilities</h3>
                            <p>You are responsible for keeping your login details secure and for making sure the information you submit is accurate and lawful.</p>

                            <h3>4. Content and Communication</h3>
                            <p>Resumes, job posts, assessments, messages, and profile content must be truthful, respectful, and relevant to hiring or career networking.</p>

                            <h3>5. Platform Use</h3>
                            <p>JumpTake may update, suspend, or remove features or accounts when needed to protect users, comply with law, or maintain the service.</p>
                        </div>
                        <button type="button" className="settings-button primary terms-modal-accept" onClick={() => setIsOpen(false)}>
                            Continue
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TermsAgreement;
