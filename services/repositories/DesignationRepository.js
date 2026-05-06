const BaseRepository = require("./BaseRepository.js");
const utility = require("../../helpers/utility");

class DesignationRepository extends BaseRepository {
    constructor() {
        super("designation", "designation_Id");
    }

    async findByName(name) {
        if (utility.checkEmpty(name)) return null;
        const sql = ` SELECT * FROM ?? WHERE ?? = ? AND ?? = 0 AND ?? = 1 LIMIT 1 `;
        const params = [this.tableName, "designation_Name", name, "is_deleted", "is_active"];
        const rows = await this.query(this.database, sql, params);
        return rows.length ? rows[0] : null;
    }

    async findByNameWithId(name, id) {
        if (utility.checkEmpty(name) || utility.checkEmpty(id)) return null;
        const sql = ` SELECT * FROM ?? WHERE ?? = ? AND ?? = 0 AND ?? = 1 AND ?? != ? LIMIT 1`;
        const params = [this.tableName, "designation_Name", name, "is_deleted", "is_active", this.idColumn, id];
        const rows = await this.query(this.database, sql, params);
        return rows.length ? rows[0] : null;
    }

    async getByIds(desId) {
        if (utility.checkEmpty(desId)) return [];
        const sql = ` SELECT * FROM ?? WHERE ?? IN (?) AND ?? = 0 AND ?? = 1 `;
        const params = [this.tableName, 'designation_Id', desId, "is_deleted", "is_active"];
        const rows = await this.query(this.database, sql, params);
        return rows;
    }
}

module.exports = new DesignationRepository();
