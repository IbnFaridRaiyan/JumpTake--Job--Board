
router.get('/:userId/notification-preferences', authenticateJWT, userController.getNotificationPreferences);


router.put('/:userId/notification-preferences', authenticateJWT, userController.updateNotificationPreferences);