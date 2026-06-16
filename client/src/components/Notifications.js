import React, { useEffect, useMemo, useState } from 'react';

const formatNotificationTime = (dateString) => {
    if (!dateString) {
        return '';
    }

    return new Date(dateString).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const Notifications = ({ mode, recipientId, onOpenNotification, onUnreadCountChange }) => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const isEmployer = mode === 'employer';

    const unreadCount = useMemo(() => (
        notifications.filter((notification) => !notification.read).length
    ), [notifications]);

    useEffect(() => {
        onUnreadCountChange?.(unreadCount);
    }, [onUnreadCountChange, unreadCount]);

    useEffect(() => {
        fetchNotifications();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, recipientId]);

    const fetchNotifications = async () => {
        if (!recipientId) {
            setNotifications([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem(isEmployer ? 'employerToken' : 'token');
            const params = new URLSearchParams({
                recipientType: isEmployer ? 'employer' : 'candidate',
                recipientId: String(recipientId)
            });

            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/notifications?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load notifications');
            }

            const data = await response.json();
            setNotifications(Array.isArray(data) ? data : []);
        } catch (fetchError) {
            console.error('Error loading notifications:', fetchError);
            setError(fetchError.message || 'Failed to load notifications.');
        } finally {
            setLoading(false);
        }
    };

    const markRead = async (notification) => {
        if (!notification?._id || notification.read) {
            return;
        }

        setNotifications((prevNotifications) => prevNotifications.map((item) => (
            item._id === notification._id ? { ...item, read: true } : item
        )));

        try {
            const token = localStorage.getItem(isEmployer ? 'employerToken' : 'token');
            await fetch(`${process.env.REACT_APP_API_URL || ''}/api/notifications/${notification._id}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } catch (readError) {
            console.error('Error marking notification read:', readError);
        }
    };

    const markAllRead = async () => {
        setNotifications((prevNotifications) => prevNotifications.map((notification) => ({
            ...notification,
            read: true
        })));

        try {
            const token = localStorage.getItem(isEmployer ? 'employerToken' : 'token');
            await fetch(`${process.env.REACT_APP_API_URL || ''}/api/notifications/read-all`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    recipientType: isEmployer ? 'employer' : 'candidate',
                    recipientId: String(recipientId)
                })
            });
        } catch (readError) {
            console.error('Error marking notifications read:', readError);
        }
    };

    const handleOpen = async (notification) => {
        await markRead(notification);
        onOpenNotification?.(notification);
    };

    return (
        <div className="notifications-page">
            <div className="notifications-hero">
                <div>
                    <span className="notifications-eyebrow">Activity Center</span>
                    <h2>Notifications</h2>
                    <p>
                        {isEmployer
                            ? 'Applications, assessments, interviews, talent updates, and messages are collected here.'
                            : 'Messages, assessment invitations, interview dates, job invitations, and new roles are collected here.'}
                    </p>
                </div>
                <button className="secondary-button" onClick={markAllRead} disabled={!unreadCount}>
                    Mark all read
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {loading ? (
                <div className="loading-spinner"></div>
            ) : notifications.length === 0 ? (
                <div className="no-jobs-message notification-empty-state">
                    <h3>No notifications yet</h3>
                    <p>Fresh activity will appear here as soon as it happens.</p>
                </div>
            ) : (
                <div className="notifications-list">
                    {notifications.map((notification) => (
                        <button
                            key={notification._id}
                            type="button"
                            className={`notification-row ${notification.read ? 'read' : 'unread'}`}
                            onClick={() => handleOpen(notification)}
                        >
                            <span className="notification-status-dot"></span>
                            <div>
                                <h3>{notification.title}</h3>
                                <p>{notification.message}</p>
                                <time>{formatNotificationTime(notification.createdAt)}</time>
                            </div>
                            <span className="notification-action">{notification.actionLabel || 'Open'}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Notifications;
