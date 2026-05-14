"use strict";

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const query = require("../helpers/query");
const constants = require("../vars/constants");

const {
    sendSuccess,
    sendError
} = require("../helpers/response");

exports.login = async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;

        if (!email || !password) {

            return sendError(
                res,
                req,
                null,
                "Email and password are required"
            );
        }

        let user =
            await query.fetchUserByEmail(
                email
            );

        if (!user) {

            return sendError(
                res,
                req,
                null,
                "Invalid email or password"
            );
        }

        const checkPassword =
            await bcrypt.compare(
                password,
                user.password_Hash
            );

        if (!checkPassword) {

            return sendError(
                res,
                req,
                null,
                "Invalid email or password"
            );
        }

        const token = jwt.sign(
            {
                user_id: user.user_Id,
                email: user.user_Email,
            },
            constants.JWT_SECRET,
            {
                expiresIn: "7d",
            }
        );

        return sendSuccess(
            res,
            req,
            {

                token,

                user: {

                    user_id:
                        user.user_Id,

                    client_id:
                        user.client_Id,

                    name:
                        user.user_Name,

                    email:
                        user.user_Email
                }

            },
            "Login successful"
        );

    } catch (error) {

        console.log(
            "LOGIN ERROR => ",
            error
        );

        return sendError(
            res,
            req,
            error,
            "Internal server error"
        );
    }
};

exports.logout = async (req, res) => {

    try {

        return sendSuccess(
            res,
            req,
            {},
            "Logout successful"
        );

    } catch (error) {

        console.log(
            "LOGOUT ERROR => ",
            error
        );

        return sendError(
            res,
            req,
            error,
            "Internal server error"
        );
    }
};