const utility = require('../helpers/utility');
const moment = require('moment-timezone');
const NotificationRepo = require('../services/repositories/NotificationRepository.js');
const EventRepo = require('../services/repositories/EventMasterRepository.js');
const ContactRepo = require('../services/repositories/ContactRepository.js');

const notificationController = exports;

const normalizeAuditDate = (value, bound = 'start') => {
  if (utility.checkEmpty(value)) return null;

  const raw = String(value).trim();
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);

  let parsed = null;
  if (isDateOnly) {
    parsed = moment(raw, 'YYYY-MM-DD', true);
    if (!parsed.isValid()) return null;
    parsed = bound === 'end' ? parsed.endOf('day') : parsed.startOf('day');
  } else {
    parsed = moment(raw, moment.ISO_8601, true);
    if (!parsed.isValid()) {
      parsed = moment(raw, 'YYYY-MM-DD HH:mm:ss', true);
    }
    if (!parsed.isValid()) return null;
  }

  return parsed.format('YYYY-MM-DD HH:mm:ss');
};

const toBooleanReadFilter = (value) => {
  if (value === true || value === 1 || value === '1') return 1;
  if (value === false || value === 0 || value === '0') return 0;

  const normalized = String(value || '')
    .trim()
    .toLowerCase();

  if (['true', 'yes', 'y', 'read'].includes(normalized)) return 1;
  if (['false', 'no', 'n', 'unread'].includes(normalized)) return 0;
  return null;
};

const normalizeNotificationIds = (input = null) => {
  const raw = Array.isArray(input) ? input : [input];

  return [...new Set(raw.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))];
};

const getCurrentNotificationUserId = (req) => {
  const userId = Number(req?.locals?.userData?.user_Id || 0);
  return Number.isFinite(userId) && userId > 0 ? userId : null;
};

const resolveUserNotificationStartAt = (req) => {
  const userData = req?.locals?.userData || {};

  const candidateFields = [
    'created_at',
    'user_created_at',
    'user_Created_At',
    'user_CreatedAt',
    'createdAt',
    'user_Join_Date',
    'user_join_date',
  ];

  for (const fieldName of candidateFields) {
    if (utility.checkEmpty(userData?.[fieldName])) continue;

    const normalized = normalizeAuditDate(userData[fieldName], 'start');
    if (normalized) return normalized;
  }

  return null;
};

const getUnreadNotificationCountForUser = async (req) => {
  const currentUserId = getCurrentNotificationUserId(req);
  const userNotificationStartAt = resolveUserNotificationStartAt(req);

  if (currentUserId) {
    const userScopedUnreadCount = await NotificationRepo.getUnreadCountForUser({
      user_Id: currentUserId,
      createdAtGte: userNotificationStartAt || null,
    });

    if (userScopedUnreadCount !== null) {
      return Number(userScopedUnreadCount || 0);
    }
  }

  if (!userNotificationStartAt) {
    return NotificationRepo.getUnreadCount();
  }

  const sql = `
    SELECT COUNT(*) AS total
    FROM ??
    WHERE ?? = 0
      AND ?? = 0
      AND ?? >= ?
  `;

  const rows = await NotificationRepo.query(NotificationRepo.database, sql, [
    NotificationRepo.tableName,
    'is_deleted',
    'is_read',
    'created_at',
    userNotificationStartAt,
  ]);

  return Number(rows?.[0]?.total || 0);
};

exports.getUnreadNotificationStatus = async (req, res) => {
  try {
    const unread_count = await getUnreadNotificationCountForUser(req);

    return utility.sendSuccess(
      res,
      req,
      {
        unread_count,
        isUnReadNotification: unread_count > 0,
      },
      'Notification status fetched successfully',
      200,
    );
  } catch (error) {
    console.log('getUnreadNotificationStatus error:', error);
    return utility.sendError(res, req, null, 'Failed to fetch notification status', 500);
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const rawInputData = req.body?.inputData || {};
    const inputData =
      rawInputData && typeof rawInputData === 'object' && rawInputData.inputData && typeof rawInputData.inputData === 'object'
        ? rawInputData.inputData
        : rawInputData;
    const currentUserId = getCurrentNotificationUserId(req);
    const userNotificationStartAt = resolveUserNotificationStartAt(req);
    const rawMarkAll = inputData.mark_all ?? inputData.markAll ?? req.body?.mark_all ?? req.body?.markAll;
    const markAll =
      rawMarkAll === true ||
      rawMarkAll === 1 ||
      rawMarkAll === '1' ||
      String(rawMarkAll || '').trim().toLowerCase() === 'true';
    const notification_Id =
      inputData.notification_Id ??
      inputData.notificationId ??
      req.body?.notification_Id ??
      req.body?.notificationId ??
      null;
    const notification_Ids =
      inputData.notification_Ids ??
      inputData.notificationIds ??
      req.body?.notification_Ids ??
      req.body?.notificationIds ??
      null;

    if (markAll) {
      let marked_read_count = 0;

      if (currentUserId) {
        const userScopedMarkCount = await NotificationRepo.markAllUnreadAsReadForUser({
          user_Id: currentUserId,
          now: req.locals?.now || null,
          createdAtGte: userNotificationStartAt || null,
        });

        if (userScopedMarkCount !== null) {
          marked_read_count = Number(userScopedMarkCount || 0);
        } else {
          const markAllParams = [
            NotificationRepo.tableName,
            'is_read',
            'read_at',
            req.locals?.now || null,
            'updated_at',
            req.locals?.now || null,
            'is_deleted',
            'is_active',
            'is_read',
          ];
          let markAllSql = `
            UPDATE ??
            SET ?? = 1, ?? = ?, ?? = ?
            WHERE ?? = 0
              AND ?? = 1
              AND ?? = 0
          `;

          if (userNotificationStartAt) {
            markAllSql += ` AND ?? >= ?`;
            markAllParams.push('created_at', userNotificationStartAt);
          }

          const markAllResult = await NotificationRepo.query(NotificationRepo.database, markAllSql, markAllParams);
          marked_read_count = Number(markAllResult?.affectedRows || 0);
        }
      }

      const unread_count = await getUnreadNotificationCountForUser(req);
      return utility.sendSuccess(
        res,
        req,
        {
          notification_Ids: [],
          mark_all: true,
          marked_read_count,
          unread_count,
          isUnReadNotification: unread_count > 0,
        },
        marked_read_count > 0 ? 'All notifications marked as read' : 'No unread notifications found',
        200,
      );
    }

    const ids = normalizeNotificationIds(
      !utility.checkEmpty(notification_Ids) ? notification_Ids : notification_Id,
    );

    if (utility.checkEmpty(ids)) {
      return utility.sendError(
        res,
        req,
        null,
        'notification_Id or notification_Ids is required (or pass mark_all: true)',
        400,
      );
    }

    let markableIds = ids;

    if (userNotificationStartAt) {
      const visibleRows = await NotificationRepo.query(
        NotificationRepo.database,
        `
          SELECT ?? FROM ??
          WHERE ?? IN (?)
            AND ?? = 0
            AND ?? >= ?
        `,
        [
          NotificationRepo.idColumn,
          NotificationRepo.tableName,
          NotificationRepo.idColumn,
          ids,
          'is_deleted',
          'created_at',
          userNotificationStartAt,
        ],
      );

      markableIds = (visibleRows || [])
        .map((row) => Number(row?.[NotificationRepo.idColumn]))
        .filter((id) => Number.isFinite(id) && id > 0);
    }

    let marked_read_count = 0;
    if (currentUserId) {
      const userScopedMarkCount = await NotificationRepo.markReadByIdsForUser(
        currentUserId,
        markableIds,
        req.locals?.now || null,
      );

      if (userScopedMarkCount !== null) {
        marked_read_count = Number(userScopedMarkCount || 0);
      } else {
        marked_read_count = await NotificationRepo.markReadByIds(markableIds, req.locals?.now || null);
      }
    } else {
      marked_read_count = await NotificationRepo.markReadByIds(markableIds, req.locals?.now || null);
    }
    const unread_count = await getUnreadNotificationCountForUser(req);

    return utility.sendSuccess(
      res,
      req,
      {
        notification_Ids: markableIds,
        marked_read_count,
        unread_count,
        isUnReadNotification: unread_count > 0,
      },
      marked_read_count > 0 ? 'Notification marked as read' : 'Notification already read',
      200,
    );
  } catch (error) {
    console.log('markNotificationRead error:', error);
    return utility.sendError(res, req, null, 'Failed to mark notification as read', 500);
  }
};

exports.getNotificationList = async (req, res) => {
  try {
    const inputData = req.body.inputData || {};
    const pagination = inputData.pagination || {};
    const filter = inputData.filter || {};

    const pageRaw = Number(pagination.page || 1);
    const limitRaw = Number(pagination.limit || 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : 10;
    const offset = (page - 1) * limit;

    const where = {
      is_deleted: 0,
      is_active: 1,
    };

    if (!utility.checkEmpty(filter.module)) {
      where.notification_Module = String(filter.module).trim().toUpperCase();
    }

    if (!utility.checkEmpty(filter.action)) {
      where.notification_Action = String(filter.action).trim();
    }

    const readFilterRaw = utility.isset(filter, 'is_read') ? filter.is_read : filter.isRead;
    if (utility.isset(filter, 'is_read') || utility.isset(filter, 'isRead')) {
      const parsedReadFilter = toBooleanReadFilter(readFilterRaw);
      if (parsedReadFilter === null) {
        return utility.sendError(res, req, null, 'Invalid is_read. Use true/false, read/unread, or 1/0', 400);
      }
      where.is_read = parsedReadFilter;
    }

    const startDateInput = filter.start_date ?? filter.startDate ?? filter.date_from ?? filter.from_date ?? null;
    const endDateInput = filter.end_date ?? filter.endDate ?? filter.date_to ?? filter.to_date ?? null;

    const requestedStartDate = normalizeAuditDate(startDateInput, 'start');
    const endDate = normalizeAuditDate(endDateInput, 'end');
    const userNotificationStartAt = resolveUserNotificationStartAt(req);

    if (!utility.checkEmpty(startDateInput) && !requestedStartDate) {
      return utility.sendError(res, req, null, 'Invalid start_date. Use YYYY-MM-DD or ISO datetime', 400);
    }

    if (!utility.checkEmpty(endDateInput) && !endDate) {
      return utility.sendError(res, req, null, 'Invalid end_date. Use YYYY-MM-DD or ISO datetime', 400);
    }

    if (requestedStartDate && endDate && new Date(requestedStartDate) > new Date(endDate)) {
      return utility.sendError(res, req, null, 'start_date must be before or equal to end_date', 400);
    }

    let startDate = requestedStartDate;
    if (userNotificationStartAt) {
      startDate = startDate ? (startDate > userNotificationStartAt ? startDate : userNotificationStartAt) : userNotificationStartAt;
    }

    if (startDate && !endDate) {
      where.created_at = { op: '>=', value: startDate };
    }
    if (endDate && !startDate) {
      where.created_at = { op: '<=', value: endDate };
    }

    let rows = [];
    let total = 0;

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      rows = [];
      total = 0;
    } else if (startDate && endDate) {
      // When both bounds are present, build custom query because BaseRepository only supports one operator per field.
      const sql = `
        SELECT * FROM ??
        WHERE ?? = 0
          AND ?? = 1
          ${!utility.checkEmpty(where.notification_Module) ? 'AND ?? = ?' : ''}
          ${!utility.checkEmpty(where.notification_Action) ? 'AND ?? = ?' : ''}
          ${utility.isset(where, 'is_read') ? 'AND ?? = ?' : ''}
          AND ?? >= ?
          AND ?? <= ?
        ORDER BY ?? DESC
        LIMIT ? OFFSET ?
      `;

      const params = [NotificationRepo.tableName, 'is_deleted', 'is_active'];
      if (!utility.checkEmpty(where.notification_Module)) {
        params.push('notification_Module', where.notification_Module);
      }
      if (!utility.checkEmpty(where.notification_Action)) {
        params.push('notification_Action', where.notification_Action);
      }
      if (utility.isset(where, 'is_read')) {
        params.push('is_read', where.is_read);
      }
      params.push('created_at', startDate, 'created_at', endDate, 'created_at', limit, offset);

      rows = await NotificationRepo.query(NotificationRepo.database, sql, params);

      const countSql = `
        SELECT COUNT(*) AS total FROM ??
        WHERE ?? = 0
          AND ?? = 1
          ${!utility.checkEmpty(where.notification_Module) ? 'AND ?? = ?' : ''}
          ${!utility.checkEmpty(where.notification_Action) ? 'AND ?? = ?' : ''}
          ${utility.isset(where, 'is_read') ? 'AND ?? = ?' : ''}
          AND ?? >= ?
          AND ?? <= ?
      `;

      const countParams = [NotificationRepo.tableName, 'is_deleted', 'is_active'];
      if (!utility.checkEmpty(where.notification_Module)) {
        countParams.push('notification_Module', where.notification_Module);
      }
      if (!utility.checkEmpty(where.notification_Action)) {
        countParams.push('notification_Action', where.notification_Action);
      }
      if (utility.isset(where, 'is_read')) {
        countParams.push('is_read', where.is_read);
      }
      countParams.push('created_at', startDate, 'created_at', endDate);

      const countRows = await NotificationRepo.query(NotificationRepo.database, countSql, countParams);
      total = Number(countRows?.[0]?.total || 0);
    } else {
      rows = await NotificationRepo.getAllWithFilter(where, limit, offset);
      total = await NotificationRepo.countWithFilter(where);
    }

    const currentUserId = getCurrentNotificationUserId(req);
    const hasUserReadTable = currentUserId ? await NotificationRepo.hasUserReadTable() : false;

    if (hasUserReadTable && !utility.checkEmpty(rows)) {
      const rowIds = (rows || [])
        .map((row) => Number(row.notification_Id))
        .filter((id) => Number.isFinite(id) && id > 0);

      if (rowIds.length > 0) {
        const userReadRows = await NotificationRepo.getUserReadRowsByNotificationIds(currentUserId, rowIds);
        const userReadMap = {};
        (userReadRows || []).forEach((row) => {
          const notificationId = Number(row?.notification_Id || 0);
          if (!Number.isFinite(notificationId) || notificationId <= 0) return;
          userReadMap[notificationId] = row;
        });

        rows = rows.map((row) => {
          const notificationId = Number(row.notification_Id || 0);
          const userRead = userReadMap[notificationId];
          return {
            ...row,
            is_read: userRead ? 1 : 0,
            read_at: userRead?.read_at || null,
          };
        });
      }
    }

    const markAsRead = inputData.mark_as_read === true || inputData.markAsRead === true;
    let marked_read_count = 0;

    if (markAsRead && !utility.checkEmpty(rows)) {
      const unreadIds = rows
        .filter((row) => Number(row.is_read) !== 1)
        .map((row) => Number(row.notification_Id))
        .filter((id) => Number.isFinite(id) && id > 0);

      if (unreadIds.length > 0) {
        if (hasUserReadTable && currentUserId) {
          const userScopedMarkCount = await NotificationRepo.markReadByIdsForUser(
            currentUserId,
            unreadIds,
            req.locals?.now || null,
          );
          marked_read_count = Number(userScopedMarkCount || 0);
        } else {
          marked_read_count = await NotificationRepo.markReadByIds(unreadIds, req.locals?.now || null);
        }
        rows = rows.map((row) =>
          unreadIds.includes(Number(row.notification_Id))
            ? {
                ...row,
                is_read: 1,
                read_at: req.locals?.now || row.read_at || null,
              }
            : row,
        );
      }
    }

    const eventNotificationIds = [...new Set(
      (rows || [])
        .filter((row) => String(row?.notification_Module || '').toUpperCase() === 'EVENT')
        .map((row) => Number(row?.notification_Ref_Id))
        .filter((id) => Number.isFinite(id) && id > 0),
    )];
    const contactNotificationIds = [...new Set(
      (rows || [])
        .filter((row) => String(row?.notification_Module || '').toUpperCase() === 'CONTACT')
        .map((row) => Number(row?.notification_Ref_Id))
        .filter((id) => Number.isFinite(id) && id > 0),
    )];

    let eventNameMap = {};
    if (eventNotificationIds.length > 0) {
      try {
        const eventRows = await EventRepo.getByIds(eventNotificationIds);
        eventNameMap = (eventRows || []).reduce((acc, eventRow) => {
          const eventId = Number(eventRow?.event_Id || 0);
          if (!Number.isFinite(eventId) || eventId <= 0) return acc;
          acc[eventId] = eventRow?.event_name || null;
          return acc;
        }, {});
      } catch (eventNameError) {
        console.log('getNotificationList event name hydrate error:', eventNameError?.message || eventNameError);
      }
    }

    let contactNameMap = {};
    if (contactNotificationIds.length > 0) {
      try {
        const contactRows = await ContactRepo.getByIdsIncludingDeleted(contactNotificationIds);
        contactNameMap = (contactRows || []).reduce((acc, contactRow) => {
          const contactId = Number(contactRow?.contact_Contact_Id || 0);
          if (!Number.isFinite(contactId) || contactId <= 0) return acc;

          const contactName =
            contactRow?.contact_Full_Name ||
            [
              contactRow?.contact_Primary_Full_Name,
              contactRow?.contact_Last_Name,
            ]
              .map((value) => String(value || '').trim())
              .filter(Boolean)
              .join(' ') ||
            null;

          acc[contactId] = contactName;
          return acc;
        }, {});
      } catch (contactNameError) {
        console.log('getNotificationList contact name hydrate error:', contactNameError?.message || contactNameError);
      }
    }

    const data = (rows || []).map((row) => {
      const moduleKey = String(row.notification_Module || '').toUpperCase();
      const refId = utility.checkEmpty(row.notification_Ref_Id) ? null : Number(row.notification_Ref_Id);
      let subtitle = null;

      if (Number.isFinite(refId) && refId > 0) {
        if (moduleKey === 'EVENT') {
          subtitle = eventNameMap[refId] || null;
        } else if (moduleKey === 'CONTACT') {
          subtitle = contactNameMap[refId] || null;
        }
      }

      return {
        notification_Id: row.notification_Id,
        title: row.notification_Title || null,
        subtitle,
        module: row.notification_Module || null,
        ref_id: refId,
        action: row.notification_Action || null,
        details: row.notification_Details || null,
        modified_By: utility.checkEmpty(row.notification_Triggered_By_User_Id)
          ? null
          : Number(row.notification_Triggered_By_User_Id),
        is_read: Number(row.is_read) === 1,
        read_at: row.read_at || null,
        created_at: row.created_at || null,
        source_table: row.notification_Source_Table || null,
        source_audit_id: utility.checkEmpty(row.notification_Source_Audit_Id)
          ? null
          : Number(row.notification_Source_Audit_Id),
      };
    });

    return utility.sendSuccess(
      res,
      req,
      {
        data,
        marked_read_count,
      },
      'Notifications fetched successfully',
      200,
      {
        page,
        limit,
        total,
        has_more: offset + data.length < total,
      },
    );
  } catch (error) {
    console.log('getNotificationList error:', error);
    return utility.sendError(res, req, null, 'Failed to fetch notifications', 500);
  }
};

module.exports = notificationController;
