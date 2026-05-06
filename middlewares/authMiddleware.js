const jwt = require("jsonwebtoken");
const UserRepo = require("../services/repositories/UserRepository.js");
const RoleRepo = require("../services/repositories/RoleRepository.js");
const utility = require("../helpers/utility");
const UserRoleRepo = require("../services/repositories/UserRoleRepository.js");
const RolePermissionRepo = require("../services/repositories/RolePermissionRepository.js");
const PermissionRepo = require("../services/repositories/PermissionRepository.js");
const methods = require("../helpers/method/methods.js");

const allowdRoutes = [
    "/user/login",
    "/user/forgot-password",
    "/user/verify-otp",
    "/user/reset-password-otp"
];


module.exports = async function authMiddleware(req, res, next) {
  try {
    const newPath = req.originalUrl.split('/api')[1] || req.path;

    if (allowdRoutes.includes(newPath)) {
      return next();
    }

    const authHeader = req.headers.authorization;

    if (utility.checkEmpty(authHeader)) {
      return utility.sendError(res, req, null, "Authorization header is missing", 401);
    }

    // --- Handle Bearer + raw token ---
    let token;
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else {
      token = authHeader;
    }

    if (utility.checkEmpty(token)) {
      return utility.sendError(res, req, null, "Token is missing or malformed", 401);
    }

    // --- Verify JWT safely ---
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtErr) {
      return utility.sendError(
        res,
        req,
        null,
        jwtErr.name === "TokenExpiredError"
          ? "Token expired"
          : "Invalid or malformed token",
        401
      );
    }

    if (
      !decoded.tokenData ||
      typeof decoded.tokenData !== "string" ||
      !decoded.tokenData.includes("---")
    ) {
      return utility.sendError(res, req, null, "Invalid token payload", 401);
    }

    const userId = decoded.tokenData.split("---")[0];
    console.log('userId: ', userId);

    const result = await methods.getUserRolesAndPermissions(userId);

    if (result.status !== 200) {
      return utility.sendError(res, req, null, result.msg, result.status);
    }

    req.locals = req.locals || {};
    req.locals.userData = {
      ...result.user,
      roleIds: result.roleIds,
      roleNames: result.roles,
      permissions: result.permissions
    };

    return next();
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    return utility.sendError(res, req, null, "Authentication failed", 401);
  }
};

