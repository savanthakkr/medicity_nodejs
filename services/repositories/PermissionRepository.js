const BaseRepository = require("./BaseRepository.js");
const utility = require("../../helpers/utility/index.js");

class PermissionRepository extends BaseRepository {
  constructor() {
    super("permission", "permission_Id");
  }

  async findByIds(ids) {
    if (utility.checkEmpty(ids)) return [];

    const arr = Array.isArray(ids) ? ids : [ids];

    const sql = `SELECT * FROM ?? WHERE ?? IN (?) AND ?? = 0 AND ?? = 1`;
    const params = [this.tableName, "permission_Id", arr, "is_deleted", "is_active"];

    return await this.query(this.database, sql, params);
  }

  async findByKey(key) {
    if (utility.checkEmpty(key)) return null;

    const sql = `SELECT * FROM ?? WHERE ?? = ? AND ?? = 0 AND ?? = 1 LIMIT 1`;
    const params = [this.tableName, "permission_Key", key, "is_deleted", "is_active"];

    const rows = await this.query(this.database, sql, params);
    return rows?.[0] || null;
  }

  /**
   * ✅ For bootstrap: fetch existing permissions by keys.
   * NOTE: We DO NOT filter by is_active/is_deleted, because bootstrap must know what exists.
   */
  async findByKeys(keys = []) {
    if (utility.checkEmpty(keys)) return [];

    const arr = Array.isArray(keys) ? keys : [keys];
    if (!arr.length) return [];

    const sql = `SELECT permission_Id, permission_Key, is_active, is_deleted
                 FROM ??
                 WHERE ?? IN (?)`;

    const params = [this.tableName, "permission_Key", arr];
    return await this.query(this.database, sql, params);
  }

  /**
   * ✅ Insert missing permissions in bulk, safely.
   * Uses INSERT IGNORE (MySQL) => avoids crash on duplicate key (multi instance start).
   *
   * item shape:
   * { key, action?, description?, isSystem? }
   */
  async insertManyIgnore(items = []) {
    if (utility.checkEmpty(items)) return { inserted: 0 };

    const data = Array.isArray(items) ? items : [items];

    const cleaned = data
      .map(x => ({
        key: String(x?.key || "").trim(),
        action: x?.action ?? null,
        description: x?.description ?? null,
        isSystem: x?.isSystem ? 1 : 0
      }))
      .filter(x => x.key);

    if (!cleaned.length) return { inserted: 0 };

    const now = this.getCurrentServerTime();

    const columns = [
      "permission_Key",
      "permission_is_System",
      "permission_Action",
      "permission_Description",
      "is_active",
      "is_deleted",
      "created_at",
      "updated_at"
    ];

    const rowPlaceholders = `(${columns.map(() => "?").join(", ")})`;
    const placeholders = cleaned.map(() => rowPlaceholders).join(", ");

    const sql = `INSERT IGNORE INTO ?? (${columns.map(() => "??").join(", ")})
                 VALUES ${placeholders}`;

    const params = [
      this.tableName,
      ...columns,
      ...cleaned.flatMap(p => [
        p.key,
        p.isSystem,
        p.action,
        p.description,
        1,      // is_active
        0,      // is_deleted
        now,
        now
      ])
    ];

    const result = await this.query(this.database, sql, params);
    return { inserted: result?.affectedRows || 0 };
  }

  /**
   * ✅ Optional: revive permissions that exist but are inactive/deleted.
   * - is_active = 1
   * - is_deleted = 0
   * - deleted_at = NULL
   * - updated_at = now
   */
  async reactivateByKeys(keys = []) {
    if (utility.checkEmpty(keys)) return { updated: 0 };

    const arr = Array.isArray(keys) ? keys : [keys];
    if (!arr.length) return { updated: 0 };

    const sql = `UPDATE ??
                 SET ?? = 1,
                     ?? = 0,
                     ?? = NULL,
                     ?? = ?
                 WHERE ?? IN (?)`;

    const params = [
      this.tableName,
      "is_active",
      "is_deleted",
      "deleted_at",
      "updated_at",
      this.getCurrentServerTime(),
      "permission_Key",
      arr
    ];

    const result = await this.query(this.database, sql, params);
    return { updated: result?.affectedRows || 0 };
  }
}

module.exports = new PermissionRepository();
