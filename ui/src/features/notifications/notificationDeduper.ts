const SEEN_TTL_MS = 10 * 60 * 1000;

const seenNotifications = new Map<string, number>();

const cleanupSeen = () => {
  const cutoff = Date.now() - SEEN_TTL_MS;
  for (const [id, timestamp] of seenNotifications.entries()) {
    if (timestamp < cutoff) {
      seenNotifications.delete(id);
    }
  }
};

export const markNotificationSeen = (id?: string | null) => {
  if (!id) {
    return;
  }
  cleanupSeen();
  seenNotifications.set(id, Date.now());
};

export const hasSeenNotification = (id?: string | null): boolean => {
  if (!id) {
    return false;
  }
  cleanupSeen();
  return seenNotifications.has(id);
};
