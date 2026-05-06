const BaseRepository = require("./BaseRepository.js");
const utility = require("../../helpers/utility");

class RolePermissionRepository extends BaseRepository {
    constructor() {
        super("role_permission", "role_permission_Id");
    }

    // async bulkCreate(rows = []) {
    //     if (utility.checkEmpty(rows) || !Array.isArray(rows)) {
    //         return false;
    //     }

    //     const sql = ` INSERT INTO role_permission
    //         (
    //             role_permission_Role_Id,
    //             role_permission_Permission_Id,
    //             role_permission_Granted_By_User_Id
    //         )
    //         VALUES ?
    //     `;


    //     const values = rows.map(row => [
    //         row.role_permission_Role_Id,
    //         row.role_permission_Permission_Id,
    //         row.role_permission_Granted_By_User_Id || null
    //     ]);

    //     return await this.query(this.database, sql, [values]);
    // }

    async deleteByRoleId(roleId, now) {
        if (utility.checkEmpty(roleId)) return false;

        const sql = `  DELETE FROM ?? WHERE ?? = ? `;

        const params = [this.tableName, "role_permission_Role_Id", roleId];
        await this.query(this.database, sql, params);
        return true;
    }

    async getPermissionIdsByRoleId(roleId) {
        if (utility.checkEmpty(roleId)) return [];

        const sql = ` SELECT ?? FROM ?? WHERE ?? = ? AND ?? = 0 AND ?? = 1 `;

        const params = [
            "role_permission_Permission_Id",
            this.tableName,
            "role_permission_Role_Id",
            roleId,
            "is_deleted",
            "is_active"
        ];

        const rows = await this.query(this.database, sql, params);

        return rows;
    }

    async getPermissionIdsByRoleIds(roleIds) {
        if (utility.checkEmpty(roleIds)) return [];

        const sql = ` SELECT * FROM ?? WHERE ?? IN (?) AND ?? = 0 AND ?? = 1 `;

        const params = [this.tableName, 'role_permission_Role_Id', roleIds, "is_deleted", "is_active"];

        const rows = await this.query(this.database, sql, params);

        return rows;
    }

    async findByRoleAndPermission(roleId, permissionId) {
        const sql = ` SELECT * FROM ?? WHERE role_permission_Role_Id = ? AND role_permission_Permission_Id = ? LIMIT 1 `;
        const rows = await this.query(this.database, sql, [this.tableName, roleId, permissionId]);
        return rows[0] || null;
    }


    async softDeleteByRoleAndPermission(roleId, permissionId, userId, now) {
        const sql = ` UPDATE role_permission  SET is_deleted = 1, is_active = 0,  deleted_at = ?
        WHERE role_permission_Role_Id = ? AND role_permission_Permission_Id = ? AND is_deleted = 0`;
        return this.query(this.database, sql, [now, roleId, permissionId]);
    }

}

module.exports = new RolePermissionRepository();
