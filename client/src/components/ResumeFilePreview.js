import React from 'react';

const isDocMimeType = (mimeType = '') => (
    mimeType.includes('msword')
    || mimeType.includes('officedocument.wordprocessingml.document')
);

const ResumeFilePreview = ({ resume, className = '' }) => {
    if (!resume) {
        return null;
    }

    const fileName = resume.fileName || 'Uploaded resume';
    const mimeType = resume.mimeType || '';
    const dataUrl = resume.dataUrl || '';
    const legacyText = resume.text || '';

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

                    <div className="resume-file-preview-actions">
                        <a
                            href={dataUrl}
                            download={fileName}
                            className="secondary-button resume-file-preview-link"
                        >
                            Download Resume
                        </a>
                    </div>
                </div>
            ) : (
                <pre>{legacyText}</pre>
            )}
        </div>
    );
};

export default ResumeFilePreview;
