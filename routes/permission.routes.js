"use strict";

const express = require("express");

const router = express.Router();

const {
    authentication
} = require("../middlewares/authentication");

const checkPermission =
require("../middlewares/checkPermission");

const {

    myPermissions,
    accessCategoryList,
    permissionList,
    createPermission,
    updatePermission,
    deletePermission

} = require("../controllers/PermissionController");

router.get(
    "/my-permissions",
    authentication,
    myPermissions
);

router.get(
    "/categories",
    authentication,
    checkPermission("ROLE_VIEW"),
    accessCategoryList
);

router.get(
    "/list",
    authentication,
    checkPermission("ROLE_VIEW"),
    permissionList
);

router.post(
    "/create",
    authentication,
    checkPermission("ROLE_CREATE"),
    createPermission
);

router.put(
    "/update/:permissionId",
    authentication,
    checkPermission("ROLE_UPDATE"),
    updatePermission
);

router.delete(
    "/delete/:permissionId",
    authentication,
    checkPermission("ROLE_DELETE"),
    deletePermission
);

module.exports = router;