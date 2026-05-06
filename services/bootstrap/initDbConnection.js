"use strict";

// var constants = require("/home/ubuntu/config/constants");
var constants = require('../../config/constants');
var dbcon = require("../../config/ConnectionPool.js"); 
var utility = require("../../helpers/utility");

function initDbConnection() {
  return new Promise(function (resolve, reject) {
    try {
      // already ready
      if (!utility.checkEmpty(constants.vals.dbconn)) {
        return resolve(constants.vals.dbconn);
      }

      // create once
      dbcon.connection()
        .then(function (conn) {
          constants.vals.dbconn = conn;
          console.log("[DB] connection initialized");
          resolve(conn);
        })
        .catch(function (e) {
          console.error("[DB] connection init failed", e);
          reject(e);
        });
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  initDbConnection: initDbConnection
};
