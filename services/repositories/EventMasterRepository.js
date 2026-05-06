const BaseRepository = require("./BaseRepository.js");
const utility = require("../../helpers/utility");

class EventMasterRepository extends BaseRepository {
    constructor() {
        super("event_master", "event_Id");
    }

    async findByName(eventName) {
        if (utility.checkEmpty(eventName)) return null;

        const sql = ` SELECT * FROM ?? WHERE ?? = ? AND ?? = 0 AND ?? = 1 LIMIT 1 `;
        const params = [this.tableName, "event_name", eventName, "is_deleted", "is_active"];

        const rows = await this.query(this.database, sql, params);
        return rows.length ? rows[0] : null;
    }

    async findByNameWithId(eventName, eventId) {
        if (utility.checkEmpty(eventName)) return null;
        const sql = ` SELECT * FROM ?? WHERE ?? = ? AND ?? = 0 AND ?? = 1 AND ?? != ? LIMIT 1`;
        const params = [this.tableName, "event_name", eventName, "is_deleted", "is_active", this.idColumn, eventId];
        const rows = await this.query(this.database, sql, params);
        return rows.length ? rows[0] : null;
    }

    async getByDateRangeJson(startDate, endDate, limit, offset) {
        const sql = `
        SELECT DISTINCT em.*
        FROM event_master em,
        JSON_TABLE(
            em.event_date_Json,
            '$.timeslots[*]'
            COLUMNS (
                slot_date_raw VARCHAR(20) PATH '$.date'
            )
        ) jt
        WHERE em.is_deleted = 0
        AND COALESCE(
            STR_TO_DATE(jt.slot_date_raw, '%d-%m-%Y'),
            STR_TO_DATE(jt.slot_date_raw, '%Y-%m-%d')
        ) BETWEEN ? AND ?
        LIMIT ?, ?
    `;
        const params = [startDate, endDate, offset, limit];
        const rows = await this.query(this.database, sql, params);
        return rows;
    }


    async countByDateRangeJson(startDate, endDate) {
        const sql = `
        SELECT COUNT(DISTINCT em.event_Id) AS total
        FROM event_master em,
        JSON_TABLE(
            em.event_date_Json,
            '$.timeslots[*]'
            COLUMNS (
                slot_date_raw VARCHAR(20) PATH '$.date'
            )
        ) jt
        WHERE em.is_deleted = 0
        AND COALESCE(
            STR_TO_DATE(jt.slot_date_raw, '%d-%m-%Y'),
            STR_TO_DATE(jt.slot_date_raw, '%Y-%m-%d')
        ) BETWEEN ? AND ?
    `;
        const params = [startDate, endDate];
        const rows = await this.query(this.database, sql, params);
        return rows.length ? rows[0].total : 0;
    }


    async getByIds(eventIds) {
        if (!Array.isArray(eventIds) || eventIds.length === 0) return [];

        const normalizedIds = [...new Set(eventIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
        if (normalizedIds.length === 0) return [];

        const query = `SELECT * FROM event_master WHERE event_Id IN (?) AND is_deleted = 0`;

        const rows = await this.query(this.database, query, [normalizedIds]);
        return rows;
    }

    async getApprovedUpcomingByIds(eventIds = [], fromDate = null) {
        if (!Array.isArray(eventIds) || eventIds.length === 0) return [];

        const normalizedFromDate = String(fromDate || "").trim();
        const effectiveFromDate = /^\d{4}-\d{2}-\d{2}$/.test(normalizedFromDate)
            ? normalizedFromDate
            : this.getCurrentServerTime().slice(0, 10);

        const sql = `
            SELECT DISTINCT em.*
            FROM event_master em
            JOIN JSON_TABLE(
                em.event_date_Json,
                '$.timeslots[*]'
                COLUMNS (
                    slot_date_raw VARCHAR(20) PATH '$.date'
                )
            ) jt
            WHERE em.event_Id IN (?)
              AND em.is_deleted = 0
              AND em.is_active = 1
              AND LOWER(TRIM(em.status)) = 'active'
              AND COALESCE(
                    STR_TO_DATE(jt.slot_date_raw, '%d-%m-%Y'),
                    STR_TO_DATE(jt.slot_date_raw, '%Y-%m-%d')
                  ) > ?
        `;

        return this.query(this.database, sql, [eventIds, effectiveFromDate]);
    }

    async getByEventParentId(parentId) {
        if (utility.checkEmpty(parentId)) return null;
        const sql = ` SELECT * FROM ?? WHERE ?? = ? AND ?? = 0 AND ?? = 1 LIMIT 1 `;
        const params = [this.tableName, "event_parent_Id", parentId, "is_deleted", "is_active", this.idColumn, eventId];
        const rows = await this.query(this.database, sql, params);
        return rows.length ? rows[0] : null;
    }

    async softDeleteByParent(parentId, now) {
        const sql = `
            UPDATE event_master
            SET is_deleted = 1,
                is_active = 0,
                deleted_at = ?,
                updated_at = ?
            WHERE event_parent_Id = ?
              AND is_deleted = 0
        `;

        return await this.query(this.database, sql, [now, now, parentId]);
    }

    async getEventStatusCount() {
        const sql = ` SELECT status, COUNT(*) as total FROM event_master WHERE is_deleted = 0 GROUP BY status `;

        return await this.query(this.database, sql);
    }


    async getEventIdsByDateRangeJson(startDate, endDate) {
        const sql = `
                SELECT DISTINCT em.event_Id
                FROM event_master em,
                JSON_TABLE(
                    em.event_date_Json,
                    '$.timeslots[*]'
                    COLUMNS (
                    slot_date_raw VARCHAR(20) PATH '$.date')
                    ) jt
                    WHERE em.is_deleted = 0
                    AND COALESCE(
                        STR_TO_DATE(jt.slot_date_raw, '%d-%m-%Y'),
                        STR_TO_DATE(jt.slot_date_raw, '%Y-%m-%d')
                    ) BETWEEN ? AND ?
                `;
        const rows = await this.query(this.database, sql, [startDate, endDate]);
        return rows.map(r => r.event_Id);
    }

}

module.exports = new EventMasterRepository();
