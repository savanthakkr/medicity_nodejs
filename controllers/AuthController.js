const utility = require('../helpers/utility/utility.js');
const UserRepo = require('../services/repositories/UserRepository.js');
const UserRoleRepo = require('../services/repositories/UserRoleRepository.js');
const RoleRepo = require('../services/repositories/RoleRepository.js');
const RolePermissionRepo = require('../services/repositories/RolePermissionRepository.js');
const PermissionRepo = require('../services/repositories/PermissionRepository.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.login = [
  async (req, res) => {
    try {

      const input = req.body.inputData;

      const userData = await UserRepo.findByEmail(input.user_Email);

      if (!userData) {
        return utility.sendError(res, req, null, 'Invalid email or password', 400);
      }

      const match = await bcrypt.compare(
        input.user_Password,
        userData.password_Hash
      );

      if (!match) {
        return utility.sendError(res, req, null, 'Invalid email or password', 400);
      }

      const token = utility.generateAuthToken(
        userData.user_Id,
        userData.password_Hash
      );

      return utility.sendSuccess(res, req, {
        user_Id: userData.user_Id,
        user_Name: userData.user_Name,
        user_Email: userData.user_Email,
        token
      }, 'Login successful');

    } catch (error) {
      console.log(error);
      return utility.sendError(res, req, null, 'Failed to login', 500);
    }
  },
];

// exports.login = [
//   async (req, res) => {
//     try {
//       const input = req.body.inputData;

//       if (utility.checkEmpty(input)) {
//         return utility.sendError(res, req, null, 'Input data is required', 400);
//       }

//       const requiredFields = ['user_Email', 'user_Password'];
//       const missing = requiredFields.filter((f) => utility.checkEmpty(input[f]));

//       if (!utility.checkEmpty(missing)) {
//         return utility.sendError(res, req, null, 'Missing input: ' + missing.join(', '), 400);
//       }

//       const userData = await UserRepo.findByEmail(input.user_Email);
//       if (utility.checkEmpty(userData) || userData.is_deleted === 1) {
//         return utility.sendError(res, req, null, 'Invalid email or password', 400);
//       }

//       if (userData.is_active === 0) {
//         return utility.sendError(res, req, null, 'User account is inactive', 403);
//       }

//       const match = await bcrypt.compare(input.user_Password, userData.user_Password_Hash);

//       if (!match) {
//         return utility.sendError(res, req, null, 'Invalid email or password', 400);
//       }

//       const userRoles = await UserRoleRepo.getUserRolesByUserId(userData.user_Id);

//       const roleIds = [...new Set(utility.objToPluckArr(userRoles, 'role_Id'))];
//       const roles = await RoleRepo.getByIds(roleIds);
//       const roleNames = [...new Set(utility.objToPluckArr(roles, 'role_Name'))];

//       const token = utility.generateAuthToken(userData.user_Id, userData.user_Password_Hash);

//       const data = {
//         user_Id: userData.user_Id,
//         user_Email: userData.user_Email,
//         designation_Id: userData.designation_Id,
//         user_Name: userData.user_Name,
//         role_Names: roleNames,
//         token,
//       };

//       return utility.sendSuccess(res, req, data, 'Login successful', 200);
//     } catch (error) {
//       return utility.sendError(res, req, null, 'Failed to login', 500);
//     }
//   },
// ];
