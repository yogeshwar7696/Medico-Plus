const mongoose = require("mongoose");
const Notification = require("../models/Notification_Model");
const Admin = require("../models/Admin_Model");
const clients = new Map();

const key = (userRole, userId) => `${userRole}:${String(userId)}`;

function addClient(userRole, userId, res) {
  const k = key(userRole, userId);
  const list = clients.get(k) || [];
  list.push(res);
  clients.set(k, list);

  return () => {
    const current = clients.get(k) || [];
    const filtered = current.filter((r) => r !== res);
    if (filtered.length === 0) clients.delete(k);
    else clients.set(k, filtered);
  };
}

function pushToClients(userRole, userId, payload) {
  const list = clients.get(key(userRole, userId));
  if (!list || list.length === 0) return;
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of list) {
    try {
      res.write(data);
    } catch (_) {}
  }
}

async function createNotification({
  userId,
  userRole,
  message,
  type = "info",
}) {
  
  if (userRole === "Admin" && !userId) {
    const activeAdminsList = await Admin.find({}, "_id");

    if (activeAdminsList.length === 0) {
      console.warn(
        "Notification system alert: No registered administrators found in database collections.",
      );
      return null;
    }

    let lastSavedNotif = null;

    for (const adminUser of activeAdminsList) {
      const adminNotif = await Notification.create({
        userId: adminUser._id, 
        userRole,
        message,
        type,
      });

      pushToClients(userRole, String(adminUser._id), {
        event: "notification",
        notification: adminNotif,
      });

      lastSavedNotif = adminNotif;
    }

    return lastSavedNotif; 
  }

  if (!userId) {
    throw new Error(
      `Validation Error: Path userId is required for direct ${userRole} notifications.`,
    );
  }

  const safeUserId = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(String(userId))
    : userId;

  const notif = await Notification.create({
    userId: safeUserId,
    userRole,
    message,
    type,
  });

  pushToClients(userRole, String(userId), {
    event: "notification",
    notification: notif,
  });

  return notif;
}

module.exports = { addClient, createNotification };
