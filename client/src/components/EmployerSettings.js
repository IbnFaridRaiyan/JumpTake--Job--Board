import React, { useEffect, useState } from 'react';

const EmployerSettings = ({ employer, switchSection, onEmployerUpdated, onLogout, onFooterBack }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [email, setEmail] = useState(employer?.email || '');
    const [phone, setPhone] = useState(employer?.phone || '');
    const [notificationSettings, setNotificationSettings] = useState({
        newApplications: true,
        newCandidates: true,
        emailNotifications: true
    });
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [isSavingContact, setIsSavingContact] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [isSavingNotifications, setIsSavingNotifications] = useState(false);
    const [settingsSaved, setSettingsSaved] = useState(false);

    useEffect(() => {
        if (employer?.id) {
            fetchEmployerSettings();
        } else {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [employer?.id]);

    const fetchEmployerSettings = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('employerToken');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/employers/${employer.id}/settings`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch employer settings');
            }

            const data = await response.json();
            setEmail(data.email || '');
            setPhone(data.phone || '');
            setNotificationSettings({
                newApplications: data.notificationPreferences?.newApplications ?? true,
                newCandidates: data.notificationPreferences?.newCandidates ?? true,
                emailNotifications: data.notificationPreferences?.emailNotifications ?? true
            });

            if (onEmployerUpdated) {
                onEmployerUpdated({
                    ...employer,
                    email: data.email || '',
                    phone: data.phone || ''
                });
            }
        } catch (error) {
            console.error('Error fetching employer settings:', error);
            setMessage(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (event) => {
        event.preventDefault();

        if (newPassword !== confirmPassword) {
            setMessage('Error: New passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            setMessage('Error: Password must be at least 6 characters');
            return;
        }

        setIsSavingPassword(true);
        setMessage('');

        try {
            const token = localStorage.getItem('employerToken');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/employers/${employer.id}/password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update password');
            }

            setMessage('Password updated successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error('Error updating employer password:', error);
            setMessage(`Error: ${error.message}`);
        } finally {
            setIsSavingPassword(false);
        }
    };

    const handleSaveContact = async (event) => {
        event.preventDefault();

        if (email && !email.includes('@')) {
            setMessage('Error: Please enter a valid email address');
            return;
        }

        setIsSavingContact(true);
        setMessage('');

        try {
            const token = localStorage.getItem('employerToken');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/employers/${employer.id}/contact`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    email,
                    phone
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update contact details');
            }

            const updatedEmployer = {
                ...employer,
                email: data.employer?.email || '',
                phone: data.employer?.phone || ''
            };

            localStorage.setItem('employer', JSON.stringify(updatedEmployer));
            if (onEmployerUpdated) {
                onEmployerUpdated(updatedEmployer);
            }

            setMessage('Contact details updated successfully!');
        } catch (error) {
            console.error('Error updating employer contact:', error);
            setMessage(`Error: ${error.message}`);
        } finally {
            setIsSavingContact(false);
        }
    };

    const handleNotificationChange = (setting) => {
        setNotificationSettings((prev) => ({
            ...prev,
            [setting]: !prev[setting]
        }));
    };

    const saveNotificationSettings = async () => {
        setIsSavingNotifications(true);
        setMessage('');

        try {
            const token = localStorage.getItem('employerToken');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/employers/${employer.id}/notification-preferences`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(notificationSettings)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save notification settings');
            }

            setSettingsSaved(true);
            setTimeout(() => setSettingsSaved(false), 3000);
        } catch (error) {
            console.error('Error updating employer notification settings:', error);
            setMessage(`Error: ${error.message}`);
        } finally {
            setIsSavingNotifications(false);
        }
    };

    const handleBackToDashboard = () => {
        if (switchSection) {
            switchSection('dashboard');
        }
    };

    const handleEditCompanyDetails = () => {
        if (switchSection) {
            switchSection('company-profile');
        }
    };

    if (loading) {
        return (
            <div className="settings-container">
                <div className="section-header">
                    <h2>Settings</h2>
                </div>
                <div className="loading-spinner">Loading settings...</div>
            </div>
        );
    }

    return (
        <div className="settings-container employer-settings-container">
            <div className="section-header">
                <h2>Settings</h2>
            </div>

            {message && (
                <div className={`notification-message ${message.includes('Error:') ? 'error' : 'success'}`}>
                    {message}
                </div>
            )}

            <div className="settings-tab employer-settings-stack">
                <div className="settings-card">
                    <h3>Security</h3>
                    <form onSubmit={handleChangePassword}>
                        <div className="form-group">
                            <label htmlFor="employer-current-password">Current Password</label>
                            <input
                                type="password"
                                id="employer-current-password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="form-control"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="employer-new-password">New Password</label>
                            <input
                                type="password"
                                id="employer-new-password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="form-control"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="employer-confirm-password">Confirm New Password</label>
                            <input
                                type="password"
                                id="employer-confirm-password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="form-control"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="settings-button primary"
                            disabled={isSavingPassword}
                        >
                            {isSavingPassword ? 'Updating...' : 'Change Password'}
                        </button>
                    </form>

                    <form onSubmit={handleSaveContact} className="employer-settings-form">
                        <div className="form-group">
                            <label htmlFor="employer-email">Change or Add Email</label>
                            <input
                                type="email"
                                id="employer-email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="form-control"
                                placeholder="company@example.com"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="employer-phone">Change or Add Phone Number</label>
                            <input
                                type="text"
                                id="employer-phone"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="form-control"
                                placeholder="+1 555 123 4567"
                            />
                        </div>
                        <button
                            type="submit"
                            className="settings-button primary"
                            disabled={isSavingContact}
                        >
                            {isSavingContact ? 'Saving...' : 'Save Contact Details'}
                        </button>
                    </form>
                </div>

                <div className="settings-card">
                    <h3>Informations</h3>
                    <p>Open your company profile to update business details, website, headquarters, and company description.</p>
                    <button
                        type="button"
                        className="settings-button primary"
                        onClick={handleEditCompanyDetails}
                    >
                        Edit Company Details
                    </button>
                </div>

                <div className="notification-card">
                    <h3>Notifications</h3>
                    <p>Choose how JumpTake should notify you about employer activity and hiring updates.</p>

                    <div className="notification-option">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={notificationSettings.newApplications}
                                onChange={() => handleNotificationChange('newApplications')}
                            />
                            <span className="checkbox-custom"></span>
                            <div className="checkbox-content">
                                <div className="notification-title">Get alert of new applications</div>
                                <div className="notification-description">
                                    Receive alerts when candidates apply to your jobs.
                                </div>
                            </div>
                        </label>
                    </div>

                    <div className="notification-option">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={notificationSettings.newCandidates}
                                onChange={() => handleNotificationChange('newCandidates')}
                            />
                            <span className="checkbox-custom"></span>
                            <div className="checkbox-content">
                                <div className="notification-title">Get notified for new candidates</div>
                                <div className="notification-description">
                                    Stay informed when new matching candidates become available.
                                </div>
                            </div>
                        </label>
                    </div>

                    <div className="notification-option">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={notificationSettings.emailNotifications}
                                onChange={() => handleNotificationChange('emailNotifications')}
                            />
                            <span className="checkbox-custom"></span>
                            <div className="checkbox-content">
                                <div className="notification-title">Allow notifications via email</div>
                                <div className="notification-description">
                                    Send your employer alerts and updates to the saved email address.
                                </div>
                            </div>
                        </label>
                    </div>

                    <div className="notification-actions">
                        <button
                            type="button"
                            className="settings-button primary"
                            onClick={saveNotificationSettings}
                            disabled={isSavingNotifications}
                        >
                            {isSavingNotifications ? 'Saving...' : 'Save Preferences'}
                        </button>

                        <div className={`settings-saved-indicator ${settingsSaved ? 'visible' : ''}`}>
                            Settings saved successfully
                        </div>
                    </div>
                </div>
            </div>

            <div className="page-footer-actions">
                <button className="back-button responsive-back-button" onClick={onFooterBack || handleBackToDashboard}>
                    Back
                </button>
                <button className="back-button responsive-back-button" onClick={onFooterBack || handleBackToDashboard}>
                    Back
                </button>
            </div>

        </div>
    );
};

export default EmployerSettings;
