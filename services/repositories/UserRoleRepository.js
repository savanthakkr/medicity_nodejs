const BaseRepository = require('./BaseRepository.js');
const utility = require('../../helpers/utility');

class UserRoleRepository extends BaseRepository {
  constructor() {
    super('user_role', 'user_role_Id');
  }

  // async bulkCreate(rows = []) {
  //     if (utility.checkEmpty(rows) || !Array.isArray(rows)) {
  //         return false;
  //     }

  //     const sql = ` INSERT INTO user_role
  //         (
  //             user_Id,
  //             role_Id,
  //             user_role_Assigned_By_User_Id
  //         )
  //         VALUES ?
  //     `;

  //     const values = rows.map(row => [
  //         row.user_Id,
  //         row.role_Id,
  //         row.user_role_Assigned_By_User_Id || null
  //     ]);

  //     return await this.query(this.database, sql, [values]);
  // }

  async assignRolesToUser(userId, roleIds = [], assignedByUserId = null) {
    if (utility.checkEmpty(userId) || utility.checkEmpty(roleIds) || !Array.isArray(roleIds)) {
      return false;
    }

    const rows = roleIds.map((roleId) => ({
      user_Id: userId,
      role_Id: roleId,
      user_role_Assigned_By_User_Id: assignedByUserId,
    }));

    return this.bulkCreate(rows);
  }

  async softDeleteByUserIdAndRoleIds(userId, roleIds = []) {
    if (utility.checkEmpty(userId) || utility.checkEmpty(roleIds) || !Array.isArray(roleIds)) {
      return 0;
    }

    const sql = `
      UPDATE ??
      SET ?? = 0,
          ?? = 1,
          ?? = ?
      WHERE ?? = ?
        AND ?? IN (?)
        AND ?? = 0
    `;

    const params = [
      this.tableName,
      'is_active',
      'is_deleted',
      'updated_at',
      this.getCurrentServerTime(),
      'user_Id',
      userId,
      'role_Id',
      roleIds,
      'is_deleted',
    ];

    const result = await this.query(this.database, sql, params);
    return result?.affectedRows || 0;
  }

  async getAllByUserId(userId) {
    if (utility.checkEmpty(userId)) return [];

    const sql = ` SELECT * FROM ?? WHERE ?? = ? `;
    const params = [this.tableName, 'user_Id', userId];

    return this.query(this.database, sql, params);
  }

  async restoreByUserIdAndRoleIds(userId, roleIds = [], now = null) {
    if (utility.checkEmpty(userId) || utility.checkEmpty(roleIds) || !Array.isArray(roleIds)) {
      return 0;
    }

    const sql = `
      UPDATE ??
      SET ?? = 1,
          ?? = 0,
          ?? = ?
      WHERE ?? = ?
        AND ?? IN (?)
    `;

    const params = [
      this.tableName,
      'is_active',
      'is_deleted',
      'updated_at',
      now || this.getCurrentServerTime(),
      'user_Id',
      userId,
      'role_Id',
      roleIds,
    ];

    const result = await this.query(this.database, sql, params);
    return result?.affectedRows || 0;
  }

  async getUserRolesByUserId(userId) {
    if (utility.checkEmpty(userId)) return null;

    const sql = ` SELECT * FROM ?? WHERE ?? IN (?) AND ?? = 0 AND ?? = 1`;

    const params = [this.tableName, 'user_Id', userId, 'is_deleted', 'is_active'];

    const rows = await this.query(this.database, sql, params);
    return rows;
  }

  async getUserRolesByUserIds(userIds) {
    if (utility.checkEmpty(userIds)) return [];

    const sql = ` SELECT * FROM ?? WHERE ?? IN (?) AND ?? = 0 AND ?? = 1 `;

    const params = [this.tableName, 'user_Id', userIds, 'is_deleted', 'is_active'];
    // const params = [this.tableName, 'user_role_Id', userIds, "is_deleted", "is_active"];

    const rows = await this.query(this.database, sql, params);

    return rows;
  }

  async getUserIdsByRoleIds(roleId) {
    if (utility.checkEmpty(roleId)) return [];
    const sql = ` SELECT * FROM ?? WHERE ?? IN (?) AND ?? = 0 AND ?? = 1 `;
    const params = [this.tableName, 'user_role_Id', roleId, 'is_deleted', 'is_active'];
    const rows = await this.query(this.database, sql, params);

    return rows;
  }

  async getActiveAssignedUserCountsByRoleIds(roleIds = []) {
    if (utility.checkEmpty(roleIds) || !Array.isArray(roleIds)) return [];

    const normalizedRoleIds = [...new Set(
      roleIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0),
    )];

    if (utility.checkEmpty(normalizedRoleIds)) return [];

    const sql = `
      SELECT
        ur.role_Id,
        COUNT(*) AS total
      FROM user_role ur
      INNER JOIN user u
        ON u.user_Id = ur.user_Id
       AND u.is_deleted = 0
       AND u.is_active = 1
      WHERE ur.role_Id IN (?)
        AND ur.is_deleted = 0
        AND ur.is_active = 1
      GROUP BY ur.role_Id
    `;

    return this.query(this.database, sql, [normalizedRoleIds]);
  }

  async countAssignedUsersByRoleId(roleId) {
    const normalizedRoleId = Number(roleId) || 0;
    if (normalizedRoleId <= 0) return 0;

    const sql = `
      SELECT COUNT(*) AS total
      FROM user_role ur
      INNER JOIN user u
        ON u.user_Id = ur.user_Id
       AND u.is_deleted = 0
       AND u.is_active = 1
      WHERE ur.role_Id = ?
        AND ur.is_deleted = 0
        AND ur.is_active = 1
    `;

    const rows = await this.query(this.database, sql, [normalizedRoleId]);
    return Number(rows?.[0]?.total || 0);
  }

  async countAssignedUsersByRoleIdWithSearch(roleId, search = '') {
    const normalizedRoleId = Number(roleId) || 0;
    if (normalizedRoleId <= 0) return 0;

    const normalizedSearch = String(search || '').trim();
    let sql = `
      SELECT COUNT(*) AS total
      FROM user_role ur
      INNER JOIN user u
        ON u.user_Id = ur.user_Id
       AND u.is_deleted = 0
       AND u.is_active = 1
      WHERE ur.role_Id = ?
        AND ur.is_deleted = 0
        AND ur.is_active = 1
    `;
    const params = [normalizedRoleId];

    if (!utility.checkEmpty(normalizedSearch)) {
      const searchLike = `${normalizedSearch}%`;
      sql += ` AND (u.user_Name LIKE ? OR u.user_Email LIKE ? OR u.user_Mobile LIKE ?)`;
      params.push(searchLike, searchLike, searchLike);
    }

    const rows = await this.query(this.database, sql, params);
    return Number(rows?.[0]?.total || 0);
  }

  async getAssignedUsersByRoleIdKeyset({ roleId, limit = 51, cursor = 0, search = '' } = {}) {
    const normalizedRoleId = Number(roleId) || 0;
    if (normalizedRoleId <= 0) return [];

    const normalizedLimit = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Number(limit) : 51;
    const normalizedCursor = Number.isFinite(Number(cursor)) && Number(cursor) > 0 ? Number(cursor) : 0;
    const normalizedSearch = String(search || '').trim();

    let sql = `
      SELECT
        ur.user_role_Id,
        ur.user_Id,
        u.user_Name,
        u.user_Email,
        u.user_Mobile AS user_Phone,
        u.is_active AS user_is_active
      FROM user_role ur
      INNER JOIN user u
        ON u.user_Id = ur.user_Id
       AND u.is_deleted = 0
       AND u.is_active = 1
      WHERE ur.role_Id = ?
        AND ur.is_deleted = 0
        AND ur.is_active = 1
    `;
    const params = [normalizedRoleId];

    if (!utility.checkEmpty(normalizedSearch)) {
      const searchLike = `${normalizedSearch}%`;
      sql += ` AND (u.user_Name LIKE ? OR u.user_Email LIKE ? OR u.user_Mobile LIKE ?)`;
      params.push(searchLike, searchLike, searchLike);
    }

    if (normalizedCursor > 0) {
      sql += ` AND ur.user_role_Id > ?`;
      params.push(normalizedCursor);
    }

    sql += ` ORDER BY ur.user_role_Id ASC LIMIT ?`;
    params.push(normalizedLimit);

    return this.query(this.database, sql, params);
  }
}

module.exports = new UserRoleRepository();
