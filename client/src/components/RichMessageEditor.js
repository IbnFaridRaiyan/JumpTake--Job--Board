import React, { useEffect, useRef, useState } from 'react';

const emojiContext = require.context('./media/emos', false, /\.png$/);
const emojiOptions = emojiContext.keys().map((key) => ({
    src: emojiContext(key),
    name: key.replace('./', '').replace('.png', '')
}));

const toolbarActions = [
    { command: 'bold', label: 'B', title: 'Bold' },
    { command: 'italic', label: 'I', title: 'Italic' },
    { command: 'underline', label: 'U', title: 'Underline' },
    { command: 'justifyLeft', label: 'Left', title: 'Align left' },
    { command: 'justifyCenter', label: 'Center', title: 'Align center' },
    { command: 'justifyRight', label: 'Right', title: 'Align right' },
    { command: 'insertUnorderedList', label: 'Bullets', title: 'Bullet list' },
    { command: 'undo', label: 'Undo', title: 'Undo' },
    { command: 'redo', label: 'Redo', title: 'Redo' },
    { command: 'removeFormat', label: 'Clear', title: 'Clear formatting' }
];

const RichMessageEditor = ({
    value,
    onChange,
    placeholder = 'Write a message...',
    messageBox = false,
    onSubmit,
    submitting = false,
    submitLabel = 'Send'
}) => {
    const editorRef = useRef(null);
    const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    const runCommand = (command) => {
        editorRef.current?.focus();
        document.execCommand(command, false, null);
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const insertEmoji = (emoji) => {
        editorRef.current?.focus();
        document.execCommand(
            'insertHTML',
            false,
            `<img src="${emoji.src}" alt="${emoji.name}" class="chat-emoji-inline" />`
        );
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
        setEmojiPickerOpen(false);
    };

    const handleSubmit = () => {
        if (onSubmit && !submitting) {
            onSubmit();
        }
    };

    return (
        <div className={`rich-message-editor ${messageBox ? 'rich-message-editor-messagebox' : ''}`}>
            <div className="rich-message-toolbar" aria-label="Message formatting toolbar">
                {toolbarActions.map((action) => (
                    <button
                        key={action.command}
                        type="button"
                        title={action.title}
                        onClick={() => runCommand(action.command)}
                    >
                        {action.label}
                    </button>
                ))}
            </div>
            {messageBox ? (
                <div className="messageBox">
                    <div className="fileUploadWrapper emojiUploadWrapper">
                        <button
                            type="button"
                            className="emoji-trigger-button"
                            onClick={() => setEmojiPickerOpen((isOpen) => !isOpen)}
                            aria-label="Add emoji"
                        >
                            <span className="tooltip">Add emoji</span>
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
                                <circle cx="9" cy="10" r="1.2" fill="currentColor" />
                                <circle cx="15" cy="10" r="1.2" fill="currentColor" />
                                <path d="M8.5 14.5c1.1 1.4 2.2 2 3.5 2s2.4-.6 3.5-2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            </svg>
                        </button>
                        {emojiPickerOpen && (
                            <div className="emoji-picker-popover">
                                {emojiOptions.map((emoji) => (
                                    <button
                                        type="button"
                                        key={emoji.name}
                                        className="emoji-picker-option"
                                        onClick={() => insertEmoji(emoji)}
                                        aria-label={emoji.name}
                                    >
                                        <img src={emoji.src} alt="" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div
                        ref={editorRef}
                        className="rich-message-input messageInput"
                        contentEditable
                        role="textbox"
                        aria-label={placeholder}
                        data-placeholder={placeholder}
                        onInput={() => onChange(editorRef.current?.innerHTML || '')}
                        suppressContentEditableWarning
                    />
                    <button
                        type="button"
                        className="sendButton"
                        onClick={handleSubmit}
                        disabled={submitting}
                        aria-label={submitLabel}
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M3 20 21 12 3 4v6l10 2-10 2v6Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>
            ) : (
                <div
                    ref={editorRef}
                    className="rich-message-input"
                    contentEditable
                    role="textbox"
                    aria-label={placeholder}
                    data-placeholder={placeholder}
                    onInput={() => onChange(editorRef.current?.innerHTML || '')}
                    suppressContentEditableWarning
                />
            )}
        </div>
    );
};

export default RichMessageEditor;
