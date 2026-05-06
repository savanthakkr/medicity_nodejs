const BaseRepository = require("./BaseRepository.js");
const utility = require("../../helpers/utility");
const NotificationRepo = require("./NotificationRepository.js");

class ContactAuditLogRepository extends BaseRepository {
    constructor() {
        super("rbac_audit_log", "rbac_audit_log_Id");
    }

    async create(dto = {}) {
        const insertId = await super.create(dto);

        await NotificationRepo.createAuditNotification({
            module: 'RBAC',
            action: dto.action_type || 'UPDATE',
            ref_id: dto.role_Id || null,
            details: dto.remarks || null,
            modified_By: dto.performed_by_user_Id || null,
            source_table: 'rbac_audit_log',
            source_audit_id: insertId,
            created_at: dto.created_at || null,
        });

        return insertId;
    }
}

module.exports = new ContactAuditLogRepository();
