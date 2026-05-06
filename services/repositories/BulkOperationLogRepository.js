const BaseRepository = require('./BaseRepository.js');
const utility = require('../../helpers/utility');

class BulkOperationLogRepository extends BaseRepository {
  constructor() {
    super('bulk_operation_log', 'bulk_operation_log_Id');
  }
}

module.exports = new BulkOperationLogRepository();

/*
Uploaded file needs to be uploaded to s3  and store in db
structure:
	#	Name	Type	Collation	Attributes	Null	Default	Comments	Extra	Action
	1	bulk_operation_log_Id Primary	bigint		UNSIGNED	No	None		AUTO_INCREMENT	Change Change	Drop Drop	
	2	requested_by_user_Id	int		UNSIGNED	Yes	NULL			Change Change	Drop Drop	
	3	requested_by_user_Name	varchar(255)	utf8mb4_general_ci		Yes	NULL			Change Change	Drop Drop	
	4	operation_type	varchar(80)	utf8mb4_general_ci		No	None	CONTACT_IMPORT, CONTACT_EXPORT, BULK_MEMBER_ADD, BULK_MEMBER_REMOVE, BULK_TAG_ASSIGN		Change Change	Drop Drop	
	5	module	varchar(80)	utf8mb4_general_ci		Yes	NULL	contact, family_group, tag, event		Change Change	Drop Drop	
	6	status	enum('queued', 'running', 'completed', 'failed', '...	utf8mb4_general_ci		No	queued			Change Change	Drop Drop	
	7	input_file_key	varchar(500)	utf8mb4_general_ci		Yes	NULL			Change Change	Drop Drop	
	8	input_file_name	varchar(255)	utf8mb4_general_ci		Yes	NULL			Change Change	Drop Drop	
	9	output_file_key	varchar(500)	utf8mb4_general_ci		Yes	NULL			Change Change	Drop Drop	
	10	output_file_name	varchar(255)	utf8mb4_general_ci		Yes	NULL			Change Change	Drop Drop	
	11	criteria	json			Yes	NULL	Filters / selected IDs / tag IDs / family group IDs		Change Change	Drop Drop	
	12	total_items	int		UNSIGNED	No	0			Change Change	Drop Drop	
	13	processed_items	int		UNSIGNED	No	0			Change Change	Drop Drop	
	14	success_count	int		UNSIGNED	No	0			Change Change	Drop Drop	
	15	failure_count	int		UNSIGNED	No	0			Change Change	Drop Drop	
	16	skipped_count	int		UNSIGNED	No	0			Change Change	Drop Drop	
	17	error_summary	varchar(500)	utf8mb4_general_ci		Yes	NULL			Change Change	Drop Drop	
	18	error_details	json			Yes	NULL			Change Change	Drop Drop	
	19	started_at	datetime			Yes	NULL			Change Change	Drop Drop	
	20	ended_at	datetime			Yes	NULL			Change Change	Drop Drop	
	21	created_at	datetime			Yes	NULL			Change Change	Drop Drop	
	22	updated_at	datetime			Yes	NULL			Change Change	Drop Drop	
	23	deleted_at	datetime			Yes	NULL			Change Change	Drop Drop	
	24	is_active	tinyint(1)			No	1			Change Change	Drop Drop	
	25	is_deleted	tinyint(1)			No	0			Change Change	Drop Drop	


*/
