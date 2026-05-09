// controllers/auth.controller.js

"use strict";

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const query = require("../helpers/query");
const constants = require("../vars/constants");
const { response } = require("express");

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: false,
        responseCode: 400,
        message: "Email and password are required",
      });
    }

    const sql = `
      SELECT *
      FROM user
      WHERE user_Email = ?
      AND is_active = 1
      AND is_deleted = 0
      LIMIT 1
    `;

    let user = await query.executeQuery(sql, [email]);

    if (!user || user.length === 0) {
      return res.status(401).json({
        status: false,
        responseCode: 401,
        message: "Invalid email or password",
      });
    }

    user = user[0];
    const checkPassword = await bcrypt.compare(
      password,
      user.password_Hash
    );

    if (!checkPassword) {
      return res.status(401).json({
        status: false,
        responseCode: 401,
        message: "Invalid email or password",
      });
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

    return res.status(200).json({
      status: true,
      responseCode: 200,
      message: "Login successful",
      token: token,
      data: {
        user_id: user.user_Id,
        client_id: user.client_Id,
        name: user.user_Name,
        email: user.user_Email,
      },
    });
  } catch (error) {
    console.log("LOGIN ERROR => ", error);
    return res.status(500).json({
      status: false,
      responseCode: 500,
      message: "Internal server error",
    });
  }
};

exports.logout = async (req, res) => {
  try {
    return res.status(200).json({
      status: true,
      responseCode: 200,
      message: "Logout successful",
    });
  } catch (error) {
    console.log("LOGOUT ERROR => ", error);

    return res.status(500).json({
      status: false,
      responseCode: 500,
      message: "Internal server error",
    });
  }
};