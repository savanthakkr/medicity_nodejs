"use strict";

const express = require("express");

const router = express.Router();

const {
    authentication
} = require("../middlewares/authentication");

const checkPermission =
require("../middlewares/checkPermission");

const {

    createRole,
    roleList,
    roleDetails,
    updateRole,
    deleteRole,
    assignPermissions,
    rolePermissions

} = require("../controllers/RoleController");

router.post(
    "/create",
    authentication,
    checkPermission("ROLE_CREATE"),
    createRole
);

router.get(
    "/list",
    authentication,
    checkPermission("ROLE_VIEW"),
    roleList
);

router.get(
    "/details/:roleId",
    authentication,
    checkPermission("ROLE_VIEW"),
    roleDetails
);

router.put(
    "/update/:roleId",
    authentication,
    checkPermission("ROLE_UPDATE"),
    updateRole
);

router.delete(
    "/delete/:roleId",
    authentication,
    checkPermission("ROLE_DELETE"),
    deleteRole
);

router.post(
    "/assign-permissions",
    authentication,
    checkPermission("ROLE_UPDATE"),
    assignPermissions
);

router.get(
    "/permissions/:roleId",
    authentication,
    checkPermission("ROLE_VIEW"),
    rolePermissions
);

module.exports = router;