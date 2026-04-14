# AMC Business Management — Senior Architect Review

> **Reviewer:** Senior IT Application Architect (15+ years)
> **Date:** April 14, 2026
> **Scope:** Full-stack review of `amc-backend` (Spring Boot 2.7 / Java 8 / MongoDB) and `amc-frontend` (Angular 17 / Angular Material 17)
> **Purpose:** Findings on correctness, performance, optimization, security, design principles, and maintainability. No code changes are made in this document.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Security Review](#2-security-review)
3. [Backend — Architecture & Design](#3-backend--architecture--design)
4. [Backend — Performance & Optimization](#4-backend--performance--optimization)
5. [Backend — Code Quality & Maintainability](#5-backend--code-quality--maintainability)
6. [Frontend — Architecture & Design](#6-frontend--architecture--design)
7. [Frontend — Performance & Optimization](#7-frontend--performance--optimization)
8. [Frontend — Code Quality & Maintainability](#8-frontend--code-quality--maintainability)
9. [Data Integrity & Consistency](#9-data-integrity--consistency)
10. [Observability & Operations](#10-observability--operations)
11. [What Is Done Well ✅](#11-what-is-done-well-)
12. [Priority Issue Summary](#12-priority-issue-summary)
13. [Recommended Roadmap](#13-recommended-roadmap)

---

## 1. Executive Summary

The AMC Business Management application is a well-structured, purpose-built internal tool for construction company accounting. The codebase is **consistent in conventions**, follows modern patterns (standalone Angular components, functional guards, JWT stateless auth), and has a good separation of concerns across layers. However, several **critical security issues**, **significant performance problems**, and **maintainability gaps** must be addressed before this application handles real financial data in a production environment.

### Overall Rating by Dimension

| Dimension | Rating | Comment |
|---|---|---|
| Architecture | ⭐⭐⭐⭐ | Solid layered design, good conventions |
| Security | ⭐⭐ | Critical credentials exposed; JWT weaknesses |
| Performance | ⭐⭐ | Full table scans dominate; N+1 patterns in analytics |
| Code Quality | ⭐⭐⭐⭐ | Consistent, readable; some duplication |
| Maintainability | ⭐⭐⭐ | Good but missing tests, CI/CD, environments |
| Frontend Design | ⭐⭐⭐⭐ | Modern Angular 17 patterns; well-structured |
| Data Integrity | ⭐⭐ | No transactions, weak referential integrity |

---

## 2. Security Review

### 🔴 CRITICAL — Credentials in Source Control

**File:** `amc-backend/src/main/resources/application.properties`

```
spring.data.mongodb.uri=mongodb+srv://amirtham_db_user:faDXYJMLOTx2IOrS@cluster0.aszzz.mongodb.net/...
app.jwt.secret=YW1jLWJ1c2luZXNzLW1hbmFnZW1lbnQtc2VjcmV0...
```

- The **MongoDB Atlas production password** is committed directly to source code.
- The **JWT signing secret** is committed directly to source code.
- **Impact:** If this repository is ever shared, made public, or accessed by unauthorized individuals, the entire database and all user sessions can be compromised immediately.

**Recommendation:**
- Move all secrets to environment variables or a secrets manager (e.g., HashiCorp Vault, AWS Secrets Manager, Azure Key Vault).
- Use Spring Boot's `application-{profile}.properties` pattern with a `.gitignore`-protected file for local development.
- **Rotate the MongoDB password and JWT secret immediately.**
- Add `application.properties` to `.gitignore` and replace with `application.properties.template`.

---

### 🔴 CRITICAL — JWT Secret Strength

**File:** `JwtTokenProvider.java`

The decoded JWT secret is the ASCII string: `amc-business-management-secret-key-for-jwt-token-generation-2026`

While this string is long, it is:
- **Human-readable and predictable** (contains the app name, purpose, and year).
- **Not cryptographically random** — should be a randomly generated 256-bit key.
- The same key is used for both access tokens and refresh tokens.

**Recommendation:**
- Generate the secret using: `openssl rand -base64 64`
- Use **separate signing keys** for access tokens and refresh tokens.
- Consider rotating keys periodically with a JWK-based approach.

---

### 🔴 CRITICAL — Refresh Token Not Validated Against Storage

**File:** `AuthService.java` → `refreshToken()`

The refresh token is validated only by JWT signature verification. There is no:
- Refresh token revocation mechanism.
- Server-side storage of issued refresh tokens.
- Single-use enforcement (refresh token rotation).

**Impact:** If a refresh token is stolen, it remains valid for its full 7-day lifetime with no way to revoke it. This is particularly dangerous for a financial application.

**Recommendation:**
- Store refresh tokens (hashed) in MongoDB with an `is_revoked` flag.
- Implement refresh token rotation: every refresh call invalidates the old token and issues a new one.
- Implement a `POST /api/auth/logout` endpoint that revokes the refresh token.

---

### 🟠 HIGH — No Rate Limiting on Authentication Endpoints

**File:** `AuthController.java`

The `/api/auth/login` and `/api/auth/register` endpoints have no rate limiting. An attacker can perform unlimited brute-force or credential-stuffing attacks.

**Recommendation:**
- Add Spring's `bucket4j` or a gateway-level rate limiter.
- Implement account lockout after N failed attempts (the `accountLocked` field exists on `User` but is never set by failed logins).
- Log failed login attempts with IP address.

---

### 🟠 HIGH — Password Exposed in API Response (UserController)

**File:** `UserController.java`, `UserService.java`

The `GET /api/users` and `GET /api/users/{id}` endpoints return the `User` entity directly. While the `User` model has `@JsonIgnore` on `password`, this is a fragile pattern because:
- A future developer editing the model could accidentally remove `@JsonIgnore`.
- The entity includes internal fields (`accountLocked`, `enabled`, `provider`) not meant for all callers.

**Recommendation:**
- Introduce a `UserResponseDto` that explicitly includes only safe fields (id, email, name, phone, role, lastLoginAt).
- Never return the raw domain model from an API endpoint.

---

### 🟠 HIGH — Missing Input Validation on Several Endpoints

| Endpoint | Issue |
|---|---|
| `POST /api/auth/refresh` | Refresh token body is a raw `Map<String, String>` — no DTO, no validation. |
| `GET /api/gst-reconciliation` | `year` and `month` path parameters are not validated for format or range. |
| `PUT /api/transactions/{id}` | `sortBy` and `direction` query parameters are not validated — potential MongoDB injection via sort field name. |
| `GET /api/dashboard` | No validation that `endDate >= startDate`. |

---

### 🟡 MEDIUM — CORS Allows All Origins via Property

**File:** `SecurityConfig.java`

```java
config.setAllowedOrigins(Arrays.asList(allowedOrigins.split(",")));
config.setAllowedHeaders(Arrays.asList("*"));
```

`setAllowedHeaders("*")` with `setAllowCredentials(true)` is technically non-compliant with the CORS spec (browsers block this combination) and may not behave as intended. Additionally, no production-specific origins are defined.

**Recommendation:**
- Explicitly list allowed headers: `Authorization`, `Content-Type`, `Accept`.
- Define production CORS origins via the profile-specific properties file.

---

### 🟡 MEDIUM — Token Expiry Not Checked After Storage Load

**File:** `AuthService.ts` → `loadUserFromStorage()`

When the page is refreshed, `loadUserFromStorage()` reads the user and token from `localStorage`. It does **not** decode or validate the JWT expiry. A user with an expired token will be treated as logged in until their first API call returns 401.

**Recommendation:**
- Decode the JWT on load (using a library like `jwt-decode`) and compare the `exp` claim against the current time.
- If expired, clear the session immediately or attempt a silent refresh.

---

### 🟡 MEDIUM — Security Context Relies on DB Lookup Per Request

**File:** `JwtAuthenticationFilter.java`

```java
User user = userRepository.findById(userId).orElse(null);
```

Every authenticated API request triggers a MongoDB read to validate the user. While this is a security best practice (ensures revoked users cannot proceed), it adds latency to every request. For a high-volume system this would be significant.

**Recommendation:**
- Cache the user object with a short TTL (e.g., Spring Cache with Caffeine, 60s TTL).
- Alternatively, embed the `enabled` and `accountLocked` flags as JWT claims and only do a DB lookup when those flags indicate a possible issue.

---

## 3. Backend — Architecture & Design

### 🟠 HIGH — DTOs Defined as Inner Static Classes in Service

**File:** `DashboardService.java`

```java
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public static class DashboardData { ... }
public static class DashboardKpis { ... }
public static class ChartData { ... }
public static class RecentTransaction { ... }
```

These DTOs are tightly coupled to the service class. The `DashboardController` references `DashboardService.DashboardData`, creating a direct compile-time coupling between the transport layer and the service layer.

**Recommendation:**
- Move all DTOs to the `dto/` package.
- Controllers should only depend on `dto` and not on service implementation classes.
- This is consistent with how `SiteAnalytics` and `SitesOverview` are correctly placed in `dto/`.

---

### 🟠 HIGH — Domain Models Used as Request Bodies

**Files:** `TransactionController`, `SiteController`, `MaterialController`, `InvoiceController`, etc.

```java
@PostMapping
public ResponseEntity<...> create(@Valid @RequestBody Transaction transaction)
```

The MongoDB `@Document` entity is used directly as the request body. This has several problems:
- Clients can attempt to set `id`, `createdAt`, `updatedAt`, or `transactionId` directly.
- Validation annotations on the model mix persistence and API concerns.
- Adding a new internal field to the model automatically exposes it in the API.

**Recommendation:**
- Introduce `CreateTransactionRequest`, `UpdateTransactionRequest` DTOs for write operations.
- Keep `@Document` models strictly for persistence; use DTOs for API contracts.

---

### 🟡 MEDIUM — `InvoiceService.generateNextInvoiceNo()` Has a Race Condition

**File:** `InvoiceService.java`

```java
long count = invoiceRepository.count();
return prefix + String.format("%03d", count + 1);
```

`count()` returns the total document count, not the highest invoice number. In concurrent scenarios or after deletions, this will produce duplicate invoice numbers.

**Recommendation:**
- Use a MongoDB atomic sequence (using `findAndModify` on a `counters` collection).
- Or query for the max existing invoice number with a specific prefix and increment.
- Add a `@Indexed(unique=true)` on `invoiceNo` to prevent duplicates at the DB level (it already exists, but the generation logic still needs fixing).

---

### 🟡 MEDIUM — `SiteService.update()` Allows Overwriting Critical Fields

**File:** `SiteService.java`

The update method copies `profit`, `profitDate`, `expenseHead`, `incomeHead` from the incoming request body. These fields appear to be derived/computed values from CSV migration — they should be read-only after initial migration or managed separately.

---

### 🟡 MEDIUM — `UserService.create()` Does Not Hash Password

**File:** `UserService.java`

```java
public User create(User user) {
    ...
    return userRepository.save(user);
}
```

The admin-facing `POST /api/users` endpoint calls `UserService.create()`, which saves the user **without hashing the password**. Only `AuthService.register()` hashes passwords. An admin creating a user via the `UserController` would store a plaintext password.

**Recommendation:**
- Inject `PasswordEncoder` into `UserService` and hash the password in `create()`.
- Or route all user creation through `AuthService.register()`.

---

### 🟡 MEDIUM — Health Endpoint Leaks Infrastructure Info

**File:** `HealthController.java` (based on project structure)

A `/api/health` endpoint is public. Depending on its implementation, it should return only `{ "status": "UP" }` and not expose stack versions, memory stats, or database connection details.

**Recommendation:**
- Limit the health endpoint to a minimal `{ "status": "UP", "timestamp": "..." }` response.
- Consider using Spring Actuator with security hardened to only expose `/health` liveness probe.

---

## 4. Backend — Performance & Optimization

### 🔴 CRITICAL — Full Table Scans on Every Analytics Call

**File:** `SiteAnalyticsService.java` → `getSitesOverview()`

```java
List<Site> allSites = siteRepository.findAll();
List<Transaction> allTransactions = transactionRepository.findAll();
List<Material> allMaterials = materialRepository.findAll();
```

This fetches **every document in three collections** into JVM heap on every call. If the database has 10,000 transactions, all 10,000 are loaded for every `/api/sites/analytics/overview` request. The entire aggregation is then done in Java streams.

**Impact:** Memory pressure, slow response times, potential OOM errors as data grows.

**Recommendation:**
- Use MongoDB aggregation pipeline (`$group`, `$sum`, `$match`) via `MongoTemplate` or `@Aggregation` in the repository.
- Example: group transactions by `siteName` and sum amounts in a single DB operation.
- Add a Redis cache (TTL: 5–15 minutes) on the overview endpoint — the data does not need to be real-time.

---

### 🔴 CRITICAL — Full Table Scan for Dashboard Calculations

**File:** `DashboardService.java` → `getDashboardData()`

```java
List<Transaction> transactions = transactionRepository.findByDateBetween(startDate, endDate);
List<Material> materials = materialRepository.findByDateBetween(startDate, endDate);
```

For a full financial year, this could fetch thousands of records. The dashboard then iterates through the entire list **multiple times** (once for revenue, once for expenditure, once for main company, once for GST company, etc.), making ~10 full stream passes through the same list.

**Recommendation:**
- Perform a **single stream pass** to accumulate all aggregates simultaneously.
- Move aggregation to MongoDB using `$group` and `$facet` pipelines.
- Cache the dashboard response (TTL: 10 minutes) — financial dashboards do not need sub-second freshness.

---

### 🔴 CRITICAL — Missing Database Indexes

The following fields are heavily used in queries but do not have MongoDB indexes declared in the models:

| Collection | Field | Used In |
|---|---|---|
| `transactions` | `date` | Date range queries (dashboard, GST, analytics) |
| `transactions` | `type` | Credit/Debit filters throughout |
| `transactions` | `company` | Company split queries |
| `transactions` | `siteName` | Site analytics lookups |
| `materials` | `siteName` | Site analytics lookups |
| `materials` | `date` | Date range queries |
| `gst_outward` | `invoiceDate` | GST reconciliation |
| `gst_inward` | `invoiceDate` | GST reconciliation |

Only `@Indexed(unique = true)` is used for business key uniqueness. Compound indexes for common query patterns are completely absent.

**Recommendation:**
Add `@CompoundIndex` annotations to the models, e.g.:

```java
// On Transaction
@CompoundIndex(def = "{'date': 1}")
@CompoundIndex(def = "{'company': 1, 'type': 1, 'date': 1}")
@CompoundIndex(def = "{'siteName': 1, 'date': 1}")
```

Or define indexes in a `@Configuration` class using `MongoTemplate.indexOps()`.

---

### 🟠 HIGH — `SiteAnalyticsService.getSiteAnalytics()` Calls DB 4 Times (Potential N+1)

**File:** `SiteAnalyticsService.java`

```java
List<Transaction> transactions = transactionRepository.findBySiteName(site.getName());
List<Material> materials = materialRepository.findBySiteName(site.getName());
// then fallback:
List<Transaction> byId = transactionRepository.findBySiteNameIgnoreCase(site.getName());
List<Material> byName = materialRepository.findBySiteNameIgnoreCase(site.getName());
```

The fallback logic always calls `findBySiteNameIgnoreCase` even though `findBySiteName` is already case-sensitive and the first call will likely return results if data is consistent. Each site detail page triggers 2–4 DB queries.

When called from `getSitesOverview()`, which iterates over all sites, this pattern is not used (data is pre-fetched), but the single-site endpoint still has unnecessary fallback calls.

**Recommendation:**
- Standardize site name casing at write time (e.g., always store as trimmed, normalized case).
- Remove the redundant fallback — use only `IgnoreCase` variant.
- Consider storing `siteId` on transactions and materials for precise lookups (avoids name-matching entirely).

---

### 🟠 HIGH — GstExcelService Uses autoSizeColumn() on Large Sheets

**File:** `GstExcelService.java`

```java
for (int i = 0; i < INWARD_HEADERS.length; i++) {
    sheet.autoSizeColumn(i);
}
```

`autoSizeColumn()` in Apache POI is extremely slow on large sheets — it iterates every cell in the column to calculate the optimal width. For GST reports with hundreds of rows and 19 columns, this causes significant CPU overhead.

**Recommendation:**
- Use pre-defined column widths (e.g., `sheet.setColumnWidth(0, 3000)`) instead of auto-sizing.
- Or limit `autoSizeColumn()` to the header sheet only.
- Prefer streaming API (`SXSSFWorkbook`) for large exports to avoid heap overflow.

---

### 🟡 MEDIUM — Rounding Done in Java Instead of DB

Throughout `DashboardService.java` and `SiteAnalyticsService.java`:

```java
Math.round(revenue * 100.0) / 100.0
```

This pattern is applied to every computed field individually. While correct, it:
- Creates intermediate `double` values subject to floating-point imprecision.
- Could be done more reliably with `BigDecimal`.

**Recommendation:**
- Use `BigDecimal` with `HALF_UP` rounding for all financial calculations.
- Return `Double` only for JSON serialization, after rounding with `BigDecimal`.

---

### 🟡 MEDIUM — No Pagination on Sites Overview and Analytics Endpoints

**Files:** `SiteController.java`, `/analytics/overview`

These endpoints return all sites and all comparison rows in a single response with no pagination or size limit. As the number of sites grows (say 500+), the response payload grows unboundedly.

**Recommendation:**
- Add pagination to `/api/sites/analytics/overview` comparison table.
- Cap top-N results to 10–20 with a configurable limit.

---

## 5. Backend — Code Quality & Maintainability

### 🟠 HIGH — No Unit or Integration Tests

There are no test files visible in the project. For a financial management application that handles invoices, GST filings, and profit calculations, the absence of automated tests is a serious risk.

**Missing tests include:**
- `AuthService` register/login/password-change flows.
- `TransactionService` CRUD and date-range filtering.
- `InvoiceService.generateNextInvoiceNo()` — especially with concurrent requests.
- `SiteAnalyticsService` aggregation correctness.
- `GlobalExceptionHandler` error response shapes.

**Recommendation:**
- Add JUnit 5 + Mockito unit tests for all service classes.
- Add Spring Boot integration tests (`@SpringBootTest`) with an embedded MongoDB (`flapdoodle`).
- Target 80% coverage for service and controller layers.

---

### 🟡 MEDIUM — `DashboardService` Has Stale "Legacy" Fields

**File:** `DashboardService.java`

```java
// Legacy fields kept so existing serialisation doesn't break
private ChartData chart1;
private ChartData chart2;
private ChartData chart3;
private double totalProfit;
private double companyExpenses;
```

Commented-as-"legacy" fields that are never populated are still serialized as `null` in the JSON response (despite `@JsonInclude(NON_NULL)` on `ApiResponse`, the inner `DashboardData` class doesn't have this annotation). These pollute the API contract and confuse API consumers.

**Recommendation:**
- Add `@JsonInclude(JsonInclude.Include.NON_NULL)` to the `DashboardData` inner class.
- Remove unused legacy fields and version the API if the contract has changed.

---

### 🟡 MEDIUM — `Transaction.type` and `Transaction.company` Are Plain Strings

**File:** `Transaction.java`

```java
private String type;    // Credit, Debit
private String company; // Main, GST
```

These are bounded sets of values but are stored and validated as free-form strings. `@NotBlank` is present but nothing prevents `type = "credit"` (lowercase) vs `"Credit"` (capitalized). The service layer uses `"Credit".equalsIgnoreCase(t.getType())` to paper over this, but the inconsistency propagates to the database.

**Recommendation:**
- Replace `String type` with an `enum TransactionType { CREDIT, DEBIT }` and `enum CompanyType { MAIN, GST }`.
- Normalize existing data in a migration script.

---

### 🟡 MEDIUM — Labour Identification is Text-Based and Fragile

**File:** `SiteAnalyticsService.java`

```java
String nature = t.getNature() != null ? t.getNature().toLowerCase() : "";
return nature.contains("labour") || nature.contains("labor") || ...
```

Identifying labour transactions by string matching on the `nature` field is fragile. A typo (`"Labur"`, `"Labourer wages"` vs `"Labour"`) will silently miscategorize transactions.

**Recommendation:**
- Add a `category` enum field to `Transaction` (e.g., `MATERIAL`, `LABOUR`, `OVERHEAD`, `REVENUE`).
- Migrate existing data using the current string-matching heuristic as a one-time migration.
- Validate `category` at write time.

---

### 🟡 MEDIUM — `@Autowired` Used Alongside `@RequiredArgsConstructor`

**File:** `SecurityConfig.java`

```java
@RequiredArgsConstructor
public class SecurityConfig {
    @Autowired
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
```

Mixing `@Autowired` with `@RequiredArgsConstructor` is redundant and confusing. `@RequiredArgsConstructor` from Lombok generates a constructor for all `final` fields, which Spring uses for constructor injection. The `@Autowired` annotations are unnecessary and should be removed.

---

### 🟡 MEDIUM — Debug Logging Enabled in Production Properties

**File:** `application.properties`

```properties
logging.level.com.amc.backend=DEBUG
logging.level.org.springframework.data.mongodb=DEBUG
```

DEBUG-level MongoDB logging will print every query, parameter, and result to the console/log. This:
- Exposes potentially sensitive financial data in logs.
- Creates significant log volume and I/O overhead in production.

**Recommendation:**
- Set `INFO` for production, `DEBUG` only for `application-dev.properties`.
- Use Spring profiles: `spring.profiles.active=dev` locally.

---

### 🟡 MEDIUM — `MongoConfig` Uses System Default Timezone

**File:** `MongoConfig.java`

```java
return source.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime();
```

Using `ZoneId.systemDefault()` means the date conversion behavior depends on the JVM's timezone setting. If the server timezone changes or the app is deployed in a different region, audit timestamps (`createdAt`, `updatedAt`) will shift.

**Recommendation:**
- Use `ZoneId.of("Asia/Kolkata")` explicitly (IST for Chennai-based company).
- Or store all timestamps as UTC and format for display.

---

## 6. Frontend — Architecture & Design

### 🟠 HIGH — `Chart.register(...registerables)` Called Multiple Times

**Files:** `dashboard.component.ts`, `sites.component.ts`, `site-detail.component.ts`

```typescript
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);
```

This line appears at the top of three separate component files. `Chart.register()` is a global side effect that registers all Chart.js plugins and controllers to a shared global registry. Calling it three times is redundant and will produce console warnings.

**Recommendation:**
- Call `Chart.register(...registerables)` exactly **once** in `main.ts` or `app.config.ts`.
- Remove the duplicate calls from individual component files.

---

### 🟠 HIGH — `SharedModule` Anti-Pattern in Standalone Components

**Files:** All page components

```typescript
imports: [SharedModule]
```

`SharedModule` is an `NgModule` that re-exports 20+ Angular Material modules, `CommonModule`, `FormsModule`, `ReactiveFormsModule`, and `NgChartsModule`. In an Angular 17 standalone component, **importing a `NgModule` that re-exports many modules imports ALL of them**, including modules the component doesn't use.

This negates the tree-shaking benefits of standalone components. For example, `LoginComponent` doesn't need `MatTableModule`, `MatSortModule`, `MatPaginatorModule`, or `NgChartsModule`, but it imports all of them via `SharedModule`.

**Recommendation:**
- For components that need only a few modules, import them directly.
- Or split `SharedModule` into functional groups: `MaterialFormModule`, `MaterialTableModule`, `MaterialLayoutModule`.
- In the long run, migrate away from `SharedModule` as standalone imports become the norm.

---

### 🟡 MEDIUM — No Environment File for Production

There is only one environment file: `environment.ts`. There is no `environment.prod.ts` or `environment.staging.ts`.

**Impact:**
- The `apiUrl` is hardcoded to `http://localhost:3000/api` — every production build must manually edit this file.
- `production: false` will be served in production builds.

**Recommendation:**
- Create `environment.prod.ts` with `production: true` and the production API URL.
- Configure `angular.json` to use file replacements for the `production` build configuration.

---

### 🟡 MEDIUM — No Role Guard Applied to Routes

**File:** `app.routes.ts`

All authenticated routes use only `authGuard`. There is no `roleGuard` applied to any route, even though the architecture description mentions it and a `VIEWER`, `ACCOUNTANT`, `ADMIN` role system exists.

**Impact:**
- A `VIEWER` user can navigate to and attempt to use any page, including destructive operations.
- Frontend role enforcement relies entirely on backend 403 responses (which is correct but provides a poor UX).

**Recommendation:**
- Apply `canActivate: [roleGuard('ADMIN')]` to admin-only pages (user management, dimensions).
- Apply `canActivate: [roleGuard('ACCOUNTANT')]` to write-capable pages.
- Hide edit/delete buttons in templates based on `auth.isAdmin()` or `auth.hasRole('ACCOUNTANT')`.

---

### 🟡 MEDIUM — Token Expiry Not Validated Client-Side

**File:** `auth.service.ts` → `isLoggedIn()`

```typescript
isLoggedIn(): boolean {
    return !!this.getToken() && this.currentUser() !== null;
}
```

`isLoggedIn()` only checks for token presence, not token validity. An expired JWT token will pass this check. The user will appear logged in, navigate to a page, and only discover the session is stale when the first API call returns 401.

**Recommendation:**
- Decode the JWT using `jwt-decode` (already a common dependency) and check the `exp` claim.
- Implement a token refresh flow triggered before expiry (e.g., refresh when <15% lifetime remaining).

---

## 7. Frontend — Performance & Optimization

### 🟠 HIGH — Loading 500 Records Client-Side for All Table Pages

**Files:** Multiple page components (e.g., `transactions.component.ts`)

```typescript
this.service.getAll(0, 500).subscribe(...)
```

Every table page loads up to 500 records in a single API call and uses `MatTableDataSource` for client-side filtering, sorting, and pagination. As the dataset grows:
- A transactions collection with 5,000+ records means the first page load requires fetching all 500 at once.
- Client-side filtering searches through all 500 records on every keystroke.
- Memory footprint of the `MatTableDataSource` grows linearly.

**Recommendation:**
- Implement **server-side pagination**: the backend already supports it (paginated endpoints exist). Use `MatPaginator`'s `page` events to trigger new API calls.
- Implement **server-side search/filter** by passing filter parameters to the API.
- Reserve client-side filtering only for small, static datasets (e.g., `dimensions`, `sites` with <100 records).

---

### 🟠 HIGH — Chart.js Configuration Objects Created Inline (Each Render)

**Files:** `dashboard.component.ts`, `sites.component.ts`, `site-detail.component.ts`

Chart options are defined as class properties with inline objects (hundreds of lines). While these are defined once at class instantiation (not on every render cycle), the issue is:
- Chart instances are not destroyed when the component is destroyed (`ngOnDestroy` is not implemented).
- Re-navigating to the same page creates new Chart.js instances without destroying the old ones, causing **"Canvas is already in use"** errors and memory leaks.

**Recommendation:**
- Implement `ngOnDestroy()` in all chart-containing components to destroy chart instances.
- Or use the `ng2-charts` (already installed) `BaseChartDirective` with proper lifecycle management — do not use `Chart.register()` alongside `ng2-charts`.

---

### 🟡 MEDIUM — Multiple HTTP Requests on `sites.component.ts` Initialization

**File:** `sites.component.ts` → `ngOnInit()`

```typescript
ngOnInit(): void {
    this.loadSites();       // GET /api/sites
    this.loadOverview();    // GET /api/sites/analytics/overview
}
```

Both calls are made sequentially (though they execute in parallel since they're HTTP observables). The overview call (`getSitesOverview()`) itself performs three full-table scans on the backend. Loading the Sites page triggers a potentially expensive backend computation every time.

**Recommendation:**
- Combine the two into a `forkJoin` to make the parallel nature explicit and handle errors together.
- Cache the overview result (e.g., with RxJS `shareReplay(1)`) within a session.
- Only load the overview when the "Analytics" tab is first selected (lazy tab loading).

---

### 🟡 MEDIUM — `BreakpointObserver` Subscription Not Unsubscribed

**File:** `layout.component.ts`

```typescript
this.breakpointObserver.observe([Breakpoints.Handset]).subscribe(result => {
    this.isMobile = result.matches;
});
```

The `BreakpointObserver` subscription is never unsubscribed. While `LayoutComponent` lives for the entire app lifetime (so this is low risk here), it sets a bad pattern that, if replicated in short-lived components, causes memory leaks.

**Recommendation:**
- Use Angular's `takeUntilDestroyed()` (Angular 16+) or `AsyncPipe` for observable subscriptions.
- Alternatively store the subscription and call `.unsubscribe()` in `ngOnDestroy()`.

---

### 🟡 MEDIUM — Date Filtering in `site-detail.component.ts` Is Client-Side Only

**File:** `site-detail.component.ts` → `applyChargesFilter()`

```typescript
if (this.filterDateFrom) {
    filtered = filtered.filter(c => c.date >= this.filterDateFrom);
}
```

The date filter operates on the already-loaded `allCharges` array (which can be hundreds of entries). This is correct for the current data size but does not scale. The date comparison is string-based (`>=` on ISO date strings), which works but is fragile.

**Recommendation:**
- Convert date strings to `Date` objects for comparison.
- As data grows, consider passing date range to the analytics API endpoint instead.

---

## 8. Frontend — Code Quality & Maintainability

### 🟠 HIGH — `Chart.register(...registerables)` Conflicts with `ng2-charts` Usage

The project uses `ng2-charts` (`NgChartsModule` in `SharedModule`) but also manually instantiates `Chart.js` with `Chart.register(...registerables)`. These two approaches conflict:
- `ng2-charts` manages Chart.js lifecycle via Angular's `BaseChartDirective`.
- Manual `Chart.js` instances bypass Angular's change detection and lifecycle management.

**Recommendation:**
- **Choose one approach.** Prefer `ng2-charts` directives (`<canvas baseChart ...>`) consistently across all components — it handles registration, destruction, and Angular integration automatically.
- Remove all manual `new Chart(...)` or `Chart.register()` calls.

---

### 🟡 MEDIUM — `formatCurrency()` Helper Duplicated Across Components

**Files:** `sites.component.ts`, `site-detail.component.ts`, `dashboard.component.ts`

```typescript
formatCurrency(value: number | undefined | null): string {
    return '₹' + (value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
```

This exact method is duplicated in at least three components.

**Recommendation:**
- Create a shared `CurrencyPipe` (Angular pipe) or a utility function in `src/app/shared/utils/currency.util.ts`.
- Import and use it wherever needed — reduces duplication and ensures consistent formatting.

---

### 🟡 MEDIUM — `truncate()` Helper Duplicated

**Files:** `sites.component.ts`, `site-detail.component.ts`

```typescript
private truncate(text: string, len: number): string {
    return text && text.length > len ? text.substring(0, len) + '…' : text;
}
```

Same helper duplicated. Should be a shared Angular pipe (`TruncatePipe`) or utility function.

---

### 🟡 MEDIUM — `confirm()` Is Used for Delete — Poor UX

**Files:** Multiple component `deleteRow()` methods

```typescript
if (confirm('Are you sure you want to delete this site?')) { ... }
```

The browser's native `confirm()` dialog:
- Blocks the main thread.
- Cannot be styled or customized.
- Is increasingly suppressed by browsers in iframes and certain contexts.
- Does not align with Material Design guidelines.

**Recommendation:**
- Replace with a Material Design `MatDialog` confirmation dialog.
- A reusable `ConfirmDialogComponent` would serve all deletion flows consistently.

---

### 🟡 MEDIUM — `loadUserFromStorage()` Parses JSON Without Schema Validation

**File:** `auth.service.ts`

```typescript
const user: User = JSON.parse(userJson);
this.currentUser.set(user);
```

While wrapped in a `try/catch`, the parsed object is cast to `User` without any validation. If the stored JSON is from an old schema (e.g., missing a new required field), the application will silently use an invalid user object.

**Recommendation:**
- Add a runtime shape check after JSON parsing (verify required fields like `id`, `email`, `role` exist).
- Consider using `zod` or a simple validator function for this purpose.

---

### 🟡 MEDIUM — Error Messages Are Generic and Unhelpful

Throughout all components:

```typescript
error: () => this.snackBar.open('Failed to load data', 'OK', { duration: 3000 })
```

The `error` callback ignores the `HttpErrorResponse` object. API errors with meaningful messages (e.g., `"Site not found with id: 'xyz'"`) are discarded.

**Recommendation:**
- Extract the error message from the `HttpErrorResponse`:
  ```typescript
  error: (err: HttpErrorResponse) => {
    const msg = err.error?.error?.message || 'An unexpected error occurred';
    this.snackBar.open(msg, 'OK', { duration: 4000 });
  }
  ```
- Create a shared `ErrorHandlerService` that extracts and formats API error messages consistently.

---

## 9. Data Integrity & Consistency

### 🔴 CRITICAL — No Transactional Guarantees

MongoDB transactions (multi-document ACID) are available on replica sets. There is no use of `MongoTransactionManager` or `@Transactional` anywhere in the codebase.

**Impact:**
- Creating an invoice and updating a transaction ledger are separate operations — a failure between them leaves data in an inconsistent state.
- Deleting a site does not clean up associated transactions or materials.

**Recommendation:**
- Enable MongoDB transactions for multi-document operations.
- Implement cascade rules: define what happens to transactions/materials when a site is deleted.
- Consider a soft-delete pattern (`isDeleted: true`) instead of hard deletion to preserve referential integrity.

---

### 🟠 HIGH — Referential Integrity Not Enforced

**Issue:** `Transaction.siteName` is a free-text copy of the site name, not a foreign key reference to a `Site`. Similarly, `Material.siteName` is a text field.

**Impact:**
- Renaming a site does not update transaction or material records.
- Transactions reference non-existent sites silently.
- Analytics group by string equality — a site renamed from "SiteA" to "Site A" (with a space) becomes two separate groups.

**Recommendation:**
- Store `siteId` (the business key) as the primary reference, not `siteName`.
- Denormalize `siteName` as a read-only display field, but query by `siteId`.
- Add a migration to ensure all existing `siteName` fields have a corresponding `siteId`.

---

### 🟠 HIGH — `Transaction.type` Values Are Case-Sensitive in Data but Case-Insensitive in Code

The service layer uses `"Credit".equalsIgnoreCase(t.getType())` while the model stores raw user-input. If data was migrated from CSV with inconsistent casing, analytics calculations will silently miscategorize transactions.

**Recommendation:**
- Normalize `type` to uppercase on write (in the service `create()` and `update()` methods).
- Run a one-time data migration to normalize existing records.

---

### 🟡 MEDIUM — GST Invoice Number Generation Fragile

**File:** `InvoiceService.java` → `generateNextInvoiceNo()`

After a deletion, `count()` returns a lower number and the next invoice could collide with a previously deleted (but possibly referenced in GST filings) invoice number.

**Impact:** GST invoice numbers are legally required to be sequential and unique. Reusing a deleted invoice number can cause compliance issues with the Indian GST portal.

---

## 10. Observability & Operations

### 🟠 HIGH — No Structured Logging

The application uses `@Slf4j` with basic string interpolation logging (only in `AuthService`). Most services have no logging at all, and the few that exist log unstructured text.

**Issues:**
- No request ID / correlation ID for tracing requests across logs.
- No audit log of who changed what financial record.
- No structured format (JSON) for log aggregation tools.

**Recommendation:**
- Add `logback-spring.xml` with JSON appender (e.g., `logstash-logback-encoder`).
- Log all CRUD operations at `INFO` level with user ID, resource type, and resource ID.
- Add an audit log collection (`audit_log`) with `userId`, `action`, `resourceType`, `resourceId`, `timestamp`.

---

### 🟠 HIGH — No API Rate Limiting or Request Size Limits

Beyond the authentication brute-force concern, there are no limits on:
- Request payload size (a client could POST a 100MB JSON body to crash the server).
- Response size (a request for all transactions with no limit could return thousands of records).

**Recommendation:**
- Set `spring.servlet.multipart.max-file-size=5MB` and `spring.servlet.multipart.max-request-size=10MB`.
- Set `server.tomcat.max-http-form-post-size=2MB`.
- Apply pagination defaulting to reasonable limits (already partially done — enforce max size of 200).

---

### 🟡 MEDIUM — No CI/CD Pipeline

There is no `.github/workflows/` or equivalent pipeline configuration. Every deployment is manual.

**Recommendation:**
- Create a GitHub Actions workflow with:
  - `mvn test` for backend tests.
  - `ng build --configuration production` for frontend.
  - Docker image build and push (optional).
  - Deployment to hosting environment.

---

### 🟡 MEDIUM — No API Documentation

No OpenAPI/Swagger configuration exists. This means:
- Frontend developers must read Java source code to understand API contracts.
- There is no way to test endpoints without a client application.

**Recommendation:**
- Add `springdoc-openapi-ui` dependency to generate Swagger UI automatically.
- Annotate key endpoints with `@Operation` and `@ApiResponse` descriptions.

---

## 11. What Is Done Well ✅

The following aspects of the codebase are well-designed and should be preserved:

1. **Consistent API Envelope** — `ApiResponse<T>` wrapping with `ok`/`error` status is applied uniformly across all controllers. This is a professional, production-grade pattern.

2. **GlobalExceptionHandler** — Centralized exception handling maps domain exceptions to correct HTTP status codes. Clean and complete for the exception types covered.

3. **Functional Auth Patterns (Frontend)** — `authGuard` as a `CanActivateFn`, `authInterceptor` as `HttpInterceptorFn`, and `AuthService` using Angular `signal()` are all modern, idiomatic Angular 17 patterns.

4. **Lombok Usage** — Consistent use of `@Data`, `@Builder`, `@RequiredArgsConstructor` reduces boilerplate significantly without sacrificing readability.

5. **Stateless JWT Architecture** — Correct stateless design with `SessionCreationPolicy.STATELESS`. No server-side session management needed.

6. **Standalone Angular Components** — All page components are `standalone: true`, using the modern Angular 17 component model with lazy loading via `loadComponent`. This is correct and forward-compatible.

7. **New Angular Control Flow** — Correct use of `@if`, `@for`, `@switch` throughout templates instead of deprecated structural directives.

8. **Service Layer Abstraction** — Frontend services correctly unwrap `ApiResponse<T>` before returning to components — components never deal with the envelope, which is clean separation of concerns.

9. **MongoConfig Custom Converters** — The `DateToLocalDateTimeConverter` and `StringToLocalDateTimeConverter` handle edge cases from CSV-migrated data gracefully, preventing runtime errors from legacy data formats.

10. **Excel Export with Apache POI** — Multi-sheet Excel export is a well-implemented feature with header styling, currency formatting, and auto-sized columns.

11. **Indian Currency Formatting** — Consistent use of `toLocaleString('en-IN')` with `₹` prefix throughout the frontend is correct for the target locale.

12. **Pagination Support** — Backend pagination infrastructure (`Page<T>`, `Pageable`, `PaginationMeta`) is correctly implemented and consistent across paginated endpoints.

---

## 12. Priority Issue Summary

| # | Severity | Area | Issue | Impact |
|---|---|---|---|---|
| 1 | 🔴 CRITICAL | Security | MongoDB credentials in source code | Full DB compromise if repo exposed |
| 2 | 🔴 CRITICAL | Security | JWT secret in source code | All user sessions can be forged |
| 3 | 🔴 CRITICAL | Security | Refresh token not revocable | Stolen tokens valid for 7 days |
| 4 | 🔴 CRITICAL | Performance | Full table scans in analytics | OOM / timeout as data grows |
| 5 | 🔴 CRITICAL | Performance | Missing DB indexes | Slow queries on all filtered endpoints |
| 6 | 🔴 CRITICAL | Data | No transactional guarantees | Inconsistent financial data on errors |
| 7 | 🟠 HIGH | Security | No rate limiting on login | Brute-force attacks possible |
| 8 | 🟠 HIGH | Security | `UserService.create()` no password hash | Plaintext passwords stored |
| 9 | 🟠 HIGH | Design | Domain models as API request bodies | API contract leakage; security risk |
| 10 | 🟠 HIGH | Performance | 500 records loaded client-side | Poor UX / browser performance at scale |
| 11 | 🟠 HIGH | Frontend | Chart.js registered multiple times | Memory leaks; canvas reuse errors |
| 12 | 🟠 HIGH | Integrity | `siteName` as foreign key | Analytics break on site rename |
| 13 | 🟠 HIGH | Quality | No automated tests | Regression risk for financial calculations |
| 14 | 🟠 HIGH | Observability | No structured logging or audit trail | Cannot trace financial changes |
| 15 | 🟡 MEDIUM | Security | Debug logging in production | Financial data in logs |
| 16 | 🟡 MEDIUM | Design | DTOs as service inner classes | Layer coupling |
| 17 | 🟡 MEDIUM | Frontend | No production environment file | Hardcoded localhost URL in prod builds |
| 18 | 🟡 MEDIUM | Frontend | No role guards on routes | VIEWER can navigate to admin pages |
| 19 | 🟡 MEDIUM | UX | `confirm()` for deletions | Blocked UI; non-Material UX |
| 20 | 🟡 MEDIUM | Quality | Duplicate helper methods across components | Maintenance overhead |

---

## 13. Recommended Roadmap

### Immediate (Sprint 1 — 1–2 weeks)
> These are security-critical items that should be fixed before any production deployment.

- [ ] Move credentials out of `application.properties` → environment variables / `.env` file
- [ ] Rotate MongoDB Atlas password and JWT secret
- [ ] Add rate limiting to `/api/auth/login`
- [ ] Fix `UserService.create()` to hash passwords
- [ ] Create `application-prod.properties` and `environment.prod.ts`
- [ ] Call `Chart.register()` only once in `main.ts`

### Short-Term (Sprint 2–3 — 2–4 weeks)
> Performance and data integrity foundations.

- [ ] Add MongoDB compound indexes to `Transaction`, `Material`, `GstOutward`, `GstInward`
- [ ] Replace full-table-scan analytics with MongoDB aggregation pipelines
- [ ] Add Redis cache to dashboard and sites overview endpoints
- [ ] Normalize `Transaction.type` and `Transaction.company` to enums
- [ ] Add `siteId` as primary reference on `Transaction` and `Material`
- [ ] Implement revocable refresh tokens (store in DB)

### Medium-Term (Sprint 4–6 — 4–8 weeks)
> Code quality, maintainability, and DX improvements.

- [ ] Add JUnit 5 unit tests for all service classes (target 80% coverage)
- [ ] Extract DTOs for all API request/response bodies
- [ ] Move `DashboardService` inner DTOs to `dto/` package
- [ ] Create shared `CurrencyPipe` and `TruncatePipe` in Angular
- [ ] Replace `confirm()` dialogs with `MatDialog` `ConfirmDialogComponent`
- [ ] Implement `ngOnDestroy` in all components with subscriptions
- [ ] Add `roleGuard` to protected routes
- [ ] Add structured JSON logging with audit trail
- [ ] Add OpenAPI/Swagger documentation

### Long-Term (Sprint 7+)
> Scalability and production readiness.

- [ ] Implement server-side pagination for all table pages (remove 500-record client-side loading)
- [ ] Add CI/CD pipeline with GitHub Actions
- [ ] Migrate to request/response DTOs (remove domain model from API contract)
- [ ] Add MongoDB transactions for multi-document operations
- [ ] Implement refresh token rotation
- [ ] Add account lockout after N failed login attempts
- [ ] Consider splitting `SharedModule` into focused sub-modules for better tree-shaking

---

*End of Review — AMC Business Management, April 14, 2026*
