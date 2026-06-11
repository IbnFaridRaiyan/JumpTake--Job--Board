import React from 'react';

const AnimatedDeleteButton = ({
    onClick,
    disabled = false,
    title = 'Delete',
    className = '',
    type = 'button'
}) => (
    <button
        type={type}
        className={`delete-button ${className}`.trim()}
        onClick={onClick}
        disabled={disabled}
        title={title}
        aria-label={title}
    >
        <svg className="trash-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <g id="lid-group" className="lid-group">
                <path d="M22 18H42" stroke="#ff4d4f" strokeWidth="4" strokeLinecap="round" />
                <path d="M27 14H37" stroke="#ff4d4f" strokeWidth="4" strokeLinecap="round" />
            </g>
            <path d="M20 24H44" stroke="#ff4d4f" strokeWidth="4" strokeLinecap="round" />
            <path d="M24 24L26 50H38L40 24" stroke="#ff4d4f" strokeWidth="4" strokeLinejoin="round" />
            <path d="M30 30V45M35 30V45" stroke="#ff4d4f" strokeWidth="3" strokeLinecap="round" />
        </svg>
    </button>
);

export default AnimatedDeleteButton;
