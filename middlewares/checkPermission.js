"use strict";

const query = require("../helpers/query");

module.exports = function (permissionKey) {
  return async function (req, res, next) {
    try {
      const userId = req.user?.user_id;
      const roleId = req.user?.role_id;

      if (!userId || !roleId) {
        return res.status(401).json({
          status: false,
          message: "Unauthorized"
        });
      }

      if (!permissionKey) {
        return res.status(400).json({
          status: false,
          message: "Permission key required"
        });
      }

      const sql = `
        SELECT 1
        FROM role_permissions rp
        INNER JOIN permissions p ON rp.permission_id = p.permission_id
        WHERE rp.role_id = ?
          AND p.permission_key = ?

        UNION

        SELECT 1
        FROM user_permissions up
        INNER JOIN permissions p ON up.permission_id = p.permission_id
        WHERE up.user_id = ?
          AND p.permission_key = ?

        LIMIT 1
      `;

      const result = await query.executeQuery(sql, [
        roleId,
        permissionKey,
        userId,
        permissionKey
      ]);

      if (result && result.length > 0) {
        return next();
      }

      return res.status(403).json({
        status: false,
        message: "Access Denied"
      });

    } catch (error) {
      console.error("RBAC_ERROR =>", error);

      return res.status(500).json({
        status: false,
        message: "Internal Server Error"
      });
    }
  };
};