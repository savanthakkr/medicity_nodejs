var express = require('express');
var app = express();

const RoleController = require('../controllers/RoleController.js');
const authMiddleware = require('../middlewares/authMiddleware.js');
const roleAccessMiddleware = require('../middlewares/roleAccessMiddleware.js');

app.use(authMiddleware);

app.use('/add', roleAccessMiddleware({ anyOf: ['role.create', 'role.all'] }), RoleController.createRole);
app.use('/update', roleAccessMiddleware({ anyOf: ['role.update', 'role.all'] }), RoleController.updateRole);
app.use('/delete', roleAccessMiddleware({ anyOf: ['role.delete', 'role.all'] }), RoleController.deleteRole);
app.use(
  '/delete-preview',
  roleAccessMiddleware({ anyOf: ['role.delete', 'role.read', 'role.all'] }),
  RoleController.getRoleDeletePreview,
);
app.use('/get-by-id', roleAccessMiddleware({ anyOf: ['role.read', 'role.all'] }), RoleController.getRoleById);
app.use('/list', roleAccessMiddleware({ anyOf: ['role.list', 'role.all'] }), RoleController.getAllRoles);
app.use('/search-list', RoleController.getRolesList);
app.use(
  '/permission/add',
  roleAccessMiddleware({ anyOf: ['role.permission.add', 'role.all'] }),
  RoleController.addPermissionToRole,
);
app.use(
  '/permission/remove',
  roleAccessMiddleware({ anyOf: ['role.permission.remove', 'role.all'] }),
  RoleController.removePermissionFromRole,
);
app.use(
  '/status-update',
  roleAccessMiddleware({ anyOf: ['role.status.update', 'role.all'] }),
  RoleController.updateRoleStatus,
);

module.exports = app;
