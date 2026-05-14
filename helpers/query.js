"use strict";
const constants = require("../vars/constants");
const messages = require("../vars/messages");
const mysql = require('mysql2');
const dbcon = require("../config/mysqlClient.js");
const _ = require('underscore');
const utility = require("../helpers/utility");
const dbquery = exports;






// query samples

exports.insertSingle = async function (db, table, params) {
	let content = await dbcon.query(db, "INSERT INTO ?? SET ?;", [table, params]).catch(console.log);
	if (!utility.checkEmpty(content)) {
		content = content.insertId;
	}
	return content;
};

exports.insertMultiple = async function (db, table, multiParams) {
	let query = [];
	let prm = "";
	let rsql = "";
	let content = "";
	for (let k in multiParams) {
		query.push(mysql.format('INSERT INTO ?? SET ?', [table, multiParams[k]]));
	}
	query = query.join(';');
	if (!utility.checkEmpty(query)) {
		content = await dbcon.query(db, query, []).catch(console.log);
	}
	return content;
};

exports.insertOrUpdate = async function (req, db,device, update) {
	let content = await dbcon.query(constants.vals.commonDB, "INSERT INTO ?? SET ? ON DUPLICATE KEY UPDATE ? , updated_at = ? ", [db,device, req.locals.now]).catch(console.log);
	return content;
}




exports.updateDeliveryType = async function (req, store_Id, pos_basket_Id) {
	let content = dbcon.query(req.locals.db, "update pos_basket set pos_basket_Delivery_Type = 'Collection', pos_basket_Customer_Billing_Postcode = '', pos_basket_Delivery_Distance = '', updated_at = ?  where is_active = 1 and is_delete = 0 and store_Id = ? and pos_basket_Id = ?;", [req.locals.now, store_Id, pos_basket_Id]).catch(console.log);
	return content;
};




exports.getCustomerAddressId = async function (req, common_customer_Id, common_customer_address_Id) {
	let content = await dbcon.query(constants.vals.commonDB, "SELECT * from common_customer_address where is_active = 1 and is_delete=0 and common_customer_Id=? and common_customer_address_Id = ? limit 0,1;", [common_customer_Id, common_customer_address_Id]).catch(console.log);
	if (!utility.checkEmpty(content)) {
		content = content[0];
	}
	return content;
};

exports.parseSqlWhereAnd = function (params) {
	let qry = "";
	for (let k in params) {
		qry += ' and ' + k + ' = ' + mysql.escape(params[k]) + '';
	}
	return qry;
};

exports.checkHolidayStatus = async function (req, store_Id, date) {
	date = utility.carbon.format(date, 'YYYY-MM-DD');
	var content = await dbcon.query(req.locals.db, "select count(*) as rowCount from pos_holiday where is_active =1 and  is_delete = 0 and store_Id = ? and pos_holiday_Date = ? and pos_holiday_Status  = 'Close';", [store_Id, date]).catch(console.log);
	var cnt = 0;
	if (!utility.checkEmpty(content)) {
		cnt = content[0].rowCount;
	}
	return cnt;
};

exports.executeQuery = async function (sql, params = []) {

	let content = await dbcon.query(
		constants.vals.defaultDB,
		sql,
		params
	).catch(console.log);

	return content || [];
};

exports.fetchUserPermissions = async function (userId) {
	let sql = `
		SELECT
			a.access_Key
		FROM access_group_user_linker agul

		INNER JOIN access_group_linker agl
			ON agl.access_group_Id = agul.access_group_Id

		INNER JOIN access a
			ON a.access_Id = agl.access_Id

		WHERE agul.user_Id = ?
		AND agul.is_active = 1
		AND agul.is_deleted = 0

		AND agl.is_active = 1
		AND agl.is_deleted = 0

		AND a.is_active = 1
		AND a.is_deleted = 0
	`;

	let content = await dbcon.query(
		constants.vals.defaultDB,
		sql,
		[userId]
	).catch(console.log);

	return content || [];
};

exports.checkClientEmailExists = async function (email) {
	let sql = `
		SELECT *
		FROM client
		WHERE client_Email = ?
		AND is_deleted = 0
		LIMIT 1
	`;

	let content = await dbcon.query(
		constants.vals.defaultDB,
		sql,
		[email]
	).catch(console.log);

	if (!utility.checkEmpty(content)) {
		content = content[0];
	}
	return content;
};

exports.fetchUserByEmail = async function (email) {

	let sql = `
		SELECT *
		FROM user
		WHERE user_Email = ?
		AND is_active = 1
		AND is_deleted = 0
		LIMIT 1
	`;

	let content = await dbcon.query(
		constants.vals.defaultDB,
		sql,
		[email]
	).catch(console.log);

	if (!utility.checkEmpty(content)) {
		content = content[0];
	}

	return content;
};