import React from 'react';

const AppModeCard = () => {
    return (
        <div className="settings-card app-mode-card">
            <div className="app-mode-copy">
                <h3>App Mode</h3>
                <p>JumpTake currently uses its clean light mode across both portals.</p>
                <p className="app-mode-development-note">
                    Dark mode is under development and is temporarily unavailable.
                </p>
            </div>
            <label className="app-mode-switch">
                <input
                    type="checkbox"
                    checked
                    disabled
                    readOnly
                    aria-label="Light mode enabled. Dark mode is under development."
                />
                <span className="app-mode-switch-track">
                    <span className="app-mode-switch-thumb"></span>
                </span>
                <span className="app-mode-switch-label">Light Mode</span>
            </label>
        </div>
    );
};

export default AppModeCard;
