import React, { useEffect, useMemo, useState } from 'react';

const formatObjectItem = (item) => {
    if (!item || typeof item !== 'object') {
        return String(item || '').trim();
    }

    const preferredParts = [
        item.institution,
        item.degree,
        item.company,
        item.role,
        item.title,
        item.dates,
        item.date,
        item.description
    ].map((value) => String(value || '').trim()).filter(Boolean);

    return (preferredParts.length ? preferredParts : Object.values(item))
        .map((value) => String(value || '').trim())
        .filter(Boolean)
        .join(' - ');
};

const normalizeList = (value, splitCommas = false) => {
    const values = Array.isArray(value) ? value : [value];
    return values
        .flatMap((item) => {
            if (item && typeof item === 'object') {
                return [formatObjectItem(item)];
            }
            return String(item || '').split(splitCommas ? /[\n,;|]+/ : /\n+/);
        })
        .map((item) => String(item || '').trim())
        .filter(Boolean);
};

const normalizeDetails = (profile = {}) => ({
    education: normalizeList(profile.education),
    experience: normalizeList(profile.experience),
    skills: normalizeList(profile.skills, true),
    achievements: normalizeList(profile.achievements),
    interests: normalizeList(profile.interests, true),
    hobbies: normalizeList(profile.hobbies, true)
});

const createDraft = (details) => ({
    education: details.education.join('\n'),
    experience: details.experience.join('\n'),
    skills: details.skills.join(', '),
    achievements: details.achievements.join('\n'),
    interests: details.interests.join(', '),
    hobbies: details.hobbies.join(', ')
});

const prepareDraft = (draft) => ({
    education: normalizeList(draft.education),
    experience: normalizeList(draft.experience),
    skills: normalizeList(draft.skills, true),
    achievements: normalizeList(draft.achievements),
    interests: normalizeList(draft.interests, true),
    hobbies: normalizeList(draft.hobbies, true)
});

const DetailList = ({ title, items }) => (
    <div className="profile-details-section">
        <h4>{title}</h4>
        {items.length ? (
            <ul>
                {items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}
            </ul>
        ) : <p>Not added yet.</p>}
    </div>
);

const ProfileDetailsCard = ({ profile = {}, editable = false, onSave, showHeader = true, className = '' }) => {
    const normalizedProfile = useMemo(() => normalizeDetails(profile), [profile]);
    const [details, setDetails] = useState(normalizedProfile);
    const [draft, setDraft] = useState(() => createDraft(normalizedProfile));
    const [expanded, setExpanded] = useState(false);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        setDetails(normalizedProfile);
        setDraft(createDraft(normalizedProfile));
    }, [normalizedProfile]);

    const saveDetails = async (event) => {
        event.preventDefault();
        const nextDetails = prepareDraft(draft);
        setSaving(true);
        setMessage('');

        try {
            if (onSave) {
                await onSave(nextDetails);
            }
            setDetails(nextDetails);
            setEditing(false);
            setExpanded(true);
            setMessage('Profile details saved.');
        } catch (error) {
            setMessage(error.message || 'Could not save profile details.');
        } finally {
            setSaving(false);
        }
    };

    const startEditing = () => {
        setDraft(createDraft(details));
        setEditing(true);
        setExpanded(true);
        setMessage('');
    };

    return (
        <section className={`profile-details-card ${expanded ? 'is-expanded' : ''} ${editing ? 'is-editing' : ''} ${showHeader ? '' : 'is-headerless'} ${className}`.trim()}>
            {showHeader && (
                <div className="profile-details-card-header">
                    <div>
                        <span>Complete profile</span>
                        <h3>Education, experience and skills</h3>
                    </div>
                    {editable && !editing && (
                        <button type="button" className="profile-details-edit" onClick={startEditing}>Edit</button>
                    )}
                </div>
            )}

            {editing ? (
                <form className="profile-details-form" onSubmit={saveDetails}>
                    <label>Education<textarea rows="3" value={draft.education} onChange={(event) => setDraft((current) => ({ ...current, education: event.target.value }))} placeholder="Latest degree or education, one per line" /></label>
                    <label>Experience<textarea rows="3" value={draft.experience} onChange={(event) => setDraft((current) => ({ ...current, experience: event.target.value }))} placeholder="Role and company, one per line" /></label>
                    <label>Skills<textarea rows="2" value={draft.skills} onChange={(event) => setDraft((current) => ({ ...current, skills: event.target.value }))} placeholder="Skills separated by commas" /></label>
                    <label>Achievements<textarea rows="3" value={draft.achievements} onChange={(event) => setDraft((current) => ({ ...current, achievements: event.target.value }))} placeholder="One achievement per line" /></label>
                    <label>Interests<textarea rows="2" value={draft.interests} onChange={(event) => setDraft((current) => ({ ...current, interests: event.target.value }))} placeholder="Interests separated by commas" /></label>
                    <label>Hobbies<textarea rows="2" value={draft.hobbies} onChange={(event) => setDraft((current) => ({ ...current, hobbies: event.target.value }))} placeholder="Hobbies separated by commas" /></label>
                    <div className="profile-details-form-actions">
                        <button type="submit" className="profile-details-save" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                        <button type="button" className="profile-details-cancel" onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
                    </div>
                </form>
            ) : (
                <>
                    <div className="profile-details-summary">
                        <div><strong>Education</strong><span>{details.education[0] || 'Not added yet.'}</span></div>
                        <div><strong>Experience</strong><span>{details.experience[0] || 'Not added yet.'}</span></div>
                        <div><strong>Skills</strong><span>{details.skills.slice(0, 4).join(', ') || 'Not added yet.'}</span></div>
                    </div>

                    {expanded && (
                        <div className="profile-details-full">
                            <DetailList title="Education" items={details.education} />
                            <DetailList title="Experience" items={details.experience} />
                            <DetailList title="Skills" items={details.skills} />
                            <DetailList title="Achievements" items={details.achievements} />
                            <DetailList title="Interests" items={details.interests} />
                            <DetailList title="Hobbies" items={details.hobbies} />
                        </div>
                    )}

                    <span
                        className="profile-details-view-more"
                        role="button"
                        tabIndex="0"
                        onClick={() => setExpanded((current) => !current)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                setExpanded((current) => !current);
                            }
                        }}
                    >
                        {expanded ? 'View less' : 'View more'}
                    </span>
                </>
            )}

            {message && <p className={`profile-details-message ${message.includes('Could not') ? 'is-error' : ''}`}>{message}</p>}
        </section>
    );
};

export default ProfileDetailsCard;
