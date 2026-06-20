import React, { useState } from 'react';
import RichMessageEditor from './RichMessageEditor';

const stripHtml = (html = '') => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const ContactCandidate = ({ companyId, candidate, onSent, mode = 'employer', currentUserId }) => {
    const [open, setOpen] = useState(false);
    const [messageHtml, setMessageHtml] = useState('');
    const [sending, setSending] = useState(false);
    const [notice, setNotice] = useState('');

    const sendMessage = async () => {
        if (!stripHtml(messageHtml)) {
            setNotice('Write a message before sending.');
            return;
        }

        setSending(true);
        setNotice('');

        try {
            const isCandidateMode = mode === 'candidate';
            const token = localStorage.getItem(isCandidateMode ? 'token' : 'employerToken');
            const endpoint = isCandidateMode ? '/api/messages/candidate-direct' : '/api/messages';
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(isCandidateMode
                    ? {
                        senderUserId: currentUserId,
                        recipientCandidateId: candidate?._id,
                        bodyHtml: messageHtml
                    }
                    : {
                        companyId,
                        candidateId: candidate?._id,
                        senderType: 'employer',
                        bodyHtml: messageHtml
                    })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send message');
            }

            setMessageHtml('');
            setOpen(false);
            setNotice('Message sent successfully.');
            if (onSent) {
                onSent(data);
            }
        } catch (sendError) {
            console.error('Error contacting candidate:', sendError);
            setNotice(`Error: ${sendError.message}`);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className={`contact-candidate-panel ${mode === 'candidate' ? 'candidate-contact-panel' : ''}`}>
            <button className="settings-button primary" type="button" onClick={() => setOpen((prev) => !prev)}>
                {mode === 'candidate' ? 'Message Candidate' : 'Contact Candidate'}
            </button>

            {notice && (
                <div className={`notification-message ${notice.includes('Error') ? 'error' : 'success'}`}>
                    {notice}
                </div>
            )}

            {open && (
                <div className="message-compose-card">
                    {mode === 'candidate' && (
                        <p className="message-compose-note">
                            You can send one introduction message first. A full conversation opens once the other candidate replies or accepts your friend invitation.
                        </p>
                    )}
                    <RichMessageEditor
                        value={messageHtml}
                        onChange={setMessageHtml}
                        placeholder={`Message ${candidate?.name || 'candidate'}...`}
                        showToolbar={false}
                    />
                    <div className="message-compose-actions">
                        <button className="settings-button primary" type="button" onClick={sendMessage} disabled={sending}>
                            {sending ? 'Sending...' : 'Send Message'}
                        </button>
                        <button className="secondary-button" type="button" onClick={() => setOpen(false)} disabled={sending}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContactCandidate;
