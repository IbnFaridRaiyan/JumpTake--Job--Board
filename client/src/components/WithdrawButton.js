import React from 'react';

const WithdrawButton = ({ onClick, disabled = false, title = 'Withdraw' }) => (
    <button
        type="button"
        className="withdraw-uiverse-button"
        onClick={onClick}
        disabled={disabled}
        title={title}
    >
        <span className="withdraw-uiverse-button__text">Withdraw</span>
        <span className="withdraw-uiverse-button__icon">
            <svg className="svg" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path fill="#ffffff" d="M135.2 17.7C140.6 6.8 151.7 0 163.8 0h120.4c12.1 0 23.2 6.8 28.6 17.7L320 32h96c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 96 0 81.7 0 64s14.3-32 32-32h96l7.2-14.3zM32 128h384l-21.2 339c-1.6 25.3-22.6 45-47.9 45H101.1c-25.3 0-46.3-19.7-47.9-45L32 128zm112 80c-8.8 0-16 7.2-16 16v192c0 8.8 7.2 16 16 16s16-7.2 16-16V224c0-8.8-7.2-16-16-16zm80 0c-8.8 0-16 7.2-16 16v192c0 8.8 7.2 16 16 16s16-7.2 16-16V224c0-8.8-7.2-16-16-16zm80 0c-8.8 0-16 7.2-16 16v192c0 8.8 7.2 16 16 16s16-7.2 16-16V224c0-8.8-7.2-16-16-16z" />
            </svg>
        </span>
    </button>
);

export default WithdrawButton;
