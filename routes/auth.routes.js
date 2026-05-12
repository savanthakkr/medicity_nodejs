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
  assignPermission,
  getMyPermissions,
  getEmployees

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
  createEmployee
);
router.post(
  "/create-admin",
  apiMiddleware,
  authentication,
  allowRoles(1),
  createAdmin
);
router.post(
  "/assign-permission",
  apiMiddleware,
  authentication,
  allowRoles(1,2),
  assignPermission
);
// GET MY PERMISSIONS (IMPORTANT FOR FRONTEND REFRESH FIX)
router.get(
  "/my-permissions",
  apiMiddleware,
  authentication,
  getMyPermissions
);
router.get(
  "/employees",
  apiMiddleware,
  authentication,
  allowRoles(1,2),
  checkPermission("employee_view"),
  getEmployees
);


router.post(
  "/logout",
  apiMiddleware,
  authentication,
  logout
);

module.exports = router;