"use strict";

const query = require("../helpers/query");
const utility = require("../helpers/utility");

const {
    sendSuccess,
    sendError
} = require("../helpers/response");

exports.createClient = async (req, res) => {

    try {

        const {
            client_Name,
            client_Email,
            client_Mobile,
            client_Address
        } = req.body;

        if (
            utility.checkEmpty(client_Name) ||
            utility.checkEmpty(client_Email)
        ) {

            return sendError(
                res,
                req,
                null,
                "Client name and email are required"
            );
        }
        const checkClient =
            await query.checkClientEmailExists(
                client_Email
            );

        if (
            !utility.checkEmpty(checkClient)
        ) {

            return sendError(
                res,
                req,
                null,
                "Client email already exists"
            );
        }
        const clientData = {

            client_Name,
            client_Email,
            client_Mobile,
            client_Address,

            is_active: 1,
            is_deleted: 0,

            created_at: utility.getCurrentDateTime()
        };

        const clientId =
            await query.insertSingle(
                "mysql_project_db",
                "client",
                clientData
            );
        const groupData = {

            client_Id: clientId,

            access_group_Name: "Admin",

            access_group_Description:
                "Default Admin Group",

            is_system_group: 1,

            is_active: 1,
            is_deleted: 0,

            created_at:
                utility.getCurrentDateTime()
        };

        const groupId =
            await query.insertSingle(
                "mysql_project_db",
                "access_group",
                groupData
            );

        return sendSuccess(
            res,
            req,
            {
                client_Id: clientId,
                access_group_Id: groupId
            },
            "Client created successfully"
        );

    } catch (error) {

        return sendError(
            res,
            req,
            error
        );
    }
};

exports.clientList = async (req, res) => {

    try {

        const {
            search = ""
        } = req.query;

        const clients =
            await query.fetchClients(search);

        return sendSuccess(
            res,
            req,
            clients,
            "Client list fetched successfully"
        );

    } catch (error) {
        return sendError(
            res,
            req,
            error
        );
    }
};

exports.clientDetails = async (req, res) => {

    try {

        const { clientId } = req.params;

        const client =
            await query.fetchSingleClient(
                clientId
            );

        if (utility.checkEmpty(client)) {

            return sendError(
                res,
                req,
                null,
                "Client not found"
            );
        }

        return sendSuccess(
            res,
            req,
            client,
            "Client details fetched successfully"
        );

    } catch (error) {

        return sendError(
            res,
            req,
            error
        );
    }
};

exports.updateClient = async (req, res) => {

    try {

        const { clientId } = req.params;

        const {
            client_Name,
            client_Email,
            client_Mobile,
            client_Address
        } = req.body;

        const client =
            await query.fetchSingleClient(
                clientId
            );

        if (utility.checkEmpty(client)) {

            return sendError(
                res,
                req,
                null,
                "Client not found"
            );
        }

        const updateData = {

            client_Name,
            client_Email,
            client_Mobile,
            client_Address,

            updated_at:
                utility.getCurrentDateTime()
        };

        await query.updateSingle(
            "mysql_project_db",
            "client",
            updateData,
            {
                client_Id: clientId
            }
        );

        return sendSuccess(
            res,
            req,
            {},
            "Client updated successfully"
        );

    } catch (error) {

        return sendError(
            res,
            req,
            error
        );
    }
};

exports.deleteClient = async (req, res) => {

    try {

        const { clientId } = req.params;

        const client =
            await query.fetchSingleClient(
                clientId
            );

        if (utility.checkEmpty(client)) {

            return sendError(
                res,
                req,
                null,
                "Client not found"
            );
        }

        await query.updateSingle(
            "mysql_project_db",
            "client",
            {
                is_deleted: 1,
                updated_at:
                    utility.getCurrentDateTime()
            },
            {
                client_Id: clientId
            }
        );

        return sendSuccess(
            res,
            req,
            {},
            "Client deleted successfully"
        );

    } catch (error) {

        return sendError(
            res,
            req,
            error
        );
    }
};

exports.updateClientStatus = async (req, res) => {

    try {

        const { clientId } = req.params;

        const {
            is_active
        } = req.body;

        const client =
            await query.fetchSingleClient(
                clientId
            );

        if (utility.checkEmpty(client)) {

            return sendError(
                res,
                req,
                null,
                "Client not found"
            );
        }

        await query.updateSingle(
            "mysql_project_db",
            "client",
            {
                is_active,
                updated_at:
                    utility.getCurrentDateTime()
            },
            {
                client_Id: clientId
            }
        );

        return sendSuccess(
            res,
            req,
            {},
            "Client status updated successfully"
        );

    } catch (error) {

        return sendError(
            res,
            req,
            error
        );
    }
};