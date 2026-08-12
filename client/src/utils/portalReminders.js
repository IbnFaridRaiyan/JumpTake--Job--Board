export const PORTAL_REMINDERS_UPDATED_EVENT = 'jumptake-portal-reminders-updated';
export const PORTAL_REMINDER_ALERT_EVENT = 'jumptake-portal-reminder-alert';
export const REMINDER_ALERT_LEAD_MS = 60 * 60 * 1000;

export const getPortalReminderStorageKey = (assistantStorageKey = '') => (
    `${assistantStorageKey}:notepad:reminders`
);

const normalizeReminder = (reminder) => {
    if (!reminder || typeof reminder !== 'object') return null;

    const text = String(reminder.text || '').trim();
    if (!text) return null;

    return {
        id: String(reminder.id || `reminder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
        text,
        dueAt: reminder.dueAt || '',
        createdAt: reminder.createdAt || new Date().toISOString(),
        alertedAt: reminder.alertedAt || '',
        notificationRead: Boolean(reminder.notificationRead),
        completed: Boolean(reminder.completed)
    };
};

export const readPortalReminders = (assistantStorageKey = '') => {
    if (typeof window === 'undefined' || !assistantStorageKey) return [];

    try {
        const stored = JSON.parse(window.localStorage.getItem(getPortalReminderStorageKey(assistantStorageKey)) || '[]');
        return Array.isArray(stored) ? stored.map(normalizeReminder).filter(Boolean) : [];
    } catch (error) {
        return [];
    }
};

export const isPortalReminderDueForAlert = (reminder, now = Date.now()) => {
    if (!reminder || reminder.completed || !reminder.dueAt) return false;
    const dueTime = new Date(reminder.dueAt).getTime();
    return Number.isFinite(dueTime) && now >= dueTime - REMINDER_ALERT_LEAD_MS;
};

export const getUnreadPortalReminderCount = (assistantStorageKey = '', now = Date.now()) => (
    readPortalReminders(assistantStorageKey).filter((reminder) => (
        isPortalReminderDueForAlert(reminder, now) && !reminder.notificationRead
    )).length
);

export const writePortalReminders = (assistantStorageKey = '', reminders = []) => {
    if (typeof window === 'undefined' || !assistantStorageKey) return [];

    const normalized = reminders.map(normalizeReminder).filter(Boolean);
    try {
        window.localStorage.setItem(getPortalReminderStorageKey(assistantStorageKey), JSON.stringify(normalized));
    } catch (error) {
        return normalized;
    }

    window.dispatchEvent(new CustomEvent(PORTAL_REMINDERS_UPDATED_EVENT, {
        detail: {
            storageKey: assistantStorageKey,
            unreadCount: normalized.filter((reminder) => (
                isPortalReminderDueForAlert(reminder) && !reminder.notificationRead
            )).length
        }
    }));

    return normalized;
};

export const getPortalReminderNotifications = (assistantStorageKey = '', now = Date.now()) => (
    readPortalReminders(assistantStorageKey)
        .filter((reminder) => isPortalReminderDueForAlert(reminder, now))
        .map((reminder) => {
            const dueTime = new Date(reminder.dueAt).getTime();
            const isOverdue = dueTime <= now;
            return {
                _id: `local-reminder:${reminder.id}`,
                reminderId: reminder.id,
                isLocalReminder: true,
                title: isOverdue ? 'Reminder is due' : 'Reminder due within one hour',
                message: reminder.text,
                section: 'notifications',
                actionLabel: 'View reminder',
                createdAt: reminder.alertedAt || new Date(dueTime - REMINDER_ALERT_LEAD_MS).toISOString(),
                dueAt: reminder.dueAt,
                read: Boolean(reminder.notificationRead)
            };
        })
        .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
);

export const markPortalReminderRead = (assistantStorageKey = '', reminderId = '') => {
    const reminders = readPortalReminders(assistantStorageKey);
    return writePortalReminders(assistantStorageKey, reminders.map((reminder) => (
        reminder.id === reminderId ? { ...reminder, notificationRead: true } : reminder
    )));
};

export const markAllPortalRemindersRead = (assistantStorageKey = '') => (
    writePortalReminders(assistantStorageKey, readPortalReminders(assistantStorageKey).map((reminder) => (
        isPortalReminderDueForAlert(reminder)
            ? { ...reminder, notificationRead: true }
            : reminder
    )))
);
