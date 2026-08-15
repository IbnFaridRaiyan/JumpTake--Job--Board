import React from 'react';
import { Link } from 'react-router-dom';
import TutorialLibrary from './TutorialLibrary';
import lightLogo from './media/jumptake-logo-9.png';
import darkLogo from './media/logo4.png';

const TutorialPage = ({ theme = 'dark', onThemeChange }) => {
    const activeTheme = theme === 'light' ? 'light' : 'dark';

    return (
        <div className={`tutorial-public-page is-${activeTheme}`}>
            <header className="tutorial-public-nav">
                <Link to="/" className="tutorial-public-brand" aria-label="JumpTake home">
                    <img src={activeTheme === 'light' ? lightLogo : darkLogo} alt="JumpTake" />
                </Link>
                <div className="tutorial-public-actions">
                    <button
                        type="button"
                        className="tutorial-theme-button"
                        onClick={() => onThemeChange?.(activeTheme === 'dark' ? 'light' : 'dark')}
                        aria-label={`Switch to ${activeTheme === 'dark' ? 'light' : 'dark'} mode`}
                        title={`Switch to ${activeTheme === 'dark' ? 'light' : 'dark'} mode`}
                    >
                        {activeTheme === 'dark' ? 'Light' : 'Dark'}
                    </button>
                    <Link to="/" className="tutorial-back-link">Back to home</Link>
                </div>
            </header>
            <TutorialLibrary />
        </div>
    );
};

export default TutorialPage;
