const BaseRepository = require('./BaseRepository.js');
const utility = require('../../helpers/utility');

const CONTACT_LIST_SORT_FIELDS = new Set([
  'contact_Salutation',
  'contact_Primary_Full_Name',
  'contact_Last_Name',
  'contact_Organization',
  'contact_Type',
  'created_at',
  'updated_at',
]);

const CONTACT_LIST_TYPE_MAP = Object.freeze({
  MAIN: 'MAIN',
  CHILD: 'CHILD',
  SPOUSE: 'SPOUSE',
  PARENT: 'PARENT',
  ALL: 'ALL',
});

class ContactRepository extends BaseRepository {
  constructor() {
    super('contact', 'contact_Contact_Id');
  }

  _normalizeSortOrder(orderBy = ['created_at', 'DESC']) {
    const requestedField = String(orderBy?.[0] || '').trim();
    const requestedDirection = String(orderBy?.[1] || 'DESC')
      .trim()
      .toUpperCase();

    const sortField = CONTACT_LIST_SORT_FIELDS.has(requestedField) ? requestedField : 'created_at';
    const sortDirection = requestedDirection === 'ASC' ? 'ASC' : 'DESC';
    return { sortField, sortDirection };
  }

  _normalizeContactListType(type = 'ALL') {
    const normalized = String(type || 'ALL')
      .trim()
      .toUpperCase();
    return CONTACT_LIST_TYPE_MAP[normalized] || 'ALL';
  }

  _buildContactListFilterClause({ type = 'ALL', filters = {} } = {}) {
    const normalizedType = this._normalizeContactListType(type);
    let sql = '';
    const params = [];

    if (normalizedType === 'MAIN') {
      sql += ' AND c.contact_Parent_Id = 0';
    } else if (normalizedType === 'CHILD') {
      sql += ' AND c.contact_Type = ?';
      params.push('CHILD');
    } else if (normalizedType === 'SPOUSE') {
      sql += ' AND c.contact_Type = ?';
      params.push('SPOUSE');
    } else if (normalizedType === 'PARENT') {
      sql += ' AND c.contact_Type = ?';
      params.push('PARENT');
    }

    const normalizedContactSearch = String(filters?.contactName ?? filters?.contact_name ?? '')
      .trim()
      .replace(/\s+/g, ' ');

    const normalizedName = String(filters?.name || '')
      .trim()
      .replace(/\s+/g, ' ');
    if (!utility.checkEmpty(normalizedName) && utility.checkEmpty(normalizedContactSearch)) {
      const compactName = normalizedName.replace(/\s+/g, '');
      sql += `
        AND (
          c.contact_Primary_Full_Name LIKE ?
          OR c.contact_Last_Name LIKE ?
          OR REPLACE(
              CONCAT(COALESCE(c.contact_Primary_Full_Name, ''), COALESCE(c.contact_Last_Name, '')),
              ' ',
              ''
            ) LIKE ?
        )
      `;
      params.push(`${normalizedName}%`, `${normalizedName}%`, `${compactName}%`);
    }

    if (!utility.checkEmpty(normalizedContactSearch)) {
      const likeValue = `%${normalizedContactSearch}%`;
      const compactSearch = normalizedContactSearch.replace(/\s+/g, '');
      const compactLikeValue = `%${compactSearch}%`;
      sql += `
        AND (
          c.contact_Primary_Full_Name LIKE ?
          OR c.contact_Last_Name LIKE ?
          OR REPLACE(
              CONCAT(COALESCE(c.contact_Primary_Full_Name, ''), COALESCE(c.contact_Last_Name, '')),
              ' ',
              ''
            ) LIKE ?
          OR c.contact_Organization LIKE ?
          OR c.contact_Salutation LIKE ?
          OR EXISTS (
            SELECT 1
            FROM contact_email ce_search
            WHERE ce_search.contact_Id = c.contact_Contact_Id
              AND ce_search.is_deleted = 0
              AND ce_search.email_address LIKE ?
          )
          OR EXISTS (
            SELECT 1
            FROM contact_phone cp_search
            WHERE cp_search.contact_Id = c.contact_Contact_Id
              AND cp_search.is_deleted = 0
              AND (
                cp_search.phone_number LIKE ?
                OR CONCAT(
                    COALESCE(NULLIF(TRIM(cp_search.country_code), ''), ''),
                    ' ',
                    COALESCE(NULLIF(TRIM(cp_search.phone_number), ''), '')
                  ) LIKE ?
              )
          )
          OR EXISTS (
            SELECT 1
            FROM contact_address ca_search
            WHERE ca_search.contact_Id = c.contact_Contact_Id
              AND ca_search.is_deleted = 0
              AND (
                ca_search.address_line1 LIKE ?
                OR ca_search.address_line2 LIKE ?
                OR ca_search.address_line3 LIKE ?
                OR ca_search.city LIKE ?
                OR ca_search.pin_code LIKE ?
              )
          )
          OR EXISTS (
            SELECT 1
            FROM contact_tag ct_search
            INNER JOIN tag t_search
              ON t_search.tag_Id = ct_search.tag_Id
              AND t_search.is_deleted = 0
              AND t_search.is_active = 1
            WHERE ct_search.contact_Id = c.contact_Contact_Id
              AND ct_search.is_deleted = 0
              AND ct_search.is_active = 1
              AND (
                t_search.tag_name LIKE ?
                OR t_search.tag_key LIKE ?
              )
          )
          OR EXISTS (
            SELECT 1
            FROM family_group_member fgm_search
            INNER JOIN family_group fg_search
              ON fg_search.family_group_Id = fgm_search.family_group_Id
              AND fg_search.is_deleted = 0
              AND fg_search.is_active = 1
            WHERE fgm_search.contact_Id = c.contact_Contact_Id
              AND fgm_search.is_deleted = 0
              AND fgm_search.is_active = 1
              AND fg_search.family_group_Name LIKE ?
          )
          OR EXISTS (
            SELECT 1
            FROM event_invite ei_search
            LEFT JOIN event_master em_search
              ON em_search.event_Id = ei_search.event_Id
              AND em_search.is_deleted = 0
            WHERE ei_search.contact_Id = c.contact_Contact_Id
              AND ei_search.is_deleted = 0
              AND ei_search.is_active = 1
              AND (
                ei_search.contact_name LIKE ?
                OR ei_search.tag_name LIKE ?
                OR ei_search.invite_label LIKE ?
                OR em_search.event_name LIKE ?
              )
          )
        )
      `;
      params.push(
        likeValue,
        likeValue,
        compactLikeValue,
        likeValue,
        likeValue,
        likeValue,
        likeValue,
        likeValue,
        likeValue,
        likeValue,
        likeValue,
        likeValue,
        likeValue,
        likeValue,
        likeValue,
        likeValue,
        likeValue,
        likeValue,
        likeValue,
        likeValue,
      );
    }

    const normalizedOrganization = String(filters?.organization || '').trim();
    if (!utility.checkEmpty(normalizedOrganization)) {
      sql += ' AND c.contact_Organization LIKE ?';
      params.push(`${normalizedOrganization}%`);
    }

    const normalizedEmailList = Array.isArray(filters?.emailList) ? filters.emailList.filter(Boolean) : [];
    if (normalizedEmailList.length > 0) {
      sql += `
        AND EXISTS (
          SELECT 1
          FROM contact_email ce
          WHERE ce.contact_Id = c.contact_Contact_Id
            AND ce.is_deleted = 0
            AND ce.email_address IN (?)
        )
      `;
      params.push(normalizedEmailList);
    }

    const normalizedMobileList = Array.isArray(filters?.mobileList) ? filters.mobileList.filter(Boolean) : [];
    if (normalizedMobileList.length > 0) {
      sql += `
        AND EXISTS (
          SELECT 1
          FROM contact_phone cp
          WHERE cp.contact_Id = c.contact_Contact_Id
            AND cp.is_deleted = 0
            AND cp.phone_number IN (?)
        )
      `;
      params.push(normalizedMobileList);
    }

    const normalizedAddress = String(filters?.address || '').trim();
    if (!utility.checkEmpty(normalizedAddress)) {
      const likeAddress = `${normalizedAddress}%`;
      sql += `
        AND EXISTS (
          SELECT 1
          FROM contact_address ca
          WHERE ca.contact_Id = c.contact_Contact_Id
            AND ca.is_deleted = 0
            AND (
              ca.address_line1 LIKE ?
              OR ca.address_line2 LIKE ?
              OR ca.address_line3 LIKE ?
              OR ca.city LIKE ?
              OR ca.pin_code LIKE ?
            )
        )
      `;
      params.push(likeAddress, likeAddress, likeAddress, likeAddress, likeAddress);
    }

    const normalizedCity = String(filters?.city || '').trim();
    if (!utility.checkEmpty(normalizedCity)) {
      sql += `
        AND EXISTS (
          SELECT 1
          FROM contact_address ca_city
          WHERE ca_city.contact_Id = c.contact_Contact_Id
            AND ca_city.is_deleted = 0
            AND ca_city.city LIKE ?
        )
      `;
      params.push(`${normalizedCity}%`);
    }

    const normalizedPinCode = String(filters?.pinCode || '').trim();
    if (!utility.checkEmpty(normalizedPinCode)) {
      sql += `
        AND EXISTS (
          SELECT 1
          FROM contact_address ca_pin
          WHERE ca_pin.contact_Id = c.contact_Contact_Id
            AND ca_pin.is_deleted = 0
            AND ca_pin.pin_code LIKE ?
        )
      `;
      params.push(`${normalizedPinCode}%`);
    }

    const normalizedFamilyGroupIds = Array.isArray(filters?.familyGroupIds)
      ? filters.familyGroupIds.filter((id) => Number.isFinite(Number(id)) && Number(id) > 0)
      : [];
    if (normalizedFamilyGroupIds.length > 0) {
      sql += `
        AND EXISTS (
          SELECT 1
          FROM family_group_member fgm
          WHERE fgm.contact_Id = c.contact_Contact_Id
            AND fgm.is_deleted = 0
            AND fgm.is_active = 1
            AND fgm.family_group_Id IN (?)
        )
      `;
      params.push(normalizedFamilyGroupIds);
    }

    const normalizedEventIds = Array.isArray(filters?.eventIds)
      ? filters.eventIds.filter((id) => Number.isFinite(Number(id)) && Number(id) > 0)
      : [];
    if (normalizedEventIds.length > 0) {
      sql += `
        AND EXISTS (
          SELECT 1
          FROM event_invite ei
          WHERE ei.contact_Id = c.contact_Contact_Id
            AND ei.is_deleted = 0
            AND ei.is_active = 1
            AND ei.event_Id IN (?)
        )
      `;
      params.push(normalizedEventIds);
    }

    const normalizedTagIds = Array.isArray(filters?.tagIds)
      ? filters.tagIds.filter((id) => Number.isFinite(Number(id)) && Number(id) > 0)
      : [];
    if (normalizedTagIds.length > 0) {
      sql += `
        AND EXISTS (
          SELECT 1
          FROM contact_tag ct
          WHERE ct.contact_Id = c.contact_Contact_Id
            AND ct.is_deleted = 0
            AND ct.is_active = 1
            AND ct.tag_Id IN (?)
        )
      `;
      params.push(normalizedTagIds);
    }

    const normalizedContactIds = Array.isArray(filters?.contactIds)
      ? filters.contactIds.filter((id) => Number.isFinite(Number(id)) && Number(id) > 0)
      : [];
    if (normalizedContactIds.length > 0) {
      sql += ' AND c.contact_Contact_Id IN (?)';
      params.push(normalizedContactIds);
    }

    return { sql, params };
  }

  async getMainListWithFilters({
    type = 'ALL',
    filters = {},
    orderBy = ['created_at', 'DESC'],
    limit = null,
    offset = null,
  } = {}) {
    const { sortField, sortDirection } = this._normalizeSortOrder(orderBy);
    const { sql: filterSql, params: filterParams } = this._buildContactListFilterClause({ type, filters });

    let sql = `
      SELECT c.*
      FROM contact c
      WHERE c.is_deleted = 0
        AND c.is_active = 1
      ${filterSql}
      ORDER BY c.${sortField} ${sortDirection}
    `;
    const params = [...filterParams];

    const hasPagination = Number.isFinite(Number(limit)) && Number(limit) > 0 && Number.isFinite(Number(offset));
    if (hasPagination) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(Number(limit), Number(offset));
    }

    return this.query(this.database, sql, params);
  }

  async getMainListWithFiltersSelectedFirst({
    type = 'ALL',
    filters = {},
    orderBy = ['created_at', 'DESC'],
    limit = null,
    offset = null,
    selectedEventIds = [],
  } = {}) {
    const { sortField, sortDirection } = this._normalizeSortOrder(orderBy);
    const { sql: filterSql, params: filterParams } = this._buildContactListFilterClause({ type, filters });
    const normalizedSelectedEventIds = Array.isArray(selectedEventIds)
      ? [...new Set(selectedEventIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))]
      : [];

    if (normalizedSelectedEventIds.length === 0) {
      return this.getMainListWithFilters({ type, filters, orderBy, limit, offset });
    }

    let sql = `
      SELECT c.*,
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM event_invite ei
            WHERE ei.contact_Id = c.contact_Contact_Id
              AND ei.is_deleted = 0
              AND ei.is_active = 1
              AND ei.event_Id IN (?)
          ) THEN 1
          ELSE 0
        END AS selected_sort_rank
      FROM contact c
      WHERE c.is_deleted = 0
        AND c.is_active = 1
      ${filterSql}
      ORDER BY selected_sort_rank DESC, c.${sortField} ${sortDirection}
    `;
    const params = [normalizedSelectedEventIds, ...filterParams];

    const hasPagination = Number.isFinite(Number(limit)) && Number(limit) > 0 && Number.isFinite(Number(offset));
    if (hasPagination) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(Number(limit), Number(offset));
    }

    return this.query(this.database, sql, params);
  }

  async countMainListWithFilters({ type = 'ALL', filters = {} } = {}) {
    const { sql: filterSql, params: filterParams } = this._buildContactListFilterClause({ type, filters });

    const sql = `
      SELECT COUNT(*) AS total
      FROM contact c
      WHERE c.is_deleted = 0
        AND c.is_active = 1
      ${filterSql}
    `;
    const rows = await this.query(this.database, sql, filterParams);
    return Number(rows?.[0]?.total || 0);
  }

  async getMainListExportChunk({ type = 'ALL', filters = {}, afterContactId = 0, limit = 2000 } = {}) {
    const { sql: filterSql, params: filterParams } = this._buildContactListFilterClause({ type, filters });
    const normalizedAfterContactId = Number.isFinite(Number(afterContactId)) ? Number(afterContactId) : 0;
    const normalizedLimit = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Number(limit) : 2000;

    let sql = `
      SELECT c.*
      FROM contact c
      WHERE c.is_deleted = 0
        AND c.is_active = 1
      ${filterSql}
    `;
    const params = [...filterParams];

    if (normalizedAfterContactId > 0) {
      sql += ' AND c.contact_Contact_Id > ?';
      params.push(normalizedAfterContactId);
    }

    sql += ' ORDER BY c.contact_Contact_Id ASC LIMIT ?';
    params.push(normalizedLimit);

    return this.query(this.database, sql, params);
  }

  async getChildren(parent_Id) {
    const sql = ` SELECT * FROM ??  WHERE contact_Parent_Id = ?  AND is_deleted = 0   AND is_active = 1 ORDER BY created_at DESC  `;
    const params = [this.tableName, parent_Id];
    return await this.query(this.database, sql, params);
  }

  async getBasicByIds(ids) {
    const sql = ` SELECT * FROM ??  WHERE contact_Contact_Id IN (?)  AND is_deleted = 0   AND is_active = 1 `;
    const params = [this.tableName, ids];

    const rows = await this.query(this.database, sql, params);
    return rows;
  }

  async getByIds(ids) {
    const sql = `
    SELECT 
      contact_Contact_Id,
      contact_Primary_Full_Name,
      contact_Last_Name,
      contact_Organization,
      CONCAT(
        COALESCE(contact_Primary_Full_Name, ''),
        CASE 
          WHEN contact_Last_Name IS NOT NULL AND contact_Last_Name <> '' 
          THEN CONCAT(' ', contact_Last_Name) 
          ELSE '' 
        END
      ) AS contact_Full_Name,
      contact_Type,
      is_available_For_Print,
      contact_Salutation,
      contact_Parent_Id
    FROM contact 
    WHERE contact_Contact_Id IN (?) 
      AND is_deleted = 0
  `;

    const params = [ids];
    const rows = await this.query(this.database, sql, params);
    return rows;
  }

  async getByIdsIncludingDeleted(ids) {
    const sql = `
    SELECT 
      contact_Contact_Id,
      contact_Primary_Full_Name,
      contact_Last_Name,
      contact_Organization,
      CONCAT(
        COALESCE(contact_Primary_Full_Name, ''),
        CASE 
          WHEN contact_Last_Name IS NOT NULL AND contact_Last_Name <> '' 
          THEN CONCAT(' ', contact_Last_Name) 
          ELSE '' 
        END
      ) AS contact_Full_Name,
      contact_Type,
      is_available_For_Print,
      contact_Salutation,
      contact_Parent_Id
    FROM contact 
    WHERE contact_Contact_Id IN (?)
  `;

    const params = [ids];
    const rows = await this.query(this.database, sql, params);
    return rows;
  }

  async findLiveByNameAndAddressLine1Pairs(pairs = []) {
    const normalizedPairs = (Array.isArray(pairs) ? pairs : [])
      .map((pair) => ({
        name: String(pair?.name || '')
          .trim()
          .toLowerCase(),
        address_line1: String(pair?.address_line1 || '')
          .trim()
          .toLowerCase(),
      }))
      .filter((pair) => !utility.checkEmpty(pair.name) && !utility.checkEmpty(pair.address_line1));

    if (utility.checkEmpty(normalizedPairs)) return [];

    const uniquePairMap = new Map();
    normalizedPairs.forEach((pair) => {
      const key = `${pair.name}|${pair.address_line1}`;
      if (!uniquePairMap.has(key)) uniquePairMap.set(key, pair);
    });
    const uniquePairs = Array.from(uniquePairMap.values());

    const chunkSize = 500;
    const results = [];

    for (let i = 0; i < uniquePairs.length; i += chunkSize) {
      const chunk = uniquePairs.slice(i, i + chunkSize);
      const tuplePlaceholders = chunk.map(() => '(?, ?)').join(', ');
      const tupleParams = [];
      chunk.forEach((pair) => {
        tupleParams.push(pair.name, pair.address_line1);
      });

      const sql = `
        SELECT DISTINCT
          c.contact_Contact_Id AS contact_Id,
          c.contact_Primary_Full_Name,
          ca.address_line1
        FROM contact c
        INNER JOIN contact_address ca
          ON ca.contact_Id = c.contact_Contact_Id
         AND ca.is_deleted = 0
        WHERE c.is_deleted = 0
          AND c.is_active = 1
          AND c.contact_Parent_Id = 0
          AND (
            c.contact_Primary_Full_Name COLLATE utf8mb4_general_ci,
            ca.address_line1 COLLATE utf8mb4_general_ci
          ) IN (${tuplePlaceholders})
      `;

      const rows = await this.query(this.database, sql, tupleParams);
      if (Array.isArray(rows) && rows.length > 0) {
        results.push(...rows);
      }
    }

    return results;
  }

  async searchRelationshipTypes({ search = '', limit = 25 } = {}) {
    const normalizedSearch = String(search || '').trim().toLowerCase();
    const parsedLimit = Number(limit);
    const safeLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(Math.floor(parsedLimit), 100) : 25;

    const whereClauses = [
      'is_deleted = 0',
      'is_active = 1',
      'contact_Relation IS NOT NULL',
      "TRIM(contact_Relation) <> ''",
    ];
    const params = [];

    if (!utility.checkEmpty(normalizedSearch)) {
      whereClauses.push('LOWER(TRIM(contact_Relation)) LIKE ?');
      params.push(`%${normalizedSearch}%`);
    }

    const sql = `
      SELECT
        LOWER(TRIM(contact_Relation)) AS relationship_key,
        MIN(TRIM(contact_Relation)) AS relationship,
        COUNT(*) AS usage_count
      FROM contact
      WHERE ${whereClauses.join(' AND ')}
      GROUP BY LOWER(TRIM(contact_Relation))
      ORDER BY usage_count DESC, relationship ASC
      LIMIT ?
    `;

    params.push(safeLimit);
    return this.query(this.database, sql, params);
  }
}

module.exports = new ContactRepository();
