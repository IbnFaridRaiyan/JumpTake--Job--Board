import React from 'react';

const AppModeCard = ({ appMode = 'light', onAppModeChange }) => {
    const isLightMode = appMode !== 'dark';
    const modeLabel = isLightMode ? 'Light Mode' : 'Dark Mode';

    const handleModeChange = (event) => {
        onAppModeChange?.(event.target.checked ? 'light' : 'dark');
    };

    return (
        <div className="settings-card app-mode-card">
            <div className="app-mode-copy">
                <h3>App Mode</h3>
                <p>Choose the appearance used across your JumpTake portal.</p>
            </div>
            <label className="app-mode-switch">
                <input
                    type="checkbox"
                    checked={isLightMode}
                    onChange={handleModeChange}
                    aria-label={`Switch to ${isLightMode ? 'dark' : 'light'} mode`}
                />
                <span className="app-mode-switch-track">
                    <span className="app-mode-switch-thumb"></span>
                </span>
                <span className="app-mode-switch-label">{modeLabel}</span>
            </label>
        </div>
    );
};

export default AppModeCard;
