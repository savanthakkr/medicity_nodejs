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




