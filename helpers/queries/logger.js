const query = require("../query.js")
const constants = require("../../vars/constants.js")


const Logger = exports;

const dbName = constants.vals.dbList.khosla_scratchCard;
const webhookLogTable = constants.vals.tableList.webhook_log

exports.logWebhook = async function (payload, status, message){
    let params = {};
    params['webhook_log_Source'] = 'external';
    params['webhook_log_Payload'] = JSON.stringify(payload);
    params['webhook_log_Status'] = status;
    params['webhook_log_Message'] = message;

    query.insertSingle(constants.vals.defaultDB, webhookLogTable, params);
}