import React, { useEffect, useRef } from 'react';

const toolbarActions = [
    { command: 'bold', label: 'B', title: 'Bold' },
    { command: 'italic', label: 'I', title: 'Italic' },
    { command: 'underline', label: 'U', title: 'Underline' },
    { command: 'justifyLeft', label: 'Left', title: 'Align left' },
    { command: 'justifyCenter', label: 'Center', title: 'Align center' },
    { command: 'justifyRight', label: 'Right', title: 'Align right' },
    { command: 'insertUnorderedList', label: 'Bullets', title: 'Bullet list' },
    { command: 'insertOrderedList', label: 'Numbers', title: 'Numbered list' },
    { command: 'undo', label: 'Undo', title: 'Undo' },
    { command: 'redo', label: 'Redo', title: 'Redo' },
    { command: 'removeFormat', label: 'Clear', title: 'Clear formatting' }
];

const RichMessageEditor = ({ value, onChange, placeholder = 'Write a message...' }) => {
    const editorRef = useRef(null);

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

    return (
        <div className="rich-message-editor">
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
        </div>
    );
};

export default RichMessageEditor;
