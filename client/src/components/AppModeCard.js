import React from 'react';

const AppModeCard = ({ appMode = 'dark', onAppModeChange }) => {
    const isLightMode = appMode === 'light';

    const handleToggle = () => {
        if (onAppModeChange) {
            onAppModeChange(isLightMode ? 'dark' : 'light');
        }
    };

    return (
        <div className="settings-card app-mode-card">
            <div className="app-mode-copy">
                <h3>App Mode</h3>
                <p>Switch between the current dark mode and a clean light mode across JumpTake.</p>
            </div>
            <label className="app-mode-switch">
                <input
                    type="checkbox"
                    checked={isLightMode}
                    onChange={handleToggle}
                    aria-label="Toggle light mode"
                />
                <span className="app-mode-switch-track">
                    <span className="app-mode-switch-thumb"></span>
                </span>
                <span className="app-mode-switch-label">{isLightMode ? 'Light Mode' : 'Dark Mode'}</span>
            </label>
        </div>
    );
};

export default AppModeCard;
