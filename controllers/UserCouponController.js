"use strict";
const Validator = require("validatorjs");
const apiResponse = require("../vars/apiResponse.js");
const constants = require("../vars/constants.js");
const utility = require("../helpers/utility.js");
const methods = require("../helpers/methods");
const _ = require("underscore");
const _s = require("underscore.string");
const dbquery = require("../helpers/query");
const dbcon = require("../config/mysqlClient");
const { sendSuccess, sendError } = require("../helpers/sendResponse.js");
const ScratchCardRepository = require("../repositories/ScratchCardRepository.js");

const UserCouponController = exports;

function getTokenFromHeader(req) {
  return req.headers["kl-token"];
}

const scratchcard_status = {
  pending: "pending",
  sent: "sent",
  opend: "opened",
  verified: "verified",
  scratched: "scratched",
};

const scratchcard_scratchStatus = {
  not_scratched: "not_scratched",
  scratched: "scratched",
};

exports.getCouponstatus = async function (req, res) {
  try {
    const { token = "" } = req.params;

    const scratchCard = await ScratchCardRepository.getScratchCardFromToken(
      token
    );
    if (!scratchCard) {
      return apiResponse.ErrorResponse(
        res,
        "No scratch card found on this token!"
      );
    }

    await ScratchCardRepository.update(scratchCard.scratchcard_Id, {
      scratchcard_Status: scratchcard_status.opend,
    });

    const scratchCardStatus = scratchCard?.scratchcard_ScratchStatus ?? "";
    return await sendSuccess(
      res,
      req,
      scratchCardStatus,
      "Scratch card found successfully!"
    );
  } catch (error) {
    console.error(error);
    return await sendError(res, req, error);
  }
};

exports.verifyPhoneNumber = async function (req, res) {
  try {
    const token = getTokenFromHeader(req);
    const { phoneNumber } = req.body?.inputData;

    if (!phoneNumber) {
      return apiResponse.ErrorResponse(res, "Phone Number is required");
    }

    const scratchCard = await ScratchCardRepository.getScratchCardFromToken(
      token
    );
    if (!scratchCard) {
      return apiResponse.ErrorResponse(
        res,
        "No scratch card found on this token!"
      );
    }

    if (
      phoneNumber.trim() !== String(scratchCard.scratchcard_Mobile ?? "").trim()
    ) {
      return apiResponse.ErrorResponse(
        res,
        "Phone number does not match. Please verify using the number you registered with."
      );
    }

    await ScratchCardRepository.update(scratchCard.scratchcard_Id, {
      scratchcard_Status: scratchcard_status.verified,
    });

    return await sendSuccess(res, req, "Phone number verified");
  } catch (error) {
    console.error(error);
    return await sendError(res, req, error);
  }
};

exports.scratchNow = async function (req, res) {
  try {
    const token = getTokenFromHeader(req);

    const scratchCard = await ScratchCardRepository.getScratchCardFromToken(
      token
    );
    if (!scratchCard) {
      return apiResponse.ErrorResponse(
        res,
        "No scratch card found on this token!"
      );
    }

    if (
      scratchCard.scratchcard_ScratchStatus == scratchcard_scratchStatus.scratched
    ) {
      return apiResponse.ErrorResponse(
        res,
        "The given scratch card is already used!"
      );
    }

    
    return await sendSuccess(res, req, {
      gift: "yay! you won something!",
      giftImage:  "https://imgcdn.kuick.com/cms-designer/redoq/gift-iron.png",
      orderNumber: "KD1234567890",
      scratchCard,
    });
  } catch (error) {
    console.error(error);
    return await sendError(res, req, error);
  }
};

exports.markAsScratched = async function (req, res) {
  try {
    let now = req.locals.now;
    const token = getTokenFromHeader(req);

    const scratchCard = await ScratchCardRepository.getScratchCardFromToken(
      token
    );
    if (!scratchCard) {
      return apiResponse.ErrorResponse(
        res,
        "No scratch card found on this token!"
      );
    }


    const hasUpdated = await ScratchCardRepository.update(
      scratchCard.scratchcard_Id,
      {
        scratchcard_ScratchStatus: scratchcard_scratchStatus.scratched,
        scratchcard_Status: scratchcard_status.scratched,
        scratchcard_ScratchAt: now,
      }
    );

    if (!hasUpdated) {
      return apiResponse.ErrorResponse(
        res,
        "scratch card has not been marked as scratched"
      );
    }

    return await sendSuccess(res, req, "Marked as scratched");
  } catch (error) {
    console.error(error);
    return await sendError(res, req, error);
  }
};

exports.addScratchCard = async function (req, res) {
  const { phoneNumber } = req.body.inputData;

  const amount = 100;

  const scratchCard = await ScratchCardRepository.upsertScratchcard(
    phoneNumber,
    amount
  );

  return await sendSuccess(res, req, scratchCard, "Marked as scratched");
};
