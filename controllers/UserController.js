const methods = require('../helpers/method/methods.js');
const utility = require('../helpers/utility/utility.js');
const UserRepo = require('../services/repositories/UserRepository.js');
const RoleRepo = require('../services/repositories/RoleRepository.js');
const UserRoleRepo = require('../services/repositories/UserRoleRepository.js');
const DesignationRepo = require('../services/repositories/DesignationRepository.js');
const PermissionRepo = require('../services/repositories/PermissionRepository.js');
const RolePermissionRepo = require('../services/repositories/RolePermissionRepository.js');

exports.createUser = [
  async (req, res) => {
    const inputData = req.body.inputData;
    const now = req.locals.now;
    const assignedByUserId = req?.locals?.userData?.user_Id;

    // Validate input data
    if (utility.checkEmpty(inputData)) {
      return utility.sendError(res, req, null, 'Input data is required', 400);
    }

    // Validate required fields
    const requiredFields = ['user_Email', 'user_Password', 'role_Ids'];
    const missingFieldsError = utility.validateRequiredFields(inputData, requiredFields);
    if (missingFieldsError) {
      console.log('missingFieldsError', missingFieldsError);
      return utility.sendError(res, req, null, missingFieldsError, 400);
    }

    // Validate role_Ids array
    const roleArrayError = utility.validateArray(inputData.role_Ids);
    if (roleArrayError) {
      return utility.sendError(res, req, null, roleArrayError, 400);
    }

    // Check if the email already exists (including deleted users)
    const existingUser = await UserRepo.findAnyByEmail(inputData.user_Email);
    if (!utility.checkEmpty(existingUser) && Number(existingUser.is_deleted || 0) !== 1) {
      return utility.sendError(res, req, null, 'Email already exists', 400);
    }

    // Validate roles
    const roles = await RoleRepo.getByIds(inputData.role_Ids);
    if (roles.length !== inputData.role_Ids.length) {
      return utility.sendError(res, req, null, 'Invalid roles', 400);
    }

    // Validate designation
    // const designation = await DesignationRepo.getById(inputData.designation_Id);
    // if (utility.checkEmpty(designation)) {
    //   return utility.sendError(res, req, null, 'Invalid designation', 400);
    // }

    // Hash the password
    const hashedPassword = await utility.hashPassword(inputData.user_Password);

    // Mobike number validation
    if (!utility.checkEmpty(inputData.user_Mobile)) {
      // const isValidMobile = utility.validateMobile(inputData.user_Mobile);
      // if (!isValidMobile) {
      // return utility.sendError(res, req, null, 'Invalid mobile number', 400);
      // }
    }

    // Create the user object
    const obj = {
      user_Email: inputData.user_Email,
      user_Dob: utility.checkEmpty(inputData.user_Dob) ? null : inputData.user_Dob,
      user_Anniversary: utility.checkEmpty(inputData.user_Anniversary) ? null : inputData.user_Anniversary,
      designation_Id: null,
      user_Password_Hash: hashedPassword,
      user_Name: utility.checkEmpty(inputData.user_Name) ? null : inputData.user_Name,
      user_Mobile: utility.checkEmpty(inputData.user_Mobile) ? null : inputData.user_Mobile,
      created_at: now,
    };

    if (!utility.checkEmpty(existingUser) && Number(existingUser.is_deleted || 0) === 1) {
      const userId = existingUser.user_Id;
      await UserRepo.restoreById(
        userId,
        {
          user_Email: obj.user_Email,
          user_Dob: obj.user_Dob,
          user_Anniversary: obj.user_Anniversary,
          designation_Id: obj.designation_Id,
          user_Password_Hash: obj.user_Password_Hash,
          user_Name: obj.user_Name,
          user_Mobile: obj.user_Mobile,
        },
        now,
      );

      const requestedRoleIds = [
        ...new Set(
          (Array.isArray(inputData.role_Ids) ? inputData.role_Ids : [])
            .map((id) => Number(id))
            .filter((id) => Number.isFinite(id) && id > 0),
        ),
      ];

      const existingRoles = await UserRoleRepo.getAllByUserId(userId);
      const existingRoleIds = new Set(
        (existingRoles || [])
          .map((row) => Number(row?.role_Id))
          .filter((id) => Number.isFinite(id) && id > 0),
      );
      const activeRoleIds = new Set(
        (existingRoles || [])
          .filter((row) => Number(row?.is_deleted || 0) === 0)
          .map((row) => Number(row?.role_Id))
          .filter((id) => Number.isFinite(id) && id > 0),
      );

      const rolesToRestore = requestedRoleIds.filter((id) => existingRoleIds.has(id));
      const rolesToAdd = requestedRoleIds.filter((id) => !existingRoleIds.has(id));
      const rolesToRemove = [...activeRoleIds].filter((id) => !requestedRoleIds.includes(id));

      if (!utility.checkEmpty(rolesToRemove)) {
        await UserRoleRepo.softDeleteByUserIdAndRoleIds(userId, rolesToRemove);
      }

      if (!utility.checkEmpty(rolesToRestore)) {
        await UserRoleRepo.restoreByUserIdAndRoleIds(userId, rolesToRestore, now);
      }

      if (!utility.checkEmpty(rolesToAdd)) {
        await UserRoleRepo.assignRolesToUser(userId, rolesToAdd, assignedByUserId);
      }

      let data = {
        userId,
        role_Ids: requestedRoleIds,
      };
      return utility.sendSuccess(res, req, data, 'User created successfully', 200);
    }

    // Create the user in the database
    const userId = await UserRepo.create(obj);
    await UserRoleRepo.assignRolesToUser(userId, inputData.role_Ids, assignedByUserId);

    // Generate the authentication token
    const token = utility.generateAuthToken(userId, hashedPassword);

    // Return the response with the user data and token
    let data = {
      userId,
      role_Ids: inputData.role_Ids,
      // token,
    };
    return utility.sendSuccess(res, req, data, 'User created successfully', 200);
  },
];

exports.updateUser = [
  async (req, res) => {
    try {
      const inputData = req.body.inputData || {};
      const user_Id = Number(inputData.user_Id);
      const actionByUserId = Number(req.locals?.userData?.user_Id) || null;

      if (utility.checkEmpty(inputData) || !Number.isFinite(user_Id) || user_Id <= 0) {
        return utility.sendError(res, req, null, 'user_Id is required', 400);
      }

      const existingUser = await UserRepo.getById(user_Id);
      if (utility.checkEmpty(existingUser)) {
        return utility.sendError(res, req, null, 'User not found', 404);
      }

      if (!utility.checkEmpty(inputData.user_Email)) {
        const isExsitUser = await UserRepo.findByEmailWithId(inputData.user_Email, user_Id);
        if (!utility.checkEmpty(isExsitUser)) {
          return utility.sendError(res, req, null, 'Email already exists for another user', 400);
        }
      }

      let obj = {};

      if (utility.isset(inputData, 'user_Email')) {
        obj.user_Email = inputData.user_Email;
      }

      if (utility.isset(inputData, 'user_Dob')) {
        obj.user_Dob = inputData.user_Dob;
      }

      if (utility.isset(inputData, 'user_Anniversary')) {
        obj.user_Anniversary = inputData.user_Anniversary;
      }

      // if (utility.isset(inputData, 'designation_Id')) {
      //   const designation = await DesignationRepo.getById(inputData.designation_Id);
      //   if (utility.checkEmpty(designation)) {
      //     return utility.sendError(res, req, null, 'Invalid designation', 400);
      //   }
      //   obj.designation_Id = inputData.designation_Id;
      // }

      if (utility.isset(inputData, 'user_Name')) {
        obj.user_Name = inputData.user_Name;
      }

      if (utility.isset(inputData, 'user_Mobile')) {
        // const isValidMobile = utility.validateMobile(inputData.user_Mobile);
        // if (!isValidMobile) {
        // return utility.sendError(res, req, null, 'Invalid mobile number', 400);
        // }
        obj.user_Mobile = inputData.user_Mobile;
      }

      const roleUpdateRequested = utility.isset(inputData, 'role_Ids');

      if (roleUpdateRequested) {
        if (!Array.isArray(inputData.role_Ids) || utility.checkEmpty(inputData.role_Ids)) {
          return utility.sendError(res, req, null, 'role_Ids must be a non-empty array', 400);
        }

        const requestedRoleIds = [...new Set(inputData.role_Ids.map((id) => Number(id)).filter((id) => id > 0))];
        if (utility.checkEmpty(requestedRoleIds)) {
          return utility.sendError(res, req, null, 'role_Ids must contain valid numeric ids', 400);
        }

        const validRoles = await RoleRepo.getByIds(requestedRoleIds);
        if (validRoles.length !== requestedRoleIds.length) {
          return utility.sendError(res, req, null, 'Invalid roles', 400);
        }

        const existingUserRoles = await UserRoleRepo.getUserRolesByUserId(user_Id);
        const existingRoleIds = [...new Set(utility.objToPluckArr(existingUserRoles || [], 'role_Id').map(Number))];

        const nextRoleSet = new Set(requestedRoleIds);
        const existingRoleSet = new Set(existingRoleIds);

        const rolesToAdd = requestedRoleIds.filter((roleId) => !existingRoleSet.has(roleId));
        const rolesToRemove = existingRoleIds.filter((roleId) => !nextRoleSet.has(roleId));

        if (!utility.checkEmpty(rolesToRemove)) {
          await UserRoleRepo.softDeleteByUserIdAndRoleIds(user_Id, rolesToRemove);
        }

        if (!utility.checkEmpty(rolesToAdd)) {
          await UserRoleRepo.assignRolesToUser(user_Id, rolesToAdd, actionByUserId);
        }
      }

      const hasUserUpdateFields = !utility.checkEmpty(obj);
      if (hasUserUpdateFields) {
        await UserRepo.update(user_Id, obj);
      }

      if (!hasUserUpdateFields && !roleUpdateRequested) {
        return utility.sendError(res, req, null, 'Nothing to update', 400);
      }

      return utility.sendSuccess(res, req, null, 'User updated successfully.', 200);
    } catch (error) {
      console.log('updateUser error:', error);
      return utility.sendError(res, req, null, 'Failed to update user.', 500);
    }
  },
];

exports.deleteUser = [
  async (req, res) => {
    try {
      const input = req.body.inputData;
      const id = input.user_Id;
      if (utility.checkEmpty(id)) {
        return utility.sendError(res, req, null, 'Invalid member id', 400);
      }

      await UserRepo.softDelete(id);

      return utility.sendSuccess(res, req, null, 'Member deleted successfully.', 200);
    } catch (error) {
      console.log('deleteMember error:', error);
      return utility.sendError(res, req, null, 'Failed to delete member.', 500);
    }
  },
];

exports.getUserById = [
  async (req, res) => {
    try {
      const input = req.body.inputData;
      const userId = input.user_Id;

      if (utility.checkEmpty(userId)) {
        return utility.sendError(res, req, null, 'User id required.', 400);
      }

      const result = await methods.getUserRolesAndPermissions(userId);

      if (result.status !== 200) {
        return utility.sendError(res, req, null, result.msg, result.status);
      }

      if (!utility.checkEmpty(result.user.designation_Id)) {
        let designationData = await DesignationRepo.getById(result.user.designation_Id);

        if (utility.checkEmpty(designationData)) {
          return utility.sendError(res, req, null, 'Designation not found', 400);
        }

        result.user.designation_Name = designationData?.designation_Name || '';
      }
      const currentUser = req.locals.userData;
      const visibility = methods.getVisibility(currentUser.roleNames);

      const data = { ...result.user };
      data.roleNames = Array.isArray(result.roles) ? result.roles : [];
      data.roles = Array.isArray(result.roleWithId) ? result.roleWithId : [];
      data.role_Ids = Array.isArray(result.roleIds)
        ? result.roleIds
        : utility.objToPluckArr(data.roles || [], 'role_Id');

      if (visibility.showPermissions) {
        data.permissions = result.permissions;
      } else {
        data.permissions = [];
      }

      return utility.sendSuccess(res, req, data, result.msg || 'User fetched successfully.', 200);
    } catch (error) {
      console.log('getUserById error:', error);
      return utility.sendError(res, req, null, 'Failed to fetch User.', 500);
    }
  },
];

exports.getAllUser = [
  async (req, res) => {
    try {
      const input = req.body.inputData || {};
      const filter = input.filter || {};
      const pagination = input.pagination || {};
      const sorting = input.sorting || {};

      const pageRaw = !utility.checkEmpty(pagination.page) ? Number(pagination.page) : 1;
      const limitRaw = !utility.checkEmpty(pagination.limit) ? Number(pagination.limit) : 10;
      const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
      const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 10;
      const offset = (page - 1) * limit;

      const where = {};

      const filterDesignationIds = Array.isArray(filter.designation_Id)
        ? filter.designation_Id.filter((x) => !utility.checkEmpty(x))
        : !utility.checkEmpty(filter.designation_Id)
          ? [filter.designation_Id]
          : [];
      if (!utility.checkEmpty(filterDesignationIds)) {
        where.designation_Id = filterDesignationIds;
      }

      const filterRoleIds = Array.isArray(filter.role_Id)
        ? filter.role_Id.filter((x) => !utility.checkEmpty(x))
        : !utility.checkEmpty(filter.role_Id)
          ? [filter.role_Id]
          : [];
      if (!utility.checkEmpty(filterRoleIds)) {
        const roleUserList = await UserRoleRepo.getAllWithFilter({ role_Id: filterRoleIds });
        const roleUserIds = [...new Set(utility.objToPluckArr(roleUserList, 'user_Id'))];

        if (utility.checkEmpty(roleUserIds)) {
          return utility.sendSuccess(res, req, [], 'Users fetched successfully.', 200, { page, limit, total: 0 });
        }
        where.user_Id = roleUserIds;
      }

      const searchName = !utility.checkEmpty(filter.user_Name) ? String(filter.user_Name).trim() : '';
      const searchEmail = !utility.checkEmpty(filter.user_Email) ? String(filter.user_Email).trim() : '';

      let allUsers = [];

      if (!utility.checkEmpty(searchName) && !utility.checkEmpty(searchEmail)) {
        const [usersByName, usersByEmail] = await Promise.all([
          UserRepo.getAllWithFilter({
            ...where,
            user_Name: { op: 'like', value: searchName },
          }),
          UserRepo.getAllWithFilter({
            ...where,
            user_Email: { op: 'like', value: searchEmail },
          }),
        ]);

        const mergedMap = new Map();
        for (const u of [...(usersByName || []), ...(usersByEmail || [])]) {
          mergedMap.set(u.user_Id, u);
        }
        allUsers = [...mergedMap.values()];
      } else if (!utility.checkEmpty(searchName)) {
        allUsers = await UserRepo.getAllWithFilter({
          ...where,
          user_Name: { op: 'like', value: searchName },
        });
      } else if (!utility.checkEmpty(searchEmail)) {
        allUsers = await UserRepo.getAllWithFilter({
          ...where,
          user_Email: { op: 'like', value: searchEmail },
        });
      } else {
        allUsers = await UserRepo.getAllWithFilter(where);
      }

      const sortKeyInput = sorting.key || sorting.Key || 'created_at';
      const allowedSortFields = ['user_Name', 'user_Email', 'created_At', 'updated_At', 'created_at', 'updated_at'];
      const sortKey = allowedSortFields.includes(sortKeyInput) ? sortKeyInput : 'created_at';
      const sortDirection = String(sorting.value || 'desc').toLowerCase() === 'asc' ? 1 : -1;

      const sortValue = (row) => {
        if (sortKey === 'created_at' || sortKey === 'created_At') return row.created_at ?? row.created_At ?? null;
        if (sortKey === 'updated_at' || sortKey === 'updated_At') return row.updated_at ?? row.updated_At ?? null;
        return row[sortKey] ?? null;
      };

      const compareValues = (a, b) => {
        if (a === b) return 0;
        if (a === null || a === undefined) return 1;
        if (b === null || b === undefined) return -1;

        const aDate = new Date(a);
        const bDate = new Date(b);
        const aIsDate = !Number.isNaN(aDate.getTime());
        const bIsDate = !Number.isNaN(bDate.getTime());
        if (aIsDate && bIsDate) {
          if (aDate > bDate) return 1;
          if (aDate < bDate) return -1;
          return 0;
        }

        return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
      };

      const sortedUsers = [...(allUsers || [])].sort(
        (a, b) => compareValues(sortValue(a), sortValue(b)) * sortDirection,
      );
      const total = sortedUsers.length;
      const users = sortedUsers.slice(offset, offset + limit);

      if (utility.checkEmpty(users)) {
        return utility.sendSuccess(res, req, [], 'Users fetched successfully.', 200, { page, limit, total });
      }

      const userIds = utility.objToPluckArr(users, 'user_Id');
      const userRoles = await UserRoleRepo.getUserRolesByUserIds(userIds);

      const userRoleMap = {};
      for (const ur of userRoles) {
        if (!userRoleMap[ur.user_Id]) {
          userRoleMap[ur.user_Id] = [];
        }
        userRoleMap[ur.user_Id].push(ur.role_Id);
      }

      const roleIds = utility.objToPluckArr(userRoles, 'role_Id');
      const roles = await RoleRepo.getByIds(roleIds);

      const roleMap = {};
      for (const r of roles) {
        roleMap[r.role_Id] = r.role_Name;
      }

      const rolePermissions = await RolePermissionRepo.getPermissionIdsByRoleIds(roleIds);

      const rolePermissionMap = {};
      for (const rp of rolePermissions) {
        if (!rolePermissionMap[rp.role_permission_Role_Id]) {
          rolePermissionMap[rp.role_permission_Role_Id] = [];
        }
        rolePermissionMap[rp.role_permission_Role_Id].push(rp.role_permission_Permission_Id);
      }

      const permissionIds = utility.objToPluckArr(rolePermissions, 'role_permission_Permission_Id');

      const permissions = await PermissionRepo.findByIds(permissionIds);

      const permissionMap = {};
      for (const p of permissions) {
        permissionMap[p.permission_Id] = p.permission_Key;
      }

      const designationIds = utility.objToPluckArr(users, 'designation_Id');
      const designations = await DesignationRepo.getByIds(designationIds);

      const designationMap = {};
      for (const d of designations) {
        designationMap[d.designation_Id] = d.designation_Name;
      }

      const currentUser = req.locals.userData;
      const visibility = methods.getVisibility(currentUser.roleNames);

      for (const user of users) {
        const roleIdsOfUser = userRoleMap[user.user_Id] || [];
        user.designation_Name = designationMap[user.designation_Id] || null;

        let roleNames = [];
        let permissionKeys = [];

        for (const rid of roleIdsOfUser) {
          if (roleMap[rid]) roleNames.push(roleMap[rid]);

          const pids = rolePermissionMap[rid] || [];
          for (const pid of pids) {
            if (permissionMap[pid]) {
              permissionKeys.push(permissionMap[pid]);
            }
          }
        }

        // Always include assigned role data for User Management listing.
        user.roleNames = roleNames;
        user.role_Ids = roleIdsOfUser;
        user.role_Names = roleNames;

        if (visibility.showPermissions) {
          user.permissions = [...new Set(permissionKeys)];
        } else {
          delete user.permissions;
        }
      }

      return utility.sendSuccess(res, req, users, 'Users fetched successfully.', 200, { page, limit, total });
    } catch (error) {
      console.log('getAllUsers error:', error);
      return utility.sendError(res, req, null, 'Failed to fetch users.', 500);
    }
  },
];

// exports.authUser = [
//   async (req, res) => {
//     try {
//       const user = req.locals.userData;

//       if (utility.checkEmpty(user)) {
//         return utility.sendError(res, req, null, 'Unauthorized', 401);
//       }

//       const userId = user.user_Id;

//       // user roles + permission keys user already has
//       const result = await methods.getUserRolesAndPermissions(userId);
//       if (!result || result.status !== 200) {
//         return utility.sendError(res, req, null, result?.msg || 'Failed to fetch permissions', result?.status || 500);
//       }

//       const designationData = await DesignationRepo.getById(user.designation_Id);
//       if (utility.checkEmpty(designationData)) {
//         return utility.sendError(res, req, null, 'Designation not found', 400);
//       }

//       // master permissions
//       const allPermissions = await PermissionRepo.getAll();
//       const allPermArr = Array.isArray(allPermissions) ? allPermissions : [];

//       // user permission keys (Set for O(1))
//       const userPermKeys = new Set(
//         (Array.isArray(result.permissions) ? result.permissions : [])
//           .map((p) => p?.permission_Key ?? p?.permission_key ?? p?.key ?? p)
//           .map((k) => String(k || '').trim())
//           .filter(Boolean),
//       );

//       const hasWildcard = userPermKeys.has('*');

//       // build final permission list: all permissions + value true/false
//       const permissions = allPermArr.map((perm) => {
//         const key = String(perm.permission_Key ?? perm.permission_key ?? '').trim();
//         const id = perm.permission_Id ?? perm.permission_id;

//         const value = hasWildcard ? true : userPermKeys.has(key);

//         return {
//           id,
//           key,
//           value,
//         };
//       });

//       const data = {
//         user: {
//           user_Id: user.user_Id,
//           user_Dob: user.user_Dob,
//           user_Email: user.user_Email,
//           user_Anniversary: user.user_Anniversary,
//           designation_Name: designationData.designation_Name,
//         },
//         roles: result.roles || [],
//         permissions, // ✅ full list with true/false
//       };

//       return utility.sendSuccess(res, req, data, 'Profile fetched', 200);
//     } catch (err) {
//       console.log('authUser error', err);
//       return utility.sendError(res, req, null, 'Failed to fetch profile', 500);
//     }
//   },
// ];

exports.authUser = [
  async (req, res) => {
    try {
      const user = req.locals.userData;
      if (utility.checkEmpty(user)) return utility.sendError(res, req, null, 'Unauthorized', 401);

      const userId = user.user_Id;

      const [result, designationData, allPermissions] = await Promise.all([
        methods.getUserRolesAndPermissions(userId),
        DesignationRepo.getById(user.designation_Id ?? 0),
        PermissionRepo.getAll(),
      ]);

      if (!result || result.status !== 200) {
        return utility.sendError(res, req, null, result?.msg || 'Failed to fetch permissions', result?.status || 500);
      }

      const allPermArr = Array.isArray(allPermissions) ? allPermissions : [];

      const userPermKeys = new Set(
        (Array.isArray(result.permissions) ? result.permissions : [])
          .map((p) => p?.permission_Key ?? p?.permission_key ?? p?.key ?? p)
          .map((k) => String(k || '').trim())
          .filter(Boolean),
      );

      const hasWildcard = userPermKeys.has('*');

      const permissions = allPermArr.map((perm) => {
        const key = String(perm.permission_Key ?? perm.permission_key ?? '').trim();
        return {
          id: perm.permission_Id ?? perm.permission_id,
          key,
          value: hasWildcard ? true : userPermKeys.has(key),
        };
      });

      const data = {
        user: {
          user_Id: user.user_Id ?? 0,
          user_Dob: user?.user_Dob ?? '',
          user_Email: user?.user_Email ?? '',
          user_Anniversary: user?.user_Anniversary ?? '',
          designation_Name: designationData?.designation_Name ?? '',
        },
        roles: result.roles || [],
        permissions,
      };

      return utility.sendSuccess(res, req, data, 'Profile fetched', 200);
    } catch (err) {
      console.log('authUser error', err);
      return utility.sendError(res, req, null, 'Failed to fetch profile', 500);
    }
  },
];

exports.getUserEffectivePermissions = async (req, res) => {
  try {
    const userId = req.params.id;

    const result = await methods.getUserRolesAndPermissions(userId);

    if (result.status !== 200) {
      return utility.sendError(res, req, null, result.msg, result.status);
    }

    let data = {
      user_Id: userId,
      roles: result.roles || [],
      permissions: result.permissions || [],
    };

    return utility.sendSuccess(res, req, data, result.msg || 'Effective permissions fetched successfully', 200);
  } catch (error) {
    console.log('getUserEffectivePermissions error:', error);
    return utility.sendError(res, req, null, 'Failed to fetch effective permissions', 500);
  }
};

// exports.updateUserProfile = utility.catchAsync(async (req, res) => {
//   const user = req.locals.userData;
//   const input = req.body.inputData || {};

//   if (utility.checkEmpty(user)) {
//     return utility.sendError(res, req, null, 'User unauthorized', 401);
//   }

//   let obj = {};

//   // Profile fields
//   if (utility.isset(input, 'user_Name')) obj.user_Name = input.user_Name;
//   if (utility.isset(input, 'user_DOB')) obj.user_DOB = input.user_DOB || null;
//   if (utility.isset(input, 'user_Anniversary')) obj.user_Anniversary = input.user_Anniversary || null;

//   // Profile photo
//   if (req.file) {
//     obj.user_Profile_Photo = `/uploads/profile/${req.file.filename}`;
//   }

//   // 🔐 Self password change
//   if (utility.isset(input, 'old_Password') || utility.isset(input, 'new_Password')) {
//     if (utility.checkEmpty(input.old_Password) || utility.checkEmpty(input.new_Password)) {
//       return utility.sendError(res, req, null, 'Both old_Password and new_Password are required', 400);
//     }

//     if (input.old_Password === input.new_Password) {
//       return utility.sendError(res, req, null, 'New password cannot be same as old password', 400);
//     }

//     const dbUser = await UserRepo.getById(user.user_Id);
//     if (utility.checkEmpty(dbUser)) {
//       return utility.sendError(res, req, null, 'User not found', 404);
//     }

//     const isValid = await utility.comparePassword(input.old_Password, dbUser.user_Password_Hash);

//     if (!isValid) {
//       return utility.sendError(res, req, null, 'Old password is incorrect', 400);
//     }

//     obj.user_Password_Hash = await utility.hashPassword(input.new_Password);
//   }

//   if (utility.checkEmpty(obj)) {
//     return utility.sendError(res, req, null, 'No data to update', 400);
//   }

//   await UserRepo.update(user.user_Id, obj);

//   return utility.sendSuccess(res, req, null, 'Profile updated successfully', 200);
// });

// exports.changePassword = utility.catchAsync(async (req, res) => {
//   const currentUser = req.locals.userData;
//   const input = req.body.inputData || {};

//   if (utility.checkEmpty(currentUser)) {
//     return utility.sendError(res, req, null, 'Unauthorized', 401);
//   }

//   const { userId, new_Password } = input;

//   if (utility.checkEmpty(userId) || utility.checkEmpty(new_Password)) {
//     return utility.sendError(res, req, null, 'userId and new_Password are required', 400);
//   }

//   // Fetch target user
//   const dbUser = await UserRepo.getById(userId);

//   if (utility.checkEmpty(dbUser)) {
//     return utility.sendError(res, req, null, 'User not found', 404);
//   }

//   // Hash new password
//   const newHashedPassword = await utility.hashPassword(new_Password);

//   // Update password
//   await UserRepo.update(userId, {
//     user_Password_Hash: newHashedPassword,
//   });

//   return utility.sendSuccess(res, req, null, 'Password reset successfully', 200);
// });

exports.updateUserStatus = async (req, res) => {
  try {
    const input = req.body.inputData;
    const now = req.locals.now;

    const { user_Id, is_active } = input;
    const loggedInUserId = req.locals.userData.user_Id;

    if (utility.checkEmpty(user_Id)) {
      return utility.sendError(res, req, null, 'user_Id is required', 400);
    }

    if (typeof is_active !== 'number' || ![0, 1].includes(is_active)) {
      return utility.sendError(res, req, null, 'is_active must be 0 or 1', 400);
    }

    if (Number(user_Id) === Number(loggedInUserId)) {
      return utility.sendError(res, req, null, 'You cannot change your own active status', 400);
    }

    let user = await UserRepo.getAllActiveDeactiveUser(user_Id);
    if (utility.checkEmpty(user)) {
      return utility.sendError(res, req, null, 'User not found', 404);
    }

    user = user[0];
    if (Number(user.is_active) === Number(is_active)) {
      return utility.sendError(res, req, null, `User is already ${is_active === 1 ? 'active' : 'inactive'}`, 400);
    }

    await UserRepo.update(user_Id, {
      is_active,
      updated_at: now,
    });

    return utility.sendSuccess(
      res,
      req,
      null,
      `User ${is_active === 1 ? 'activated' : 'deactivated'} successfully`,
      200,
    );
  } catch (error) {
    console.log('updateUserStatus error:', error);
    return utility.sendError(res, req, null, 'Failed to update user status', 500);
  }
};
