# BTRC React Dashboard — User Permissions Guide

This guide explains how the role-based access control (RBAC) system works in the
React dashboard and how to configure it after deploying a fresh Metabase instance.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [How Login Works](#how-login-works)
3. [Permission Groups](#permission-groups)
4. [Permission Rules Reference](#permission-rules-reference)
5. [Getting Group IDs from Metabase](#getting-group-ids-from-metabase)
6. [Updating permissions.js After Fresh Deployment](#updating-permissionsjs-after-fresh-deployment)
7. [Adding a New Group or User](#adding-a-new-group-or-user)
8. [Adding a New Regional Officer](#adding-a-new-regional-officer)
9. [Troubleshooting Login Issues](#troubleshooting-login-issues)

---

## Architecture Overview

```
User enters email + password
         │
         ▼
  AuthContext.login()
         │
         ├── POST /api/session          → get session token
         ├── GET  /api/user/current     → get group_ids[]
         └── resolvePermissions()       → map group IDs → React perms
                   │
                   ▼
         perms object stored in context
                   │
         ┌─────────┼──────────────────┐
         ▼         ▼                  ▼
   Tab visibility  Division lock   Feature flags
   (SLA/Regional/  (Regional        (showISPFilter,
    Violation)      Officers only)   showViolationDetail)
```

All permission logic lives in two files:

| File | Purpose |
|------|---------|
| `src/contexts/AuthContext.jsx` | Login flow, stores `user` + `perms` |
| `src/config/permissions.js`   | Group ID → permission rules mapping |

---

## How Login Works

1. User submits email + password on `LoginPage`.
2. `AuthContext.login()` calls `metabaseAPI.login()` → `POST /api/session`.
3. On success, calls `metabaseAPI.getCurrentUser()` → `GET /api/user/current`.
4. The response contains `group_ids: [1, 7]` (Metabase group IDs the user belongs to).
5. `resolvePermissions(groupIds, email)` finds the **highest-priority** matching group
   and returns a `perms` object.
6. `RegulatoryDashboard` reads `perms` to decide which tabs to show and which
   features to enable.

---

## Permission Groups

The dashboard recognises these groups (defined in `permissions.js`):

| Group ID | Group Name           | Who it is |
|----------|----------------------|-----------|
| `2`      | Administrators       | Metabase built-in superuser |
| `5`      | BTRC Administrators  | System Admin, IT Manager |
| `6`      | Management Team      | CEO, CTO |
| `7`      | Operations Team      | PM, QoS Analyst |
| `8`      | Regional Officers    | Dhaka Officer, Chittagong Officer |
| `9`      | External Viewers     | Consultant |

> **Important:** The IDs above are what the local/reference Metabase instance
> assigned. On a fresh deployment the IDs may differ. See
> [Getting Group IDs from Metabase](#getting-group-ids-from-metabase).

### Priority Order

When a user belongs to multiple groups, the **first** match in the priority list wins:

```
Priority (highest → lowest):
  2 → 5 → 4 → 7 → 6 → 8 → 9
```

---

## Permission Rules Reference

Defined in `src/config/permissions.js` — `GROUP_PERMISSIONS`:

| Group ID | Label              | Tabs visible             | Read-only | Division lock | ISP filter | Violation detail |
|----------|--------------------|--------------------------|-----------|---------------|------------|-----------------|
| `2`      | Administrator      | R2.1, R2.2, R2.3         | No        | None          | Yes        | Yes             |
| `5`      | BTRC Administrator | R2.1, R2.2, R2.3         | No        | None          | Yes        | Yes             |
| `4`      | Operation Team     | R2.1, R2.2, R2.3         | No        | None          | Yes        | Yes             |
| `7`      | Operations Team    | R2.1, R2.2, R2.3         | No        | None          | Yes        | Yes             |
| `6`      | Management         | R2.1, R2.2               | Yes       | None          | No         | No              |
| `8`      | Regional Officer   | R2.2, R2.3               | No        | By email      | Yes        | Yes             |
| `9`      | External Viewer    | R2.2 only                | Yes       | None          | No         | No              |

**Division lock (group 8):** The locked division is looked up by email in
`REGIONAL_OFFICER_DIVISIONS`:

```js
export const REGIONAL_OFFICER_DIVISIONS = {
  'dhaka.officer@btrc.gov.bd':      'Dhaka',
  'chittagong.officer@btrc.gov.bd': 'Chattagram',
};
```

---

## Getting Group IDs from Metabase

After running `init_metabase_users.py`, the script prints the actual group IDs.
You can also check them manually:

### Option A — Metabase Admin UI

1. Go to `http://localhost:3000`
2. Log in as admin
3. Settings (gear icon) → **People** → **Groups**
4. Note the ID shown in the URL when you click each group:
   `http://localhost:3000/admin/people/groups/7` → ID is `7`

### Option B — Metabase API

```bash
# Replace TOKEN with your session token
curl -s http://localhost:3000/api/permissions/group \
  -H "X-Metabase-Session: TOKEN" | python3 -m json.tool
```

The response lists all groups with their IDs:

```json
[
  {"id": 1, "name": "All Users"},
  {"id": 2, "name": "Administrators"},
  {"id": 5, "name": "BTRC Administrators"},
  {"id": 6, "name": "Management Team"},
  ...
]
```

### Option C — Run the init script

`init_metabase_users.py` prints a summary table at the end showing actual IDs
vs. expected IDs and flags any mismatches automatically.

---

## Updating permissions.js After Fresh Deployment

If the group IDs on your server differ from the IDs in `permissions.js`, update
the file's `GROUP_PERMISSIONS` object keys.

**Example:** Suppose your server assigned these IDs:

| Group Name          | Server ID | Expected ID |
|---------------------|-----------|-------------|
| BTRC Administrators | **10**    | 5           |
| Management Team     | **11**    | 6           |
| Operations Team     | **12**    | 7           |
| Regional Officers   | **13**    | 8           |
| External Viewers    | **14**    | 9           |

**Step 1.** Open `src/config/permissions.js`.

**Step 2.** Update the numeric keys in `GROUP_PERMISSIONS`:

```js
// BEFORE (local/reference IDs)
export const GROUP_PERMISSIONS = {
  2:  { label: 'Administrator', ... },
  5:  { label: 'BTRC Administrator', ... },
  6:  { label: 'Management', ... },
  7:  { label: 'Operations Team', ... },
  8:  { label: 'Regional Officer', ... },
  9:  { label: 'External Viewer', ... },
};

// AFTER (server IDs from example above)
export const GROUP_PERMISSIONS = {
  2:  { label: 'Administrator', ... },         // built-in, never changes
  10: { label: 'BTRC Administrator', ... },    // was 5
  11: { label: 'Management', ... },            // was 6
  12: { label: 'Operations Team', ... },       // was 7
  13: { label: 'Regional Officer', ... },      // was 8
  14: { label: 'External Viewer', ... },       // was 9
};
```

**Step 3.** Update the `GROUP_PRIORITY` array (same order, new IDs):

```js
// BEFORE
const GROUP_PRIORITY = [2, 5, 4, 7, 6, 8, 9];

// AFTER (using server IDs; 4 = dev/tester may not exist on server — remove it)
const GROUP_PRIORITY = [2, 10, 12, 11, 13, 14];
```

**Step 4.** Rebuild and redeploy the React app:

```bash
yarn build
```

---

## Adding a New Group or User

### Add a new group in Metabase

1. Metabase → Settings → People → Groups → **Create a group**
2. Note the new group's ID (from URL or API)

### Add the group to permissions.js

```js
// src/config/permissions.js

export const GROUP_PERMISSIONS = {
  // ... existing groups ...

  // NEW: e.g., "Finance Team" with ID 15
  15: {
    label:       'Finance Team',
    tabs:        [TABS.SLA, TABS.REGIONAL],   // which tabs they can see
    readOnly:    true,
    divisionLock: null,
    showViolationDetail: false,
    showISPFilter: false,
  },
};

// Add to priority list (insert at appropriate position)
const GROUP_PRIORITY = [2, 5, 4, 7, 6, 8, 15, 9];  // 15 before External Viewers
```

### Create the user in Metabase

```bash
# Via API — replace TOKEN and values
curl -X POST http://localhost:3000/api/user \
  -H "X-Metabase-Session: TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Finance",
    "last_name":  "Officer",
    "email":      "finance@btrc.gov.bd",
    "password":   "Test@12345"
  }'
```

Then add them to the group via Metabase UI: **People → Groups → Finance Team → Add member**.

---

## Adding a New Regional Officer

Regional Officers have their division locked by email.

**Step 1.** Create the user in Metabase and add them to the **Regional Officers** group.

**Step 2.** Add their email → division mapping in `permissions.js`:

```js
export const REGIONAL_OFFICER_DIVISIONS = {
  'dhaka.officer@btrc.gov.bd':      'Dhaka',
  'chittagong.officer@btrc.gov.bd': 'Chattagram',
  // Add new officer here:
  'sylhet.officer@btrc.gov.bd':     'Sylhet',
  'rajshahi.officer@btrc.gov.bd':   'Rajshahi',
  'khulna.officer@btrc.gov.bd':     'Khulna',
  'barisal.officer@btrc.gov.bd':    'Barisal',
  'mymensingh.officer@btrc.gov.bd': 'Mymensingh',
  'rangpur.officer@btrc.gov.bd':    'Rangpur',
};
```

Division names must match exactly what is stored in the `division` column of the
TimescaleDB database (case-sensitive). The 8 valid values are:

```
Dhaka, Chattagram, Rajshahi, Khulna, Barisal, Sylhet, Rangpur, Mymensingh
```

---

## Troubleshooting Login Issues

### 401 Unauthorized on login

**Cause:** Wrong password for the test account.

**Fix:**
```bash
# 1. Login as admin to get a session token
SESSION=$(curl -s -X POST http://localhost:3000/api/session \
  -H "Content-Type: application/json" \
  -d '{"username":"alamin.technometrics22@gmail.com","password":"Test@123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

# 2. Find the user's ID
curl -s "http://localhost:3000/api/user" \
  -H "X-Metabase-Session: $SESSION" \
  | python3 -c "import sys,json; [print(u['id'], u['email']) for u in json.load(sys.stdin)['data']]"

# 3. Reset password (replace USER_ID)
curl -X PUT http://localhost:3000/api/user/USER_ID/password \
  -H "X-Metabase-Session: $SESSION" \
  -H "Content-Type: application/json" \
  -d '{"password":"Test@12345"}'
# Expect: HTTP 204 No Content = success
```

---

### User logs in but sees no tabs / wrong tabs

**Cause:** `group_ids` returned for the user does not match any key in
`GROUP_PERMISSIONS`.

**Fix — check what groups the user actually belongs to:**
```bash
curl -s http://localhost:3000/api/user/current \
  -H "X-Metabase-Session: TOKEN" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('group_ids:', d.get('group_ids'))"
```

Compare the returned IDs with `GROUP_PERMISSIONS` keys in `permissions.js`.
If no match is found, the user is shown the default (External Viewer) permissions.

---

### User gets "External Viewer" access instead of their correct role

**Cause:** The group IDs in `permissions.js` were set for the local instance but
differ on the production server.

**Fix:** Follow the steps in
[Updating permissions.js After Fresh Deployment](#updating-permissionsjs-after-fresh-deployment).

---

### "Showing all POC data" even after selecting a date range

**Cause:** The date parameters are not being sent, or the Metabase cards don't
have `start_date`/`end_date` template tags.

**Verify:** In the browser Network tab, check the `POST /api/card/{id}/query`
request body. It should include:
```json
{
  "parameters": [
    {"type": "date/single", "target": ["variable", ["template-tag", "start_date"]], "value": "2025-12-01"},
    {"type": "date/single", "target": ["variable", ["template-tag", "end_date"]],   "value": "2025-12-07"}
  ]
}
```

If `parameters` is empty, the date filter is not working. Check that the card's
SQL uses `{{start_date}}` and `{{end_date}}` template tags.

---

*Last updated: 2026-02-22*
