'use strict';
// var constants = require('/home/ubuntu/config/constants');
var constants = require('../../config/constants');
const utility = require('../utility/utility.js');
const dbQuery = require('../query/query2.js');
const UserRepo = require('../../services/repositories/UserRepository.js');
const UserRoleRepo = require('../../services/repositories/UserRoleRepository.js');
const RoleRepo = require('../../services/repositories/RoleRepository.js');
const RolePermissionRepo = require('../../services/repositories/RolePermissionRepository.js');
const PermissionRepo = require('../../services/repositories/PermissionRepository.js');
const ContactAuditRepo = require('../../services/repositories/ContactAuditLogRepository.js');
const RbacAuditRepo = require('../../services/repositories/RbacAuditLogRepository.js');
const BulkOperationLogRepo = require('../../services/repositories/BulkOperationLogRepository.js');

const toBoundedString = (value, maxLength, fallback = '') => {
  let normalized = fallback;
  if (!utility.checkEmpty(value)) {
    normalized = String(value).replace(/\s+/g, ' ').trim();
  }
  return normalized.slice(0, maxLength);
};

const toJsonStringSafe = (value, fallback = '{}') => {
  try {
    return JSON.stringify(value ?? {});
  } catch (error) {
    return fallback;
  }
};

const normalizeRoleName = (value) =>
  String(
    value && typeof value === 'object'
      ? value.role_Name || value.roleName || value.name || ''
      : value || '',
  )
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

exports.getVisibility = function (roleNames = []) {
  const normalizedRoles = new Set(
    (Array.isArray(roleNames) ? roleNames : [roleNames]).map(normalizeRoleName).filter(Boolean),
  );

  const isSuperAdmin = normalizedRoles.has('superadmin') || normalizedRoles.has('super admin');
  const isAdmin = normalizedRoles.has('admin');
  const isHr =
    normalizedRoles.has('hr') ||
    normalizedRoles.has('human resource') ||
    normalizedRoles.has('human resources');

  if (isSuperAdmin || isAdmin) {
    return {
      showRoles: true,
      showPermissions: true,
    };
  }

  if (isHr) {
    return {
      showRoles: true,
      showPermissions: false,
    };
  }

  return {
    showRoles: false,
    showPermissions: false,
  };
};

exports.getUserRolesAndPermissions = async (userId) => {
  if (utility.checkEmpty(userId)) {
    return {
      status: 400,
      msg: 'User id is required',
    };
  }

  const user = await UserRepo.getById(userId);
  if (utility.checkEmpty(user)) {
    return {
      status: 400,
      msg: 'Invalid user',
    };
  }

  const userRoles = await UserRoleRepo.getUserRolesByUserId(userId);
  if (utility.checkEmpty(userRoles)) {
    return {
      status: 200,
      msg: 'No roles assigned',
      user,
      roles: [],
      permissions: [],
    };
  }

  const roleIds = utility.objToPluckArr(userRoles, 'role_Id');

  const roles = await RoleRepo.getByIds(roleIds);
  const roleNames = utility.objToPluckArr(roles, 'role_Name');

  const rolePermissions = await RolePermissionRepo.getPermissionIdsByRoleIds(roleIds);
  if (utility.checkEmpty(rolePermissions)) {
    return {
      status: 200,
      msg: 'No permissions found',
      user,
      roles: roleNames,
      permissions: [],
      roleWithId: roles,
    };
  }

  const permissionIds = utility.objToPluckArr(rolePermissions, 'role_permission_Permission_Id');

  const permissions = await PermissionRepo.findByIds(permissionIds);
  const permissionKeys = utility.objToPluckArr(permissions, 'permission_Key');

  return {
    status: 200,
    user,
    roleIds,
    roles: roleNames,
    permissions: [...new Set(permissionKeys)],
    roleWithId: roles,
  };
};

// audit log helper
exports.logContactAudit = async ({
  contact_Id,
  type,
  originalData = null,
  modifiedData = null,
  user_Id = null,
  reason = null,
  now,
}) => {
  try {
    const normalizedType = String(type || '')
      .trim()
      .toUpperCase();
    const resolvedReason =
      utility.checkEmpty(reason) && normalizedType === 'UPDATE' ? 'Contact updated' : reason;
    const obj = {
      contact_Id,
      modification_type: type,
      original_data: originalData ? JSON.stringify(originalData) : null,
      modified_data: modifiedData ? JSON.stringify(modifiedData) : null,
      modified_by_user_Id: user_Id,
      modification_reason: resolvedReason,
      created_at: now,
    };

    await ContactAuditRepo.create(obj);
  } catch (err) {
    console.log('Audit log failed:', err.message);
  }
};

// rbac audit log helper
exports.logRbacAudit = async ({
  action_type,
  user_Id = null,
  user_Name = null,
  role_Id = null,
  role_Name = null,
  permission_Id = null,
  permission_Name = null,
  target_user_Id = null,
  target_user_Name = null,
  previous_Role_Id = null,
  previous_Role_Name = null,
  previous_Permission_Id = null,
  previous_Permission_Name = null,
  remarks = null,
  now,
}) => {
  try {
    const obj = {
      action_type,
      performed_by_user_Id: user_Id,
      performed_by_user_Name: user_Name,
      target_user_Id,
      target_user_Name,
      role_Id,
      role_Name,
      permission_Id,
      permission_Name,
      previous_Role_Id,
      previous_Role_Name,
      previous_Permission_Id,
      previous_Permission_Name,
      remarks,
      created_at: now,
    };

    await RbacAuditRepo.create(obj);
  } catch (err) {
    console.log('RBAC Audit log failed:', err.message);
  }
};

exports.logContactExportBulkOperationInBackground = ({
  req,
  now,
  status = 'completed',
  outputFileKey = null,
  outputFileName = null,
  totalItems = 0,
  processedItems = 0,
  successCount = 0,
  failureCount = 0,
  skippedCount = 0,
  errorSummary = null,
  errorDetails = null,
  criteria = {},
}) => {
  setImmediate(async () => {
    try {
      const userData = req.locals?.userData || {};
      const requestedByUserIdRaw = Number(userData.user_Id);
      const requestedByUserId =
        Number.isFinite(requestedByUserIdRaw) && requestedByUserIdRaw > 0 ? requestedByUserIdRaw : null;
      const requestedByUserName = toBoundedString(userData.user_Name || userData.name || '', 255, '') || null;
      const safeNow = now || req.locals?.now || null;

      await BulkOperationLogRepo.create({
        requested_by_user_Id: requestedByUserId,
        requested_by_user_Name: requestedByUserName,
        operation_type: 'CONTACT_EXPORT',
        module: 'contact',
        status,
        output_file_key: outputFileKey,
        output_file_name: outputFileName,
        criteria: toJsonStringSafe(criteria),
        total_items: Number(totalItems) || 0,
        processed_items: Number(processedItems) || 0,
        success_count: Number(successCount) || 0,
        failure_count: Number(failureCount) || 0,
        skipped_count: Number(skippedCount) || 0,
        error_summary: errorSummary ? toBoundedString(errorSummary, 500, 'Contact export failed') : null,
        error_details: errorDetails ? toJsonStringSafe(errorDetails) : null,
        started_at: safeNow,
        ended_at: safeNow,
        created_at: safeNow,
      });
    } catch (error) {
      console.log('Bulk export log create failed:', error.message);
    }
  });
};
