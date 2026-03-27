# 🔐 01 — Authentication & Users

## Overview

Users authenticate via **Google Sign-In (OIDC)** on the Angular frontend. The Google `idToken` is sent to the backend, validated, and exchanged for a short-lived **JWT** issued by the application server. All subsequent API calls use this JWT in the `Authorization` header.

---

## MongoDB Collection: `users`

```json
{
  "_id": "ObjectId",
  "email": "admin@amirtham.com",
  "name": "Manimaran",
  "picture": "https://lh3.googleusercontent.com/...",
  "googleId": "118234567890123456789",
  "role": "admin",
  "isActive": true,
  "lastLoginAt": "2026-03-28T10:00:00.000Z",
  "createdAt": "2026-01-15T08:30:00.000Z",
  "updatedAt": "2026-03-28T10:00:00.000Z"
}
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | `String` | ✅ | Google account email (unique) |
| `name` | `String` | ✅ | Display name from Google profile |
| `picture` | `String` | — | Profile picture URL |
| `googleId` | `String` | ✅ | Google `sub` claim (unique) |
| `role` | `String` | ✅ | One of: `admin`, `accountant`, `viewer` |
| `isActive` | `Boolean` | ✅ | `false` disables login |
| `lastLoginAt` | `Date` | — | Updated on each successful login |
| `createdAt` | `Date` | ✅ | Auto-set on creation |
| `updatedAt` | `Date` | ✅ | Auto-set on every update |

### Indexes

```javascript
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "googleId": 1 }, { unique: true });
```

### Roles & Permissions

| Action | `admin` | `accountant` | `viewer` |
|--------|---------|--------------|----------|
| View all modules | ✅ | ✅ | ✅ |
| Create / Edit transactions | ✅ | ✅ | ❌ |
| Delete transactions | ✅ | ❌ | ❌ |
| Manage sites | ✅ | ✅ | ❌ |
| Delete sites | ✅ | ❌ | ❌ |
| Manage users | ✅ | ❌ | ❌ |
| Export PDF / CSV | ✅ | ✅ | ✅ |

---

## API Endpoints

### `POST /auth/google-login`

Exchange a Google `idToken` for an application JWT.

**Request**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6..."
}
```

**Backend Logic**
1. Verify `idToken` with Google's token verification API or library.
2. Extract `email`, `name`, `picture`, `sub` (Google ID).
3. Find or create user in `users` collection.
4. If `isActive === false`, reject with 403.
5. Update `lastLoginAt`.
6. Sign and return an application JWT (expiry: 8 hours).

**Response — 200 OK**
```json
{
  "status": "ok",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 28800,
    "user": {
      "id": "664a1f...",
      "email": "admin@amirtham.com",
      "name": "Manimaran",
      "picture": "https://...",
      "role": "admin"
    }
  }
}
```

**Response — 403 Forbidden** (inactive user)
```json
{
  "status": "error",
  "error": {
    "code": "USER_INACTIVE",
    "message": "Your account has been deactivated. Contact admin."
  }
}
```

**Response — 401 Unauthorized** (invalid token)
```json
{
  "status": "error",
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Google token validation failed."
  }
}
```

---

### `GET /auth/me`

Returns the profile of the currently authenticated user.

**Headers**: `Authorization: Bearer <jwt>`

**Response — 200 OK**
```json
{
  "status": "ok",
  "data": {
    "id": "664a1f...",
    "email": "admin@amirtham.com",
    "name": "Manimaran",
    "picture": "https://...",
    "role": "admin",
    "lastLoginAt": "2026-03-28T10:00:00.000Z"
  }
}
```

---

### `GET /users` *(admin only)*

List all registered users.

**Response — 200 OK**
```json
{
  "status": "ok",
  "data": [
    {
      "id": "664a1f...",
      "email": "admin@amirtham.com",
      "name": "Manimaran",
      "role": "admin",
      "isActive": true,
      "lastLoginAt": "2026-03-28T10:00:00.000Z"
    }
  ]
}
```

---

### `PATCH /users/:id` *(admin only)*

Update a user's role or active status.

**Request**
```json
{
  "role": "accountant",
  "isActive": true
}
```

**Response — 200 OK**
```json
{
  "status": "ok",
  "data": {
    "id": "664a1f...",
    "email": "user@amirtham.com",
    "role": "accountant",
    "isActive": true
  }
}
```

---

## JWT Payload Structure

```json
{
  "sub": "664a1f...",
  "email": "admin@amirtham.com",
  "role": "admin",
  "iat": 1711612800,
  "exp": 1711641600
}
```

---

## Implementation Notes

- **Token Expiry**: 8 hours. Frontend should handle 401 responses by redirecting to Google Sign-In.
- **Refresh Strategy**: Re-authenticate with Google silently (Google One Tap) rather than implementing refresh tokens for simplicity.
- **Password-less**: No passwords stored — authentication is entirely delegated to Google.
- **First User Bootstrap**: The first user to sign in can be auto-assigned `admin` role, or seed the `users` collection manually.
