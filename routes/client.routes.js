"use strict";

const express = require("express");

const router = express.Router();

const {
    authentication
} = require("../middlewares/authentication");

const checkPermission =
require("../middlewares/checkPermission");

const {

    createClient,
    clientList,
    clientDetails,
    updateClient,
    deleteClient,
    updateClientStatus

} = require("../controllers/ClientController");

router.post(
    "/create",
    authentication,
    checkPermission("CLIENT_CREATE"),
    createClient
);

router.get(
    "/list",
    authentication,
    checkPermission("CLIENT_VIEW"),
    clientList
);

router.get(
    "/details/:clientId",
    authentication,
    checkPermission("CLIENT_VIEW"),
    clientDetails
);

router.put(
    "/update/:clientId",
    authentication,
    checkPermission("CLIENT_UPDATE"),
    updateClient
);

router.delete(
    "/delete/:clientId",
    authentication,
    checkPermission("CLIENT_DELETE"),
    deleteClient
);

router.patch(
    "/status/:clientId",
    authentication,
    checkPermission("CLIENT_UPDATE"),
    updateClientStatus
);

module.exports = router;