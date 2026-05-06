const BaseRepository = require('./BaseRepository.js');
const utility = require('../../helpers/utility');

class RoleRepository extends BaseRepository {
  constructor() {
    super('role', 'role_Id');
  }

  async findByName(roleName) {
    if (utility.checkEmpty(roleName)) return null;

    const sql = ` SELECT * FROM ?? WHERE ?? = ? AND ?? = 0 AND ?? = 1 LIMIT 1 `;
    const params = [this.tableName, 'role_Name', roleName, 'is_deleted', 'is_active'];

    const rows = await this.query(this.database, sql, params);
    return rows.length ? rows[0] : null;
  }

  async findAnyByName(roleName) {
    if (utility.checkEmpty(roleName)) return null;

    const sql = ` SELECT * FROM ?? WHERE ?? = ? LIMIT 1 `;
    const params = [this.tableName, 'role_Name', roleName];

    const rows = await this.query(this.database, sql, params);
    return rows.length ? rows[0] : null;
  }

  async findByNameWithId(roleName, roleId) {
    if (utility.checkEmpty(roleName)) return null;

    const sql = ` SELECT * FROM ?? WHERE ?? = ? AND ?? = 0 AND ?? = 1 AND ?? != ? LIMIT 1`;

    const params = [this.tableName, 'role_Name', roleName, 'is_deleted', 'is_active', this.idColumn, roleId];

    const rows = await this.query(this.database, sql, params);
    return rows.length ? rows[0] : null;
  }

  async getByIds(roleIds) {
    if (utility.checkEmpty(roleIds)) return [];

    const sql = ` SELECT * FROM ?? WHERE ?? IN (?) AND ?? = 0 AND ?? = 1 `;

    const params = [this.tableName, 'role_Id', roleIds, 'is_deleted', 'is_active'];

    const rows = await this.query(this.database, sql, params);

    return rows;
  }

  async findAnyById(roleId) {
    if (utility.checkEmpty(roleId)) return null;

    const sql = `SELECT * FROM ?? WHERE ?? = ? LIMIT 1`;
    const params = [this.tableName, this.idColumn, roleId];

    const rows = await this.query(this.database, sql, params);
    return rows.length ? rows[0] : null;
  }

  async roleStatusUpdate(roleId, status, now) {
    const sql = ` UPDATE role SET is_active = ?, updated_at = ? , is_deleted = 0 WHERE role_Id = ? `;
    return this.query(this.database, sql, [status, now, roleId]);
  }

  async restoreById(roleId, patch = {}, now = null) {
    const normalizedId = Number(roleId);
    if (!Number.isFinite(normalizedId) || normalizedId <= 0) return false;

    const updates = {
      is_active: 1,
      is_deleted: 0,
      deleted_at: null,
    };

    if (patch && Object.prototype.hasOwnProperty.call(patch, 'role_Name')) {
      updates.role_Name = patch.role_Name;
    }
    if (patch && Object.prototype.hasOwnProperty.call(patch, 'role_Description')) {
      updates.role_Description = patch.role_Description;
    }
    if (patch && Object.prototype.hasOwnProperty.call(patch, 'role_Is_System')) {
      updates.role_Is_System = patch.role_Is_System;
    }
    if (patch && Object.prototype.hasOwnProperty.call(patch, 'role_Created_By_User_Id')) {
      updates.role_Created_By_User_Id = patch.role_Created_By_User_Id;
    }

    const sanitized = this._sanitizeInput({
      ...updates,
      updated_at: now || this.getCurrentServerTime(),
    });

    const entries = Object.entries(sanitized);
    if (entries.length === 0) return false;

    const setClause = entries.map(() => `?? = ?`).join(', ');
    const params = [this.tableName, ...entries.flatMap(([key, value]) => [key, value]), this.idColumn, normalizedId];
    const sql = ` UPDATE ?? SET ${setClause} WHERE ?? = ? `;

    const result = await this.query(this.database, sql, params);
    return result?.affectedRows > 0;
  }

  async getAll(where = {}, limit = null, offset = null, orderBy = ['created_at', 'DESC']) {
    const validatedWhere = this._validateWhereClause(where);

    let sql = `SELECT * FROM ?? WHERE ?? = 0`;
    const params = [this.tableName, 'is_deleted'];

    for (const [key, value] of Object.entries(validatedWhere)) {
      if (Array.isArray(value)) {
        sql += ` AND ?? IN (?)`;
        params.push(key, value);
      } else {
        sql += ` AND ?? = ?`;
        params.push(key, value);
      }
    }

    sql += ` ORDER BY ?? ${orderBy[1]}`;
    params.push(orderBy[0]);

    if (limit !== null && offset !== null) {
      sql += ` LIMIT ? OFFSET ?`;
      params.push(Number(limit), Number(offset));
    }

    const rows = await this.query(this.database, sql, params);
    return rows;
  }

  async getAllWithFilter(where = {}, limit = null, offset = null, options = {}) {
    const {
      // If provided, these columns will do LIKE when value is a string
      likeColumns = [],
      // If provided, these columns will do REGEXP when value is a string
      regexColumns = [],
      // If true, all string columns in `where` will use LIKE (unless overridden by op object)
      globalLike = false,
      // Sorting support
      orderBy = ['created_at', 'DESC'],
    } = options;

    // 1) Clean empty filters first
    const cleanedWhere = this._cleanWhere(where);

    // 2) Validate keys (identifiers) only after cleaning
    const validatedWhere = this._validateWhereClause(cleanedWhere);

    let sql = `SELECT * FROM ?? WHERE ?? = 0`;
    const params = [this.tableName, 'is_deleted'];

    const allowedOps = new Set(['=', '!=', '>', '<', '>=', '<=', 'like', 'regexp', 'in', 'not in']);

    for (const [key, rawVal] of Object.entries(validatedWhere)) {
      // a) IN for arrays
      if (Array.isArray(rawVal)) {
        sql += ` AND ?? IN (?)`;
        params.push(key, rawVal);
        continue;
      }

      // b) Operator object
      if (rawVal && typeof rawVal === 'object') {
        const op = String(rawVal.op || '').toLowerCase();
        const value = rawVal.value;

        if (!allowedOps.has(op)) {
          throw new Error(`Invalid operator "${rawVal.op}" for column "${key}"`);
        }

        if (op === 'in' || op === 'not in') {
          if (!Array.isArray(value) || value.length === 0) continue;
          sql += op === 'in' ? ` AND ?? IN (?)` : ` AND ?? NOT IN (?)`;
          params.push(key, value);
          continue;
        }

        if (op === 'like') {
          sql += ` AND ?? LIKE ?`;
          params.push(key, `${String(value)}%`);
          continue;
        }

        if (op === 'regexp') {
          sql += ` AND ?? REGEXP ?`;
          params.push(key, String(value));
          continue;
        }

        // comparison ops
        sql += ` AND ?? ${op} ?`;
        params.push(key, value);
        continue;
      }

      // c) Plain string -> LIKE / REGEXP if configured, else exact
      if (typeof rawVal === 'string') {
        if (regexColumns.includes(key)) {
          sql += ` AND ?? REGEXP ?`;
          params.push(key, rawVal);
          continue;
        }

        if (globalLike || likeColumns.includes(key)) {
          sql += ` AND ?? LIKE ?`;
          params.push(key, `${rawVal}%`);
          continue;
        }

        sql += ` AND ?? = ?`;
        params.push(key, rawVal);
        continue;
      }

      // d) numbers/booleans/etc -> exact
      sql += ` AND ?? = ?`;
      params.push(key, rawVal);
    }

    const [orderByColumn = 'created_at', orderByDirection = 'DESC'] = Array.isArray(orderBy)
      ? orderBy
      : ['created_at', 'DESC'];

    this._validateIdentifier(orderByColumn, 'order by column');
    const safeDirection = String(orderByDirection).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    sql += ` ORDER BY ?? ${safeDirection}`;
    params.push(orderByColumn);

    if (limit !== null && offset !== null) {
      sql += ` LIMIT ? OFFSET ?`;
      params.push(Number(limit), Number(offset));
    }

    try {
      return await this.query(this.database, sql, params);
    } catch (error) {
      console.error(`GetAll operation failed for table ${this.tableName}:`, error);
      throw new Error(`Failed to fetch records: ${error.message}`);
    }
  }
}

module.exports = new RoleRepository();
