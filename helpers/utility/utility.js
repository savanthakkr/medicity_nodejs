'use strict';
var encryptLaravel5 = require('encrypt-laravel-5');
var moment = require('moment-timezone');
// var constants = require('/home/ubuntu/config/constants');
// var messages = require("/home/ubuntu/surity_select_node_backend/config/messages");
const axios = require('axios');
var utility = exports;
// const apiResponse = require('/home/ubuntu/config/apiResponse');
var constants = require('../../config/constants');
const apiResponse = require('../../config/apiResponse');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
var _ = require('underscore');
const { promisify } = require('util');

module.exports.checkEmail = (req, email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

module.exports.validateMobile = (req, mobile) => {
  const mobileRegex = /^[0-9]{10}$/;
  return mobileRegex.test(mobile);
};

module.exports.decryptlara = function (encrypted) {
  return encryptLaravel5.decrypt(encrypted, constants.vals.hash_key);
};

module.exports.encryptlara = function (payload) {
  return encryptLaravel5.encrypt(payload, constants.vals.hash_key);
};

module.exports.formatTotal = function (num) {
  return utility.number_format(Math.round(num * 100) / 100, 2, '.', '');
};

exports.generate_password = async (passwordLength) => {
  var chars = '0123456789abcdefghijklmnopqrstuvwxyz!@#$ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var password = '';
  for (var i = 0; i < passwordLength; i++) {
    var randomNumber = Math.floor(Math.random() * chars.length);
    password += chars.substring(randomNumber, randomNumber + 1);
  }
  return password;
};

exports.run_axios_api = async function (req, url, httpMethod, header, data) {
  var config = {
    method: httpMethod,
    url: url,
    headers: header,
    data: data,
  };
  var val = '';
  await axios(config)
    .then(function (response) {
      val = response.data;
    })
    .catch(function (error) {
      if (error.response) {
        val = error.response.data;
      } else if (error.request) {
        console.log(error.request);
      } else {
      }
    });
  return val;
};

module.exports.checkEmpty = function (mixedVar) {
  var key;
  if (typeof mixedVar == 'object') {
    for (key in mixedVar) {
      if (Object.hasOwnProperty.bind(mixedVar)(key)) {
        return false;
      }
    }
    return true;
  } else {
    var undef;

    var i;
    var len;
    var emptyValues = [
      undef,
      null,
      'null',
      false,
      0,
      '',
      '0',
      '0.00',
      '0.0',
      'empty',
      undefined,
      'undefined',
      '0000-00-00 00:00:00',
    ];
    if (typeof mixedVar == 'string') {
      mixedVar = mixedVar.trim();
    }

    for (i = 0, len = emptyValues.length; i < len; i++) {
      if (mixedVar == emptyValues[i]) {
        return true;
      }
    }
  }
  return false;
};

module.exports.normalizeText = function (value, options = {}) {
  const normalizedOptions = options && typeof options === 'object' ? options : {};
  const trim = normalizedOptions.trim !== false;
  const lowercase = normalizedOptions.lowercase === true;
  const collapseWhitespace = normalizedOptions.collapseWhitespace === true;
  const fallback = Object.prototype.hasOwnProperty.call(normalizedOptions, 'fallback') ? normalizedOptions.fallback : '';

  if (value === undefined || value === null) return fallback;

  let text = String(value);

  if (collapseWhitespace) {
    text = text.replace(/\s+/g, ' ');
  }

  if (trim) {
    text = text.trim();
  }

  if (lowercase) {
    text = text.toLowerCase();
  }

  return text;
};

module.exports.number_format = function (number, decimals, dec_point, thousands_sep) {
  number = (number + '').replace(/[^0-9+\-Ee.]/g, '');
  var n = !isFinite(+number) ? 0 : +number,
    prec = !isFinite(+decimals) ? 0 : Math.abs(decimals),
    sep = typeof thousands_sep == 'undefined' ? ',' : thousands_sep,
    dec = typeof dec_point == 'undefined' ? '.' : dec_point,
    s = '',
    toFixedFix = function (n, prec) {
      var k = Math.pow(10, prec);
      return '' + Math.round(n * k) / k;
    };
  // Fix for IE checkFloat(0.55).toFixed(0) = 0
  s = (prec ? toFixedFix(n, prec) : '' + Math.round(n)).split('.');
  if (s[0].length > 3) {
    s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
  }
  if ((s[1] || '').length < prec) {
    s[1] = s[1] || '';
    s[1] += new Array(prec - s[1].length + 1).join('0');
  }
  return s.join(dec);
};

module.exports.trimMobile = function (num) {
  if (!utility.checkEmpty(num)) {
    // Incorrect regex "/[^0-9]/" correct regex is /[^0-9]/g because replace() does not recognize strings as regex.
    num = num.replace('/[^0-9]/', '');
    num = '' + num + '';
    num = num.trim();
    num = num.substr(num.length - 10);
  }
  return num;
};

exports.successApiResponse = async function (req, res, response) {
  if (!utility.checkEmpty(req.locals.apptech) && req.locals.apptech == 'fcsd') {
    response = await this.nestedObjToStr(req, response);
  }
  return response;
};

module.exports.getRand = function () {
  return Math.floor(Math.random() * 1000);
};

module.exports.getRandDigit = function (digits) {
  if (digits < 1) {
    throw new Error('Number of digits must be at least 1');
  }
  let min = Math.pow(10, digits - 1);
  let max = Math.pow(10, digits) - 1;
  return Math.floor(min + Math.random() * (max - min + 1));
};

module.exports.carbon = {
  now: function (req) {
    return moment().tz(req.locals.tz).format('YYYY-MM-DD HH:mm:ss');
  },
  parse: function (date) {
    return moment.parseZone(date).format('YYYY-MM-DD HH:mm:ss');
  },
  yesterday: function (req) {
    return moment().subtract(1, 'days').tz(req.locals.tz).format('YYYY-MM-DD HH:mm:ss');
  },
  fromDay: function (req, dayCount) {
    return moment().subtract(dayCount, 'days').tz(req.locals.tz).format('YYYY-MM-DD HH:mm:ss');
  },
  tomorrow: function (req) {
    return moment().add(1, 'days').tz(req.locals.tz).format('YYYY-MM-DD HH:mm:ss');
  },
  format: function (date, frmt) {
    return moment.parseZone(date).format(frmt);
  },
  strtotime: function (req, date) {
    return moment(date).tz(req.locals.tz).valueOf() / 1000; //new Date(date).getTime() / 1000;
  },
  isGreater: function (date1, date2) {
    date1 = moment.parseZone(date1).format('YYYY-MM-DD HH:mm:ss');
    date2 = moment.parseZone(date2).format('YYYY-MM-DD HH:mm:ss');
    let check = moment(date1).isAfter(date2);
    if (check) {
      return true;
    } else {
      return false;
    }
  },
  isGreaterOrEqual: function (date1, date2) {
    date1 = moment.parseZone(date1);
    date2 = moment.parseZone(date2);
    if (date1 >= date2) {
      return true;
    } else {
      return false;
    }
  },
  isLessOrEqual: function (date1, date2) {
    date1 = moment.parseZone(date1);
    date2 = moment.parseZone(date2);
    if (date1 <= date2) {
      return true;
    } else {
      return false;
    }
  },
  addDay: function (date, day) {
    //return  moment.parseZone(date).add(day,'days').tz(req.locals.tz).format('YYYY-MM-DD HH:mm:ss');
    return moment.parseZone(date).add(day, 'days').format('YYYY-MM-DD HH:mm:ss');
  },
  addMonth: function (date, months) {
    //return  moment.parseZone(date).add(day,'days').tz(req.locals.tz).format('YYYY-MM-DD HH:mm:ss');
    return moment.parseZone(date).add(months, 'months').format('YYYY-MM-DD HH:mm:ss');
  },
  addDayFormat: function (date, day, frmt) {
    //return  moment.parseZone(date).add(day,'days').tz(req.locals.tz).format('YYYY-MM-DD HH:mm:ss');
    return moment.parseZone(date).add(day, 'days').format(frmt);
  },
  subDay: function (date, day) {
    return moment.parseZone(date).subtract(day, 'days').format('YYYY-MM-DD HH:mm:ss');
  },
  addMinutes: function (date, minutes) {
    return moment.parseZone(date).add(minutes, 'minutes').format('YYYY-MM-DD HH:mm:ss');
  },
  subMinutes: function (date, minutes) {
    return moment.parseZone(date).subtract(minutes, 'minutes').format('YYYY-MM-DD HH:mm:ss');
  },
  subSeconds: function (date, seconds) {
    return moment.parseZone(date).subtract(seconds, 'seconds').format('YYYY-MM-DD HH:mm:ss');
  },
  addSeconds: function (date, seconds) {
    return moment.parseZone(date).add(seconds, 'seconds').format('YYYY-MM-DD HH:mm:ss');
  },
  diff: function (date1, date2, unit) {
    date1 = moment.parseZone(date1);
    date2 = moment.parseZone(date2);
    return date1.diff(date2, unit, true);
  },
  endofMonth: (date, frmt) => moment(date).clone().endOf('month').format(frmt),
  firstOfMonth: (date, frmt) => moment(date).clone().startOf('month').format(frmt),
  subMonths: function (date, months) {
    return moment.parseZone(date).subtract(months, 'months').format('YYYY-MM-DD HH:mm:ss');
  },
  subWeek: function (date, week) {
    return moment.parseZone(date).subtract(week, 'week').format('YYYY-MM-DD HH:mm:ss');
  },
  parseTimeZone: function (req, date) {
    let formattedTime = moment().parseZone(date).format('YYYY-MM-DD HH:mm:ss');
    return formattedTime;
  },
  lastFridayDate: function (req) {
    let formattedDateTime = moment().parseZone(req.locals.now).day(-2).format('YYYY-MM-DD');
    return formattedDateTime;
  },
};

exports.checkFloat = function (num) {
  num = parseFloat(num);
  if (isNaN(num) || num == 0.0 || num == '' || num == 0 || num == '0') {
    return 0.0;
  } else {
    num = utility.formatTotal(num);
    num = parseFloat(num);
    if (isNaN(num) || num == 0.0 || num == '' || num == 0 || num == '0') {
      return 0.0;
    } else {
      return num;
    }
  }
};

module.exports.checkInt = function (num) {
  num = parseInt(num);
  if (isNaN(num) || num == '' || num == 0 || num == '0') {
    return 0;
  } else {
    return num;
  }
};

exports.objToPluckArr = function (obj, val) {
  var objarr = [];
  for (var k in obj) {
    objarr.push(obj[k][val]);
  }
  return objarr;
};

exports.ErrorResponse = async (res, error, statusCode = 500) => {
  const response = {
    status: 'error',
    msg: error?.message || error || 'An unexpected error occurred.',
  };
  return res.status(statusCode).json(response);
};

// exports.sendSuccess = async(res, req, data, message = "Success") => {
//   const result = {
//     status: "success",
//     msg: message,
//     data,
//   };
//   return await apiResponse.successApiResponse(res, result);
// }

exports.sendSuccess = async (res, req, data, message = 'Success', statusCode = 200, pagination, filter, sorting) => {
  const result = {
    status: 'success',
    msg: message,
    data,
  };

  if (!utility.checkEmpty(pagination)) {
    result.pagination = pagination;
  }

  if (!utility.checkEmpty(filter)) {
    result.filter = filter;
  }
  if (!utility.checkEmpty(sorting)) {
    result.sorting = sorting;
  }
  return await apiResponse.successApiResponse(res, result);
};

exports.sendError = async (res, req, error, message = 'An unexpected error occurred.', statusCode = 500) => {
  const result = {
    status: 'error',
    msg: message,
    error: error?.message || error || null,
  };

  return this.ErrorResponse(res, result.msg, statusCode, result.error);
};

exports.hashPassword = (password) => bcrypt.hash(password, 10);

exports.generateAuthToken = (userId, hashedPassword) => {
  const tokenData = userId + '---' + hashedPassword;
  const token = jwt.sign({ tokenData }, process.env.JWT_SECRET);
  return token;
};

exports.isset = function (obj, key) {
  if (_.has(obj, key)) {
    return true;
  } else {
    return false;
  }
};

exports.validateRequiredFields = (inputData, requiredFields) => {
  const missingFields = requiredFields.filter((field) => utility.checkEmpty(inputData[field]));
  if (missingFields.length > 0) {
    return `Missing or empty fields → ${missingFields.join(', ')}`;
  }
  return null;
};

exports.validateArray = (arr) => {
  if (!Array.isArray(arr) || utility.checkEmpty(arr)) {
    return 'Array must be non-empty';
  }
  return null;
};

exports.groupBy = (arr, key) => {
  return arr.reduce((acc, item) => {
    (acc[item[key]] = acc[item[key]] || []).push(item);
    return acc;
  }, {});
};

exports.sleep = promisify(setTimeout);
