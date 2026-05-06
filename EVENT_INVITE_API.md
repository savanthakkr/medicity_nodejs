# Event Invite API (Frontend Handoff)

## Base Route

- Base path: `POST /event-invite/...`
- Auth: required (all endpoints are behind auth middleware)
- Most requests use:

```json
{
  "inputData": {}
}
```

## Important Behavior (Sub Events)

- Invites added to a main event are **not automatically inherited** to sub-events.
- Each sub-event has a dedicated one-time sync API:
  - `POST /event-invite/sync-sub-event-invites`
- Sync can be done **only once per sub-event**.

## Endpoints Overview

- `POST /event-invite/send-invite`
- `POST /event-invite/list`
- `POST /event-invite/search`
- `POST /event-invite/delete`
- `POST /event-invite/delete-many`
- `POST /event-invite/sync-sub-event-invites`
- `POST /event-invite/status-change` (this changes **event workflow status**, not individual invite status)

## 1) Send Invites

### Endpoint

- `POST /event-invite/send-invite`

### Supported `invite_type`

- `contact`
- `tag`
- `parent-tag`
- `family-group`

### Common Fields

- `event_Id` (required)
- `invite_type` (required)
- `invite_label` (optional)

### Type-specific fields

- `contact` -> `contact_Ids` (array, required)
- `tag` -> `tag_Id` (required)
- `parent-tag` -> `tag_Id` (required; parent tag id)
- `family-group` -> `family_group_Id` (required)

### Request Examples

#### A. Direct contact invites

```json
{
  "inputData": {
    "event_Id": 101,
    "invite_type": "contact",
    "contact_Ids": [11, 12, 13],
    "invite_label": "VIP Batch"
  }
}
```

#### B. Tag invites

```json
{
  "inputData": {
    "event_Id": 101,
    "invite_type": "tag",
    "tag_Id": 8,
    "invite_label": "Corporate"
  }
}
```

#### C. Parent-tag invites

```json
{
  "inputData": {
    "event_Id": 101,
    "invite_type": "parent-tag",
    "tag_Id": 5,
    "invite_label": "All Sub Tags"
  }
}
```

#### D. Family-group invites

```json
{
  "inputData": {
    "event_Id": 101,
    "invite_type": "family-group",
    "family_group_Id": 22,
    "invite_label": "Sharma Family"
  }
}
```

### Responses (data payload)

- `contact` -> `[]`
- `family-group` -> `[]`
- `tag` -> `{ "parentInviteId": <number> }`
- `parent-tag` -> `{ "parentInviteId": <number> }`

### Important Notes

- Backend skips duplicate invites where applicable (same contact/tag invite already exists for that event structure).
- Adding invites to a parent/main event does **not** copy them to sub-events automatically.
- If a sub-event has a parent event, backend validates the parent event is active before allowing invite creation on the sub-event.

## 2) List Invites

### Endpoint

- `POST /event-invite/list`

### Request

- `invite_type` is required
- `event_Id` is optional (if omitted, backend lists across all events)
- Allowed `invite_type` for this endpoint:
  - `contact`
  - `tag`
  - `parent-tag`

```json
{
  "inputData": {
    "invite_type": "contact",
    "event_Id": 101
  }
}
```

### Response Shape by `invite_type`

#### A. `contact`

```json
[
  {
    "invite_Id": 501,
    "invite_status": "pending",
    "invite_label": "VIP Batch",
    "contact": {
      "contact_Id": 11,
      "contact_name": "John Doe",
      "contact_type": "SELF"
    },
    "event": {
      "event_Id": 101,
      "event_name": "Annual Meet",
      "event_date": null,
      "event_location": "Kolkata"
    }
  }
]
```

#### B. `tag`

Returns grouped structure: parent tag invite + child contact invites.

```json
[
  {
    "tag": {
      "tag_name": "Corporate",
      "tag_Id": 8,
      "invite_Id": 600,
      "invite_status": "pending",
      "invite_label": "Corporate",
      "event_invite_parent_Id": 600
    },
    "event": {
      "event_Id": 101,
      "event_name": "Annual Meet",
      "event_date": null,
      "event_location": "Kolkata"
    },
    "contacts": [
      {
        "invite_Id": 601,
        "invite_status": "pending",
        "invite_label": "Corporate",
        "contact": {
          "contact_Id": 11,
          "contact_name": "John Doe",
          "contact_type": "SELF"
        }
      }
    ]
  }
]
```

#### C. `parent-tag`

Same grouped shape as `tag`, but child contacts come from parent-tag invite expansion.

## 3) Search Invitee List (for Event)

### Endpoint

- `POST /event-invite/search`

### Request

- `filter.event_Id` required
- `filter.name` optional (prefix search on `contact_name`)

```json
{
  "inputData": {
    "filter": {
      "event_Id": 101,
      "name": "jo"
    }
  }
}
```

### Response (data payload)

```json
[
  {
    "invite_Id": 501,
    "contact_Id": 11,
    "contact_name": "John Doe",
    "contact_Type": "",
    "isDuplicate": false
  }
]
```

Notes:
- `isDuplicate` is computed when same `contact_Id` appears multiple times in the event invite table (different invite rows).

## 4) Delete Single Invite

### Endpoint

- `POST /event-invite/delete`

### Request

```json
{
  "inputData": {
    "invite_Id": 501
  }
}
```

### Response (data payload)

- `null`

## 5) Delete Multiple Invites

### Endpoint

- `POST /event-invite/delete-many`

### Request

- `event_Id` required
- `invite_Ids` required (array; single value also accepted by backend, but send array from frontend)

```json
{
  "inputData": {
    "event_Id": 101,
    "invite_Ids": [600, 501]
  }
}
```

### Behavior

- Soft deletes selected invites in the given event
- If a selected invite is a parent `tag` invite, backend also deletes its child invites in that event
- If deleting child invites leaves a parent tag invite orphaned, backend may auto-delete that parent invite

### Response (data payload summary)

```json
{
  "event_Id": 101,
  "requested_count": 2,
  "matched_count": 2,
  "deleted_count": 3,
  "selected_deleted_count": 2,
  "cascade_child_deleted_count": 1,
  "auto_parent_deleted_count": 0,
  "missing_count": 0,
  "deleted_selected_invite_Ids": [600, 501],
  "deleted_cascade_child_invite_Ids": [601],
  "deleted_auto_parent_invite_Ids": [],
  "missing_invite_Ids": []
}
```

## 6) Sync Invites From Main Event to Sub-Event (One-Time)

### Endpoint

- `POST /event-invite/sync-sub-event-invites`

### Request

- `event_Id` must be the **sub-event ID** (not main event)

```json
{
  "inputData": {
    "event_Id": 202
  }
}
```

### What Sync Does

- Copies invites from the main event (`event_parent_Id`) into the sub-event
- Preserves parent/child tag invite relationships
- Skips invite rows already present in the sub-event
- Marks the sub-event as synced (`event_invite_sync_done = 1`)
- Can be executed **only once**

### How Frontend Can Know If Sync Is Already Done

Use any of these checks:

1. Preferred: read `event_invite_sync_done` from sub-event data (from event list/detail API response if your event API returns raw event fields).
   - `0` -> not synced yet
   - `1` -> already synced

2. After a successful sync call, backend returns:
   - `"event_invite_sync_done": 1`

3. If frontend calls sync again, backend returns `400` with:
   - `Sub event invites already synced. Sync can be done only once`

Frontend recommendation:
- Store/use `event_invite_sync_done` on sub-event row and disable/hide the Sync button when it is `1`.

### Success Response (data payload)

```json
{
  "sub_event_Id": 202,
  "main_event_Id": 101,
  "source_invite_count": 12,
  "created_count": 12,
  "skipped_count": 0,
  "event_invite_sync_done": 1
}
```

### Common Error Cases

- `400` `Valid sub event event_Id is required`
- `400` `Sync is allowed only for sub events`
- `400` `Sub event invites already synced. Sync can be done only once`
- `400` `Main event has no invites to sync`
- `400` `No new invites were synced. Sub event already contains all main event invites`

## 7) Status Change (Event Workflow Status)

### Endpoint

- `POST /event-invite/status-change`

### Important

- Despite the route name, this endpoint updates the **event status workflow**, not an individual invite row status.

### Request

- Required: `event_Id`, `action`
- Optional: `comments`

```json
{
  "inputData": {
    "event_Id": 101,
    "action": "submit",
    "comments": "Submitting for approval"
  }
}
```

### Supported `action` values

- `submit` (same branch as `active` in current backend)
- `active`
- `approve-manager`
- `approve-admin`
- `reject`
- `cancel`
- `complete`

### Response (data payload)

```json
{
  "event_Id": 101,
  "status": "under-review-by-manager",
  "event_approval_count": 0
}
```

## Error Handling Notes (Frontend)

- Backend typically returns `400` for validation/business rule failures
- Backend returns `404` for missing event/invite in some endpoints
- Some duplicate/empty-result scenarios intentionally return `200` with data payload (for list/search)

## Recommended Frontend Flow (Sub-Events)

1. User adds invites to main event via `/send-invite`
2. User opens a sub-event
3. UI shows "Sync invites from main event" action (only if sub-event not yet synced)
4. Call `/sync-sub-event-invites` once
5. Refresh `/list` and `/search` for that sub-event

## Quick Notes for UI Labels

- `invite_type = "tag"` -> invite by a single tag
- `invite_type = "parent-tag"` -> invite by parent tag + all child tags
- `invite_type = "family-group"` -> invite all contacts from a family group
- `invite_label` -> optional display label for batch/source tagging in UI
