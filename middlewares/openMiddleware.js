// "use strict";
// var express = require("express");
// var moment = require('moment-timezone');

// var constants = require("/home/ubuntu/config/constants");
// // var apiResponse = require("/home/ubuntu/config/apiResponse");
// var apiResponse = require("./config/apiResponse");

// var dbcon = require("../config/ConnectionPool");
// var utility = require("../helpers/utility");

// var router = express.Router();

// router.use(async function (req, res, next) {
//     res.removeHeader("X-Powered-By");
//     res.removeHeader("Server");
//     req.locals = {};

//     if (utility.checkEmpty(constants.vals.dbconn)) {
//         if (utility.checkEmpty(constants.vals.dbconn)) {
//             constants.vals.dbconn = await dbcon.connection().catch(e => { console.log(e); })
//             console.log('from conn');

//         } else {
//             console.log('from redis');
//         }
//     }
//     req.locals.tz = constants.vals.tz;
//     let now = utility.carbon.now(req);
//     req.locals.now = now;
//     req.locals.appService = 'medicity_api';
//     return next();

// })


// module.exports = router;
"use strict";

var express = require("express");
var moment = require("moment-timezone");

var constants = require("../config/constants");
var apiResponse = require("../config/apiResponse");

var dbcon = require("../config/ConnectionPool");
var utility = require("../helpers/utility");

var router = express.Router();

router.use(async function (req, res, next) {

    res.removeHeader("X-Powered-By");
    res.removeHeader("Server");

    req.locals = {};

    if (utility.checkEmpty(constants.vals.dbconn)) {

        constants.vals.dbconn = await dbcon.connection().catch(e => {
            console.log(e);
        });

        console.log("from conn");
    }

    req.locals.tz = constants.vals.tz;

    let now = new Date();

    req.locals.now = now;
    req.locals.appService = "medicity_api";

    return next();
});

module.exports = router;