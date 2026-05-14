"use strict";

const express = require("express");

const router = express.Router();

const {
    authentication
} = require("../middlewares/authentication");

const checkPermission =
require("../middlewares/checkPermission");

const {

    createUser,
    userList,
    userDetails,
    updateUser,
    deleteUser,
    updateUserStatus,
    changePassword,
    myProfile

} = require("../controllers/UserController");

router.post(
    "/create",
    authentication,
    checkPermission("USER_CREATE"),
    createUser
);

router.get(
    "/list",
    authentication,
    checkPermission("USER_VIEW"),
    userList
);

router.get(
    "/details/:userId",
    authentication,
    checkPermission("USER_VIEW"),
    userDetails
);

router.put(
    "/update/:userId",
    authentication,
    checkPermission("USER_UPDATE"),
    updateUser
);

router.delete(
    "/delete/:userId",
    authentication,
    checkPermission("USER_DELETE"),
    deleteUser
);

router.patch(
    "/status/:userId",
    authentication,
    checkPermission("USER_UPDATE"),
    updateUserStatus
);

router.patch(
    "/change-password/:userId",
    authentication,
    checkPermission("USER_UPDATE"),
    changePassword
);

router.get(
    "/my-profile",
    authentication,
    myProfile
);

module.exports = router;