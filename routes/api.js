var express = require("express");
var apiMiddleware = require("../middlewares/api.js");
var WebhookController = require("../controllers/WebhookController.js");
var UserCouponController = require("../controllers/UserCouponController.js");
//var AdminController = require("../controllers/AdminController");
//var EmployeeController = require("../controllers/EmployeeController");
const { authentication } = require("../middlewares/authentication");
const checkPermission = require("../middlewares/checkPermission");
var app = express();

app.use(apiMiddleware)

app.use("/webhook",WebhookController.webhook_controller);

//todo: move to seperate folder
app.use("/client/get-coupon-status/:token", UserCouponController.getCouponstatus) // will give, scratchd or not scratched
app.use("/client/verify-phone-number", UserCouponController.verifyPhoneNumber) //get phone number and verify it
app.use("/client/scratch-now", UserCouponController.scratchNow) // start to scratch
app.use("/client/mark-as-scratched", UserCouponController.markAsScratched) //mark as scratch
// admin routes
// app.use(
//   "/admin/create",
//   authentication,
//   checkPermission("admin_create"),
//   AdminController.createAdmin
// );

// employee routes
// s

module.exports = app;
