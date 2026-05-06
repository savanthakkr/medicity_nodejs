var express = require("express");
var openMiddleware = require("../middlewares/openMiddleware.js");
const userJs = require('./user.route.js');
const permissionJs = require('./permission.route.js');
const roleJs = require('./role.route.js');
const notificationJs = require('./notification.route.js');

var app = express();
app.use(openMiddleware);

app.use('/auth', require('./auth.route.js'));
app.use('/user', userJs);
app.use('/permission', permissionJs);
app.use('/role', roleJs);
app.use('/notification', notificationJs);

module.exports = app;
