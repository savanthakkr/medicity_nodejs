var express = require("express");
var app = express();

const authController = require("../controllers/AuthController.js");

// auth
app.use("/login", authController.login);


module.exports = app;
