import React, { useState } from 'react';
import RichMessageEditor from './RichMessageEditor';
import { apiUrl } from '../utils/apiUrl';

const stripHtml = (html = '') => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const ContactActionIcon = ({ type = 'message' }) => {
    const paths = {
        message: 'M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4.414L.854 15.146A.5.5 0 0 1 0 14.793zm3.5 1a.5.5 0 0 0 0 1h9a.5.5 0 0 0 0-1zm0 2.5a.5.5 0 0 0 0 1h9a.5.5 0 0 0 0-1zm0 2.5a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1z',
        send: 'M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995-4.995-3.178a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576zm6.787-8.201L1.592 6.603 5.93 9.364z',
        close: 'M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z'
    };

    return (
        <svg className="contact-candidate-action-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d={paths[type] || paths.message} />
        </svg>
    );
};

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
            const response = await fetch(apiUrl(endpoint), {
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
                <ContactActionIcon type="message" />
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
                            <ContactActionIcon type="send" />
                            {sending ? 'Sending...' : 'Send Message'}
                        </button>
                        <button className="secondary-button" type="button" onClick={() => setOpen(false)} disabled={sending}>
                            <ContactActionIcon type="close" />
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContactCandidate;
