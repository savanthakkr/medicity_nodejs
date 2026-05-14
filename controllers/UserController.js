"use strict";

const bcrypt = require("bcryptjs");

const query = require("../helpers/query");
const utility = require("../helpers/utility");

const {
    sendSuccess,
    sendError
} = require("../helpers/response");

exports.createUser = async (req, res) => {

    try {

        const {

            client_Id,
            access_group_Id,

            user_Name,
            user_Email,
            user_Mobile,
            password

        } = req.body;

        if (
            utility.checkEmpty(client_Id) ||
            utility.checkEmpty(access_group_Id) ||
            utility.checkEmpty(user_Name) ||
            utility.checkEmpty(user_Email) ||
            utility.checkEmpty(password)
        ) {

            return sendError(
                res,
                req,
                null,
                "Required fields missing"
            );
        }

        const checkEmail =
            await query.checkUserEmailExists(
                user_Email
            );

        if (!utility.checkEmpty(checkEmail)) {

            return sendError(
                res,
                req,
                null,
                "Email already exists"
            );
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const userData = {

            client_Id,

            user_Name,
            user_Email,
            user_Mobile,

            password_Hash: passwordHash,

            is_active: 1,
            is_deleted: 0,

            created_at:
                utility.getCurrentDateTime()
        };

        const userId =
            await query.insertSingle(
                "mysql_project_db",
                "user",
                userData
            );

        const roleData = {

            client_Id,

            user_Id: userId,

            access_group_Id,

            assigned_by_user_Id:
                req.user.user_id,

            is_active: 1,
            is_deleted: 0,

            created_at:
                utility.getCurrentDateTime()
        };

        await query.insertSingle(
            "mysql_project_db",
            "access_group_user_linker",
            roleData
        );

        return sendSuccess(
            res,
            req,
            {
                user_Id: userId
            },
            "User created successfully"
        );

    } catch (error) {

        return sendError(
            res,
            req,
            error
        );
    }
};

exports.userList = async (req, res) => {

    try {

        const {
            client_Id,
            search = ""
        } = req.query;

        const users =
            await query.fetchUsers(
                client_Id,
                search
            );

        return sendSuccess(
            res,
            req,
            users,
            "User list fetched successfully"
        );

    } catch (error) {

        return sendError(
            res,
            req,
            error
        );
    }
};

exports.userDetails = async (req, res) => {

    try {

        const {
            userId
        } = req.params;

        const user =
            await query.fetchSingleUser(
                userId
            );

        if (utility.checkEmpty(user)) {

            return sendError(
                res,
                req,
                null,
                "User not found"
            );
        }

        return sendSuccess(
            res,
            req,
            user,
            "User details fetched successfully"
        );

    } catch (error) {

        return sendError(
            res,
            req,
            error
        );
    }
};

exports.updateUser = async (req, res) => {

    try {

        const {
            userId
        } = req.params;

        const {

            access_group_Id,

            user_Name,
            user_Email,
            user_Mobile

        } = req.body;

        const user =
            await query.fetchSingleUser(
                userId
            );

        if (utility.checkEmpty(user)) {

            return sendError(
                res,
                req,
                null,
                "User not found"
            );
        }

        await query.updateSingle(
            "mysql_project_db",
            "user",
            {

                user_Name,
                user_Email,
                user_Mobile,

                updated_at:
                    utility.getCurrentDateTime()

            },
            {
                user_Id: userId
            }
        );

        await query.updateSingle(
            "mysql_project_db",
            "access_group_user_linker",
            {

                access_group_Id,

                updated_at:
                    utility.getCurrentDateTime()

            },
            {
                user_Id: userId
            }
        );

        return sendSuccess(
            res,
            req,
            {},
            "User updated successfully"
        );

    } catch (error) {

        return sendError(
            res,
            req,
            error
        );
    }
};

exports.deleteUser = async (req, res) => {

    try {

        const {
            userId
        } = req.params;

        const user =
            await query.fetchSingleUser(
                userId
            );

        if (utility.checkEmpty(user)) {

            return sendError(
                res,
                req,
                null,
                "User not found"
            );
        }

        await query.updateSingle(
            "mysql_project_db",
            "user",
            {

                is_deleted: 1,

                updated_at:
                    utility.getCurrentDateTime()

            },
            {
                user_Id: userId
            }
        );

        return sendSuccess(
            res,
            req,
            {},
            "User deleted successfully"
        );

    } catch (error) {

        return sendError(
            res,
            req,
            error
        );
    }
};

exports.updateUserStatus = async (req, res) => {

    try {

        const {
            userId
        } = req.params;

        const {
            is_active
        } = req.body;

        const user =
            await query.fetchSingleUser(
                userId
            );

        if (utility.checkEmpty(user)) {

            return sendError(
                res,
                req,
                null,
                "User not found"
            );
        }

        await query.updateSingle(
            "mysql_project_db",
            "user",
            {

                is_active,

                updated_at:
                    utility.getCurrentDateTime()

            },
            {
                user_Id: userId
            }
        );

        return sendSuccess(
            res,
            req,
            {},
            "User status updated successfully"
        );

    } catch (error) {

        return sendError(
            res,
            req,
            error
        );
    }
};

exports.changePassword = async (req, res) => {

    try {

        const {
            userId
        } = req.params;

        const {
            password
        } = req.body;

        if (
            utility.checkEmpty(password)
        ) {

            return sendError(
                res,
                req,
                null,
                "Password is required"
            );
        }

        const user =
            await query.fetchSingleUser(
                userId
            );

        if (utility.checkEmpty(user)) {

            return sendError(
                res,
                req,
                null,
                "User not found"
            );
        }

        const passwordHash =
            await bcrypt.hash(password, 10);

        await query.updateSingle(
            "mysql_project_db",
            "user",
            {

                password_Hash:
                    passwordHash,

                updated_at:
                    utility.getCurrentDateTime()

            },
            {
                user_Id: userId
            }
        );

        return sendSuccess(
            res,
            req,
            {},
            "Password changed successfully"
        );

    } catch (error) {

        return sendError(
            res,
            req,
            error
        );
    }
};

exports.myProfile = async (req, res) => {

    try {

        const user =
            await query.fetchSingleUser(
                req.user.user_id
            );

        return sendSuccess(
            res,
            req,
            user,
            "Profile fetched successfully"
        );

    } catch (error) {

        return sendError(
            res,
            req,
            error
        );
    }
};