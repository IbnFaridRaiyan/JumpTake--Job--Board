import React from 'react';

const MobileChatComposer = ({
    value,
    onChange,
    onSubmit,
    inputRef,
    placeholder = 'Write a message',
    disabled = false,
    sendDisabled = false,
    className = '',
    ariaLabel = 'Message'
}) => {
    const submitComposer = (event) => {
        event.preventDefault();
        if (!sendDisabled) onSubmit?.(event);
    };

    return (
        <form
            className={`mobile-chat-composer ${className}`.trim()}
            onSubmit={submitComposer}
            data-mobile-chat-composer="true"
        >
            <label className="mobile-chat-composer-field">
                <textarea
                    ref={inputRef}
                    value={value}
                    onChange={(event) => onChange?.(event.target.value)}
                    rows={1}
                    enterKeyHint="send"
                    inputMode="text"
                    placeholder={placeholder}
                    aria-label={ariaLabel}
                    disabled={disabled}
                />
            </label>
            <button
                type="submit"
                className="mobile-chat-composer-send"
                disabled={sendDisabled}
                aria-label="Send message"
                title="Send message"
            >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3.5 4.5 21 12 3.5 19.5l2-6.1L14 12l-8.5-1.4-2-6.1Z" />
                </svg>
            </button>
        </form>
    );
};

export default MobileChatComposer;
