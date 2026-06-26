import React from 'react';

const PortalAiSearchIcon = () => (
    <svg className="portal-ai-top-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
    </svg>
);

const PortalAiButton = ({ onClick }) => (
    <button
        type="button"
        className="portal-ai-top-button"
        onClick={onClick}
        aria-label="Ask JumpTake AI"
        title="Ask JumpTake AI"
    >
        <PortalAiSearchIcon />
    </button>
);

export default PortalAiButton;
