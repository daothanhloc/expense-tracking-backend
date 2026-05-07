# Zalo Webhook: User Data Deletion

## Problem

Zalo Mini Apps require a webhook URL to handle user consent withdrawal events. When a user removes the Mini App from their Zalo account, Zalo sends a `user.remove.info` event. The app must delete all data associated with that user and respond with success.

The app currently has no webhook handling and no user/data deletion logic.

## Scope

- Handle Zalo webhook URL verification (GET handshake)
- Handle `user.remove.info` event (POST)
- Delete all data associated with the user
- Phone-only users (no `zaloId`) are handled gracefully (return success, nothing to delete)

## Architecture

### Endpoint

`GET` and `POST /api/webhooks/zalo`

No JWT authentication middleware. Security is provided by verifying `oa_id` matches `ZALO_APP_ID`.

### Webhook URL Verification (GET)

Zalo sends a GET request with `oa_id` query parameter to verify the webhook URL during setup.

- Verify `oa_id` matches `ZALO_APP_ID`
- Return `{ errorCode: 0, message: "Success" }`

### Data Deletion Event (POST)

Zalo sends a POST with JSON body:

```json
{
  "event": "user.remove.info",
  "oa_id": "...",
  "user_id_by_app": "..."
}
```

Flow:
1. Verify `oa_id` matches `ZALO_APP_ID` — reject if mismatch (403)
2. Extract `user_id_by_app` from the event
3. Find user by `zaloId` matching `user_id_by_app`
4. If no user found — return `{ errorCode: 0, message: "No data found" }` (nothing to delete)
5. If user found — delete cascading data in order:
   - Delete all Transactions where `createdBy = userId`
   - Delete all Contributions where `userId = userId`
   - Remove `userId` from Group `members` arrays
   - Delete any Groups that now have zero members
   - Remove user's contribution entries from all Goals (recalculate `currentAmount` from remaining contributions)
   - Delete Goals only in groups that were deleted (zero members after removal)
   - Delete the User document
6. Log the deletion (user ID, timestamp, counts of deleted records)
7. Return `{ errorCode: 0, message: "Success" }`

### Goal Handling

Goals have embedded `contributions` sub-documents with `userId`. When deleting a user:
- Remove their contribution entries from all goals in groups they belong to
- If a goal's `currentAmount` is affected, recalculate from remaining contributions
- Do not delete the goal itself — the other user may still use it

### Error Handling

- Invalid `oa_id` → 403 Forbidden
- Missing required fields → 400 Bad Request
- Unexpected errors → log error, still return `{ errorCode: 0 }` to Zalo (they don't retry on failure, so we acknowledge receipt and handle internally)

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `src/controllers/webhookController.js` | New | Handles GET handshake + POST data deletion |
| `src/routes/index.js` | Modified | Add GET+POST `/webhooks/zalo` routes (no auth middleware) |

## Data Models Affected

| Model | Deletion Criteria |
|-------|-------------------|
| Transaction | `createdBy = userId` |
| Contribution | `userId = userId` |
| Goal (contributions sub-doc) | `contributions.userId = userId` |
| Group | Remove from `members`; delete if empty |
| User | `zaloId = user_id_by_app` |

## Environment Variables

No new env vars needed. Uses existing `ZALO_APP_ID` for webhook verification.
