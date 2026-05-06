const utility = require('../helpers/utility/utility.js');
const PermissionRepo = require('../services/repositories/PermissionRepository.js');
const RolePermissionRepo = require('../services/repositories/RolePermissionRepository.js');
const { logRbacAudit } = require('../helpers/method/methods.js');
const EventRepo = require('../services/repositories/EventMasterRepository.js');

const isMissingPrintApprovalStatusColumnError = (error) => {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return (
    code === 'ER_BAD_FIELD_ERROR' ||
    (/print_approval_status/i.test(message) && /unknown column|doesn'?t exist/i.test(message))
  );
};

const EVENT_STATUS_ENUM = Object.freeze({
  ACTIVE: 'active',
  UNDER_REVIEW_BY_ADMIN: 'under-review-by-admin',
});

const normalizeEventStatusValue = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

const getEventApprovalCount = (row = {}) => {
  const parsed = Number(row?.event_approval_count || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isEventRowRejected = (row = {}) => normalizeEventStatusValue(row?.status) === 'rejected';

const isEventRowAdminApproved = (row = {}) => {
  const normalizedStatus = normalizeEventStatusValue(row?.status);
  const approvalCount = getEventApprovalCount(row);

  if (normalizedStatus === EVENT_STATUS_ENUM.UNDER_REVIEW_BY_ADMIN) {
    return true;
  }

  if (normalizedStatus === EVENT_STATUS_ENUM.ACTIVE && approvalCount >= 2) {
    return true;
  }

  return approvalCount >= 2;
};

exports.createPermission = [
  async (req, res) => {
    try {
      const inputData = req.body.inputData;
      let userData = req.locals.userData;
      let now = req.locals.now;

      if (utility.checkEmpty(inputData)) {
        return utility.sendError(res, req, null, 'Input data is required', 400);
      }

      const allowedFields = ['permission_Key', 'permission_Action', 'permission_Description'];

      const missingFields = allowedFields.filter((field) => utility.checkEmpty(inputData[field]));

      if (!utility.checkEmpty(missingFields)) {
        return utility.sendError(res, req, null, `Missing fields: ${missingFields.join(', ')}`, 400);
      }

      const findPermission = await PermissionRepo.findByKey(inputData.permission_Key);
      if (!utility.checkEmpty(findPermission)) {
        return utility.sendError(res, req, null, 'Permission already exists', 400);
      }

      const obj = {};
      obj.permission_Key = inputData.permission_Key;
      obj.permission_is_System = inputData.permission_is_System || null;
      obj.permission_Action = inputData.permission_Action || null;
      obj.permission_Description = inputData.permission_Description || null;

      const permissionId = await PermissionRepo.create(obj);

      await logRbacAudit({
        action_type: 'PERMISSION_CREATE',
        permission_Id: permissionId,
        permission_Name: inputData.permission_Key,
        user_Id: userData.user_Id,
        user_Name: userData.full_name,
        remarks: 'Permission created',
        now,
      });

      return utility.sendSuccess(res, req, null, 'Permission created successfully', 200);
    } catch (error) {
      console.log('createPermission error:', error);
      return utility.sendError(res, req, null, 'Failed to create permission', 500);
    }
  },
];

exports.updatePermission = [
  async (req, res) => {
    try {
      const inputData = req.body.inputData;
      let userData = req.locals.userData;
      let now = req.locals.now;

      const allowedFields = ['permission_Id'];

      const missingFields = allowedFields.filter((field) => utility.checkEmpty(inputData[field]));

      if (!utility.checkEmpty(missingFields)) {
        return utility.sendError(res, req, null, `Missing fields: ${missingFields.join(', ')}`, 400);
      }

      const permissionId = inputData.permission_Id;

      const findPermission = await PermissionRepo.getById(permissionId);
      if (utility.checkEmpty(findPermission)) {
        return utility.sendError(res, req, null, 'Permission Not found', 400);
      }

      let obj = {};

      if (utility.isset(inputData, 'permission_Key')) {
        obj.permission_Key = inputData.permission_Key;
      }

      if (utility.isset(inputData, 'permission_is_System')) {
        obj.permission_is_System = inputData.permission_is_System;
      }

      if (utility.isset(inputData, 'permission_Action')) {
        obj.permission_Action = inputData.permission_Action;
      }

      if (utility.isset(inputData, 'permission_Description')) {
        obj.permission_Description = inputData.permission_Description;
      }

      await PermissionRepo.update(permissionId, obj);

      await logRbacAudit({
        action_type: 'PERMISSION_UPDATE',
        permission_Id: permissionId,
        permission_Name: findPermission.permission_Key,
        previous_Permission_Name: findPermission.permission_Key,
        user_Id: userData.user_Id,
        user_Name: userData.full_name,
        remarks: 'Permission updated',
        now,
      });

      return utility.sendSuccess(res, req, null, 'Permission updated successfully', 200);
    } catch (error) {
      console.log('updatePermission error:', error);
      return utility.sendError(res, req, null, 'Failed to update permission', 500);
    }
  },
];

exports.deletePermission = [
  async (req, res) => {
    try {
      const inputData = req.body.inputData;
      let now = req.locals.now;
      let userData = req.locals.userData;

      if (utility.checkEmpty(inputData) || utility.checkEmpty(inputData.permission_Id)) {
        return utility.sendError(res, req, null, 'permission_Id is required', 400);
      }
      const permissionId = inputData.permission_Id;

      const findPermission = await PermissionRepo.getById(permissionId);
      if (utility.checkEmpty(findPermission)) {
        return utility.sendError(res, req, null, 'Permission Not found', 400);
      }

      await PermissionRepo.softDelete(permissionId);

      await logRbacAudit({
        action_type: 'PERMISSION_DELETE',
        permission_Id: permissionId,
        permission_Name: findPermission.permission_Key,
        user_Id: userData.user_Id,
        user_Name: userData.full_name,
        remarks: 'Permission deleted',
        now,
      });

      return utility.sendSuccess(res, req, null, 'Permission deleted successfully', 200);
    } catch (error) {
      console.log('deletePermission error:', error);
      return utility.sendError(res, req, null, 'Failed to delete permission', 500);
    }
  },
];

exports.getPermissionById = [
  async (req, res) => {
    try {
      const inputData = req.body.inputData;

      if (utility.checkEmpty(inputData) || utility.checkEmpty(inputData.permission_Id)) {
        return utility.sendError(res, req, null, 'permission_Id is required', 400);
      }
      const permissionId = inputData.permission_Id;

      const permission = await PermissionRepo.getById(permissionId);
      if (utility.checkEmpty(permission)) {
        return utility.sendError(res, req, null, 'Permission not found', 404);
      }

      return utility.sendSuccess(res, req, permission, 'Permission fetched successfully', 200);
    } catch (error) {
      console.log('getPermissionById error:', error);
      return utility.sendError(res, req, null, 'Failed to fetch permission', 500);
    }
  },
];

exports.getAllPermissions = [
  async (req, res) => {
    try {
      const input = req.body.inputData || {};
      const filter = input.filter || {};
      const pagination = input.pagination || {};

      const page = !utility.checkEmpty(pagination.page) ? Number(pagination.page) : 1;
      const limit = !utility.checkEmpty(pagination.limit) ? Number(pagination.limit) : 10;
      const offset = (page - 1) * limit;

      const allowedFilters = ['permission_Key', 'permission_Resource', 'permission_Action'];

      const where = {};
      for (const key of allowedFilters) {
        if (!utility.checkEmpty(filter[key])) {
          where[key] = filter[key];
        }
      }

      const permissions = await PermissionRepo.getAll(where, limit, offset);
      const total = await PermissionRepo.count(where);

      return utility.sendSuccess(res, req, permissions, 'Permissions fetched successfully', 200, {
        page,
        limit,
        total,
      });
    } catch (error) {
      console.log('getAllPermissions error:', error);
      return utility.sendError(res, req, null, 'Failed to fetch permissions', 500);
    }
  },
];

exports.updatePermissionStatus = [
  async (req, res) => {
    try {
      const inputData = req.body.inputData;
      let now = req.locals.now;
      let userData = req.locals.userData;

      if (utility.checkEmpty(inputData)) {
        return utility.sendError(res, req, null, 'Input data is required', 400);
      }

      const requiredFields = ['is_active', 'permission_Id'];
      const missingFields = requiredFields.filter((field) => utility.checkEmpty(inputData[field]));

      if (!utility.checkEmpty(missingFields)) {
        return utility.sendError(res, req, null, `Missing fields: ${missingFields.join(', ')}`, 400);
      }

      let permissionId = inputData.permission_Id;
      const findPermission = await PermissionRepo.getById(permissionId);
      if (utility.checkEmpty(findPermission)) {
        return utility.sendError(res, req, null, 'Permission Not found', 400);
      }

      await PermissionRepo.update(inputData.permission_Id, { is_active: inputData.is_active });

      await logRbacAudit({
        action_type: inputData.is_active ? 'PERMISSION_ACTIVATE' : 'PERMISSION_DEACTIVATE',
        permission_Id: findPermission.permission_Id,
        permission_Name: findPermission.permission_Key,
        user_Id: userData.user_Id,
        user_Name: userData.full_name,
        remarks: `Permission ${inputData.is_active ? 'activated' : 'deactivated'}`,
        now,
      });

      return utility.sendSuccess(res, req, null, 'Permission status updated', 200);
    } catch (error) {
      console.log('updatePermissionStatus error:', error);
      return utility.sendError(res, req, null, 'Failed to update permission status', 500);
    }
  },
];

exports.getModuleWisePermission = async (req, res) => {
  try {
    const permissions = await PermissionRepo.getAll();

    if (!Array.isArray(permissions) || permissions.length === 0) {
      if (req.subQuery) return [];
      return utility.sendSuccess(res, req, [], 'Permissions fetched successfully');
    }

    const IGNORE_MODULES = new Set(['designation', 'permission']);

    const moduleMap = {};
    let wildcardPerm = null;

    const normalizeKey = (k) => String(k || '').trim();

    const normalizeAction = (a) => {
      const act = String(a || '')
        .trim()
        .toLowerCase();
      if (!act) return '';
      if (act === 'update') return 'edit';
      return act;
    };

    // build action key (ensures nothing gets overwritten for keys like event.approval.manager)
    const buildActionKeyFromPermissionKey = (key) => {
      const parts = String(key || '')
        .split('.')
        .map((p) => String(p || '').trim())
        .filter(Boolean);

      if (!parts.length) return { moduleName: '', actionKey: '' };

      const moduleName = parts[0];
      if (!moduleName) return { moduleName: '', actionKey: '' };

      // 2 parts => normal: contact.create => create
      if (parts.length === 2) {
        return { moduleName, actionKey: normalizeAction(parts[1]) };
      }

      // 3+ parts => flatten: event.approval.manager => approval_manager
      // user.auth.read => auth_read
      const mid = parts.slice(1, -1).join('_');
      const last = parts[parts.length - 1];
      const actionKey = normalizeAction(`${mid}_${last}`);

      return { moduleName, actionKey };
    };

    for (const perm of permissions) {
      const rawKey = perm.permission_Key ?? perm.permission_key ?? '';
      const key = normalizeKey(rawKey);
      if (!key) continue;

      // wildcard
      if (key === '*') {
        wildcardPerm = {
          module: 'wildcard',
          all: {
            value: true,
            id: perm.permission_Id ?? perm.permission_id,
            key: '*',
          },
        };
        continue;
      }

      const { moduleName, actionKey } = buildActionKeyFromPermissionKey(key);
      if (!moduleName || !actionKey) continue;

      // ignore only these modules
      if (IGNORE_MODULES.has(moduleName)) continue;

      if (!moduleMap[moduleName]) moduleMap[moduleName] = {};

      moduleMap[moduleName][actionKey] = {
        value: false,
        id: perm.permission_Id ?? perm.permission_id,
        key,
      };
    }

    // preferred ordering (everything else goes after)
    const ORDER = ['list', 'create', 'edit', 'delete', 'all'];

    const result = Object.keys(moduleMap)
      .sort((a, b) => a.localeCompare(b))
      .map((moduleName) => {
        const actions = moduleMap[moduleName];
        const obj = { module: moduleName };

        // ordered keys first
        for (const k of ORDER) {
          if (actions[k]) obj[k] = actions[k];
        }

        // extras after (sorted for stable output)
        Object.keys(actions)
          .filter((k) => !ORDER.includes(k))
          .sort((a, b) => a.localeCompare(b))
          .forEach((k) => {
            obj[k] = actions[k];
          });

        return obj;
      });

    // wildcard at top
    if (wildcardPerm) result.unshift(wildcardPerm);

    if (req.subQuery) return result;

    return utility.sendSuccess(res, req, result, 'Permissions fetched successfully');
  } catch (error) {
    console.error(error);
    return utility.sendError(res, req, null, 'Failed to fetch permission', 500);
  }
};

// exports.getModuleWisePermission = async (req, res) => {
//   try {
//     const permissions = await PermissionRepo.getAll();

//     if (!Array.isArray(permissions) || permissions.length === 0) {
//       return utility.sendSuccess(res, req, [], 'Permissions fetched successfully');
//     }

//     const IGNORE_MODULES = new Set(['designation', 'permission']);

//     const moduleMap = {};
//     let wildcardPerm = null; // store "*" permission if found

//     for (const perm of permissions) {
//       const key = perm.permission_Key || perm.permission_key || '';
//       if (!key || typeof key !== 'string') continue;

//       // ---------------- WILDCARD ----------------
//       if (key.trim() === '*') {
//         wildcardPerm = {
//           module: 'wildcard',
//           all: {
//             value: true, // present => true
//             id: perm.permission_Id || perm.permission_id,
//             key: '*',
//           },
//         };
//         continue;
//       }
//       // ------------------------------------------

//       const parts = key.split('.');
//       const moduleName = (parts[0] || '').trim();
//       let action = (parts[1] || perm.permission_Action || '').trim().toLowerCase();

//       if (!moduleName || !action) continue;
//       // console.log('moduleName: ', moduleName);

//       // ignore module
//       if (IGNORE_MODULES.has(moduleName)) continue;

//       // rename update -> edit
//       if (action === 'update') action = 'edit';

//       if (!moduleMap[moduleName]) {
//         moduleMap[moduleName] = {};
//       }

//       moduleMap[moduleName][action] = {
//         value: false,
//         id: perm.permission_Id || perm.permission_id,
//         key: key,
//       };
//     }

//     // Desired order
//     const ORDER = ['list', 'create', 'edit', 'delete', 'all'];

//     const result = Object.keys(moduleMap)
//       .sort((a, b) => a.localeCompare(b))
//       .map((moduleName) => {
//         const actions = moduleMap[moduleName];

//         const obj = { module: moduleName };

//         // put ordered keys first
//         for (const k of ORDER) {
//           if (actions[k]) obj[k] = actions[k];
//         }

//         // append extras after
//         for (const k of Object.keys(actions)) {
//           if (ORDER.includes(k)) continue;
//           obj[k] = actions[k];
//         }

//         return obj;
//       });

//     // Add wildcard module at the top (if present)
//     if (wildcardPerm) {
//       result.unshift(wildcardPerm);
//     }

//     if (req.subQuery) {
//       return result;
//     }

//     return utility.sendSuccess(res, req, result, 'Permissions fetched successfully');
//   } catch (error) {
//     console.error(error);
//     return utility.sendError(res, req, null, 'Failed to fetch permission', 500);
//   }
// };

exports.getModuleWisePErmissionForEdit = async (req, res) => {
  const roleId = req.body?.inputData?.role_Id;

  if (utility.checkEmpty(roleId)) {
    return utility.sendError(res, req, null, 'role_Id is required', 400);
  }

  const IGNORE_MODULES = new Set(['designation', 'permission']);

  try {
    const rolePermissions = await RolePermissionRepo.getPermissionIdsByRoleId(roleId);
    const permissionIds = utility.objToPluckArr(rolePermissions, 'role_permission_Permission_Id');

    let selectedPermissionKeys = [];
    if (!utility.checkEmpty(permissionIds)) {
      const permissions = await PermissionRepo.findByIds(permissionIds);
      selectedPermissionKeys = utility.objToPluckArr(permissions, 'permission_Key');
    }

    const selectedPermissionSet = new Set(selectedPermissionKeys);

    req.subQuery = true;
    const base = await exports.getModuleWisePermission(req, res); // includes wildcard module if "*" exists in DB master list
    delete req.subQuery;

    if (!Array.isArray(base)) {
      return base;
    }

    const filteredBase = base.filter((moduleObj) => !IGNORE_MODULES.has(moduleObj.module));

    const data = base.map((moduleObj) => {
      const moduleName = moduleObj.module;
      const out = { ...moduleObj };

      for (const actionKey of Object.keys(out)) {
        if (actionKey === 'module') continue;
        if (!out[actionKey] || typeof out[actionKey] !== 'object') continue;

        const permKey = out[actionKey].key || `${moduleName}.${actionKey}`; // fallback keeps old mapping behavior

        out[actionKey] = {
          ...out[actionKey],
          value: selectedPermissionSet.has(permKey),
        };
      }

      return out;
    });

    return utility.sendSuccess(res, req, data, 'Permissions fetched successfully');
  } catch (error) {
    console.error(error);
    return utility.sendError(res, req, null, 'Failed to fetch permission', 500);
  }
};

const getModuleCandidates = (moduleName = '') => {
  const normalized = String(moduleName || '')
    .trim()
    .toLowerCase();

  if (!normalized) return [];

  const candidates = new Set([normalized]);

  if (normalized.endsWith('ies') && normalized.length > 3) {
    candidates.add(`${normalized.slice(0, -3)}y`);
  }
  if (normalized.endsWith('es') && normalized.length > 2) {
    candidates.add(normalized.slice(0, -2));
  }
  if (normalized.endsWith('s') && normalized.length > 1) {
    candidates.add(normalized.slice(0, -1));
  }

  return [...candidates];
};

exports.getSectionWisePermissions = async (req, res) => {
  try {
    const inputData = req.body?.inputData || {};
    const moduleName = inputData.module;

    if (utility.checkEmpty(moduleName)) {
      return utility.sendError(res, req, null, 'module is required', 400);
    }

    const userData = req.locals?.userData || {};
    const userPermissions = Array.isArray(userData.permissions) ? userData.permissions : [];

    const output = {
      list: false,
      create: false,
      update: false,
      modify: false,
      delete: false,
      status: false,
      auth: false,
      getById: false,
      all: false,
    };

    if (userPermissions.includes('*')) {
      output.list = true;
      output.create = true;
      output.update = true;
      output.modify = true;
      output.delete = true;
      output.status = true;
      output.auth = true;
      output.getById = true;
      output.all = true;
      return utility.sendSuccess(res, req, output, 'Section wise permissions fetched successfully');
    }

    const permissionSet = new Set(
      userPermissions
        .map((p) =>
          String(p || '')
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean),
    );

    const moduleCandidates = getModuleCandidates(moduleName);
    if (moduleCandidates.length === 0) {
      return utility.sendSuccess(res, req, output, 'Section wise permissions fetched successfully');
    }

    const hasAny = (actions = []) => {
      for (const moduleCandidate of moduleCandidates) {
        if (permissionSet.has(`${moduleCandidate}.all`)) {
          return true;
        }
        for (const action of actions) {
          if (permissionSet.has(`${moduleCandidate}.${action}`)) {
            return true;
          }
        }
      }
      return false;
    };

    output.list = hasAny(['list', 'view']);
    output.create = hasAny(['create', 'add']);
    output.update = hasAny(['update', 'edit']);
    output.modify = hasAny(['modify', 'delete', 'status.update']);
    output.delete = hasAny(['delete']);
    output.status = hasAny(['status.update', 'status']);
    output.auth = hasAny(['auth.update', 'auth']);
    output.getById = hasAny(['read']);
    output.all = hasAny(['all']);

    return utility.sendSuccess(res, req, output, 'Section wise permissions fetched successfully');
  } catch (error) {
    console.error(error);
    return utility.sendError(res, req, null, 'Failed to fetch section wise permissions', 500);
  }
};

const PUBLIC_URL = process.env.PUBLIC_URL || '';
const withPublicUrl = (path) => `${PUBLIC_URL}${path}`;
const EVENT_APPROVAL_PERMISSION_KEYS = Object.freeze({
  MANAGER: 'event.approval.manager',
  ADMIN: 'event.approval.admin',
  ALL: 'event.all',
  WILDCARD: '*',
});
const EVENT_APPROVAL_PENDING_STATUS = Object.freeze({
  DRAFT: 'draft',
  MANAGER: 'active',
  ADMIN: 'under-review-by-manager',
});

const normalizePermissionKey = (value) =>
  utility.normalizeText(value, {
    trim: true,
    lowercase: true,
  });

const getEventApprovalStatusesForSidebar = (permissions = []) => {
  const normalizedPermissionSet = new Set(
    (Array.isArray(permissions) ? permissions : [])
      .map((permission) => normalizePermissionKey(permission))
      .filter(Boolean),
  );

  const hasWildcardPermission = normalizedPermissionSet.has(EVENT_APPROVAL_PERMISSION_KEYS.WILDCARD);
  const hasEventAllPermission = normalizedPermissionSet.has(EVENT_APPROVAL_PERMISSION_KEYS.ALL);

  const hasManagerApprovalPermission =
    hasWildcardPermission ||
    hasEventAllPermission ||
    normalizedPermissionSet.has(EVENT_APPROVAL_PERMISSION_KEYS.MANAGER);

  const hasAdminApprovalPermission =
    hasWildcardPermission || hasEventAllPermission || normalizedPermissionSet.has(EVENT_APPROVAL_PERMISSION_KEYS.ADMIN);

  // Sidebar count should include draft + active for approval-enabled users.
  const statusList = [];

  if (hasManagerApprovalPermission || hasAdminApprovalPermission) {
    statusList.push(EVENT_APPROVAL_PENDING_STATUS.DRAFT);
    statusList.push(EVENT_APPROVAL_PENDING_STATUS.MANAGER);
  }

  if (hasAdminApprovalPermission) {
    statusList.push(EVENT_APPROVAL_PENDING_STATUS.ADMIN);
  }

  return [...new Set(statusList)];
};

const SIDE_NAV_SOURCE = [
  {
    Items: [
      {
        path: withPublicUrl('/dashboard'),
        iconName: 'dashboard',
        type: 'link',
        selected: false,
        active: false,
        title: 'Dashboard',
        allow: { always: true },
      },
    ],
  },
  // {
  //   Items: [
  //     {
  //       path: withPublicUrl('/family-group'),
  //       iconName: 'family',
  //       type: 'link',
  //       selected: false,
  //       active: false,
  //       title: 'Family Group',
  //       allow: { modulesAny: ['family'] },
  //     },
  //   ],
  // },
  {
    Items: [
      {
        path: withPublicUrl('/contacts'),
        iconName: 'contacts',
        type: 'link',
        selected: false,
        active: false,
        title: 'Contacts',
        allow: { modulesAny: ['contact'] },
      },
    ],
  },
  {
    Items: [
      {
        path: withPublicUrl('/import-contacts'),
        alternatePath: [withPublicUrl('/import-contacts'), withPublicUrl('/import/list')],
        iconName: 'import',
        type: 'link',
        selected: false,
        active: false,
        title: 'Import',
        allow: {
          modulesAny: ['contact'],
          permissionsAll: ['contact.create'],
        },
      },
    ],
  },
  {
    Items: [
      {
        title: 'Event Management',
        iconName: 'events',
        type: 'sub',
        selected: false,
        active: false,
        children: [
          {
            path: withPublicUrl('/event-management'),
            iconName: 'events',
            type: 'link',
            selected: false,
            active: false,
            title: 'Events',
            allow: { modulesAny: ['event'] },
          },
          {
            path: withPublicUrl('/event-approvals'),
            iconName: 'eventApproval',
            badge: 'nav-badge sidebar-count-badge',
            badgetxt: '00',
            type: 'link',
            selected: false,
            active: false,
            title: 'Event Approvals',
            allow: { modulesAny: ['event'] },
          },
        ],
        allow: { modulesAny: ['event'] },
      },
    ],
  },
  {
    Items: [
      {
        path: withPublicUrl('/print-approvals'),
        iconName: 'printApproval',
        badge: 'nav-badge sidebar-count-badge',
        badgetxt: '00',
        type: 'link',
        selected: false,
        active: false,
        title: 'Print Approvals',
        allow: { modulesAny: ['printapproval'] },
      },
    ],
  },
  // {
  //   Items: [
  //     {
  //       path: withPublicUrl('/reports'),
  //       iconName: 'reports',
  //       type: 'link',
  //       selected: false,
  //       active: false,
  //       title: 'Reports',
  //       allow: { modulesAny: ['report'] },
  //     },
  //   ],
  // },
  {
    Items: [
      {
        path: withPublicUrl('/audit-logs'),
        iconName: 'auditLogs',
        type: 'link',
        selected: false,
        active: false,
        title: 'Audit Logs',
        allow: { modulesAny: ['report'] },
      },
    ],
  },
  {
    Items: [
      {
        path: withPublicUrl('/tags'),
        iconName: 'tags',
        type: 'link',
        selected: false,
        active: false,
        title: 'Tags',
        allow: { modulesAny: ['tag'] },
      },
    ],
  },
  {
    Items: [
      {
        title: 'User Management',
        iconName: 'userManagement',
        type: 'sub',
        selected: false,
        active: false,
        children: [
          {
            path: withPublicUrl('/user'),
            type: 'link',
            selected: false,
            active: false,
            title: 'User',
            allow: { modulesAny: ['user'] },
          },
          {
            path: withPublicUrl('/user/role'),
            type: 'link',
            selected: false,
            active: false,
            title: 'Role',
            allow: { modulesAny: ['role'] },
          },
        ],
        allow: { modulesAny: ['user', 'role'] },
      },
    ],
  },
];

const getModulesFromPermissions = (permissions = []) => {
  const set = new Set();
  for (const p of permissions) {
    if (!p || typeof p !== 'string') continue;
    if (p.trim() === '*') continue;
    const mod = p.split('.')[0]?.trim();
    if (mod) set.add(mod);
  }
  return set;
};

const isAllowed = (allow, ctx) => {
  if (!allow) return true; // no rule = allow (you can flip this to false if you want)
  if (allow.always) return true;
  if (ctx.hasWildcard) return true;

  // modulesAny: user must have ANY of these modules
  if (Array.isArray(allow.modulesAny) && allow.modulesAny.length > 0) {
    const ok = allow.modulesAny.some((m) => ctx.modules.has(m));
    if (!ok) return false;
  }

  // permissionsAll: user must have ALL these permissions
  if (Array.isArray(allow.permissionsAll) && allow.permissionsAll.length > 0) {
    const ok = allow.permissionsAll.every((perm) => ctx.permissionsSet.has(perm));
    if (!ok) return false;
  }

  return true;
};

const stripAllowRules = (sections = []) => {
  return (sections || []).map((section) => ({
    ...section,
    Items: (section.Items || []).map((item) => {
      const { allow, ...itemWithoutAllow } = item;
      if (item.type !== 'sub') {
        return itemWithoutAllow;
      }

      return {
        ...itemWithoutAllow,
        children: (item.children || []).map((child) => {
          const { allow: childAllow, ...childWithoutAllow } = child;
          return childWithoutAllow;
        }),
      };
    }),
  }));
};

const buildSidebarForUser = ({ permissions = [] }) => {
  const hasWildcard = permissions.includes('*');
  const modules = getModulesFromPermissions(permissions);
  const permissionsSet = new Set(permissions);

  const ctx = { hasWildcard, modules, permissionsSet };

  // If wildcard, return full (no filtering) BUT still remove allow rules if you want
  if (hasWildcard) {
    return stripAllowRules(SIDE_NAV_SOURCE);
  }

  const filtered = [];

  for (const section of SIDE_NAV_SOURCE) {
    const newSection = { ...section };
    const items = [];

    for (const item of section.Items || []) {
      // Submenu
      if (item.type === 'sub') {
        const children = (item.children || []).filter((ch) => isAllowed(ch.allow, ctx));

        // show submenu if it has at least 1 visible child.
        // Parent allow rules are decorative/grouping only; child rules enforce access.
        if (children.length > 0) {
          items.push({ ...item, children });
        }
        continue;
      }

      // Normal link
      if (isAllowed(item.allow, ctx)) {
        items.push(item);
      }
    }

    if (items.length > 0) {
      newSection.Items = items;
      filtered.push(newSection);
    }
  }

  return stripAllowRules(filtered);
};

exports.getSideNavPermissions = async (req, res) => {
  try {
    const userData = req.locals?.userData || {};
    const permissions = Array.isArray(userData.permissions) ? userData.permissions : [];

    const sidebar = buildSidebarForUser({ permissions });

    const eventApprovalStatuses = getEventApprovalStatusesForSidebar(permissions);
    let eventApprovalSidebarCount = 0;
    if (!utility.checkEmpty(eventApprovalStatuses)) {
      const mainEvents = await EventRepo.getAllWithFilter({
        event_parent_Id: 0,
        event_Is_Sent_For_Approval: 1,
        status:
          eventApprovalStatuses.length === 1
            ? eventApprovalStatuses[0]
            : {
                op: 'in',
                value: eventApprovalStatuses,
              },
      });
      const rootIds = (mainEvents || [])
        .map((row) => Number(row?.event_Id || 0))
        .filter((id) => Number.isFinite(id) && id > 0);

      if (rootIds.length > 0) {
        const childRows = await EventRepo.getAllWithFilter({
          event_parent_Id: [...new Set(rootIds)],
        });
        const childrenByRoot = {};
        for (const child of childRows || []) {
          const parentId = Number(child?.event_parent_Id || 0);
          if (!parentId) continue;
          if (!childrenByRoot[parentId]) childrenByRoot[parentId] = [];
          childrenByRoot[parentId].push(child);
        }

        for (const root of mainEvents || []) {
          const rootId = Number(root?.event_Id || 0);
          if (!rootId) continue;
          const familyRows = [root, ...(childrenByRoot[rootId] || [])];
          if (familyRows.some((row) => isEventRowRejected(row))) {
            continue;
          }
          eventApprovalSidebarCount += 1;
        }
      }
    }

    let printApprovalSidebarCount = 0;
    try {
      const pendingParents = await EventRepo.getAllWithFilter({
        event_parent_Id: 0,
        print_approval_status: 'pending',
      });
      const rootIds = (pendingParents || [])
        .map((row) => Number(row?.event_Id || 0))
        .filter((id) => Number.isFinite(id) && id > 0);

      if (rootIds.length > 0) {
        const childRows = await EventRepo.getAllWithFilter({
          event_parent_Id: [...new Set(rootIds)],
        });
        const childrenByRoot = {};
        for (const child of childRows || []) {
          const parentId = Number(child?.event_parent_Id || 0);
          if (!parentId) continue;
          if (!childrenByRoot[parentId]) childrenByRoot[parentId] = [];
          childrenByRoot[parentId].push(child);
        }

        for (const root of pendingParents || []) {
          const rootId = Number(root?.event_Id || 0);
          if (!rootId) continue;
          const familyRows = [root, ...(childrenByRoot[rootId] || [])];
          if (familyRows.length === 0) continue;
          const isFullyApproved = familyRows.every((row) => isEventRowAdminApproved(row));
          if (isFullyApproved) {
            printApprovalSidebarCount += 1;
          }
        }
      }
    } catch (error) {
      if (!isMissingPrintApprovalStatusColumnError(error)) {
        throw error;
      }
      printApprovalSidebarCount = 0;
    }

    const applySidebarBadges = (items = []) => {
      (items || []).forEach((item) => {
        const itemPath = utility.normalizeText(item?.path, { trim: true, lowercase: true });
        if (itemPath && itemPath.endsWith('/event-approvals')) {
          item.badge = 'nav-badge sidebar-count-badge';
          item.badgetxt = String(eventApprovalSidebarCount).padStart(2, '0');
        }

        if (itemPath && itemPath.endsWith('/print-approvals')) {
          item.badge = 'nav-badge sidebar-count-badge';
          item.badgetxt = String(printApprovalSidebarCount).padStart(2, '0');
        }

        if (Array.isArray(item?.children) && item.children.length > 0) {
          applySidebarBadges(item.children);
        }
      });
    };

    sidebar.forEach((section) => {
      applySidebarBadges(section?.Items || []);
    });

    return utility.sendSuccess(res, req, sidebar, 'Sidebar fetched successfully');
  } catch (error) {
    console.error(error);
    return utility.sendError(res, req, null, 'Failed to fetch sidebar', 500);
  }
};
