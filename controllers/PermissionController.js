"use strict";

const query = require("../helpers/query");

const {
    sendSuccess,
    sendError
} = require("../helpers/response");

exports.myPermissions = async (req, res) => {

    try {

        const permissions =
            await query.fetchUserPermissions(
                req.user.user_id
            );

        const permissionKeys =
            permissions.map(
                item => item.access_Key
            );

        return sendSuccess(
            res,
            req,
            permissionKeys,
            "Permissions fetched successfully"
        );

    } catch (error) {

        return sendError(
            res,
            req,
            error
        );
    }
};

exports.accessCategoryList = async (req, res) => {

    try {

        const categories =
            await query.fetchAccessCategories();

        return sendSuccess(
            res,
            req,
            categories,
            "Access categories fetched successfully"
        );

    } catch (error) {

        return sendError(
            res,
            req,
            error
        );
    }
};

exports.permissionList = async (req, res) => {

    try {

        const {
            access_category_Id
        } = req.query;

        const permissions =
            await query.fetchPermissions(
                access_category_Id
            );

        return sendSuccess(
            res,
            req,
            permissions,
            "Permissions fetched successfully"
        );

    } catch (error) {

        return sendError(
            res,
            req,
            error
        );
    }
};

exports.createPermission = async (req, res) => {

    try {

        const {

            client_Id,
            access_category_Id,

            access_Name,
            access_Key,
            access_URL

        } = req.body;

        const permissionData = {

            client_Id,

            access_category_Id,

            access_Name,
            access_Key,
            access_URL,

            is_system_generated: 0,

            is_show: 1,

            is_active: 1,
            is_deleted: 0,

            created_at:
                utility.getCurrentDateTime()
        };

        const permissionId =
            await query.insertSingle(
                "mysql_project_db",
                "access",
                permissionData
            );

        return sendSuccess(
            res,
            req,
            {
                access_Id: permissionId
            },
            "Permission created successfully"
        );

    } catch (error) {

        return sendError(
            res,
            req,
            error
        );
    }
};

exports.updatePermission = async (req, res) => {

    try {

        const {
            permissionId
        } = req.params;

        const {

            access_Name,
            access_Key,
            access_URL

        } = req.body;

        await query.updateSingle(
            "mysql_project_db",
            "access",
            {

                access_Name,
                access_Key,
                access_URL,

                updated_at:
                    utility.getCurrentDateTime()

            },
            {
                access_Id: permissionId
            }
        );

        return sendSuccess(
            res,
            req,
            {},
            "Permission updated successfully"
        );

    } catch (error) {

        return sendError(
            res,
            req,
            error
        );
    }
};

exports.deletePermission = async (req, res) => {

    try {

        const {
            permissionId
        } = req.params;

        await query.updateSingle(
            "mysql_project_db",
            "access",
            {

                is_deleted: 1,

                updated_at:
                    utility.getCurrentDateTime()

            },
            {
                access_Id: permissionId
            }
        );

        return sendSuccess(
            res,
            req,
            {},
            "Permission deleted successfully"
        );

    } catch (error) {

        return sendError(
            res,
            req,
            error
        );
    }
};