# API Updated Summary (Postman Style)

## Base URL

```text
{{devEmamiURL}}/api
```

## Common Headers (Protected APIs)

```http
Authorization: Bearer <token>
Content-Type: application/json
```

## Standard Response Wrapper (Typical)

```json
{
  "status": "success",
  "msg": "Message",
  "data": {}
}
```

## API Changes

## Contact APIs (Updated)

### POST `{{devEmamiURL}}/api/contact/add` (UPDATED)

Headers:

```http
Authorization: Bearer <token>
Content-Type: application/json
```

Request Body (new field supported):

```json
{
  "inputData": {
    "salutation": "Mr.",
    "full_name": "John",
    "type": "main",
    "organization": "Acme Pvt Ltd"
  }
}
```

Notes:

```text
- Supports organization / contact_Organization in create payload
- Persists to contact.contact_Organization
```

### POST `{{devEmamiURL}}/api/contact/update/:id` (UPDATED)

Headers:

```http
Authorization: Bearer <token>
Content-Type: application/json
```

Request Body (new field supported):

```json
{
  "inputData": {
    "organization": "Acme Pvt Ltd"
  }
}
```

Notes:

```text
- Supports organization / contact_Organization in update payload
- Persists to contact.contact_Organization
```

### POST `{{devEmamiURL}}/api/contact/get-by-id` (UPDATED)

Field Updates:

```text
- Returns organization field in contact response mapping
```

### POST `{{devEmamiURL}}/api/contact/list` (UPDATED)

Field Updates:

```text
- Returns organization field in list rows
- Sorting supports contact_Organization
```

## Contact Import / Duplicate APIs (Updated)

### POST `{{devEmamiURL}}/api/contact-imports/...` (UPDATED - Import Queue / Import Processing)

Headers:

```http
Authorization: Bearer <token>
Content-Type: application/json
```

Behavior Updates:

```text
- Excel parser reads organization column headers (e.g. Organization / ORG / variants)
- Stores duplicate_contact_Organization in duplicate_contact table
- Carries organization into final contact creation paths
```

### POST `{{devEmamiURL}}/api/contact-imports/...` (UPDATED - Duplicate Review/List)

Field Updates:

```text
- Duplicate review/list responses include organization field
```

## Event APIs (Updated)

### POST `{{devEmamiURL}}/api/event/list` (UPDATED)

Headers:

```http
Authorization: Bearer <token>
Content-Type: application/json
```

Request Body (sorting example):

```json
{
  "inputData": {
    "sorting": {
      "Key": "event_location",
      "value": "desc"
    }
  }
}
```

Behavior Updates:

```text
- Ascending/descending sorting now works across event row fields
- Supported direction values: asc, desc, ascending, descending
```

### POST `{{devEmamiURL}}/api/event/list-main-with-sub-events` (UPDATED)

Behavior Updates:

```text
- Sorting support expanded across event fields (removed old hardcoded whitelist limitation)
```

### POST `{{devEmamiURL}}/api/event/list-new` (UPDATED)

Headers:

```http
Authorization: Bearer <token>
Content-Type: application/json
```

Request Body (sorting/filter example):

```json
{
  "inputData": {
    "pagination": { "page": 1, "limit": 10 },
    "filter": {
      "event_name": "Meet",
      "status": ["approved"]
    },
    "sorting": { "Key": "created_At", "value": "ascending" }
  }
}
```

New / Updated Response Fields (main event row):

```json
{
  "event_Id": 123,
  "event_name": "Annual Meet",
  "totaluniqueInvitees": 42,
  "invited_users": [
    {
      "event_invite_Id": 5001,
      "contact_Id": 456,
      "contact_name": "John Doe",
      "invited_by": "Admin User",
      "association": [{ "type": "direct", "name": "Invited Directly" }]
    }
  ],
  "children": []
}
```

Behavior Updates:

```text
- Sorting support expanded across event fields
- Adds totaluniqueInvitees on main event rows
- totaluniqueInvitees counts unique contact_Id invitees across main + child events
- invited_users[].association now includes direct, tag, parent-tag, and family-group sources
```

## Event Invite APIs (Updated / Created)

### POST `{{devEmamiURL}}/api/event-invite/send-invite` (UPDATED)

Headers:

```http
Authorization: Bearer <token>
Content-Type: application/json
```

Behavior Updates:

```text
- Creates a single summary audit row per API call (action = invite-sent)
- Audit comments include created/skipped/requested counts and relevant metadata
```

### POST `{{devEmamiURL}}/api/event-invite/delete` (UPDATED)

Headers:

```http
Authorization: Bearer <token>
Content-Type: application/json
```

Request Body:

```json
{
  "inputData": {
    "invite_Id": 45
  }
}
```

Behavior Updates:

```text
- Writes audit row (action = invite-removed)
```

### POST `{{devEmamiURL}}/api/event-invite/delete-many` (NEW)

Headers:

```http
Authorization: Bearer <token>
Content-Type: application/json
```

Request Body:

```json
{
  "inputData": {
    "event_Id": 123,
    "invite_Ids": [45, 46, 47]
  }
}
```

Success Response (`data`):

```json
{
  "event_Id": 123,
  "requested_count": 3,
  "matched_count": 2,
  "deleted_count": 4,
  "selected_deleted_count": 2,
  "cascade_child_deleted_count": 1,
  "auto_parent_deleted_count": 1,
  "missing_count": 1,
  "deleted_selected_invite_Ids": [45, 46],
  "deleted_cascade_child_invite_Ids": [88],
  "deleted_auto_parent_invite_Ids": [12],
  "missing_invite_Ids": [47]
}
```

Behavior:

```text
- Accepts one or many invite IDs in same array
- Deletes only invites belonging to given event_Id
- Creates one summary audit row (invite-removed)
- Resets event_Is_Sent_For_Approval = 0 if any invite is removed
- Cascades tag-parent invite children removal when required
- Auto-removes orphan tag parent invites when children are removed
```

## Dashboard / Audit APIs (Updated)

### POST `{{devEmamiURL}}/api/dashboard/audit-log` (UPDATED)

Headers:

```http
Authorization: Bearer <token>
Content-Type: application/json
```

Request Body (date filter example):

```json
{
  "inputData": {
    "pagination": { "page": 1, "limit": 20 },
    "filter": {
      "start_date": "2026-02-01",
      "end_date": "2026-02-23"
    }
  }
}
```

Supported Date Filter Keys:

```text
start_date, end_date
startDate, endDate
date_from, date_to
from_date, to_date
```

Behavior Updates:

```text
- Date-only values (YYYY-MM-DD) are expanded to full-day range
- Pagination now returns total and accurate has_more
- Audit title/subtitle formatting improved for EVENT / CONTACT / RBAC
- Missing/deleted references show fallback subtitle (e.g. EVENT #123)
```

## Notification APIs (New)

Route Base:

```text
{{devEmamiURL}}/api/notification
```

### POST `{{devEmamiURL}}/api/notification/unread-status` (NEW)

Headers:

```http
Authorization: Bearer <token>
Content-Type: application/json
```

Request Body:

```json
{
  "inputData": {}
}
```

Success Response (`data`):

```json
{
  "unread_count": 4,
  "isUnReadNotification": true
}
```

### POST `{{devEmamiURL}}/api/notification/list` (NEW)

Headers:

```http
Authorization: Bearer <token>
Content-Type: application/json
```

Request Body (example):

```json
{
  "inputData": {
    "pagination": { "page": 1, "limit": 20 },
    "filter": {
      "module": "EVENT",
      "action": "invite-sent",
      "is_read": "unread",
      "start_date": "2026-02-01",
      "end_date": "2026-02-23"
    },
    "mark_as_read": true
  }
}
```

Supported Filters:

```text
module
action
is_read / isRead (true/false/read/unread/1/0)
start_date / end_date (+ aliases)
```

Supported Request Options:

```text
mark_as_read: true
markAsRead: true
```

Success Response (`data`):

```json
{
  "data": [
    {
      "notification_Id": 1,
      "title": "Event Invite Sent",
      "module": "EVENT",
      "ref_id": 123,
      "action": "invite-sent",
      "details": "invite_type=contact, created=10, skipped=2, requested=12",
      "modified_By": 7,
      "is_read": true,
      "read_at": "2026-02-23 12:00:00",
      "created_at": "2026-02-23 11:59:30",
      "source_table": "event_approval_log",
      "source_audit_id": 550
    }
  ],
  "marked_read_count": 20
}
```
