const axios = require("axios");

/**
 * ENV VARS (override in .env)
 * BW_BASE_URL=http://192.168.0.181:1634
 * BW_PARTNER_NOTIFY_URL=http://bluewave.com/api/order_inform
 * BW_TIMEOUT_MS=15000
 */
const BASE_URL = process.env.BW_BASE_URL || "https://sysmaco.fortiddns.com:3625";
const PARTNER_NOTIFY_URL =
  process.env.BW_PARTNER_NOTIFY_URL || "http://bluewave.com/api/order_inform";
const REQUEST_TIMEOUT_MS = Number(process.env.BW_TIMEOUT_MS || 15000);

/** Shared constants */
const DEALER_CONSTANTS = {
  dealerNameForTokenAndInvoice: "KHOSLA ELECTRONICS PVT. LTD.",
  dealerNameForNotify: "KHOSLA ELECTRONICS PVT LTD",
  dealerCode: "KEPL",
  partnerName: "BlueWaves",
  partnerCode: "BWST05430Z",
  sourceSystem: "POS",
};

/** Axios instance for BlueWave APIs */
const bluewaveAxiosInstance = axios.create({
  baseURL: BASE_URL + "/Softtech/BlueWave",
  timeout: REQUEST_TIMEOUT_MS,
  validateStatus: (statusCode) => statusCode >= 200 && statusCode < 300,
});

/** Retry once on network/server error */
bluewaveAxiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const requestConfig = error.config;
    const shouldRetry =
      !requestConfig?._retried &&
      (error.code === "ECONNABORTED" ||
        (error.response && error.response.status >= 500));

    if (shouldRetry) {
      requestConfig._retried = true;
      await new Promise((resolve) => setTimeout(resolve, 400)); // backoff
      return bluewaveAxiosInstance(requestConfig);
    }
    throw error;
  }
);

/** ---------- helpers ---------- */

function buildStandardHeaders({ dealerName, orderNumber, authToken }) {
  const headers = {
    "Content-Type": "application/json",
    DealerName: dealerName,
    DealerCode: DEALER_CONSTANTS.dealerCode,
    PartnerName: DEALER_CONSTANTS.partnerName,
    PartnerCode: DEALER_CONSTANTS.partnerCode,
    SourceSystem: DEALER_CONSTANTS.sourceSystem,
  };
  if (orderNumber) headers.OrderNo = orderNumber;
  if (authToken) headers.Authorization = normalizeBearerToken(authToken);
  return headers;
}

function normalizeBearerToken(token) {
  if (!token) return token;
  return token.startsWith("Bearer ") ? token : "Bearer " + token;
}

/** Safely extract TokenId and Token */
function parseTokenResponse(responseData) {
  const tokenId =
    responseData?.TokenId ??
    responseData?.data?.TokenId ??
    responseData?.tokenId ??
    responseData?.Data?.TokenId;

  const tokenRaw =
    responseData?.Authorization ??
    responseData?.data?.Authorization ??
    responseData?.Token ??
    responseData?.token ??
    responseData?.Data?.Authorization;

  return { tokenId, tokenRaw };
}

/** Mask secrets in headers/body before logging */
function maskSensitive(obj) {
  if (!obj) return obj;
  const s = JSON.parse(JSON.stringify(obj));
  const mask = (v) =>
    typeof v === "string" && v.length > 8 ? v.slice(0, 4) + "****" + v.slice(-2) : "****";
  const keysToMask = [
    "authorization",
    "Authorization",
    "token",
    "Token",
    "Bearer",
    "access_token",
    "refresh_token",
  ];

  const visit = (o) => {
    if (!o || typeof o !== "object") return;
    Object.keys(o).forEach((k) => {
      if (keysToMask.includes(k)) {
        o[k] = mask(String(o[k]));
      } else if (typeof o[k] === "object") {
        visit(o[k]);
      }
    });
  };
  visit(s);
  return s;
}

/** Call user-provided logApi if present */
async function safeLog(logApi, payload) {
  if (typeof logApi !== "function") return;
  try {
    await logApi(payload);
  } catch (e) {
    // never block on logging
    // eslint-disable-next-line no-console
    console.warn("logApi error (ignored):", e?.message || e);
  }
}

/** ---------- main exported APIs ---------- */

/**
 * 1) Generate Token
 * @param {string} orderNumber
 * @param {object} options  { logApi?: (payload)=>Promise|void, meta?: any }
 */
async function generateTokenApi(orderNumber, logApi) {
  const headers = buildStandardHeaders({
    dealerName: DEALER_CONSTANTS.dealerNameForTokenAndInvoice,
    orderNumber,
  });

  await safeLog(logApi, {
    direction: "outbound",
    service: "BlueWave",
    action: "GenerateSOTokenByNumber",
    method: "POST",
    url: `${BASE_URL}/Softtech/BlueWave/GenerateSOTokenByNumber`,
    headers: maskSensitive(headers),
    body: {},
    meta: { orderNumber},
  });

  try {
    const response = await bluewaveAxiosInstance.post(
      "/GenerateSOTokenByNumber",
      {},
      { headers }
    );

    const { tokenId, tokenRaw } = parseTokenResponse(response.data);
    await safeLog(logApi, {
      direction: "inbound",
      service: "BlueWave",
      action: "GenerateSOTokenByNumber",
      status: response.status,
      headers: maskSensitive(response.headers),
      body: maskSensitive(response.data),
      meta: { orderNumber, ...meta },
    });

    if (!tokenId || !tokenRaw) {
      throw new Error(
        "Unexpected token response: " + JSON.stringify(response.data).slice(0, 500)
      );
    }

    return { tokenId, tokenRaw, rawResponse: response.data, header: headers };
  } catch (err) {
    await safeLog(logApi, {
      direction: "error",
      service: "BlueWave",
      action: "GenerateSOTokenByNumber",
      error: err?.message,
      meta: { orderNumber, ...meta },
    });
    throw err;
  }
}

/**
 * 2) Pull Invoice
 * @param {string} orderNumber
 * @param {string|number} tokenId
 * @param {string} authToken
 * @param {object} options  { logApi?: (payload)=>Promise|void, meta?: any }
 */
async function pullInvoiceApi(orderNumber, tokenId, authToken, options = {}) {
  const { logApi, meta } = options;

  const headers = buildStandardHeaders({
    dealerName: DEALER_CONSTANTS.dealerNameForTokenAndInvoice,
    orderNumber,
    authToken,
  });
  const requestBody = { TokenId: tokenId, OrderNo: orderNumber };

  await safeLog(logApi, {
    direction: "outbound",
    service: "BlueWave",
    action: "SOPull",
    method: "POST",
    url: `${BASE_URL}/Softtech/BlueWave/SOPull`,
    headers: maskSensitive(headers),
    body: maskSensitive(requestBody),
    meta: { orderNumber, tokenId, ...meta },
  });

  try {
    const response = await bluewaveAxiosInstance.post("/SOPull", requestBody, {
      headers,
    });

    await safeLog(logApi, {
      direction: "inbound",
      service: "BlueWave",
      action: "SOPull",
      status: response.status,
      headers: maskSensitive(response.headers),
      body: maskSensitive(response.data),
      meta: { orderNumber, tokenId, ...meta },
    });

    return response.data;
  } catch (err) {
    await safeLog(logApi, {
      direction: "error",
      service: "BlueWave",
      action: "SOPull",
      error: err?.message,
      meta: { orderNumber, tokenId, ...meta },
    });
    throw err;
  }
}

/**
 * 3) Notify Partner (order_inform)
 * @param {number|string} tokenId
 * @param {string} tokenRaw
 * @param {string} orderNumber
 * @param {object} options  { logApi?: (payload)=>Promise|void, meta?: any }
 */
async function notifyPartnerApi(tokenId, tokenRaw, orderNumber, options = {}) {
  const { logApi, meta } = options;

  const tokenForBody =
    tokenRaw && tokenRaw.startsWith("Bearer ")
      ? tokenRaw.slice("Bearer ".length)
      : tokenRaw;

  const headers = buildStandardHeaders({
    dealerName: DEALER_CONSTANTS.dealerNameForNotify,
  });

  const requestBody = {
    Response: true,
    TokenDetails: [{ TokenId: tokenId, Token: tokenForBody, OrderNo: orderNumber }],
  };

  await safeLog(logApi, {
    direction: "outbound",
    service: "Partner",
    action: "order_inform",
    method: "POST",
    url: PARTNER_NOTIFY_URL,
    headers: maskSensitive(headers),
    body: maskSensitive(requestBody),
    meta: { orderNumber, tokenId, ...meta },
  });

  try {
    const response = await axios.post(PARTNER_NOTIFY_URL, requestBody, {
      headers,
      timeout: REQUEST_TIMEOUT_MS,
      validateStatus: (s) => s >= 200 && s < 300,
    });

    await safeLog(logApi, {
      direction: "inbound",
      service: "Partner",
      action: "order_inform",
      status: response.status,
      headers: maskSensitive(response.headers),
      body: maskSensitive(response.data),
      meta: { orderNumber, tokenId, ...meta },
    });

    return response.data;
  } catch (err) {
    await safeLog(logApi, {
      direction: "error",
      service: "Partner",
      action: "order_inform",
      error: err?.message,
      meta: { orderNumber, tokenId, ...meta },
    });
    throw err;
  }
}

module.exports = {
  generateTokenApi,
  pullInvoiceApi,
  notifyPartnerApi,
};
