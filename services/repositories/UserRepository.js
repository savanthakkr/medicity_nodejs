const BaseRepository = require("./BaseRepository.js");
const utility = require("../../helpers/utility");

class UserRepository extends BaseRepository {
    constructor() {
        super("user", "user_Id");
    }

    async findByEmail(email) {
        if (utility.checkEmpty(email)) return null;

        const sql = ` SELECT * FROM ?? WHERE ?? = ? AND ?? = 0 LIMIT 1 `;
        const params = [
            this.tableName,
            "user_Email",
            email,
            "is_deleted"
        ];

        const rows = await this.query(this.database, sql, params);
        return rows.length ? rows[0] : null;
    }

    async findAnyByEmail(email) {
        if (utility.checkEmpty(email)) return null;

        const sql = ` SELECT * FROM ?? WHERE ?? = ? LIMIT 1 `;
        const params = [this.tableName, "user_Email", email];

        const rows = await this.query(this.database, sql, params);
        return rows.length ? rows[0] : null;
    }

    async findByEmailWithId(email, userId) {
        if (utility.checkEmpty(email)) return null;

        const sql = ` SELECT * FROM ?? WHERE ?? = ? AND ?? = 0 AND ?? = 1 AND ?? != ? LIMIT 1`;

        const params = [this.tableName, "user_Email", email, "is_deleted", "is_active", this.idColumn, userId];

        const rows = await this.query(this.database, sql, params);
        return rows.length ? rows[0] : null;
    }

    async findByPhone(phone) {
        if (utility.checkEmpty(phone)) return null;
        const sql = `SELECT * FROM ?? WHERE ?? = ? AND ?? = 0 AND ?? = 1 LIMIT 1`;
        const params = [this.tableName, "user_Mobile", phone, "is_deleted", "is_active"];
        const rows = await this.query(this.database, sql, params);
        return rows.length ? rows[0] : null;
    }

    async getByIds(userIds) {
        if (utility.checkEmpty(userIds)) return [];
        const sql = ` SELECT * FROM ?? WHERE ?? IN (?) AND ?? = 0 AND ?? = 1 `;
        const params = [this.tableName, 'user_Id', userIds, "is_deleted", "is_active"];
        const rows = await this.query(this.database, sql, params);

        return rows;
    }

    async getAllActiveDeactiveUser(userIds = []) {
        try {
            let sql = `SELECT * FROM ?? WHERE ?? = 0`;
            const params = [this.tableName, 'is_deleted'];

            if (!utility.checkEmpty(userIds)) {
                const ids = Array.isArray(userIds) ? userIds : [userIds];
                sql += ` AND ?? IN (?)`;
                params.push('user_Id', ids);
            }

            return await this.query(this.database, sql, params);
        } catch (error) {
            console.error('getAllActiveDeactiveUser error:', error);
            throw error;
        }
    }

    async restoreById(userId, patch = {}, now = null) {
        const normalizedId = Number(userId);
        if (!Number.isFinite(normalizedId) || normalizedId <= 0) return false;

        const updates = {
            is_active: 1,
            is_deleted: 0,
            deleted_at: null,
        };

        if (patch && Object.prototype.hasOwnProperty.call(patch, "user_Email")) {
            updates.user_Email = patch.user_Email;
        }
        if (patch && Object.prototype.hasOwnProperty.call(patch, "user_Dob")) {
            updates.user_Dob = patch.user_Dob;
        }
        if (patch && Object.prototype.hasOwnProperty.call(patch, "user_Anniversary")) {
            updates.user_Anniversary = patch.user_Anniversary;
        }
        if (patch && Object.prototype.hasOwnProperty.call(patch, "designation_Id")) {
            updates.designation_Id = patch.designation_Id;
        }
        if (patch && Object.prototype.hasOwnProperty.call(patch, "user_Password_Hash")) {
            updates.user_Password_Hash = patch.user_Password_Hash;
        }
        if (patch && Object.prototype.hasOwnProperty.call(patch, "user_Name")) {
            updates.user_Name = patch.user_Name;
        }
        if (patch && Object.prototype.hasOwnProperty.call(patch, "user_Mobile")) {
            updates.user_Mobile = patch.user_Mobile;
        }

        const sanitized = this._sanitizeInput({
            ...updates,
            updated_at: now || this.getCurrentServerTime(),
        });

        const entries = Object.entries(sanitized);
        if (entries.length === 0) return false;

        const setClause = entries.map(() => `?? = ?`).join(", ");
        const params = [this.tableName, ...entries.flatMap(([key, value]) => [key, value]), this.idColumn, normalizedId];
        const sql = ` UPDATE ?? SET ${setClause} WHERE ?? = ? `;

        const result = await this.query(this.database, sql, params);
        return result?.affectedRows > 0;
    }


}

module.exports = new UserRepository();
