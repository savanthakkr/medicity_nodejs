const BaseRepository = require('./BaseRepository.js');
const utility = require('../../helpers/utility');

class NotificationRepository extends BaseRepository {
  constructor() {
    super('notification', 'notification_Id');
    this.userReadTableName = 'notification_user_read';
    this.userReadIdColumn = 'notification_user_read_Id';
    this._hasUserReadTableCache = null;
  }

  buildTitle(moduleName, action, details = null) {
    const moduleKey = String(moduleName || '')
      .trim()
      .toUpperCase();
    const actionKey = String(action || '')
      .trim()
      .toLowerCase();
    const normalizedDetails = utility.normalizeText(details, {
      trim: true,
      lowercase: true,
    });

    if (moduleKey === 'EVENT') {
      if (actionKey === 'approved') {
        if (normalizedDetails.includes('manager')) return 'Event Approved by Manager';
        if (normalizedDetails.includes('admin')) return 'Event Approved by Admin';
        return 'Event Approved';
      }
      if (actionKey === 'submitted') return 'Event Sent for Approval';
      if (actionKey === 'updated and submitted') return 'Event Updated and Submitted';
      if (actionKey === 'rejected') return 'Event Rejected';
      if (actionKey === 'cancelled') return 'Event Cancelled';
      if (actionKey === 'completed') return 'Event Completed';
      if (actionKey === 'deleted') return 'Event Deleted';
      if (actionKey === 'updated') return 'Event Updated';
      if (actionKey === 'sent-for-approval') return 'Event Sent for Approval';
      if (actionKey === 'print-ready') return 'Event Ready for Printing';
      if (actionKey === 'invite-sent' || actionKey === 'invite-added' || actionKey === 'event-invite-sent') {
        return 'Invitee Added';
      }
      if (actionKey === 'invite-removed') return 'Event Invite Removed';
      if (actionKey === 'created') return 'Event Created';
      return 'Event Activity';
    }

    if (moduleKey === 'CONTACT') {
      if (actionKey === 'create') return 'New Contact Added';
      if (actionKey === 'update') return 'Contact Updated';
      if (actionKey === 'delete') return 'Contact Deleted';
      if (actionKey === 'import') return 'Contacts Imported';
      return 'Contact Activity';
    }

    if (moduleKey === 'RBAC') {
      if (actionKey === 'create') return 'Role Assigned';
      if (actionKey === 'update') return 'Role Updated';
      if (actionKey === 'delete') return 'Role Removed';
      return 'RBAC Activity';
    }

    return 'Notification';
  }

  async createAuditNotification({
    module = null,
    action = null,
    ref_id = null,
    details = null,
    modified_By = null,
    source_table = null,
    source_audit_id = null,
    created_at = null,
  } = {}) {
    if (utility.checkEmpty(module) || utility.checkEmpty(action)) return null;

    const now = created_at || this.getCurrentServerTime();
    const title = this.buildTitle(module, action, details);

    try {
      return await super.create({
        notification_Module: String(module).toUpperCase(),
        notification_Action: String(action),
        notification_Ref_Id: utility.checkEmpty(ref_id) ? null : Number(ref_id),
        notification_Details: utility.checkEmpty(details) ? null : String(details),
        notification_Title: title,
        notification_Triggered_By_User_Id: utility.checkEmpty(modified_By) ? null : Number(modified_By),
        notification_Source_Table: utility.checkEmpty(source_table) ? null : String(source_table),
        notification_Source_Audit_Id: utility.checkEmpty(source_audit_id) ? null : Number(source_audit_id),
        is_read: 0,
        read_at: null,
        created_at: now,
      });
    } catch (error) {
      console.log('Notification create failed:', error.message || error);
      return null;
    }
  }

  async getUnreadCount() {
    const sql = `SELECT COUNT(*) AS total FROM ?? WHERE ?? = 0 AND ?? = 0`;
    const rows = await this.query(this.database, sql, [this.tableName, 'is_deleted', 'is_read']);
    return Number(rows?.[0]?.total || 0);
  }

  async hasUserReadTable(forceRefresh = false) {
    if (!forceRefresh && this._hasUserReadTableCache !== null) {
      return this._hasUserReadTableCache;
    }

    try {
      const rows = await this.query(this.database, 'SHOW TABLES LIKE ?', [this.userReadTableName]);
      this._hasUserReadTableCache = Array.isArray(rows) && rows.length > 0;
    } catch (error) {
      this._hasUserReadTableCache = false;
    }

    return this._hasUserReadTableCache;
  }

  async getUnreadCountForUser({ user_Id = null, createdAtGte = null } = {}) {
    const normalizedUserId = Number(user_Id);
    if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) return null;

    const hasUserReadTable = await this.hasUserReadTable();
    if (!hasUserReadTable) return null;

    const sql = `
      SELECT COUNT(*) AS total
      FROM ${this.tableName} n
      LEFT JOIN ${this.userReadTableName} nur
        ON nur.notification_Id = n.${this.idColumn}
       AND nur.user_Id = ?
      WHERE n.is_deleted = 0
        AND n.is_active = 1
        ${utility.checkEmpty(createdAtGte) ? '' : 'AND n.created_at >= ?'}
        AND nur.${this.userReadIdColumn} IS NULL
    `;

    const params = [normalizedUserId];
    if (!utility.checkEmpty(createdAtGte)) {
      params.push(createdAtGte);
    }

    const rows = await this.query(this.database, sql, params);
    return Number(rows?.[0]?.total || 0);
  }

  async getUserReadRowsByNotificationIds(user_Id = null, ids = []) {
    const normalizedUserId = Number(user_Id);
    const notificationIds = Array.isArray(ids)
      ? ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
      : [];

    if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0 || !notificationIds.length) {
      return [];
    }

    const hasUserReadTable = await this.hasUserReadTable();
    if (!hasUserReadTable) return [];

    const sql = `
      SELECT notification_Id, read_at
      FROM ${this.userReadTableName}
      WHERE user_Id = ?
        AND notification_Id IN (?)
    `;

    return await this.query(this.database, sql, [normalizedUserId, notificationIds]);
  }

  async markReadByIdsForUser(user_Id = null, ids = [], now = null) {
    const normalizedUserId = Number(user_Id);
    const notificationIds = Array.isArray(ids)
      ? [...new Set(ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))]
      : [];

    if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0 || !notificationIds.length) {
      return 0;
    }

    const hasUserReadTable = await this.hasUserReadTable();
    if (!hasUserReadTable) return null;

    const readAt = now || this.getCurrentServerTime();
    const updatedAt = readAt;
    const createdAt = readAt;

    const placeholders = notificationIds.map(() => '(?, ?, ?, ?, ?)').join(', ');
    const values = [];
    notificationIds.forEach((notificationId) => {
      values.push(notificationId, normalizedUserId, readAt, createdAt, updatedAt);
    });

    const sql = `
      INSERT INTO ${this.userReadTableName}
        (notification_Id, user_Id, read_at, created_at, updated_at)
      VALUES ${placeholders}
      ON DUPLICATE KEY UPDATE
        read_at = VALUES(read_at),
        updated_at = VALUES(updated_at)
    `;

    const result = await this.query(this.database, sql, values);
    return Number(result?.affectedRows || 0);
  }

  async markAllUnreadAsReadForUser({ user_Id = null, now = null, createdAtGte = null } = {}) {
    const normalizedUserId = Number(user_Id);
    if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) return 0;

    const hasUserReadTable = await this.hasUserReadTable();
    if (!hasUserReadTable) return null;

    const unreadSql = `
      SELECT n.${this.idColumn} AS notification_Id
      FROM ${this.tableName} n
      LEFT JOIN ${this.userReadTableName} nur
        ON nur.notification_Id = n.${this.idColumn}
       AND nur.user_Id = ?
      WHERE n.is_deleted = 0
        AND n.is_active = 1
        ${utility.checkEmpty(createdAtGte) ? '' : 'AND n.created_at >= ?'}
        AND nur.${this.userReadIdColumn} IS NULL
    `;

    const unreadParams = [normalizedUserId];
    if (!utility.checkEmpty(createdAtGte)) {
      unreadParams.push(createdAtGte);
    }

    const rows = await this.query(this.database, unreadSql, unreadParams);
    const unreadIds = (rows || [])
      .map((row) => Number(row.notification_Id))
      .filter((id) => Number.isFinite(id) && id > 0);

    if (!unreadIds.length) return 0;
    return await this.markReadByIdsForUser(normalizedUserId, unreadIds, now);
  }

  async markReadByIds(ids = [], now = null) {
    const notificationIds = Array.isArray(ids)
      ? ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
      : [];

    if (!notificationIds.length) return 0;

    const readAt = now || this.getCurrentServerTime();
    const updatedAt = readAt;

    const sql = `
      UPDATE ??
      SET ?? = 1,
          ?? = ?,
          ?? = ?
      WHERE ?? IN (?) AND ?? = 0
    `;

    const result = await this.query(this.database, sql, [
      this.tableName,
      'is_read',
      'read_at',
      readAt,
      'updated_at',
      updatedAt,
      this.idColumn,
      notificationIds,
      'is_deleted',
    ]);

    return Number(result?.affectedRows || 0);
  }
}

module.exports = new NotificationRepository();
