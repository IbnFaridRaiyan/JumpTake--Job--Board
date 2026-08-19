import React from 'react';

const isDocMimeType = (mimeType = '') => (
    mimeType.includes('msword')
    || mimeType.includes('officedocument.wordprocessingml.document')
);

const ResumeFilePreview = ({ resume, className = '' }) => {
    if (!resume) {
        return null;
    }

    const fileName = typeof resume.fileName === 'string' && resume.fileName.trim() ? resume.fileName : 'Uploaded resume';
    const mimeType = typeof resume.mimeType === 'string' ? resume.mimeType : '';
    const dataUrl = typeof resume.dataUrl === 'string' ? resume.dataUrl : '';
    const legacyText = typeof resume.text === 'string'
        ? resume.text
        : Array.isArray(resume.text)
            ? resume.text.map((item) => String(item || '')).filter(Boolean).join('\n')
            : '';

    const isImage = mimeType.startsWith('image/');
    const isPdf = mimeType.includes('pdf');
    const isText = mimeType.startsWith('text/');
    const isDoc = isDocMimeType(mimeType);

    return (
        <div className={`application-uploaded-resume-preview ${className}`.trim()}>
            <div className="application-uploaded-resume-meta">
                <strong>{fileName}</strong>
            </div>

            {dataUrl ? (
                <div className="resume-file-preview-shell">
                    {isImage ? (
                        <img src={dataUrl} alt={fileName} className="resume-file-preview-image" />
                    ) : (
                        <iframe
                            src={dataUrl}
                            title={fileName}
                            className={`resume-file-preview-frame ${isDoc ? 'is-doc-preview' : ''} ${isPdf ? 'is-pdf-preview' : ''} ${isText ? 'is-text-preview' : ''}`.trim()}
                        />
                    )}
                </div>
            ) : (
                <pre>{legacyText}</pre>
            )}
        </div>
    );
};

export default ResumeFilePreview;
