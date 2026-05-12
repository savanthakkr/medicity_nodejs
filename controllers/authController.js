"use strict";

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const query = require("../helpers/query");
const constants = require("../vars/constants");

// -------------------------
// ROLE CONSTANTS
// -------------------------
const ROLES = {
  SUPER_ADMIN: 1,
  ADMIN: 2,
  EMPLOYEE: 3
};

// -------------------------
// LOGIN
// -------------------------
exports.login = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: false,
        message: "Email and password are required"
      });
    }

    email = email.trim().toLowerCase();

    // -------------------------
    // FIND USER
    // -------------------------
    const sql = `
      SELECT *
      FROM users
      WHERE LOWER(email) = LOWER(?)
        AND is_active = 1
        AND is_delete = 0
      LIMIT 1
    `;

    const result = await query.executeQuery(sql, [email]);

    if (!result?.length) {
      return res.status(401).json({
        status: false,
        message: "Invalid credentials"
      });
    }

    const user = result[0];

    // -------------------------
    // PASSWORD CHECK
    // -------------------------
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        status: false,
        message: "Invalid credentials"
      });
    }

    // -------------------------
    // FETCH USER PERMISSIONS (RBAC)
    // -------------------------
    const permSql = `
  SELECT DISTINCT p.permission_key

  FROM permissions p

  LEFT JOIN role_permissions rp
    ON rp.permission_id = p.permission_id
    AND rp.role_id = ?
    AND rp.is_active = 1

  LEFT JOIN user_permissions up
    ON up.permission_id = p.permission_id
    AND up.user_id = ?
    AND up.is_active = 1

  WHERE
    (
      rp.permission_id IS NOT NULL
      OR up.permission_id IS NOT NULL
    )
    AND p.is_active = 1
    AND p.is_delete = 0
`;

    const permResult = await query.executeQuery(permSql, [
  user.role_id,
  user.user_id
]);

    const permissions = permResult.map(p => p.permission_key);

    // -------------------------
    // GENERATE TOKEN
    // -------------------------
    const token = jwt.sign(
      {
        user_id: user.user_id,
        role_id: user.role_id,
        email: user.email,
        permissions
      },
      constants.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // -------------------------
    // RESPONSE
    // -------------------------
    return res.status(200).json({
      status: true,
      message: "Login successful",
      token,
      permissions, // ⭐ IMPORTANT FOR FRONTEND RBAC
      data: {
        user_id: user.user_id,
        role_id: user.role_id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.error("LOGIN_ERROR =>", error);

    return res.status(500).json({
      status: false,
      message: "Internal Server Error"
    });
  }
};// -------------------------
// CREATE ADMIN (RBAC HANDLED VIA MIDDLEWARE)
// -------------------------
exports.createAdmin = async (req, res) => {
  if (req.user.role_id !== 1) {
  return res.status(403).json({
    status: false,
    message: "Only Super Admin allowed"
  });
}
  try {
    let { name, email, password, mobile_no } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        status: false,
        message: "name, email, password required"
      });
    }

    email = email.trim().toLowerCase();

    const checkSql = `
      SELECT 1 FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1
    `;

    const exists = await query.executeQuery(checkSql, [email]);

    if (exists?.length) {
      return res.status(400).json({
        status: false,
        message: "Email already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertSql = `
      INSERT INTO users
      (name, email, password, mobile_no, role_id, parent_user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const insertResult = await query.executeQuery(insertSql, [
      name,
      email,
      hashedPassword,
      mobile_no,
      ROLES.ADMIN,
      req.user.user_id
    ]);

    return res.status(200).json({
      status: true,
      message: "Admin created successfully",
      data: {
        user_id: insertResult.insertId
      }
    });

  } catch (error) {
    console.error("CREATE_ADMIN_ERROR =>", error);

    return res.status(500).json({
      status: false,
      message: "Internal Server Error"
    });
  }
};

// -------------------------
// CREATE EMPLOYEE (RBAC HANDLED VIA MIDDLEWARE)
// -------------------------
exports.createEmployee = async (req, res) => {
  if (
  req.user.role_id !== 1 &&
  !req.user.permissions?.includes("employee_create")
) {
  return res.status(403).json({
    status: false,
    message: "Forbidden"
  });
}
  try {
    let { name, email, password, mobile_no } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        status: false,
        message: "name, email, password required"
      });
    }

    email = email.trim().toLowerCase();

    const checkSql = `
      SELECT 1 FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1
    `;

    const exists = await query.executeQuery(checkSql, [email]);

    if (exists?.length) {
      return res.status(400).json({
        status: false,
        message: "Email already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertSql = `
      INSERT INTO users
      (name, email, password, mobile_no, role_id, parent_user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const insertResult = await query.executeQuery(insertSql, [
      name,
      email,
      hashedPassword,
      mobile_no,
      ROLES.EMPLOYEE,
      req.user.user_id
    ]);

    return res.status(200).json({
      status: true,
      message: "Employee created successfully",
      data: {
        user_id: insertResult.insertId
      }
    });

  } catch (error) {
    console.error("CREATE_EMPLOYEE_ERROR =>", error);

    return res.status(500).json({
      status: false,
      message: "Internal Server Error"
    });
  }
};

// -------------------------
// ASSIGN PERMISSIONS (KEY-BASED RBAC)
// -------------------------
exports.assignPermission = async (req, res) => {
  if (
  req.user.role_id !== 1 &&
  !req.user.permissions?.includes("employee_assign_permissions")
) {
  return res.status(403).json({
    status: false,
    message: "Forbidden"
  });
}
  try {
    const { user_id, permission_keys } = req.body;

    if (!user_id || !Array.isArray(permission_keys)) {
      return res.status(400).json({
        status: false,
        message: "Invalid request"
      });
    }

    const userCheckSql = `
      SELECT user_id
      FROM users
      WHERE user_id = ?
      LIMIT 1
    `;

    const userExists = await query.executeQuery(userCheckSql, [user_id]);

    if (!userExists.length) {
      return res.status(404).json({
        status: false,
        message: "User not found"
      });
    }

    const assignerPermissions = req.user.permissions || [];

    const allowedPermissionKeys =
      req.user.role_id === 1
        ? permission_keys
        : permission_keys.filter(key =>
            assignerPermissions.includes(key)
          );

    const uniqueAllowedPermissionKeys = [...new Set(allowedPermissionKeys)];

    if (permission_keys.length && !uniqueAllowedPermissionKeys.length) {
      return res.status(403).json({
        status: false,
        message: "No valid permissions found"
      });
    }

    if (!uniqueAllowedPermissionKeys.length) {
      const deleteSql = `
        DELETE FROM user_permissions
        WHERE user_id = ?
      `;

      await query.executeQuery(deleteSql, [user_id]);

      return res.status(200).json({
        status: true,
        message: "Permissions assigned successfully"
      });
    }

    // 1. Fetch permission IDs from DB using keys
    const sql = `
      SELECT permission_id, permission_key
      FROM permissions
      WHERE permission_key IN (?)
      AND is_delete = 0
    `;

    const permissions = await query.executeQuery(sql, [
      uniqueAllowedPermissionKeys
    ]);

    if (!permissions.length) {
      return res.status(403).json({
        status: false,
        message: "No valid permissions found"
      });
    }

    const deleteSql = `
      DELETE FROM user_permissions
      WHERE user_id = ?
    `;

    await query.executeQuery(deleteSql, [user_id]);

    for (let perm of permissions) {
      const insertSql = `
        INSERT INTO user_permissions
        (user_id, permission_id, assigned_by)
        VALUES (?, ?, ?)
      `;

      await query.executeQuery(insertSql, [
        user_id,
        perm.permission_id,
        req.user.user_id
      ]);
    }

    return res.status(200).json({
      status: true,
      message: "Permissions assigned successfully"
    });

  } catch (error) {
    console.error("ASSIGN_PERMISSION_ERROR =>", error);

    return res.status(500).json({
      status: false,
      message: "Internal Server Error"
    });
  }
};
exports.getMyPermissions = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const sql = `
      SELECT p.permission_key
      FROM user_permissions up
      JOIN permissions p ON p.permission_id = up.permission_id
      WHERE up.user_id = ?
        AND up.is_active = 1
    `;

    const result = await query.executeQuery(sql, [userId]);

    return res.json({
      status: true,
      permissions: result.map(r => r.permission_key)
    });

  } catch (err) {
    return res.status(500).json({
      status: false,
      message: "Error"
    });
  }
};
exports.getEmployees = async (req, res) => {
  try {

    const sql = `
      SELECT 
        u.user_id,
        u.name,
        u.email,
        u.mobile_no,
        u.role_id,
        GROUP_CONCAT(p.permission_key) AS permissions

      FROM users u

      LEFT JOIN user_permissions up
        ON up.user_id = u.user_id

      LEFT JOIN permissions p
        ON p.permission_id = up.permission_id

      WHERE u.is_delete = 0
        AND u.role_id != 1

      GROUP BY u.user_id

      ORDER BY u.user_id DESC
    `;

    const result = await query.executeQuery(sql);

    const formatted = result.map(user => ({
      ...user,
      permissions: user.permissions
        ? user.permissions.split(",")
        : []
    }));

    return res.status(200).json({
      status: true,
      data: formatted
    });

  } catch (error) {

    console.error("GET_EMPLOYEES_ERROR =>", error);

    return res.status(500).json({
      status: false,
      message: "Internal Server Error"
    });
  }
};
// -------------------------
// LOGOUT
// -------------------------
exports.logout = async (req, res) => {
  return res.status(200).json({
    status: true,
    message: "Logout successful"
  });
};
