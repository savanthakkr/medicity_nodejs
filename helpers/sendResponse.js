const SendResponse = exports;

const utility = require("./utility.js");
const apiResponse = require("../vars/apiResponse.js");

async function sendSuccess(res, req, data, message = "Success") {
  const result = {
    status: "success",
    msg: message,
    data,
  };
  return await utility.successApiResponse(req, res, result);
}

async function sendError(res, req, error, message = "An unexpected error occurred.") {
  console.error("Error:", error);
  const result = {
    status: "error",
    msg: message,
    error: error?.message || error,
  };
  return await apiResponse.ErrorResponse(res, result.error);
}

module.exports = { sendSuccess, sendError };
