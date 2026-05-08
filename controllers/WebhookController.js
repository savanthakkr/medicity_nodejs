"use strict";
const Validator = require("validatorjs");
const apiResponse = require("../vars/apiResponse.js");
const constants = require("../vars/constants.js");
const utility = require("../helpers/utility.js");
const methods = require("../helpers/methods");
const _ = require("underscore");
const _s = require("underscore.string");
const dbquery = require("../helpers/query");
const mongoClient = require("../config/mongoClient");
const dbcon = require("../config/mysqlClient");
const { generateTokenApi } = require("../services/apiCalls.js");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

const WebhookController = exports;

const webhookstatus = {
  recived: "recived",
  failed: "failed",
  processed: "processed",
};

async function logWebhook(req, payload, status, message, source = "external") {
  const now = req.locals.now
  let params = {};
  params["webhook_log_Source"] = source;
  params["webhook_log_Payload"] = JSON.stringify(payload);
  params["webhook_log_Status"] = status;
  params["webhook_log_Message"] = message;
  params["created_at"] = now;
  await dbquery.insertSingle(constants.vals.defaultDB, "webhook_log", params);
}

async function logApi(req) {
  const now = req.locals.now
  await dbcon.query(
    constants.vals.defaultDB,
    `INSERT INTO apilog (apilog_Product, apilog_Request_Method, apilog_Ip, apilog_Request_Origin, apilog_Request_Url, apilog_Full_Url, apilog_Request_Headers, apilog_Request_Body, is_active, is_delete, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "khosla",
      req.method,
      req.ip,
      req.headers.origin || "",
      req.originalUrl,
      req.protocol + "://" + req.get("host") + req.originalUrl,
      JSON.stringify(req.headers),
      JSON.stringify(req.body),
      1,
      0,
      now,
    ]
  );
}

async function markScratchcardStatusAsSent(id) {
  if (id === undefined || id === null || id === "") {
    throw new Error("scratchcard_Id is required");
  }

  // Guarded update
  const updateSql = `
    UPDATE scratchcard
       SET scratchcard_Status = 'sent', updated_at = NOW()
     WHERE scratchcard_Id = ?
       AND is_delete = 0
       AND is_active = 1
       AND (scratchcard_Status IS NULL OR scratchcard_Status = 'pending')
     LIMIT 1
  `;
  await dbcon.query(constants.vals.defaultDB, updateSql, [id]);

  // Return the (possibly updated) row
  const selectSql = `
    SELECT *
      FROM scratchcard
     WHERE scratchcard_Id = ?
       AND is_delete = 0
       AND is_active = 1
     LIMIT 1
  `;
  const rows = await dbcon.query(constants.vals.defaultDB, selectSql, [id]);
  return rows[0] || null;
}

async function upsertScratchcard(req, mobile, amount, externalRef) {
  // Try to find existing by externalRef
  let query = "";
  let params = [];

  // If no externalRef, fallback to mobile+amount+today
  //query = `SELECT * FROM scratchcard WHERE scratchcard_Mobile = ? AND scratchcard_Amount = ? AND DATE(created_at) = CURDATE() AND is_delete = 0 LIMIT 1`;
  query = `SELECT * FROM scratchcard WHERE scratchcard_Mobile = ? AND scratchcard_Amount = ?  AND is_active = 1 and is_delete = 0 LIMIT 1`;
  params = [mobile, amount];

  const rows = await dbcon.query(constants.vals.defaultDB, query, params);
  console.log("rows", rows);
  if (rows.length > 0) return rows[0]; // Already exists

  // Insert new
  const token = uuidv4();

  let insData = await dbquery.insertSingle(
    constants.vals.defaultDB,
    "scratchcard",
    {
      scratchcard_Mobile: mobile,
      scratchcard_Amount: amount,
      scratchcard_ExternalRef: externalRef,
      scratchcard_Token: token,
    }
  );
  // Return the new row

  console.log("insData", rows, insData);

  query = `SELECT * FROM scratchcard WHERE scratchcard_Mobile = ? AND scratchcard_Amount = ?  AND is_active = 1 and is_delete = 0 LIMIT 1`;
  params = [mobile, amount];
  const newRows = await dbcon.query(constants.vals.defaultDB, query, params);

  console.log("newRows", params, newRows);
  return newRows[0];
}

async function sendSmsAndLog(mobile, text) {
  // Replace with your SMS provider details
  const smsApiUrl = "https://your-sms-api/send";
  let smsResp = null;
  let status = "queued";
  try {
    smsResp = await axios.post(smsApiUrl, {
      to: mobile,
      message: text,
    });
    status = smsResp.data && smsResp.data.success ? "sent" : "failed";
  } catch (e) {
    status = "failed";
    smsResp = { error: e.message };
  }

  await dbquery.insertSingle(constants.vals.defaultDB, "sms_log", {
    sms_log_Mobile: mobile,
    sms_log_Text: text,
    sms_log_Provider: "your-sms-provider",
    sms_log_Response: JSON.stringify(smsResp),
    sms_log_Status: status,
  });
  return status;
}

const BASE_URL =
  process.env.BW_BASE_URL || "https://sysmaco.fortiddns.com:3625";

const headers = {
  "Content-Type": "application/json",
  DealerName: "KHOSLA ELECTRONICS PVT. LTD.",
  DealerCode: "KEPL",
  PartnerName: "BlueWaves",
  PartnerCode: "BWST05430Z",
  SourceSystem: "POS",
};

// async function callTokenGenerationApi(orderNo) {
//   const header = {
//     ...headers,
//     OrderNo: orderNo,
//   };
//   const data = await utility.run_axios_api(
//     BASE_URL + "/Softtech/BlueWave/GenerateSOTokenByNumber",
//     {},
//     headers
//   );
//   return data;
// }

async function callInvoiceDataPullToken(tokenId, orderNo, authToken) {
  const url = BASE_URL + "/Softtech/BlueWave/SOPull";

  const header = {
    ...headers,
    OrderNo: orderNo,
    Authorization: "Bearer " + authToken,
  };

  const body = {
    TokenId: tokenId,
    OrderNo: orderNo,
  };

  console.log("🔗 API URL:", url);
  console.log("📦 Request Body:", body);
  console.log("📝 Request Headers:", header);

  console.log('inv 1');

  try {
    const response = await axios.post(url, body, { headers: header });
    console.log('inv 2');

    console.log("✅ API Call Successful");
    console.log("📥 Status:", response.status);
    console.log("📥 Response Data:", response);

    return { data: response, header };
  } catch (error) {
    console.log('inv 3');
    console.error("❌ API Call Failed");

    if (error.response) {
      // The request was made and server responded with non-2xx
      console.error("Status:", error.response.status);
      console.error("Response Data:", error.response.data);
    } else if (error.request) {
      // The request was made but no response received
      console.error("No Response Received:", error.request);
    } else {
      // Something happened setting up the request
      console.error("Error Message:", error.message);
    }

    console.error("Error Config:", error.config);
    console.log('inv 4');
    return { data: null, header: header };
  }
  console.log('inv 5');
}

async function callTokenGenerationApi(orderNo) {
  const url = BASE_URL + "/Softtech/BlueWave/GenerateSOTokenByNumber";

  const header = {
    ...headers,
    OrderNo: orderNo,
  };

  console.log("🔗 API URL:", url);
  console.log("📦 Request Body: {}");
  console.log("📝 Request Headers:", header);

  try {
    const response = await axios.post(url, {}, { headers: header });

    console.log("✅ API Call Successful");
    console.log("📥 Status:", response.status);
    console.log("📥 Response Data:", response.data);

    return { data: response.data, header };
  } catch (error) {
    console.error("❌ API Call Failed");

    if (error.response) {
      // The request was made and server responded with non-2xx
      console.error("Status:", error.response.status);
      console.error("Response Data:", error.response.data);
    } else if (error.request) {
      // The request was made but no response received
      console.error("No Response Received:", error.request);
    } else {
      // Something happened setting up the request
      console.error("Error Message:", error.message);
    }

    console.error("Error Config:", error.config);

    return { data: null, header };
  }
}


exports.webhook_controller = async function (req, res) {
  try {
    let response = {};
    response["status"] = "error";
    response["msg"] = "";

    await logApi(req);

    await logWebhook(
      req,
      { headers: req.headers, body: req.body },
      webhookstatus.recived,
      "Webhook received yet to be validated"
    );

    const { Response, TokenDetails } = req.body;

    console.log("Webhook Payload:", req.body);


    if (!TokenDetails || TokenDetails?.length < 1) {
      await logWebhook(
        req,
        { headers: req.headers, body: req.body },
        webhookstatus.failed,
        "Validation failed, Token Details is empty!"
      );
      return apiResponse.ErrorResponse(res, "Token Details is empty!");
    }

    const tokenDetailsItem = TokenDetails[0];

    //validations
    if (!tokenDetailsItem.TokenId) {
      await logWebhook(
        req,
        { headers: req.headers, body: req.body },
        webhookstatus.failed,
        "Validation failed, TokenId is required in TokenDetails!"
      );
      return apiResponse.ErrorResponse(
        res,
        "TokenId is required in TokenDetails!"
      );
    }
    if (!tokenDetailsItem.Token) {
      await logWebhook(
        req,
        { headers: req.headers, body: req.body },
        webhookstatus.failed,
        "Validation failed, Token is required in TokenDetails!"
      );
      return apiResponse.ErrorResponse(
        res,
        "Token is required in TokenDetails!"
      );
    }
    if (!tokenDetailsItem.OrderNo) {
      await logWebhook(
        req,
        { headers: req.headers, body: req.body },
        webhookstatus.failed,
        "Validation failed, OrderNo is required in TokenDetails!"
      );
      return apiResponse.ErrorResponse(
        res,
        "OrderNo is required in TokenDetails!"
      );
    }

    await logWebhook(
      req,
      { headers: req.headers, body: req.body },
      webhookstatus.recived,
      "successful Webhook data received"
    );

    let tokenData = { data: null, header: {} };
    //call token api
    // try {
    //     tokenData = await callTokenGenerationApi(tokenDetailsItem.OrderNo);
    //         if (!tokenData.data) {
    //           await logWebhook(
    //            req,
    //             tokenData,
    //             webhookstatus.failed,
    //             "token generation api did not sent any data",
    //             "tokenData"
    //           );
    //           return apiResponse.ErrorResponse(
    //             res,
    //             "token generation api did not sent any data"
    //           );
    //         }
    // } catch (error) {
    //     console.log("Error in token generation api", error)
    //     await logWebhook(req,error, webhookstatus.failed, `token generation api failed`, "tokenData")
    // }
    // console.log(tokenData, "*** token data ***")
    // response["tokenData"] = tokenData.data;

    //get token data and call invoice data
    //TODO: decode tokenData to get raw token from it

    console.log("Calling invoice data pull with", {
      TokenId: tokenDetailsItem.TokenId,
      OrderNo: tokenDetailsItem.OrderNo,
      Token: tokenDetailsItem.Token,
    });

    let invoiceData = { data: null, header: {} };
    try {
      invoiceData = await callInvoiceDataPullToken(
        tokenDetailsItem.TokenId,
        tokenDetailsItem.OrderNo,
        tokenDetailsItem.Token
      );

      console.log("Invoice Data Response:", invoiceData);


      if (!invoiceData.data) {
        await logWebhook(
          req,
          {},
          webhookstatus.failed,
          "invoice pull generation api did not sent any data",
          "invoiceData"
        );
        return apiResponse.ErrorResponse(
          res,
          "invoice pull generation api did not sent any data"
        );
      }
      response["invoiceData"] = invoiceData.data;
      await logWebhook(
        req,
        { invoiceData },
        webhookstatus.recived,
        "invoice pull data recived",
        "invoiceData"
      );
    } catch (error) {
      console.log("Error in invoice pull generation api", error);
      await logWebhook(
        req,
        error,
        webhookstatus.failed,
        "invoice pull generation api failed",
        "invoiceData"
      );
    }

    console.log("Final Invoice Data:", invoiceData);
    //TODO: uncomment when the invoice data start to work
    // const scratchcard = await upsertScratchcard(
    //   req,
    //   invoiceData.data?.mobile ?? "",
    //   invoiceData.data?.amount ?? 0
    // );

    // await logWebhook(
    //   req,
    //   { headers: req.headers, body: req.body, scratchcard: scratchcard },
    //   webhookstatus.failed,
    //   "scratchcard upserted"
    // );

    // // 6. Send SMS with dynamic link
    // const link = `https://khosla-electronics.com/scratch/${scratch.scratchcard_Token}`;
    // const smsText = `Congratulations! You won a gift scratch card. Click to claim: ${link}`;

    // const smsStatus = await sendSmsAndLog(invoiceData.data?.mobile ?? "", smsText);
    // await logWebhook(
    //   req,
    //   {smsStatus: smsStatus },
    //   webhookstatus.failed,
    //   "sms updated"
    // );
    // if (smsStatus == "sent") {
    //   await markScratchcardStatusAsSent(scratch.scratchcard_Id);
    // }

    //Update webhook_log (processed)
    await logWebhook(
      req,
      { headers: req.headers, body: req.body },
      webhookstatus.processed,
      "Webhook processed"
    );

    // response["token"] = scratch.scratchcard_Token
    response["status"] = "success";
    return utility.apiResponse(req, res, response);
  } catch (err) {
    console.log(err);
    await logWebhook(
      req,
      { headers: req.headers, body: req.body },
      webhookstatus.failed,
      err.message
    );
    return apiResponse.ErrorResponse(res, err);
  }
};
