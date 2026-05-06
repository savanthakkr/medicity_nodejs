var express = require('express');
var app = express();

const userController = require('../controllers/UserController.js');
const authController = require('../controllers/AuthController');
const authMiddleware = require('../middlewares/authMiddleware.js');
const roleAccessMiddleware = require('../middlewares/roleAccessMiddleware.js');

app.use(authMiddleware);

app.use('/add', roleAccessMiddleware({ anyOf: ['user.create', 'user.all'] }), userController.createUser);
app.use('/update', roleAccessMiddleware({ anyOf: ['user.update', 'user.all'] }), userController.updateUser);
app.use('/delete', roleAccessMiddleware({ anyOf: ['user.delete', 'user.all'] }), userController.deleteUser);
app.use('/get-by-id', roleAccessMiddleware({ anyOf: ['user.read', 'user.all'] }), userController.getUserById);
app.use('/list', roleAccessMiddleware({ anyOf: ['user.list', 'user.all'] }), userController.getAllUser);
app.use('/auth/user', userController.authUser);

app.use('/status', roleAccessMiddleware({ anyOf: ['user.status', 'user.all'] }), userController.updateUserStatus);

// app.use('/profile/update', userController.updateUserProfile);

// app.use(
//   '/:id/effective-permissions',
//   roleAccessMiddleware(['user.read.permission']),
//   userController.getUserEffectivePermissions
// );
// app.use('/change-password', roleAccessMiddleware(['user.update.password']), userController.changePassword);

module.exports = app;
