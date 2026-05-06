const BaseRepository = require('./BaseRepository.js');
const utility = require('../../helpers/utility');
const NotificationRepo = require('./NotificationRepository.js');

class ContactAuditLogRepository extends BaseRepository {
  constructor() {
    super('contact_audit_log', 'contact_audit_log_Id');
  }

  async create(dto = {}) {
    const insertId = await super.create(dto);

    await NotificationRepo.createAuditNotification({
      module: 'CONTACT',
      action: dto.modification_type || 'UPDATE',
      ref_id: dto.contact_Id || null,
      details: dto.modification_reason || null,
      modified_By: dto.modified_by_user_Id || null,
      source_table: 'contact_audit_log',
      source_audit_id: insertId,
      created_at: dto.created_at || null,
    });

    return insertId;
  }
}

module.exports = new ContactAuditLogRepository();

/*
	#	Name	Type	Collation	Attributes	Null	Default	Comments	Extra	Action
	1	contact_audit_log_Id Primary	int		UNSIGNED	No	None		AUTO_INCREMENT	Change Change	Drop Drop	
	2	contact_Id Index	int		UNSIGNED	No	None			Change Change	Drop Drop	
	3	modification_type	varchar(100)	utf8mb4_general_ci		Yes	NULL	'CREATE','UPDATE','DELETE'		Change Change	Drop Drop	
	4	original_data	json			Yes	NULL			Change Change	Drop Drop	
	5	modified_data	json			Yes	NULL			Change Change	Drop Drop	
	6	modified_by_user_Id Index	int		UNSIGNED	No	None			Change Change	Drop Drop	
	7	modification_reason	varchar(255)	utf8mb4_general_ci		Yes	NULL			Change Change	Drop Drop	
	8	created_at	datetime			Yes	NULL			Change Change	Drop Drop	
	9	is_active	tinyint			No	1			Change Change	Drop Drop	
	10	is_deleted	tinyint			No	0			Change Change	Drop Drop	
	11	updated_at	datetime			Yes	NULL			Change Change	Drop Drop	
	12	deleted_at	datetime			Yes	NULL			Change Change	Drop Drop	

*/
