var express = require('express');
var app = express();

const PermissionController = require('../controllers/PermissionController.js');

const authMiddleware = require('../middlewares/authMiddleware.js');
const roleAccessMiddleware = require('../middlewares/roleAccessMiddleware.js');

app.use(authMiddleware);

app.use('/add', roleAccessMiddleware(['permission.create']), PermissionController.createPermission);

app.use('/update', roleAccessMiddleware(['permission.update']), PermissionController.updatePermission);

app.use('/delete', roleAccessMiddleware(['permission.delete']), PermissionController.deletePermission);

app.use('/get-by-id', roleAccessMiddleware(['permission.read']), PermissionController.getPermissionById);

app.use('/list', roleAccessMiddleware(['permission.list']), PermissionController.getAllPermissions);

app.use(
  '/status-update',
  roleAccessMiddleware({ anyOf: ['permission.status.update', 'permission.update'] }),
  PermissionController.updatePermissionStatus,
);

app.use('/module-wise-permission', PermissionController.getModuleWisePermission);

app.use('/module-wise-permission-for-edit', PermissionController.getModuleWisePErmissionForEdit);

app.use('/get-section-wise-permissions', PermissionController.getSectionWisePermissions);

app.use('/side-menu', PermissionController.getSideNavPermissions);

module.exports = app;

// laravel grouping - dependency solve
