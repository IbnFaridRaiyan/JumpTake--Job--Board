import React, { useState, useEffect } from 'react';

const UserSettings = ({ user, onLogout }) => {
    const [activeTab, setActiveTab] = useState('account');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [newEmail, setNewEmail] = useState(user?.email || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [notificationSettings, setNotificationSettings] = useState({
        jobRecommendations: true,
        applicationUpdates: true,
        securityAlerts: true,
        marketingEmails: false
    });
    const [recommendationFrequency, setRecommendationFrequency] = useState('weekly');
    const [settingsSaved, setSettingsSaved] = useState(false);
    
   
    useEffect(() => {
        if (user && user.id) {
            fetchUserNotificationPreferences();
        }
    }, [user]);
    
    const fetchUserNotificationPreferences = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/users/${user.id}/notification-preferences`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                
               
                setNotificationSettings({
                    jobRecommendations: data.jobRecommendations ?? true,
                    applicationUpdates: data.applicationUpdates ?? true,
                    securityAlerts: data.securityAlerts ?? true,
                    marketingEmails: data.marketingEmails ?? false
                });
                
                setRecommendationFrequency(data.recommendationFrequency || 'weekly');
            } else {
                console.error('Failed to fetch notification preferences');
            }
        } catch (error) {
            console.error('Error fetching notification preferences:', error);
        }
    };
    
    const handleChangePassword = async (e) => {
        e.preventDefault();
        
        if (newPassword !== confirmPassword) {
            setMessage('New passwords do not match');
            return;
        }
        
        if (newPassword.length < 6) {
            setMessage('Password must be at least 6 characters');
            return;
        }
        
        setIsSubmitting(true);
        setMessage('');
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/users/${user.id}/password`, {
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
                throw new Error(data.error || 'Failed to change password');
            }
            
            setMessage('Password changed successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            
        } catch (error) {
            console.error('Error changing password:', error);
            setMessage(`Error: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleChangeEmail = async (e) => {
        e.preventDefault();
        
        if (!newEmail || !newEmail.includes('@')) {
            setMessage('Please enter a valid email address');
            return;
        }
        
        setIsSubmitting(true);
        setMessage('');
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/users/${user.id}/email`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    email: newEmail
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to update email');
            }
            
            setMessage('Email updated successfully! Please log in again with your new email.');
            
          
            setTimeout(() => {
                onLogout();
            }, 3000);
            
        } catch (error) {
            console.error('Error updating email:', error);
            setMessage(`Error: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteAccount = async (e) => {
        e.preventDefault();
        
        if (!deletePassword) {
            setMessage('Please enter your password to confirm deletion');
            return;
        }
        
        setIsDeleting(true);
        setMessage('');
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/users/${user.id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    password: deletePassword
                })
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete account');
            }
            
            setMessage('Account deleted successfully. Redirecting to home page...');
            
            
            setTimeout(() => {
                onLogout();
            }, 2000);
            
        } catch (error) {
            console.error('Error deleting account:', error);
            setMessage(`Error: ${error.message}`);
        } finally {
            setIsDeleting(false);
        }
    };
    
    const handleShowDeleteConfirmation = () => {
        setConfirmDelete(true);
    };

    const handleHideDeleteConfirmation = () => {
        setConfirmDelete(false);
        setDeletePassword('');
    };

    const handleNotificationChange = (setting) => {
        setNotificationSettings({
            ...notificationSettings,
            [setting]: !notificationSettings[setting]
        });
    };

    const handleFrequencySelect = (frequency) => {
        setRecommendationFrequency(frequency);
    };

    const saveNotificationSettings = async () => {
        setIsSubmitting(true);
        setMessage('');
       
        if (!user || !user.id) {
            setMessage('Error: User information not available');
            setIsSubmitting(false);
            return;
        }
        
        try {
            const token = localStorage.getItem('token');
            
            const response = await fetch(`http://localhost:5000/api/users/${user.id}/notification-preferences`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    jobRecommendations: notificationSettings.jobRecommendations,
                    recommendationFrequency: recommendationFrequency,
                    applicationUpdates: notificationSettings.applicationUpdates,
                    securityAlerts: notificationSettings.securityAlerts,
                    marketingEmails: notificationSettings.marketingEmails
                })
            });
            
          
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
                throw new Error('Received HTML response instead of JSON. The server might be down or experiencing issues.');
            }
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `Error ${response.status}: ${response.statusText}`);
            }
            
            setSettingsSaved(true);
            
          
            setTimeout(() => {
                setSettingsSaved(false);
            }, 3000);
        } catch (error) {
            console.error('Error saving notification preferences:', error);
            setMessage(`Error: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const renderAccountTab = () => (
        <div className="settings-tab account-tab">
            <div className="settings-card">
                <h3>Change Email</h3>
                <form onSubmit={handleChangeEmail}>
                    <div className="form-group">
                        <label htmlFor="newEmail">New Email</label>
                        <input 
                            type="email" 
                            id="newEmail" 
                            value={newEmail} 
                            onChange={(e) => setNewEmail(e.target.value)} 
                            className="form-control"
                            required
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="settings-button primary"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Updating...' : 'Update Email'}
                    </button>
                </form>
            </div>
            
            <div className="settings-card">
                <h3>Change Password</h3>
                <form onSubmit={handleChangePassword}>
                    <div className="form-group">
                        <label htmlFor="currentPassword">Current Password</label>
                        <input 
                            type="password" 
                            id="currentPassword" 
                            value={currentPassword} 
                            onChange={(e) => setCurrentPassword(e.target.value)} 
                            className="form-control"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="newPassword">New Password</label>
                        <input 
                            type="password" 
                            id="newPassword" 
                            value={newPassword} 
                            onChange={(e) => setNewPassword(e.target.value)} 
                            className="form-control"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm New Password</label>
                        <input 
                            type="password" 
                            id="confirmPassword" 
                            value={confirmPassword} 
                            onChange={(e) => setConfirmPassword(e.target.value)} 
                            className="form-control"
                            required
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="settings-button primary"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
            </div>
        </div>
    );
    
    const renderSecurityTab = () => (
        <div className="settings-tab security-tab">
            <div className="settings-card">
                <h3>Change Password</h3>
                <form onSubmit={handleChangePassword}>
                    <div className="form-group">
                        <label htmlFor="currentPassword">Current Password</label>
                        <input 
                            type="password" 
                            id="currentPassword" 
                            value={currentPassword} 
                            onChange={(e) => setCurrentPassword(e.target.value)} 
                            className="form-control"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="newPassword">New Password</label>
                        <input 
                            type="password" 
                            id="newPassword" 
                            value={newPassword} 
                            onChange={(e) => setNewPassword(e.target.value)} 
                            className="form-control"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm New Password</label>
                        <input 
                            type="password" 
                            id="confirmPassword" 
                            value={confirmPassword} 
                            onChange={(e) => setConfirmPassword(e.target.value)} 
                            className="form-control"
                            required
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="settings-button primary"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
            </div>
            
            <div className="settings-card delete-account">
                <h3>Delete Account</h3>
                <p className="warning-text">
                    Warning: This action cannot be undone. All your data, including your profile, applications, 
                    and account information will be permanently deleted.
                </p>
                {!confirmDelete ? (
                    <button 
                        className="delete-account-button" 
                        onClick={handleShowDeleteConfirmation}
                    >
                        Delete Account
                    </button>
                ) : (
                    <form onSubmit={handleDeleteAccount}>
                        <div className="form-group">
                            <label htmlFor="deletePassword">Enter your password to confirm deletion</label>
                            <input 
                                type="password" 
                                id="deletePassword" 
                                value={deletePassword} 
                                onChange={(e) => setDeletePassword(e.target.value)} 
                                className="form-control"
                                required
                            />
                        </div>
                        <div className="button-group">
                            <button 
                                type="submit" 
                                className="confirm-delete-button"
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                            <button 
                                type="button" 
                                className="cancel-edit-button"
                                onClick={handleHideDeleteConfirmation}
                                disabled={isDeleting}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
    
    const renderNotificationsTab = () => (
        <div className="settings-tab notifications-tab">
            <div className="notification-card">
                <h3>Email Notifications</h3>
                <p>Select which emails you would like to receive from Resume Scanner.</p>
                
                <div className="notification-option">
                    <label className="checkbox-label">
                        <input 
                            type="checkbox" 
                            checked={notificationSettings.jobRecommendations}
                            onChange={() => handleNotificationChange('jobRecommendations')}
                        />
                        <span className="checkbox-custom"></span>
                        <div className="checkbox-content">
                            <div className="notification-title">Job Recommendations</div>
                            <div className="notification-description">
                                Get personalized job recommendations based on your skills and experience
                            </div>
                            {notificationSettings.jobRecommendations && (
                                <div className="frequency-selector">
                                    <div 
                                        className={`frequency-option ${recommendationFrequency === 'daily' ? 'selected' : ''}`}
                                        onClick={() => handleFrequencySelect('daily')}
                                    >
                                        Daily
                                    </div>
                                    <div 
                                        className={`frequency-option ${recommendationFrequency === 'weekly' ? 'selected' : ''}`}
                                        onClick={() => handleFrequencySelect('weekly')}
                                    >
                                        Weekly
                                    </div>
                                    <div 
                                        className={`frequency-option ${recommendationFrequency === 'monthly' ? 'selected' : ''}`}
                                        onClick={() => handleFrequencySelect('monthly')}
                                    >
                                        Monthly
                                    </div>
                                </div>
                            )}
                        </div>
                    </label>
                </div>
                
                <div className="notification-option">
                    <label className="checkbox-label">
                        <input 
                            type="checkbox" 
                            checked={notificationSettings.applicationUpdates}
                            onChange={() => handleNotificationChange('applicationUpdates')}
                        />
                        <span className="checkbox-custom"></span>
                        <div className="checkbox-content">
                            <div className="notification-title">Application Status Updates</div>
                            <div className="notification-description">
                                Receive updates when employers review or respond to your applications
                            </div>
                        </div>
                    </label>
                </div>
                
                <div className="notification-option">
                    <label className="checkbox-label">
                        <input 
                            type="checkbox" 
                            checked={notificationSettings.securityAlerts}
                            onChange={() => handleNotificationChange('securityAlerts')}
                        />
                        <span className="checkbox-custom"></span>
                        <div className="checkbox-content">
                            <div className="notification-title">Security Alerts</div>
                            <div className="notification-description">
                                Important security notifications about your account
                            </div>
                        </div>
                    </label>
                </div>
                
                <div className="notification-option">
                    <label className="checkbox-label">
                        <input 
                            type="checkbox" 
                            checked={notificationSettings.marketingEmails}
                            onChange={() => handleNotificationChange('marketingEmails')}
                        />
                        <span className="checkbox-custom"></span>
                        <div className="checkbox-content">
                            <div className="notification-title">Product Updates & Tips</div>
                            <div className="notification-description">
                                News about features, tips for job hunting, and career advice
                            </div>
                        </div>
                    </label>
                </div>
                
                <div className="notification-actions">
                    <button 
                        type="button" 
                        className="settings-button primary"
                        onClick={saveNotificationSettings}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Saving...' : 'Save Preferences'}
                    </button>
                    
                    <div className={`settings-saved-indicator ${settingsSaved ? 'visible' : ''}`}>
                        Settings saved successfully
                    </div>
                </div>
            </div>
        </div>
    );
    
    return (
        <div className="settings-container">
            <div className="section-header">
                <h2>Settings</h2>
            </div>
            
            {message && (
                <div className={`notification-message ${message.includes('Error') ? 'error' : 'success'}`}>
                    {message}
                </div>
            )}
            
            <div className="settings-tabs">
                <div className="tabs-header">
                    <button 
                        className={`tab-button ${activeTab === 'account' ? 'active' : ''}`}
                        onClick={() => setActiveTab('account')}
                    >
                        <i className="tab-icon account-icon"></i>
                        Account
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'security' ? 'active' : ''}`}
                        onClick={() => setActiveTab('security')}
                    >
                        <i className="tab-icon security-icon"></i>
                        Security
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'notifications' ? 'active' : ''}`}
                        onClick={() => setActiveTab('notifications')}
                    >
                        <i className="tab-icon notifications-icon"></i>
                        Notifications
                    </button>
                </div>
                
                <div className="tabs-content">
                    {activeTab === 'account' && renderAccountTab()}
                    {activeTab === 'security' && renderSecurityTab()}
                    {activeTab === 'notifications' && renderNotificationsTab()}
                </div>
            </div>
        </div>
    );
};

export default UserSettings;