var express = require("express");
var app = express();

const NotificationController = require("../controllers/NotificationController.js");

const authMiddleware = require("../middlewares/authMiddleware.js");
const roleAccessMiddleware = require("../middlewares/roleAccessMiddleware.js");

const NOTIFICATION_VIEW_PERMISSIONS = [
  "notification",
  "notification.read",
  "notification.list",
  "notification.all",
];
const NOTIFICATION_UPDATE_PERMISSIONS = [
  "notification",
  "notification.update",
  "notification.read",
  "notification.all",
];

app.use(authMiddleware);

app.use(
  "/unread-status",
  roleAccessMiddleware({ anyOf: NOTIFICATION_VIEW_PERMISSIONS }),
  NotificationController.getUnreadNotificationStatus,
);

app.use(
  "/list",
  roleAccessMiddleware({ anyOf: NOTIFICATION_VIEW_PERMISSIONS }),
  NotificationController.getNotificationList,
);

app.use(
  "/mark-read",
  roleAccessMiddleware({ anyOf: NOTIFICATION_UPDATE_PERMISSIONS }),
  NotificationController.markNotificationRead,
);

module.exports = app;
