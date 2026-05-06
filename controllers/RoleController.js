const utility = require('../helpers/utility/utility.js');
const RoleRepo = require('../services/repositories/RoleRepository.js');
const PermissionRepo = require('../services/repositories/PermissionRepository.js');
const RolePermissionRepo = require('../services/repositories/RolePermissionRepository.js');
const UserRoleRepository = require('../services/repositories/UserRoleRepository.js');
const RbacAuditRepo = require('../services/repositories/RbacAuditLogRepository.js');
const { logRbacAudit } = require('../helpers/method/methods.js');

const normalizePositiveNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const normalizePreviewLimit = (value) => {
  const parsed = normalizePositiveNumber(value, 50);
  if (parsed < 1) return 50;
  return Math.min(parsed, 200);
};

const mapAssignedUserRow = (row = {}) => ({
  user_role_Id: normalizePositiveNumber(row.user_role_Id, 0),
  user_Id: normalizePositiveNumber(row.user_Id, 0),
  user_Name: utility.checkEmpty(row.user_Name) ? null : String(row.user_Name).trim(),
  user_Email: utility.checkEmpty(row.user_Email) ? null : String(row.user_Email).trim(),
  user_Phone: utility.checkEmpty(row.user_Phone)
    ? (utility.checkEmpty(row.user_Mobile) ? null : String(row.user_Mobile).trim())
    : String(row.user_Phone).trim(),
  user_is_active: Number(row.user_is_active) === 1 ? 1 : 0,
});

exports.createRole = [
  async (req, res) => {
    try {
      const inputData = req.body.inputData;
      let userData = req.locals.userData;
      const createdBy = userData?.user_Id;
      let now = req.locals.now;

      if (utility.checkEmpty(inputData)) {
        return utility.sendError(res, req, null, 'Input data is required', 400);
      }

      const requiredFields = ['role_Name', 'role_Description'];
      const missingFields = requiredFields.filter((field) => utility.checkEmpty(inputData[field]));

      if (!utility.checkEmpty(missingFields)) {
        return utility.sendError(res, req, null, `Missing fields: ${missingFields.join(', ')}`, 400);
      }

      if (utility.checkEmpty(inputData.permission_Ids) || !Array.isArray(inputData.permission_Ids)) {
        return utility.sendError(res, req, null, 'permissions must be a non-empty array', 400);
      }

      const existingRole = await RoleRepo.findAnyByName(inputData.role_Name);
      if (!utility.checkEmpty(existingRole) && Number(existingRole.is_deleted || 0) !== 1) {
        return utility.sendError(res, req, null, 'Role already exists', 400);
      }

      const validPermissions = await PermissionRepo.findByIds(inputData.permission_Ids);
      if (validPermissions.length !== inputData.permission_Ids.length) {
        return utility.sendError(res, req, null, 'One or more permissions are invalid', 400);
      }

      if (!utility.checkEmpty(existingRole) && Number(existingRole.is_deleted || 0) === 1) {
        const roleId = existingRole.role_Id;
        await RoleRepo.restoreById(
          roleId,
          {
            role_Name: inputData.role_Name,
            role_Description: inputData.role_Description || null,
            role_Is_System: inputData.role_Is_System || 0,
          },
          now,
        );

        await RolePermissionRepo.deleteByRoleId(roleId);

        const rolePermissionRows = inputData.permission_Ids.map((permissionId) => ({
          role_permission_Role_Id: roleId,
          role_permission_Permission_Id: permissionId,
          role_permission_Granted_By_User_Id: createdBy,
        }));
        await RolePermissionRepo.bulkCreate(rolePermissionRows);

        await logRbacAudit({
          action_type: 'ROLE_CREATE',
          role_Id: roleId,
          role_Name: inputData.role_Name,
          user_Id: createdBy,
          user_Name: userData?.full_name,
          remarks: 'Role restored',
          now,
        });

        return utility.sendSuccess(res, req, { role_Id: roleId }, 'Role created successfully', 200);
      }

      const obj = {};
      obj.role_Name = inputData.role_Name;
      obj.role_Description = inputData.role_Description || null;
      obj.role_Is_System = inputData.role_Is_System || 0;
      obj.role_Created_By_User_Id = createdBy;

      const roleId = await RoleRepo.create(obj);

      const rolePermissionRows = inputData.permission_Ids.map((permissionId) => ({
        role_permission_Role_Id: roleId,
        role_permission_Permission_Id: permissionId,
        role_permission_Granted_By_User_Id: createdBy,
      }));

      await RolePermissionRepo.bulkCreate(rolePermissionRows);

      await logRbacAudit({
        action_type: 'ROLE_CREATE',
        role_Id: roleId,
        role_Name: inputData.role_Name,
        user_Id: createdBy,
        user_Name: userData?.full_name,
        remarks: 'Role created',
        now,
      });

      return utility.sendSuccess(res, req, { role_Id: roleId }, 'Role created successfully', 200);
    } catch (error) {
      console.log('createRole error:', error);
      return utility.sendError(res, req, null, 'Failed to create role', 500);
    }
  },
];

exports.updateRole = [
  async (req, res) => {
    try {
      const inputData = req.body.inputData;
      let now = req.locals.now;
      const roleId = inputData.role_Id;
      const updatedBy = req.locals.userData;

      if (utility.checkEmpty(inputData) || utility.checkEmpty(roleId)) {
        return utility.sendError(res, req, null, 'role_Id is required', 400);
      }

      if (!utility.checkEmpty(inputData.role_Name)) {
        const exists = await RoleRepo.findByNameWithId(inputData.role_Name, roleId);
        if (!utility.checkEmpty(exists)) {
          return utility.sendError(res, req, null, 'Role name already exists', 400);
        }
      }

      const findRole = await RoleRepo.getById(roleId);
      if (utility.checkEmpty(findRole)) {
        return utility.sendError(res, req, null, 'Role not found', 404);
      }

      let obj = {};
      let permissionsUpdated = false;
      let nextPermissionIds = [];

      if (utility.isset(inputData, 'role_Name')) {
        obj.role_Name = inputData.role_Name;
      }

      if (utility.isset(inputData, 'role_Description')) {
        obj.role_Description = inputData.role_Description;
      }

      if (utility.isset(inputData, 'permission_Ids')) {
        if (!Array.isArray(inputData.permission_Ids)) {
          return utility.sendError(res, req, null, 'permission_Ids must be an array', 400);
        }

        const parsedPermissionIds = inputData.permission_Ids.map((id) => Number(id));
        const hasInvalidPermissionId = parsedPermissionIds.some((id) => !Number.isFinite(id) || id <= 0);
        if (hasInvalidPermissionId) {
          return utility.sendError(res, req, null, 'permission_Ids must contain valid numeric ids', 400);
        }

        nextPermissionIds = [...new Set(parsedPermissionIds)];

        if (!utility.checkEmpty(nextPermissionIds)) {
          const validPermissions = await PermissionRepo.findByIds(nextPermissionIds);
          if (validPermissions.length !== nextPermissionIds.length) {
            return utility.sendError(res, req, null, 'One or more permissions are invalid', 400);
          }
        }

        // Sync role permissions exactly with incoming list.
        // Missing permissions in payload will be removed from this role.
        await RolePermissionRepo.deleteByRoleId(roleId);

        if (!utility.checkEmpty(nextPermissionIds)) {
          const rolePermissionRows = nextPermissionIds.map((permissionId) => ({
            role_permission_Role_Id: roleId,
            role_permission_Permission_Id: permissionId,
            role_permission_Granted_By_User_Id: updatedBy.user_Id,
          }));
          await RolePermissionRepo.bulkCreate(rolePermissionRows);
        }

        permissionsUpdated = true;
      }

      if (!utility.checkEmpty(obj)) {
        await RoleRepo.update(roleId, obj);
      }

      if (utility.checkEmpty(obj) && !permissionsUpdated) {
        return utility.sendError(res, req, null, 'Nothing to update', 400);
      }

      await logRbacAudit({
        action_type: 'ROLE_UPDATE',
        role_Id: roleId,
        role_Name: findRole.role_Name,
        previous_Role_Name: findRole.role_Name,
        user_Id: updatedBy.user_Id,
        user_Name: updatedBy.full_name,
        remarks: permissionsUpdated ? `Role updated with ${nextPermissionIds.length} permission(s)` : 'Role updated',
        now,
      });

      return utility.sendSuccess(res, req, null, 'Role updated successfully', 200);
    } catch (error) {
      console.log('updateRole error:', error);
      return utility.sendError(res, req, null, 'Failed to update role', 500);
    }
  },
];

exports.deleteRole = [
  async (req, res) => {
    try {
      const input = req.body.inputData || {};
      const roleId = input.role_Id;
      const updatedBy = req.locals.userData;
      let now = req.locals.now;

      if (utility.checkEmpty(roleId)) {
        return utility.sendError(res, req, null, 'role_Id is required', 400);
      }

      const findRole = await RoleRepo.getById(roleId);

      if (utility.checkEmpty(findRole)) {
        return utility.sendError(res, req, null, 'Role not found', 404);
      }

      const assignedUsersCount = await UserRoleRepository.countAssignedUsersByRoleId(roleId);
      if (assignedUsersCount > 0) {
        return utility.sendError(
          res,
          req,
          null,
          `Cannot delete role. ${assignedUsersCount} user(s) are still assigned to this role. Remove role assignments first.`,
          409,
        );
      }

      await RoleRepo.softDelete(roleId);
      await RolePermissionRepo.deleteByRoleId(roleId);

      await logRbacAudit({
        action_type: 'ROLE_DELETE',
        role_Id: roleId,
        role_Name: findRole.role_Name,
        user_Id: updatedBy.user_Id,
        user_Name: updatedBy.full_name,
        remarks: 'Role deleted',
        now,
      });

      return utility.sendSuccess(res, req, null, 'Role deleted successfully', 200);
    } catch (error) {
      console.log('deleteRole error:', error);
      return utility.sendError(res, req, null, 'Failed to delete role', 500);
    }
  },
];

exports.getRoleDeletePreview = [
  async (req, res) => {
    try {
      const inputData = req.body?.inputData || {};
      const filter = inputData.filter || {};
      const pagination = inputData.pagination || {};

      const roleId = normalizePositiveNumber(inputData.role_Id || filter.role_Id, 0);
      if (roleId <= 0) {
        return utility.sendError(res, req, null, 'role_Id is required', 400);
      }

      const role = await RoleRepo.findAnyById(roleId);
      if (utility.checkEmpty(role) || Number(role.is_deleted) === 1) {
        return utility.sendError(res, req, null, 'Role not found', 404);
      }

      const limit = normalizePreviewLimit(pagination.limit);
      const cursor = normalizePositiveNumber(pagination.cursor, 0);
      const search = utility.checkEmpty(filter.search) ? '' : String(filter.search).trim();

      const totalAssignedUsers = await UserRoleRepository.countAssignedUsersByRoleId(roleId);
      const filteredAssignedUsers = utility.checkEmpty(search)
        ? totalAssignedUsers
        : await UserRoleRepository.countAssignedUsersByRoleIdWithSearch(roleId, search);
      const rows = await UserRoleRepository.getAssignedUsersByRoleIdKeyset({
        roleId,
        limit: limit + 1,
        cursor,
        search,
      });

      const hasMore = rows.length > limit;
      const currentRows = hasMore ? rows.slice(0, limit) : rows;
      const users = currentRows.map(mapAssignedUserRow);
      const nextCursor = hasMore && !utility.checkEmpty(users)
        ? normalizePositiveNumber(users[users.length - 1]?.user_role_Id, 0)
        : null;

      const responsePayload = {
        role: {
          role_Id: normalizePositiveNumber(role.role_Id, 0),
          role_Name: utility.checkEmpty(role.role_Name) ? null : String(role.role_Name).trim(),
          role_Description: utility.checkEmpty(role.role_Description) ? null : String(role.role_Description).trim(),
        },
        summary: {
          assigned_user_count: totalAssignedUsers,
          filtered_user_count: filteredAssignedUsers,
          can_delete: totalAssignedUsers === 0,
          validation_message:
            totalAssignedUsers > 0
              ? 'This role cannot be deleted while users are assigned to it.'
              : null,
        },
        users,
      };

      return utility.sendSuccess(
        res,
        req,
        responsePayload,
        'Role delete preview fetched successfully',
        200,
        {
          limit,
          cursor,
          next_cursor: nextCursor,
          has_more: hasMore,
          returned: users.length,
          total: filteredAssignedUsers,
        },
      );
    } catch (error) {
      console.log('getRoleDeletePreview error:', error);
      return utility.sendError(res, req, null, 'Failed to fetch role delete preview', 500);
    }
  },
];

exports.getRoleById = [
  async (req, res) => {
    try {
      const input = req.body.inputData;
      const roleId = input.role_Id;

      if (utility.checkEmpty(roleId)) {
        return utility.sendError(res, req, null, 'role_Id is required', 400);
      }

      const role = await RoleRepo.getById(roleId);
      if (utility.checkEmpty(role)) {
        return utility.sendError(res, req, null, 'Role not found', 404);
      }

      const rolePermissions = await RolePermissionRepo.getPermissionIdsByRoleId(roleId);

      const permissionIds = utility.objToPluckArr(rolePermissions, 'role_permission_Permission_Id');

      let permissions = [];
      if (!utility.checkEmpty(permissionIds)) {
        permissions = await PermissionRepo.findByIds(permissionIds);
      }

      let data = {
        ...role,
        permissions,
      };
      return utility.sendSuccess(res, req, data, 'Role fetched successfully', 200);
    } catch (error) {
      console.log('getRoleById error:', error);
      return utility.sendError(res, req, null, 'Failed to fetch role', 500);
    }
  },
];

exports.getAllRoles = [
  async (req, res) => {
    try {
      const input = req.body.inputData || {};
      const filter = input.filter || {};
      const pagination = input.pagination || {};
      const sorting = input.sorting || {};

      const page = !utility.checkEmpty(pagination.page) ? Number(pagination.page) : 1;
      const limit = !utility.checkEmpty(pagination.limit) ? Number(pagination.limit) : 10;
      const offset = (page - 1) * limit;

      const allowedFilters = ['is_active']; // active in active handle carefully will only inactive if no role is assigned to user

      // sort name, permission count user count
      const where = {};

      allowedFilters.forEach((key) => {
        if (filter[key] !== undefined && filter[key] !== null && filter[key] !== '') {
          where[key] = filter[key];
        }
      });

      const searchRoleName = !utility.checkEmpty(filter.role_Name)
        ? String(filter.role_Name).trim()
        : !utility.checkEmpty(filter.search)
          ? String(filter.search).trim()
          : null;

      if (!utility.checkEmpty(searchRoleName)) {
        where.role_Name = searchRoleName;
      }

      let orderBy = ['created_at', 'DESC'];

      if (sorting?.key && ['role_Name', 'created_at'].includes(sorting.key)) {
        orderBy = [sorting.key, sorting.value === 'asc' ? 'ASC' : 'DESC'];
      }

      const queryOptions = {
        likeColumns: ['role_Name'],
        globalLike: false,
        orderBy,
      };

      const roles = await RoleRepo.getAllWithFilter(where, limit, offset, queryOptions);

      if (utility.checkEmpty(roles)) {
        return utility.sendSuccess(res, req, [], 'Roles fetched successfully', 200, { page, limit, total: 0 });
      }

      const roleIds = utility.objToPluckArr(roles, 'role_Id');

      const rolePermissions = await RolePermissionRepo.getPermissionIdsByRoleIds(roleIds);

      const permissionIds = utility.objToPluckArr(rolePermissions, 'role_permission_Permission_Id');

      let permissions = [];
      if (!utility.checkEmpty(permissionIds)) {
        permissions = await PermissionRepo.findByIds(permissionIds);
      }

      const permissionMap = {};
      for (const p of permissions) {
        permissionMap[p.permission_Id] = p;
      }

      for (const role of roles) {
        const rolePerms = rolePermissions
          .filter((rp) => rp.role_permission_Role_Id === role.role_Id)
          .map((rp) => permissionMap[rp.role_permission_Permission_Id])
          .filter(Boolean);

        role.permissions = rolePerms;
      }

      const roleUserCounts = await UserRoleRepository.getActiveAssignedUserCountsByRoleIds(roleIds);
      const roleUserCountMap = {};
      for (const row of roleUserCounts) {
        const roleId = normalizePositiveNumber(row.role_Id, 0);
        if (roleId > 0) {
          roleUserCountMap[roleId] = normalizePositiveNumber(row.total, 0);
        }
      }

      const allFilteredRoles = await RoleRepo.getAllWithFilter(where, null, null, queryOptions);
      const total = allFilteredRoles.length;

      for (const role of roles) {
        role.user_count = roleUserCountMap[role.role_Id] || 0;
      }

      return utility.sendSuccess(res, req, roles, 'Roles fetched successfully', 200, { page, limit, total });
    } catch (error) {
      console.log('getAllRoles error:', error);
      return utility.sendError(res, req, null, 'Failed to fetch roles', 500);
    }
  },
];

exports.addPermissionToRole = [
  async (req, res) => {
    try {
      const inputData = req.body.inputData;
      const updatedBy = req.locals.userData;
      let now = req.locals.now;

      if (
        utility.checkEmpty(inputData) ||
        utility.checkEmpty(inputData.role_Id) ||
        utility.checkEmpty(inputData.permission_Id)
      ) {
        return utility.sendError(res, req, null, 'role_Id and permission_Id are required', 400);
      }

      const { role_Id, permission_Id } = inputData;

      const role = await RoleRepo.getById(role_Id);
      if (utility.checkEmpty(role)) {
        return utility.sendError(res, req, null, 'Role not found', 404);
      }

      const permission = await PermissionRepo.getById(permission_Id);
      if (utility.checkEmpty(permission)) {
        return utility.sendError(res, req, null, 'Permission not found', 404);
      }

      const exists = await RolePermissionRepo.findByRoleAndPermission(role_Id, permission_Id);

      if (!utility.checkEmpty(exists)) {
        return utility.sendError(res, req, null, 'Permission already assigned to role', 400);
      }

      const obj = {};
      obj.role_permission_Role_Id = role_Id;
      obj.role_permission_Permission_Id = permission_Id;
      obj.role_permission_Granted_By_User_Id = updatedBy.user_Id;

      await RolePermissionRepo.create(obj);

      await logRbacAudit({
        action_type: 'ADD_PERMISSION',
        role_Id,
        role_Name: role.role_Name,
        permission_Id,
        permission_Name: permission.permission_Name,
        user_Id: updatedBy.user_Id,
        user_Name: updatedBy.full_name,
        remarks: 'Permission added to role',
        now,
      });

      return utility.sendSuccess(res, req, null, 'Permission added to role successfully', 200);
    } catch (error) {
      console.log('addPermissionToRole error:', error);
      return utility.sendError(res, req, null, 'Failed to add permission to role', 500);
    }
  },
];

exports.removePermissionFromRole = [
  async (req, res) => {
    try {
      const inputData = req.body.inputData;
      let now = req.locals.now;
      const userId = req.locals.userData.user_Id;
      const updatedBy = req.locals.userData;

      if (
        utility.checkEmpty(inputData) ||
        utility.checkEmpty(inputData.role_Id) ||
        utility.checkEmpty(inputData.permission_Id)
      ) {
        return utility.sendError(res, req, null, 'role_Id and permission_Id are required', 400);
      }

      const { role_Id, permission_Id } = inputData;

      const exists = await RolePermissionRepo.findByRoleAndPermission(role_Id, permission_Id);

      if (utility.checkEmpty(exists)) {
        return utility.sendError(res, req, null, 'Permission not assigned to role', 404);
      }

      await RolePermissionRepo.softDeleteByRoleAndPermission(role_Id, permission_Id, userId, now);

      const role = await RoleRepo.getById(role_Id);
      const permission = await PermissionRepo.getById(permission_Id);

      await logRbacAudit({
        action_type: 'REMOVE_PERMISSION',
        role_Id,
        role_Name: role.role_Name,
        permission_Id,
        permission_Id,
        permission_Name: permission.permission_Name,
        user_Id: userId,
        user_Name: updatedBy.full_name,
        remarks: 'Permission removed from role',
        now,
      });

      return utility.sendSuccess(res, req, null, 'Permission removed from role successfully', 200);
    } catch (error) {
      console.log('removePermissionFromRole error:', error);
      return utility.sendError(res, req, null, 'Failed to remove permission from role', 500);
    }
  },
];

exports.updateRoleStatus = [
  async (req, res) => {
    try {
      const inputData = req.body.inputData;
      let now = req.locals.now;
      const updatedBy = req.locals.userData;

      if (utility.checkEmpty(inputData)) {
        return utility.sendError(res, req, null, 'Input data is required', 400);
      }

      if (utility.checkEmpty(inputData.role_Id)) {
        return utility.sendError(res, req, null, 'role_Id is required', 400);
      }

      if (inputData.is_active !== 0 && inputData.is_active !== 1) {
        return utility.sendError(res, req, null, 'is_active must be 0 or 1', 400);
      }

      const role = await RoleRepo.findAnyById(inputData.role_Id);
      if (utility.checkEmpty(role)) {
        return utility.sendError(res, req, null, 'Role not found', 404);
      }

      if (Number(role.is_active) === Number(inputData.is_active)) {
        return utility.sendSuccess(res, req, null, `Role already ${inputData.is_active ? 'active' : 'inactive'}`, 200);
      }
      await RoleRepo.roleStatusUpdate(inputData.role_Id, inputData.is_active, now);

      await logRbacAudit({
        action_type: inputData.is_active ? 'ROLE_ACTIVATE' : 'ROLE_DEACTIVATE',
        role_Id: inputData.role_Id,
        role_Name: role.role_Name,
        user_Id: updatedBy.user_Id,
        user_Name: updatedBy.full_name,
        remarks: `Role ${inputData.is_active ? 'activated' : 'deactivated'}`,
        now,
      });

      return utility.sendSuccess(res, req, null, 'Role status updated', 200);
    } catch (error) {
      console.log('updateRoleStatus error:', error);
      return utility.sendError(res, req, null, 'Failed to update role status', 500);
    }
  },
];

exports.getRolesList = [
  async (req, res) => {
    try {
      const input = req.body?.inputData || {};
      const filter = input.filter || {};

      // strict filters
      const allowedFilters = ['role_Id', 'role_Name', 'is_active'];
      const where = { is_active: 1 };

      for (const key of allowedFilters) {
        if (!utility.checkEmpty(filter[key])) {
          where[key] = filter[key];
        }
      }

      const roles = await RoleRepo.getAllWithFilter(where, null, null, {
        likeColumns: ['role_Name'], // role_Name string will behave like %value%
        globalLike: false,
      });

      // only Id + role_Name
      const out = (roles || []).map((r) => ({
        role_Id: r.role_Id,
        role_Name: r.role_Name,
      }));

      return utility.sendSuccess(res, req, out, 'Roles fetched successfully', 200, null, filter);
    } catch (error) {
      console.log('getRolesList error:', error);
      return utility.sendError(res, req, null, 'Failed to fetch roles', 500);
    }
  },
];
