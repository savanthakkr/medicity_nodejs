# Contact Create API Documentation

## Endpoints

- `POST /contact/add` -> `createContactNew`
- `POST /contact/new` -> `createContactNew`
- `POST /contact/add-v2` -> `createContactV2Controller`

All three endpoints use the same core create logic. The only functional difference is the duplicate-response behavior of `/add-v2`.

## Difference: `createContactNew` vs `createContactV2Controller`

### `createContactNew` (`/contact/add`, `/contact/new`)

- Uses the normal create flow
- Returns standard success response payload
- Does **not** return V2 duplicate-check response payload (`isDuplicate`, `duplicateFields`, etc.)

### `createContactV2Controller` (`/contact/add-v2`)

- Uses the same create flow
- Adds duplicate-contact precheck response behavior
- If duplicate contact is detected, returns `200` with:
  - `isDuplicate: true`
  - `success: false`
  - `msg: "Duplicate contact found"`
  - `duplicateFields`
  - `matchedContact_Id`
  - `matchedRules`

## New Flags (Supported in all create endpoints)

You can send either snake_case or camelCase:

- `merge_with_existing` or `mergeWithExisting`
- `create_duplicate` or `createDuplicate`

## Flag Behavior

### 1) `merge_with_existing = true`

Purpose:
- If the incoming payload matches an existing contact (duplicate-contact rules), merge sub-fields into the existing contact instead of creating a new contact.

Behavior:
- Finds duplicate using existing duplicate-contact logic
- If duplicate is found:
  - Adds incoming `phones` as **non-default** (`is_default = 0`)
  - Adds incoming `emails` as **non-default** (`is_default = 0`)
  - Adds incoming `addresses` as **non-default** (`is_default = 0`)
  - Adds incoming `metadata` as a new metadata row (if not duplicate remark)
- Skips rows that already exist on the same target contact
- Rejects phone/email values if they belong to a different contact
- Returns success with merge summary instead of creating a new contact

Important limitations:
- `family` payload is **not supported** with merge mode (request returns `400`)
- Metadata table currently has no `is_default` field, so metadata is appended as a new row (not marked default/non-default)

If no duplicate contact is found:
- Flow falls back to normal create (new contact is created)

### 2) `create_duplicate = true`

Purpose:
- Force creation of a new contact and skip duplicate validations.

Behavior:
- Skips duplicate checks:
  - payload duplicate checks (email/phone inside payload)
  - duplicate-contact matching check
  - DB duplicate email/phone checks
- Creates a completely new contact record and sub-records

## Validation Rules for Flags

- `merge_with_existing` and `create_duplicate` **cannot both be true**
- If both are true, API returns `400`

## Request Examples

### A) Normal create (default behavior)

```json
{
  "inputData": {
    "salutation": "Mr",
    "full_name": "John Doe",
    "last_name": "Doe",
    "type": "SELF",
    "contact": {
      "phones": [
        {
          "country_code": "+91",
          "phone_number": "9876543210",
          "phone_type": "mobile",
          "is_default": true
        }
      ],
      "emails": [
        {
          "email_address": "john@example.com",
          "email_type": "personal",
          "is_default": true
        }
      ],
      "addresses": [],
      "metadata": {
        "contact_Remark": "VIP"
      }
    }
  }
}
```

### B) Merge with existing

```json
{
  "inputData": {
    "salutation": "Mr",
    "full_name": "John Doe",
    "type": "SELF",
    "merge_with_existing": true,
    "contact": {
      "phones": [
        {
          "country_code": "+91",
          "phone_number": "9999999999",
          "phone_type": "mobile",
          "is_default": true
        }
      ],
      "emails": [
        {
          "email_address": "john.alt@example.com",
          "email_type": "work",
          "is_default": true
        }
      ],
      "addresses": [
        {
          "address_line1": "123 New Street",
          "city": "Kolkata",
          "pin_code": "700001",
          "address_type": "home",
          "is_default": true
        }
      ],
      "metadata": {
        "contact_Remark": "Added from merge request"
      }
    }
  }
}
```

Note:
- Incoming `is_default: true` values are **ignored during merge** and stored as non-default (`0`).

### C) Force duplicate create

```json
{
  "inputData": {
    "salutation": "Mr",
    "full_name": "John Doe",
    "type": "SELF",
    "create_duplicate": true,
    "contact": {
      "phones": [
        {
          "country_code": "+91",
          "phone_number": "9876543210",
          "phone_type": "mobile",
          "is_default": true
        }
      ],
      "emails": [
        {
          "email_address": "john@example.com",
          "email_type": "personal",
          "is_default": true
        }
      ],
      "addresses": [],
      "metadata": null
    }
  }
}
```

## Response Examples

### `createContactNew` success (`/contact/add`, `/contact/new`)

```json
{
  "main_contact_Id": 123,
  "merged_with_existing": false,
  "create_duplicate": false
}
```

### `createContactV2Controller` success (`/contact/add-v2`)

```json
{
  "main_contact_Id": 123,
  "isDuplicate": false,
  "success": true,
  "msg": "",
  "merged_with_existing": false,
  "create_duplicate": false
}
```

### Merge success (all create endpoints)

```json
{
  "main_contact_Id": 45,
  "merged_with_existing": true,
  "create_duplicate": false,
  "merge_summary": {
    "contact_Contact_Id": 45,
    "phones_added": 1,
    "phones_skipped_existing": 0,
    "emails_added": 1,
    "emails_skipped_existing": 0,
    "addresses_added": 1,
    "addresses_skipped_existing": 0,
    "metadata_added": 1,
    "metadata_skipped_existing": 0
  }
}
```

### V2 duplicate detected (`/contact/add-v2`)

```json
{
  "isDuplicate": true,
  "success": false,
  "msg": "Duplicate contact found",
  "duplicateFields": [
    { "fieldName": "name", "fieldValue": "John Doe" }
  ],
  "matchedContact_Id": 45,
  "matchedRules": ["name_mobile"]
}
```

## Notes for Frontend

- Prefer `/contact/add-v2` if UI needs duplicate-check feedback before create
- Use `merge_with_existing=true` only after user confirms merge behavior
- Use `create_duplicate=true` only when user explicitly chooses to bypass duplicate checks
- Do not send both flags as `true`

