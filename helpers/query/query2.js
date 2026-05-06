"use strict";
// var constants = require("/home/ubuntu/config/constants");
var constants = require('../../config/constants');
var mysql = require('mysql2');
var dbcon = require("../../config/ConnectionPool");
var utility = require('../../helpers/utility');


module.exports.insertSingle = async function (db, table, params) {
    var content = await dbcon.query(db, "INSERT INTO ?? SET ?;", [table, params]).catch(console.log);
    if (!utility.checkEmpty(content)) {
        content = content.insertId;
    }
    return content;
};


exports.insertMultiple = async (req, db, table, multiParams) => {
    var query = [];
    var prm = "";
    var rsql = "";
    var content = "";
    for (var k in multiParams) {
        query.push(mysql.format('INSERT INTO ?? SET ?', [table, multiParams[k]]));
    }
    query = query.join(';');
    if (!utility.checkEmpty(query)) {
        content = await dbcon.query(db, query, []).catch(e => console.log(e));
    }
    return content;
};