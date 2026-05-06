var express = require("express");
const helmet = require("helmet");
var path = require("path");
var cookieParser = require("cookie-parser"); 
var logger = require("morgan");
require("dotenv").config();
var apiRouter = require("./routes/index.js");
// var apiResponse = require("/home/ubuntu/config/apiResponse");  
var apiResponse = require("./config/apiResponse");
var cors = require("cors");
const {syncPermissionsOnStart} = require("./services/bootstrap/syncPermissionsOnStart.js");
const {initDbConnection} = require("./services/bootstrap/initDbConnection.js");
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

//app.use(helmet());
if(process.env.NODE_ENV !== "test") {
	app.use(logger("dev"));
}
app.use(express.json({limit:'50mb'}));
app.use(express.urlencoded({ extended: false,limit:'50mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// app.use(express.static('/home/ubuntu/Assets'));
app.use(express.static(path.join(__dirname, "Assets")));


//To allow cross-origin requests
app.use(cors());


//Route Prefixes
app.use("/api", apiRouter);

// throw 404 if URL not found
app.all("*", function(req, res) {
	return apiResponse.notFoundResponse(res, "Page not found");
});

app.use((err, req, res) => {
	if(err.name == "UnauthorizedError"){
		return apiResponse.unauthorizedResponse(res, err.message);
	}
});

setImmediate(function () {
  initDbConnection()
    .then(function () {
      return syncPermissionsOnStart();
    })
    .then(function (r) {
      console.log("[PERMISSION SYNC]", r);
    })
    .catch(function (e) {
      console.error("[STARTUP FAILED]", e);
    });
});

module.exports = app;
