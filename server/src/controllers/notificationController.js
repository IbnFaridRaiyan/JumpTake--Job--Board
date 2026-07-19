const Notification = require('../models/Notification');

const WELCOME_SYSTEM_KEY = 'jumptake-welcome';

const ensureWelcomeNotification = async (recipientType, recipientId) => {
    const identity = {
        recipientType,
        recipientId: String(recipientId),
        'payload.systemKey': WELCOME_SYSTEM_KEY
    };
    try {
        return await Notification.findOneAndUpdate(
            identity,
            {
                $setOnInsert: {
                    title: 'Welcome from JumpTake',
                    message: 'Welcome to JumpTake. Discover opportunities, grow your network, and take your next step with us.',
                    section: 'home',
                    actionLabel: 'Go home',
                    payload: {
                        systemKey: WELCOME_SYSTEM_KEY,
                        persistent: true
                    },
                    read: false
                }
            },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true
            }
        );
    } catch (error) {
        if (error?.code === 11000) {
            return Notification.findOne(identity);
        }
        throw error;
    }
};

const createNotification = async ({
    recipientType,
    recipientId,
    title,
    message,
    section = '',
    actionLabel = 'Open',
    payload = {}
}) => {
    if (!recipientType || !recipientId || !title || !message) {
        return null;
    }

    return Notification.create({
        recipientType,
        recipientId: String(recipientId),
        title,
        message,
        section,
        actionLabel,
        payload
    });
};

const getNotifications = async (req, res) => {
    try {
        const { recipientType, recipientId } = req.query;

        if (!recipientType || !recipientId) {
            return res.status(400).json({ error: 'Recipient type and ID are required' });
        }

        if (!['employer', 'candidate'].includes(recipientType)) {
            return res.status(400).json({ error: 'Invalid recipient type' });
        }

        await ensureWelcomeNotification(recipientType, recipientId);

        const notifications = await Notification.find({
            recipientType,
            recipientId: String(recipientId)
        }).sort({ createdAt: -1 }).limit(80);

        return res.status(200).json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error.message);
        return res.status(500).json({
            error: 'Failed to fetch notifications',
            message: error.message
        });
    }
};

const markNotificationRead = async (req, res) => {
    try {
        const notification = await Notification.findByIdAndUpdate(
            req.params.id,
            { read: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        return res.status(200).json(notification);
    } catch (error) {
        console.error('Error marking notification read:', error.message);
        return res.status(500).json({
            error: 'Failed to update notification',
            message: error.message
        });
    }
};

const markAllNotificationsRead = async (req, res) => {
    try {
        const { recipientType, recipientId } = req.body;

        if (!recipientType || !recipientId) {
            return res.status(400).json({ error: 'Recipient type and ID are required' });
        }

        await Notification.updateMany({
            recipientType,
            recipientId: String(recipientId)
        }, { read: true });

        return res.status(200).json({ message: 'Notifications marked as read' });
    } catch (error) {
        console.error('Error marking notifications read:', error.message);
        return res.status(500).json({
            error: 'Failed to update notifications',
            message: error.message
        });
    }
};

module.exports = {
    createNotification,
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead
};
