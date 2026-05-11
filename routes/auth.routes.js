"use strict";

var express = require("express");
var router = express.Router();

var apiMiddleware = require("../middlewares/api");
const { authentication, allowRoles } = require("../middlewares/authentication");
const checkPermission = require("../middlewares/checkPermission");

const {
  login,
  logout,
  createEmployee,
  createAdmin,
  assignPermission

} = require("../controllers/authController");

router.options("/login", (req, res) => res.sendStatus(200));

router.post(
  "/login",
  apiMiddleware,
  login
);

router.post(
  "/create-employee",
  apiMiddleware,
  authentication,
  allowRoles(2),
  checkPermission("employee_create"),
  createEmployee
);
router.post(
  "/create-admin",
  apiMiddleware,
  authentication,
  allowRoles(1),
  checkPermission("admin_create"),
  createAdmin
);
router.post(
  "/assign-permission",
  apiMiddleware,
  authentication,
  allowRoles(1,2),
  checkPermission("employee_assign_permissions"),
  assignPermission
);

router.post(
  "/logout",
  apiMiddleware,
  authentication,
  logout
);

module.exports = router;