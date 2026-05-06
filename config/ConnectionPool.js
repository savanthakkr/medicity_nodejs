var Promise = require('bluebird'),
  mysql = require('mysql2'),
  using = Promise.using;
//const wlogger = require('../helpers/logger').logger;

// var dbs = require('/home/ubuntu/config/db').dbs;
// var dbs_v2 = require('/home/ubuntu/config/db').dbs_v2;
// var dbs_login = require('/home/ubuntu/config/db').dbs_login;
// var constants = require('/home/ubuntu/config/constants');
var dbs = require('./db').dbs;
var dbs_v2 = require('./db').dbs_v2;
var dbs_login = require('./db').dbs_login;
var constants = require('./constants');
var utility = require('../helpers/utility');

var env = process.env.NODE_ENV == 'production' ? 'prod' : 'dev';
var pools = {};
var pools_v2 = {};
var base = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'project_dev_medicity',
  connectionLimit: 200,
  multipleStatements: true,
  dateStrings: true,
  //debug: true,
  //acquireTimeout: 30000,
  typeCast: function (field, next) {
    if (field.type == 'BIT' && field.length == 1) {
      var bit = field.string();
      return bit === null ? null : bit.charCodeAt(0);
    }
    return next();
  },
};

exports.connection = async () =>
  new Promise((resolve, reject) => {
    //console.log('--------------------');
    //console.log(dbs);
    Object.keys(dbs).forEach(function (d) {
      var o = Object.assign({}, base);
      Object.keys(dbs[d]).forEach(function (k) {
        o[k] = dbs[d][k];
      });
      pools[d] = mysql.createPool(o);
    });
    constants.vals.dbconnpool = {};
    resolve(pools);
  });

exports.connection_v2 = async () =>
  new Promise((resolve, reject) => {
    //console.log('--------------------');
    //console.log(dbs);
    if (!utility.checkEmpty(dbs_v2)) {
      Object.keys(dbs_v2).forEach(function (d) {
        var o = Object.assign({}, base);
        o['database'] = dbs_v2[d].database;
        if (
          !utility.checkEmpty(constants.vals.service_name) &&
          !utility.checkEmpty(dbs_login[constants.vals.service_name])
        ) {
          o['user'] = dbs_login[constants.vals.service_name].user;
          o['password'] = dbs_login[constants.vals.service_name].password;
        }
        let readPool = o;
        let writePool = o;

        readPool.host = dbs_v2[d].read;
        writePool.host = dbs_v2[d].write;
        pools_v2[d] = {};
        pools_v2[d].read = mysql.createPool(readPool);
        pools_v2[d].write = mysql.createPool(writePool);
      });
    }
    resolve(pools_v2);
  });

exports.query = async (database, qry, params) =>
  new Promise((resolve, reject) => {
    // console.log(mysql.format(qry, params));

    const handler = (error, result) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(result);
    };
    // console.log('++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++',database);
    // console.log('------------------------------------------------------------------------------------------------');
    // console.log(constants.vals.dbconn);
    // console.log('++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');
    // console.log( constants.vals.dbconn,database);
    //   constants.vals.dbconn[database].on('acquire', function (connection) {
    //     //console.log('Connection %d acquired '+database, connection.threadId);
    //   });

    //   constants.vals.dbconn[database].on('connection', function (connection) {
    //     //console.log('Connection done '+database);
    //   });

    //   constants.vals.dbconn[database].on('release', function (connection) {
    //     //console.log('Connection %d released '+database, connection.threadId);
    //   });

    //var qry = constants.vals.dbconn[database].query(q, params, handler);

    let checkVer = 'v1';
    let queryType = 'write';
    qry = qry.trim();
    // console.log(qry, params);
    if (!utility.checkEmpty(qry)) {
      let fWord = qry.split(' ');
      if (!utility.checkEmpty(fWord)) {
        if (fWord[0].toLowerCase() == 'select') {
          queryType = 'read';
        }
      }
    }

    // let connectionObj = constants.vals.dbconn[database];
    let connectionObj = constants.vals.dbconn[database] || constants.vals.dbconn['default'];

    // if (!utility.checkEmpty(constants.vals.dbconnv2) && !utility.checkEmpty(constants.vals.dbconnv2[database]) && !utility.checkEmpty(constants.vals.dbconnv2[database][queryType])) {
    //   checkVer = 'v2';
    //   connectionObj = constants.vals.dbconnv2[database][queryType];
    // }
    // if (!utility.checkEmpty(constants.vals.dbconnv2)) {
    //   //console.log('checkVer ==== 111111', constants.vals.dbconnv2);
    // }
    // if (database == 'mysql_dine_server_common' || database == 'mysql_csd') {
    //   //console.log('checkVer ==== ', database, checkVer);
    // }

    try {
      connectionObj.getConnection(function (err, connection) {
        if (err) {
          console.error(
            '++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++',
          );
          // console.error(mysql.format(qry, params));
          console.error(
            '------------------------------------------------------------------------------------------------',
          );
          console.error('runQry-cannot getConnection ERROR: ' + database, err);
          reject(err);
        }
        connection.query(qry, params, function (err, result) {
          if (database == 'mysql_dine_server_common') {
            // console.log(mysql.format(qry, params));
            let querylog = {};
            querylog.querylog_Product = 'dineservice-nodejs';
            querylog.querylog_Database = database;
            querylog.querylog_Stmt = qry;
            querylog.querylog_Params = params;
            querylog.querylog_Query = mysql.format(qry, params);
            try {
              //constants.vals.mongodbconn[constants.vals.commonDB].model("querylog")(querylog).save();
            } catch (e) {
              console.log('MDB ERR', e);
            }
          }
          connection.release();
          if (err) {
            console.error(
              '++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++',
            );
            // console.error(mysql.format(qry, params));
            console.error(
              '------------------------------------------------------------------------------------------------',
            );
            console.error('runQry-cannot Query ERROR:' + database, err);
            reject(err);
          }

          resolve(result);
        });
      });
    } catch (err) {
      console.log('Connection error ', database, err);
    }
  });
