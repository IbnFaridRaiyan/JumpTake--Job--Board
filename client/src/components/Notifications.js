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

const notificationIconPaths = {
    checkAll: 'M8.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L2.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093L8.95 4.992zm-.92 5.14.92.92a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 1 0-1.091-1.028L9.477 9.417l-.485-.486z',
    postcard: 'M11 8h2V6h-2zM0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm8.5.5a.5.5 0 0 0-1 0v7a.5.5 0 0 0 1 0zM2 5.5a.5.5 0 0 0 .5.5H6a.5.5 0 0 0 0-1H2.5a.5.5 0 0 0-.5.5M2.5 7a.5.5 0 0 0 0 1H6a.5.5 0 0 0 0-1zM2 9.5a.5.5 0 0 0 .5.5H6a.5.5 0 0 0 0-1H2.5a.5.5 0 0 0-.5.5m8-4v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5',
    cardText: 'M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2zM3 5.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5M3 8a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 8m0 2.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5',
    boxArrowLeft: 'M10 3.5a.5.5 0 0 0-.5-.5h-8a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 1 1 0v2A1.5 1.5 0 0 1 9.5 14h-8A1.5 1.5 0 0 1 0 12.5v-9A1.5 1.5 0 0 1 1.5 2h8A1.5 1.5 0 0 1 11 3.5v2a.5.5 0 0 1-1 0M4.146 8.354a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L5.707 7.5H14.5a.5.5 0 0 1 0 1H5.707l2.147 2.146a.5.5 0 0 1-.708.708z'
};

const NotificationIcon = ({ name }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path fillRule={name === 'boxArrowLeft' ? 'evenodd' : undefined} d={notificationIconPaths[name] || notificationIconPaths.postcard} />
    </svg>
);

const getNotificationActionIcon = (notification) => {
    const label = String(notification?.actionLabel || '').toLowerCase();
    const section = String(notification?.section || '').toLowerCase();

    if (label.includes('assessment') || section.includes('assessment')) {
        return 'cardText';
    }

    if (label.includes('back')) {
        return 'boxArrowLeft';
    }

    return 'postcard';
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

    const visibleNotifications = notifications;

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
            <div className="notifications-activity-intro">
                <p className="notifications-activity-copy">
                    Check your newest <span className="notifications-activities-word">Activities</span>, might find something Interesting here...
                    <br />
                    <span className="notifications-missing-copy">are you missing anything?</span>
                </p>
                <button className="notification-icon-action notification-mark-all-button" onClick={markAllRead} disabled={!unreadCount}>
                    <NotificationIcon name="checkAll" />
                    <span>Mark all read</span>
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
                    {visibleNotifications.map((notification) => (
                        <button
                            key={notification._id}
                            type="button"
                            className={`notification-row ${notification.read ? 'read' : 'unread'}`}
                            onClick={() => handleOpen(notification)}
                        >
                            <span className="notification-status-slot" aria-hidden="true">
                                {!notification.read && <span className="notification-status-dot"></span>}
                            </span>
                            <div>
                                <h3>{notification.title}</h3>
                                <p>{notification.message}</p>
                                <time>{formatNotificationTime(notification.createdAt)}</time>
                            </div>
                            <span className="notification-action notification-icon-action">
                                <NotificationIcon name={getNotificationActionIcon(notification)} />
                                <span>{notification.actionLabel || 'Open'}</span>
                            </span>
                        </button>
                    ))}
                </div>
            )}

        </div>
    );
};

export default Notifications;
