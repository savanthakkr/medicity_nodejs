"use strict";

const query = require("../helpers/query");

const {
	unauthorizedResponse
} = require("../vars/apiResponse");

module.exports = (permissionKey) => {
	return async (req, res, next) => {
		try {
			const userId = req.user.user_id;

			const permissions =
				await query.fetchUserPermissions(userId);

			const permissionKeys = permissions.map(
				item => item.access_Key
			);

			if (!permissionKeys.includes(permissionKey)) {

				return unauthorizedResponse(
					res,
					"Permission denied"
				);
			}

			next();

		} catch (error) {

			console.log(error);

			return unauthorizedResponse(
				res,
				"Unauthorized"
			);
		}
	};
};