var dbcon = require('../../config/mysqlClient.js');
// const apiResponse = require('/home/ubuntu/config/apiResponse');
var utility = require('../../helpers/utility.js');
// var constants = require('/home/ubuntu/config/constants');
var constants = require('../../vars/constants');
const apiResponse = require('../../vars/apiResponse');
const moment = require('moment-timezone');

class BaseRepository {
  /**
   * @param {string} tableName
   * @param {string} [idColumn='id']
   */
  constructor(tableName, idColumn = 'id') {
    // Validate table and column names to prevent SQL injection
    this._validateIdentifier(tableName, 'table name');
    this._validateIdentifier(idColumn, 'column name');

    this.tableName = tableName;
    this.idColumn = idColumn;
    this.query = dbcon.query;
    this.database = constants.vals.devemamiDB;
  }

  getCurrentServerTime(timezone = constants.vals.tz) {
    if (timezone) {
      return moment().tz(timezone).format('YYYY-MM-DD HH:mm:ss');
    }
    return moment().format('YYYY-MM-DD HH:mm:ss');
  }

  /**
   * Validates SQL identifiers (table names, column names) to prevent SQL injection
   * @param {string} identifier
   * @param {string} type
   */
  _validateIdentifier(identifier, type = 'identifier') {
    if (!identifier || typeof identifier !== 'string') {
      throw new Error(`Invalid ${type}: must be a non-empty string`);
    }

    // Only allow alphanumeric characters, underscores, and must start with letter or underscore
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
      throw new Error(
        `Invalid ${type}: "${identifier}". Only alphanumeric characters and underscores allowed, must start with letter or underscore`,
      );
    }

    // Prevent excessively long identifiers
    if (identifier.length > 64) {
      throw new Error(`Invalid ${type}: "${identifier}" is too long (max 64 characters)`);
    }

    // Block common SQL keywords that shouldn't be used as identifiers
    const blockedKeywords = [
      'SELECT',
      'INSERT',
      'UPDATE',
      'DELETE',
      'DROP',
      'CREATE',
      'ALTER',
      'TRUNCATE',
      'UNION',
      'WHERE',
      'FROM',
      'JOIN',
      'HAVING',
      'ORDER',
      'GROUP',
      'LIMIT',
      'EXEC',
      'EXECUTE',
      'SCRIPT',
      'PROCEDURE',
      'FUNCTION',
    ];

    if (blockedKeywords.includes(identifier.toUpperCase())) {
      throw new Error(`Invalid ${type}: "${identifier}" is a reserved SQL keyword`);
    }
  }

  /**
   * Sanitizes and validates input data
   * @param {Object} dto
   * @returns {Object}
   */
  _sanitizeInput(dto) {
    if (!dto || typeof dto !== 'object') {
      throw new Error('Input must be a valid object');
    }

    const sanitized = {};
    const maxStringLength = 10000; // Prevent extremely large strings

    for (const [key, value] of Object.entries(dto)) {
      // Validate column names
      this._validateIdentifier(key, 'column name');

      // Skip undefined and null values
      if (value === undefined || value === null) {
        continue;
      }

      // Validate string length to prevent buffer overflow attacks
      if (typeof value === 'string' && value.length > maxStringLength) {
        throw new Error(`Value for column "${key}" is too long (max ${maxStringLength} characters)`);
      }

      // Prevent prototype pollution
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        throw new Error(`Invalid column name: "${key}" is not allowed`);
      }

      sanitized[key] = value;
    }

    return sanitized;
  }

  /**
   * Validates WHERE clause object to prevent SQL injection
   * @param {Object} where
   * @returns {Object}
   */
  _validateWhereClause(where) {
    if (!where || typeof where !== 'object') {
      return {};
    }

    const validated = {};

    for (const [key, value] of Object.entries(where)) {
      // Validate column names
      this._validateIdentifier(key, 'column name in WHERE clause');

      // Prevent prototype pollution
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        throw new Error(`Invalid column name in WHERE clause: "${key}" is not allowed`);
      }

      validated[key] = value;
    }

    return validated;
  }

  /**
   * Creates a new record with proper parameterization
   * @param {Object} dto
   * @returns {Promise<number>} - Returns insertId
   */
  async create(dto) {
    if (!dto || Object.keys(dto).length === 0) {
      throw new Error('No data provided for creation');
    }

    // Sanitize and validate input
    const sanitizedDto = this._sanitizeInput(dto);

    if (Object.keys(sanitizedDto).length === 0) {
      throw new Error('No valid data provided for creation after sanitization');
    }

    if (!sanitizedDto.hasOwnProperty('created_at')) {
      sanitizedDto.created_at = this.getCurrentServerTime();
    }

    const columns = Object.keys(sanitizedDto);
    const values = Object.values(sanitizedDto);
    const placeholders = values.map(() => '?').join(', ');
    const columnNames = columns.map(() => '??').join(', ');

    const sql = `INSERT INTO ?? (${columnNames}) VALUES (${placeholders})`;
    const params = [this.tableName, ...columns, ...values];

    try {
      const result = await this.query(this.database, sql, params);

      // Check if the operation actually succeeded
      if (!result || !result.insertId || result.affectedRows === 0) {
        throw new Error(`Failed to create record in ${this.tableName}. No rows were affected.`);
      }
      console.log('this.tableName: ', this.tableName);

      return result.insertId;
    } catch (error) {
      console.error(`Create operation failed for table ${this.tableName}:`, error);
      throw new Error(`Failed to create record: ${error.message}`);
    }
  }

  /**
   * Updates a record using DTO properties.
   * @param {number|string} idValue
   * @param {Object} dto
   * @returns {Promise<boolean>} - Returns true if update was successful
   */
  async update(idValue, dto) {
    if (idValue === undefined || idValue === null || idValue === '') {
      throw new Error('Invalid ID value provided for update');
    }

    // Sanitize and validate input
    const sanitizedDto = this._sanitizeInput(dto);
    const entries = Object.entries(sanitizedDto);

    if (entries.length === 0) {
      throw new Error('No valid fields provided for update');
    }

    const setClause = entries.map(() => `?? = ?`).join(', ');
    const setParams = entries.flatMap(([key, value]) => [key, value]);

    const sql = `
    UPDATE ?? 
    SET ${setClause}, ?? = ?
    WHERE ?? = ? AND ?? = 0
  `;

    const params = [
      this.tableName,
      ...setParams,
      'updated_at',
      this.getCurrentServerTime(),
      this.idColumn,
      idValue,
      'is_deleted',
    ];
    try {
      const result = await this.query(this.database, sql, params);

      // Check if the operation actually affected any rows
      if (!result || result.affectedRows === 0) {
        throw new Error(
          `Failed to update record with ${this.idColumn} = ${idValue} in ${this.tableName}. No rows were affected. Record may not exist or may already be deleted.`,
        );
      }

      return true;
    } catch (error) {
      console.error(`Update operation failed for table ${this.tableName}, ${this.idColumn} = ${idValue}:`, error);
      throw new Error(`Failed to update record: ${error.message}`);
    }
  }

  /**
   * Soft deletes a record.
   * @param {number|string} idValue
   * @returns {Promise<boolean>} - Returns true if deletion was successful
   */
  async softDelete(idValue) {
    // Validate ID value
    if (idValue === undefined || idValue === null || idValue === '') {
      throw new Error('Invalid Id value provided for deletion');
    }

    const sql = `
    UPDATE ??
    SET ?? = 0, ?? = 1, ?? = ?
    WHERE ?? = ?
  `;
    const params = [
      this.tableName,
      'is_active',
      'is_deleted',
      'updated_at',
      this.getCurrentServerTime(),
      this.idColumn,
      idValue,
    ];
    try {
      const result = await this.query(this.database, sql, params);

      // Check if the operation actually affected any rows
      if (!result || result.affectedRows === 0) {
        throw new Error(
          `Failed to delete record with ${this.idColumn} = ${idValue} in ${this.tableName}. No rows were affected. Record may not exist.`,
        );
      }

      return true;
    } catch (error) {
      console.error(`Soft delete operation failed for table ${this.tableName}, ${this.idColumn} = ${idValue}:`, error);
      throw new Error(`Failed to delete record: ${error.message}`);
    }
  }

  /**
   * Bulk soft delete rows by WHERE conditions (supports IN with array values)
   * @param {Object} where
   * @returns {Promise<number>} - affected rows count
   */
  async bulkSoftDelete(where = {}) {
    const validatedWhere = this._validateWhereClause(where);

    // must have at least one filter (safety)
    if (!validatedWhere || Object.keys(validatedWhere).length === 0) {
      throw new Error(`bulkSoftDelete requires at least one WHERE condition for table ${this.tableName}`);
    }

    let sql = `
      UPDATE ??
      SET ?? = 0,
          ?? = 1,
          ?? = ?
      WHERE ?? = 0
    `;

    const params = [this.tableName, 'is_active', 'is_deleted', 'updated_at', this.getCurrentServerTime(), 'is_deleted'];

    // add WHERE conditions
    for (const [key, value] of Object.entries(validatedWhere)) {
      if (Array.isArray(value)) {
        sql += ` AND ?? IN (?)`;
        params.push(key, value);
      } else {
        sql += ` AND ?? = ?`;
        params.push(key, value);
      }
    }

    try {
      const result = await this.query(this.database, sql, params);

      if (!result) {
        throw new Error(`bulkSoftDelete failed for table ${this.tableName}`);
      }

      return result.affectedRows || 0;
    } catch (error) {
      console.error(`bulkSoftDelete operation failed for table ${this.tableName}:`, error);
      throw new Error(`bulkSoftDelete failed: ${error.message}`);
    }
  }

  /**
   * Fetches a record by ID.
   * @param {number|string} idValue
   * @returns {Promise<Object|null>}
   */
  async getById(idValue) {
    // Validate ID value
    console.log(idValue, 'idValue');
    if (idValue === undefined || idValue === null || idValue === '') {
      throw new Error('Invalid ID value provided');
    }

    const sql = `
      SELECT * FROM ??
      WHERE ?? = ? AND ?? = 0 
      LIMIT 1
    `;
    const params = [this.tableName, this.idColumn, idValue, 'is_deleted'];

    try {
      const rows = await this.query(this.database, sql, params);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error(`GetById operation failed for table ${this.tableName}, ${this.idColumn} = ${idValue}:`, error);
      throw new Error(`Failed to fetch record: ${error.message}`);
    }
  }

  /**
   * Removes "empty" filter values so they don't become `col = ''`
   * - removes: undefined, null, "", "   "
   * - keeps: 0, false, non-empty strings, arrays (if not empty)
   */
  _cleanWhere(where = {}) {
    if (!where || typeof where !== 'object' || Array.isArray(where)) return {};

    const cleaned = {};

    for (const [key, value] of Object.entries(where)) {
      // block prototype pollution keys
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;

      // skip undefined/null
      if (value === undefined || value === null) continue;

      // skip empty string / whitespace-only
      if (typeof value === 'string' && value.trim() === '') continue;

      // skip empty array
      if (Array.isArray(value) && value.length === 0) continue;

      cleaned[key] = value;
    }

    return cleaned;
  }

  /**
   * Fetches all records not marked as deleted, with optional WHERE conditions.
   * @param {Object} [where={}] - key-value pairs for WHERE filters.
   * @returns {Promise<Object[]>}
   */
  /**
   * Fetches all records not marked as deleted, with optional filters + search
   *
   * Supported where value formats:
   * 1) Exact:
   *    { api_Verb: "GET" }
   *
   * 2) IN:
   *    { api_Verb: ["GET", "POST"] }
   *
   * 3) Operator object:
   *    { api_Name: { op: "like", value: "user" } }
   *    { api_Slug: { op: "regexp", value: "^auth_" } }
   *    { created_at: { op: ">=", value: "2026-01-01" } }
   */
  async getAllWithFilter(where = {}, limit = null, offset = null, options = {}) {
    const {
      // If provided, these columns will do LIKE when value is a string
      likeColumns = [],
      // If provided, these columns will do REGEXP when value is a string
      regexColumns = [],
      // If true, all string columns in `where` will use LIKE (unless overridden by op object)
      globalLike = false,
      // Optional sort: [columnName, 'ASC'|'DESC']
      orderBy = null,
    } = options;

    // 1) Clean empty filters first
    const cleanedWhere = this._cleanWhere(where);

    // 2) Validate keys (identifiers) only after cleaning
    const validatedWhere = this._validateWhereClause(cleanedWhere);

    let sql = `SELECT * FROM ?? WHERE ?? = 0`;

    const params = [this.tableName, 'is_deleted'];

    const allowedOps = new Set(['=', '!=', '>', '<', '>=', '<=', 'like', 'regexp', 'in', 'not in']);

    for (const [key, rawVal] of Object.entries(validatedWhere)) {
      // a) IN for arrays
      if (Array.isArray(rawVal)) {
        sql += ` AND ?? IN (?)`;
        params.push(key, rawVal);
        continue;
      }

      // b) Operator object
      if (rawVal && typeof rawVal === 'object') {
        const op = String(rawVal.op || '').toLowerCase();
        const value = rawVal.value;

        if (!allowedOps.has(op)) {
          throw new Error(`Invalid operator "${rawVal.op}" for column "${key}"`);
        }

        if (op === 'in' || op === 'not in') {
          if (!Array.isArray(value) || value.length === 0) continue;
          sql += op === 'in' ? ` AND ?? IN (?)` : ` AND ?? NOT IN (?)`;
          params.push(key, value);
          continue;
        }

        if (op === 'like') {
          sql += ` AND ?? LIKE ?`;
          params.push(key, `${String(value)}%`);
          continue;
        }

        if (op === 'regexp') {
          sql += ` AND ?? REGEXP ?`;
          params.push(key, String(value));
          continue;
        }

        // comparison ops
        sql += ` AND ?? ${op} ?`;
        params.push(key, value);
        continue;
      }

      // c) Plain string -> LIKE / REGEXP if configured, else exact
      if (typeof rawVal === 'string') {
        if (regexColumns.includes(key)) {
          sql += ` AND ?? REGEXP ?`;
          params.push(key, rawVal);
          continue;
        }

        if (globalLike || likeColumns.includes(key)) {
          sql += ` AND ?? LIKE ?`;
          params.push(key, `${rawVal}%`);
          continue;
        }

        sql += ` AND ?? = ?`;
        params.push(key, rawVal);
        continue;
      }

      // d) numbers/booleans/etc -> exact
      sql += ` AND ?? = ?`;
      params.push(key, rawVal);
    }

    let orderByField = 'created_at';
    let orderByDirection = 'DESC';

    if (Array.isArray(orderBy) && orderBy.length >= 1) {
      const requestedField = String(orderBy[0] || '').trim();
      const requestedDirection = String(orderBy[1] || 'DESC')
        .trim()
        .toUpperCase();

      if (requestedField) {
        this._validateIdentifier(requestedField, 'orderBy column');
        orderByField = requestedField;
      }

      orderByDirection = requestedDirection === 'ASC' ? 'ASC' : 'DESC';
    }

    sql += ` ORDER BY ?? ${orderByDirection}`;
    params.push(orderByField);

    if (limit !== null && offset !== null) {
      sql += ` LIMIT ? OFFSET ?`;
      params.push(Number(limit), Number(offset));
    }

    try {
      return await this.query(this.database, sql, params);
    } catch (error) {
      console.error(`GetAll operation failed for table ${this.tableName}:`, error);
      throw new Error(`Failed to fetch records: ${error.message}`);
    }
  }

  /**
   * Fetches all records not marked as deleted, with optional WHERE conditions.
   * @param {Object} [where={}] - key-value pairs for WHERE filters.
   * @returns {Promise<Object[]>}
   */
  async getAll(where = {}, limit = null, offset = null, orderBy = ['created_at', 'DESC']) {
    const validatedWhere = this._validateWhereClause(where);

    let sql = `SELECT * FROM ?? WHERE ?? = 0`;
    const params = [this.tableName, 'is_deleted'];

    for (const [key, value] of Object.entries(validatedWhere)) {
      if (Array.isArray(value)) {
        sql += ` AND ?? IN (?)`;
        params.push(key, value);
      } else {
        sql += ` AND ?? = ?`;
        params.push(key, value);
      }
    }

    // sql += ` ORDER BY ?? DESC`;
    // params.push('created_at');

    sql += ` ORDER BY ?? ${orderBy[1]}`;
    params.push(orderBy[0]);

    if (limit !== null && offset !== null) {
      sql += ` LIMIT ? OFFSET ?`;
      params.push(Number(limit), Number(offset));
    }
    try {
      return await this.query(this.database, sql, params);
    } catch (error) {
      console.error(`GetAll operation failed for table ${this.tableName}:`, error);
      throw new Error(`Failed to fetch records: ${error.message}`);
    }
  }

  /**
   * Counts records with optional WHERE conditions
   * @param {Object} [where={}] - WHERE conditions
   * @returns {Promise<number>}
   */
  async count(where = {}) {
    // Validate and sanitize WHERE clause
    const validatedWhere = this._validateWhereClause(where);

    let sql = `SELECT COUNT(*) as total FROM ?? WHERE ?? = 0`;
    const params = [this.tableName, 'is_deleted'];

    // Add WHERE conditions
    for (const [key, value] of Object.entries(validatedWhere)) {
      sql += ` AND ?? = ?`;
      params.push(key, value);
    }

    try {
      const result = await this.query(this.database, sql, params);
      return result[0]?.total || 0;
    } catch (error) {
      console.error(`Count operation failed for table ${this.tableName}:`, error);
      throw new Error(`Failed to count records: ${error.message}`);
    }
  }

  /**
   * Counts records not marked as deleted, with optional filters + search
   *
   * Supported where value formats:
   * 1) Exact:
   *    { api_Verb: "GET" }
   *
   * 2) IN:
   *    { api_Verb: ["GET", "POST"] }
   *
   * 3) Operator object:
   *    { api_Name: { op: "like", value: "user" } }
   *    { api_Slug: { op: "regexp", value: "^auth_" } }
   *    { created_at: { op: ">=", value: "2026-01-01" } }
   *
   * @param {Object} [where={}] - key-value filters
   * @param {Object} [options={}] - like/regex behavior
   * @returns {Promise<number>}
   */
  async countWithFilter(where = {}, options = {}) {
    const { likeColumns = [], regexColumns = [], globalLike = false } = options;

    // 1) Clean empty filters first (same pattern as getAllWithFilter)
    const cleanedWhere = this._cleanWhere(where);

    // 2) Validate keys after cleaning
    const validatedWhere = this._validateWhereClause(cleanedWhere);

    let sql = `SELECT COUNT(*) as total FROM ?? WHERE ?? = 0`;
    const params = [this.tableName, 'is_deleted'];

    const allowedOps = new Set(['=', '!=', '>', '<', '>=', '<=', 'like', 'regexp', 'in', 'not in']);

    for (const [key, rawVal] of Object.entries(validatedWhere)) {
      // a) IN for arrays
      if (Array.isArray(rawVal)) {
        if (rawVal.length === 0) continue;
        sql += ` AND ?? IN (?)`;
        params.push(key, rawVal);
        continue;
      }

      // b) Operator object
      if (rawVal && typeof rawVal === 'object') {
        const op = String(rawVal.op || '').toLowerCase();
        const value = rawVal.value;

        if (!allowedOps.has(op)) {
          throw new Error(`Invalid operator "${rawVal.op}" for column "${key}"`);
        }

        if (op === 'in' || op === 'not in') {
          if (!Array.isArray(value) || value.length === 0) continue;
          sql += op === 'in' ? ` AND ?? IN (?)` : ` AND ?? NOT IN (?)`;
          params.push(key, value);
          continue;
        }

        if (op === 'like') {
          sql += ` AND ?? LIKE ?`;
          params.push(key, `${String(value)}%`);
          continue;
        }

        if (op === 'regexp') {
          sql += ` AND ?? REGEXP ?`;
          params.push(key, String(value));
          continue;
        }

        // comparison ops
        sql += ` AND ?? ${op} ?`;
        params.push(key, value);
        continue;
      }

      // c) Plain string -> LIKE / REGEXP if configured, else exact
      if (typeof rawVal === 'string') {
        if (regexColumns.includes(key)) {
          sql += ` AND ?? REGEXP ?`;
          params.push(key, rawVal);
          continue;
        }

        if (globalLike || likeColumns.includes(key)) {
          sql += ` AND ?? LIKE ?`;
          params.push(key, `${rawVal}%`);
          continue;
        }

        sql += ` AND ?? = ?`;
        params.push(key, rawVal);
        continue;
      }

      // d) numbers/booleans/etc -> exact
      sql += ` AND ?? = ?`;
      params.push(key, rawVal);
    }

    try {
      const result = await this.query(this.database, sql, params);
      return result[0]?.total || 0;
    } catch (error) {
      console.error(`CountWithFilter operation failed for table ${this.tableName}:`, error);
      throw new Error(`Failed to count records: ${error.message}`);
    }
  }

  /**
   * Bulk insert multiple rows safely
   * @param {Array<Object>} rows
   * @returns {Promise<number>} - number of affected rows
   */
  async bulkCreate(rows = []) {
    try {
      // Validate input
      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error('bulkCreate expects a non-empty array of objects');
      }

      // Ensure rows are plain objects (not arrays, not null)
      rows.forEach((row, idx) => {
        if (!row || typeof row !== 'object' || Array.isArray(row)) {
          throw new Error(`Row at index ${idx} is not a valid object`);
        }
      });

      // Sanitize rows, assign timestamps and default flags
      const sanitizedRows = rows.map((row) => {
        const sanitized = this._sanitizeInput(row);

        // Add defaults if missing
        if (!sanitized.hasOwnProperty('created_at')) {
          sanitized.created_at = this.getCurrentServerTime();
        }
        if (!sanitized.hasOwnProperty('is_active')) sanitized.is_active = 1;
        if (!sanitized.hasOwnProperty('is_deleted')) sanitized.is_deleted = 0;

        return sanitized;
      });

      // Collect ALL unique columns from ALL rows
      const allColumnsSet = new Set();
      sanitizedRows.forEach((row) => {
        Object.keys(row).forEach((key) => allColumnsSet.add(key));
      });
      const columns = Array.from(allColumnsSet);

      // Normalize all rows to have the same columns (fill missing with null)
      const normalizedRows = sanitizedRows.map((row, idx) => {
        const normalized = {};
        columns.forEach((col) => {
          // Use hasOwnProperty to distinguish between undefined and explicitly set null
          normalized[col] = row.hasOwnProperty(col) ? row[col] : null;
        });
        return normalized;
      });

      // Build query
      const columnNames = columns.map(() => '??').join(', ');
      const placeholders = normalizedRows.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');

      const sql = `INSERT INTO ?? (${columnNames}) VALUES ${placeholders}`;

      const params = [this.tableName, ...columns];
      normalizedRows.forEach((row) => {
        columns.forEach((col) => params.push(row[col]));
      });

      const result = await this.query(this.database, sql, params);

      if (!result || !result.affectedRows) {
        throw new Error(`Bulk insert failed for table ${this.tableName}`);
      }

      return result.affectedRows;
    } catch (error) {
      console.error(`bulkCreate failed for table ${this.tableName}:`, error);
      throw new Error(`bulkCreate failed: ${error.message}`);
    }
  }
}

module.exports = BaseRepository;
