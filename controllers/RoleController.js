"use strict";

const query = require("../helpers/query");
const utility = require("../helpers/utility");

const {
    sendSuccess,
    sendError
} = require("../helpers/response");

exports.createRole = async (req, res) => {

    try {

        const {
            client_Id,
            access_group_Name,
            access_group_Description
        } = req.body;

        if (
            utility.checkEmpty(client_Id) ||
            utility.checkEmpty(access_group_Name)
        ) {

            return sendError(
                res,
                req,
                null,
                "Client and role name are required"
            );
        }

        const roleData = {

            client_Id,

            access_group_Name,

            access_group_Description,

            is_system_group: 0,

            is_active: 1,
            is_deleted: 0,

            created_at:
                utility.getCurrentDateTime()
        };

        const roleId =
            await query.insertSingle(
                "mysql_project_db",
                "access_group",
                roleData
            );

        return sendSuccess(
            res,
            req,
            {
                access_group_Id: roleId
            },
            "Role created successfully"
        );

    } catch (error) {

        return sendError(
            res,
            req,
            error
        );
    }
};

exports.roleList = async (req, res) => {

    try {

        const {
            client_Id
        } = req.query;

        const roles =
            await query.fetchRoles(client_Id);

        return sendSuccess(
            res,
            req,
            roles,
            "Role list fetched successfully"
        );

    } catch (error) {

        return sendError(
            res,
            req,
            error
        );
    }
};

exports.roleDetails = async (req, res) => {

    try {

        const {
            roleId
        } = req.params;

        const role =
            await query.fetchSingleRole(roleId);

        if (utility.checkEmpty(role)) {

            return sendError(
                res,
                req,
                null,
                "Role not found"
            );
        }

        return sendSuccess(
            res,
            req,
            role,
            "Role details fetched successfully"
        );

    } catch (error) {

        return sendError(
            res,
            req,
            error
        );
    }
};

exports.updateRole = async (req, res) => {

    try {

        const {
            roleId
        } = req.params;

        const {
            access_group_Name,
            access_group_Description
        } = req.body;

        const role =
            await query.fetchSingleRole(roleId);

        if (utility.checkEmpty(role)) {

            return sendError(
                res,
                req,
                null,
                "Role not found"
            );
        }

        await query.updateSingle(
            "mysql_project_db",
            "access_group",
            {
                access_group_Name,
                access_group_Description,

                updated_at:
                    utility.getCurrentDateTime()
            },
            {
                access_group_Id: roleId
            }
        );

        return sendSuccess(
            res,
            req,
            {},
            "Role updated successfully"
        );

    } catch (error) {

        return sendError(
            res,
            req,
            error
        );
    }
};

exports.deleteRole = async (req, res) => {

    try {

        const {
            roleId
        } = req.params;

        const role =
            await query.fetchSingleRole(roleId);

        if (utility.checkEmpty(role)) {

            return sendError(
                res,
                req,
                null,
                "Role not found"
            );
        }

        await query.updateSingle(
            "mysql_project_db",
            "access_group",
            {
                is_deleted: 1,

                updated_at:
                    utility.getCurrentDateTime()
            },
            {
                access_group_Id: roleId
            }
        );

        return sendSuccess(
            res,
            req,
            {},
            "Role deleted successfully"
        );

    } catch (error) {

        return sendError(
            res,
            req,
            error
        );
    }
};

exports.assignPermissions = async (req, res) => {

    try {

        const {
            access_group_Id,
            access_Ids
        } = req.body;

        if (
            utility.checkEmpty(access_group_Id)
        ) {

            return sendError(
                res,
                req,
                null,
                "Role is required"
            );
        }

        await query.deleteGroupPermissions(
            access_group_Id
        );

        if (
            Array.isArray(access_Ids) &&
            access_Ids.length > 0
        ) {

            let permissionData = [];

            access_Ids.forEach((accessId) => {

                permissionData.push({

                    client_Id: 1,

                    access_group_Id,

                    access_Id: accessId,

                    is_active: 1,
                    is_deleted: 0,

                    created_at:
                        utility.getCurrentDateTime()
                });

            });

            await query.insertMultiple(
                "mysql_project_db",
                "access_group_linker",
                permissionData
            );
        }

        return sendSuccess(
            res,
            req,
            {},
            "Permissions assigned successfully"
        );

    } catch (error) {

        return sendError(
            res,
            req,
            error
        );
    }
};

exports.rolePermissions = async (req, res) => {

    try {

        const {
            roleId
        } = req.params;

        const permissions =
            await query.fetchRolePermissions(
                roleId
            );

        return sendSuccess(
            res,
            req,
            permissions,
            "Role permissions fetched successfully"
        );

    } catch (error) {

        return sendError(
            res,
            req,
            error
        );
    }
};