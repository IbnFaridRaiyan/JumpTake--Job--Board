import React, { useState } from 'react';
import RichMessageEditor from './RichMessageEditor';

const stripHtml = (html = '') => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const ContactCandidate = ({ companyId, candidate, onSent }) => {
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
            const token = localStorage.getItem('employerToken');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
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
        <div className="contact-candidate-panel">
            <button className="settings-button primary" type="button" onClick={() => setOpen((prev) => !prev)}>
                Contact Candidate
            </button>

            {notice && (
                <div className={`notification-message ${notice.includes('Error') ? 'error' : 'success'}`}>
                    {notice}
                </div>
            )}

            {open && (
                <div className="message-compose-card">
                    <RichMessageEditor
                        value={messageHtml}
                        onChange={setMessageHtml}
                        placeholder={`Message ${candidate?.name || 'candidate'}...`}
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
