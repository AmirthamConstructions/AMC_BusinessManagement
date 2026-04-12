# AMC Business Management — Copilot Project Instructions

> **Read this file completely before starting any task.** This document describes the full architecture, conventions, file locations, and patterns for both the backend and frontend. Every new feature, bug fix, or refactor must follow these exact patterns.

---

## 1. Project Overview

**AMC Business Management** is a full-stack business management application for **Amirtham Constructions**, a construction company based in Chennai, India. It tracks transactions, sites, materials, invoices, GST filings, profit & loss, balance sheets, and dashboards.

| Layer | Tech | Version | Port |
|-------|------|---------|------|
| Backend | Spring Boot + MongoDB | Spring Boot 2.7.11, Java 8 | `3000` |
| Frontend | Angular + Angular Material | Angular 17.3, Material 17.3 | `4200` |
| Database | MongoDB Atlas | Cluster0 | Cloud |
| Auth | JWT (jjwt 0.11.5) | Bearer tokens | — |

---

## 2. Workspace Structure

```
AMC_BusinessManagement/
├── amc-backend/                      # Spring Boot REST API
│   ├── pom.xml                       # Maven — Spring Boot 2.7.11, Java 8
│   └── src/main/java/com/amc/backend/
│       ├── AmcBackendApplication.java
│       ├── config/
│       │   ├── MongoConfig.java
│       │   └── SecurityConfig.java   # CORS, JWT filter, role-based security
│       ├── controller/               # REST controllers (one per entity)
│       ├── dto/                      # ApiResponse, PaginationMeta, Auth DTOs
│       ├── exception/                # GlobalExceptionHandler, ResourceNotFoundException, DuplicateResourceException
│       ├── model/                    # MongoDB @Document models (Lombok)
│       ├── repository/               # MongoRepository interfaces
│       ├── security/                 # JwtTokenProvider, JwtAuthFilter, EntryPoint
│       └── service/                  # Business logic services
├── amc-frontend/                     # Angular 17 SPA
│   ├── package.json
│   └── src/
│       ├── environments/environment.ts  # apiUrl = http://localhost:3000/api
│       └── app/
│           ├── app.config.ts         # provideRouter, provideHttpClient with authInterceptor
│           ├── app.routes.ts         # Lazy-loaded routes inside LayoutComponent
│           ├── guards/               # authGuard (functional), roleGuard (factory)
│           ├── interceptors/         # authInterceptor — attaches Bearer token
│           ├── layout/               # Shell: toolbar + sidenav + router-outlet
│           ├── models/               # TypeScript interfaces (one per entity)
│           ├── pages/                # One folder per page (standalone components)
│           ├── services/             # HttpClient services (one per entity)
│           └── shared/
│               └── shared.module.ts  # Re-exports CommonModule, FormsModule, ReactiveFormsModule + all Material modules
├── CSV/                              # Raw business data CSVs (migrated to MongoDB)
├── migration/                        # Node.js migration scripts & validation
└── .github/copilot-instructions.md   # THIS FILE
```

---

## 3. Backend Patterns & Conventions

### 3.1 Model (MongoDB Document)

**Location:** `amc-backend/src/main/java/com/amc/backend/model/`

Every model follows this exact pattern:

```java
package com.amc.backend.model;

import javax.validation.constraints.*;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "collection_name")  // snake_case collection name
public class EntityName {

    @Id
    private String id;                     // MongoDB auto-generated

    @Indexed(unique = true)                // For business keys
    @NotBlank(message = "... is required") // javax.validation
    private String businessKey;

    // Domain fields...
    private LocalDate dateField;
    private Double numericField;
    private String textField;

    private LocalDateTime createdAt;       // Always present
    private LocalDateTime updatedAt;       // Always present
}
```

**Key rules:**
- Use `@Data @Builder @NoArgsConstructor @AllArgsConstructor` (Lombok)
- `@Id` is always `String id`
- Dates: `LocalDate` for business dates, `LocalDateTime` for audit timestamps
- Numbers: `Double` (not `double`) — nullable
- Booleans: `Boolean` with `@Builder.Default` for defaults
- Use `javax.validation.constraints` annotations for required fields
- Embedded objects: static inner classes with same Lombok annotations (see `Invoice.InvoiceLineItem`)

**Existing models & collections:**

| Model | Collection | Key Fields |
|-------|-----------|------------|
| `Transaction` | `transactions` | `transactionId` (unique), `date`, `company` (Main/GST), `type` (Credit/Debit), `amount` |
| `Site` | `sites` | `siteId` (unique), `name`, `company`, `isActive` |
| `Material` | `materials` | `billNo`, `date`, `itemName`, `quantity`, `rate`, `amount`, `siteName` |
| `GstOutward` | `gst_outward` | `invoiceNo` (unique), `invoiceDate`, `customerName`, `customerGSTIN`, `taxableValue`, `cgstAmount`, `sgstAmount`, `invoiceValue` |
| `GstInward` | `gst_inward` | `purchaseBillNo`, `invoiceDate`, `companyName`, `taxableValue`, `cgstAmount`, `sgstAmount`, `purchaseBillValue` |
| `BalanceRow` | `balance_sheet` | `company`, `financialYear`, `liability`, `liabilityAmount`, `asset`, `assetAmount` |
| `PnlEntry` | `profit_loss` | `company`, `financialYear`, `date`, `income`, `incomeAmount`, `expense`, `expenseAmount` |
| `Invoice` | `invoices` | `invoiceNo` (unique), `invoiceDate`, `customerName`, `customerGSTIN`, `lineItems` (embedded list), `subTotal`, `cgstAmount`, `sgstAmount`, `grandTotal`, `status` |
| `Dimension` | `dimensions` | `name` (unique), `values` (List<String>) |
| `User` | `users` | `email` (unique), `password` (BCrypt), `role` (ADMIN/ACCOUNTANT/VIEWER) |

### 3.2 Repository

**Location:** `amc-backend/src/main/java/com/amc/backend/repository/`

```java
package com.amc.backend.repository;

import com.amc.backend.model.EntityName;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EntityNameRepository extends MongoRepository<EntityName, String> {
    // Spring Data derived query methods
    Page<EntityName> findByField(String value, Pageable pageable);
    Optional<EntityName> findByUniqueField(String value);
    List<EntityName> findByDateBetween(LocalDate start, LocalDate end);
}
```

**Key rules:**
- Extend `MongoRepository<EntityName, String>`
- Use `Page<T>` return for paginated endpoints, `List<T>` for non-paginated
- Use Spring Data derived query method naming

### 3.3 Service

**Location:** `amc-backend/src/main/java/com/amc/backend/service/`

```java
package com.amc.backend.service;

@Service
@RequiredArgsConstructor
public class EntityNameService {

    private final EntityNameRepository entityNameRepository;

    // PAGINATION: Always use Page for list endpoints
    public Page<EntityName> findAll(int page, int size, String sortBy, String direction) {
        Sort sort = direction.equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        return entityNameRepository.findAll(pageable);
    }

    // FIND BY ID: Always throw ResourceNotFoundException
    public EntityName findById(String id) {
        return entityNameRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("EntityName", "id", id));
    }

    // CREATE: Set createdAt + updatedAt
    public EntityName create(EntityName entity) {
        entity.setCreatedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());
        return entityNameRepository.save(entity);
    }

    // UPDATE: Fetch existing, copy fields, set updatedAt
    public EntityName update(String id, EntityName entity) {
        EntityName existing = findById(id);
        existing.setField(entity.getField());
        // ... copy all fields
        existing.setUpdatedAt(LocalDateTime.now());
        return entityNameRepository.save(existing);
    }

    // DELETE: Check exists, throw if not
    public void delete(String id) {
        if (!entityNameRepository.existsById(id)) {
            throw new ResourceNotFoundException("EntityName", "id", id);
        }
        entityNameRepository.deleteById(id);
    }

    // BUILD META: Standard pagination meta
    public PaginationMeta buildMeta(Page<?> page) {
        return PaginationMeta.builder()
                .total(page.getTotalElements())
                .page(page.getNumber())
                .perPage(page.getSize())
                .totalPages(page.getTotalPages())
                .build();
    }
}
```

### 3.4 Controller

**Location:** `amc-backend/src/main/java/com/amc/backend/controller/`

```java
package com.amc.backend.controller;

@RestController
@RequestMapping("/api/entity-name")   // kebab-case URL
@RequiredArgsConstructor
public class EntityNameController {

    private final EntityNameService entityNameService;

    // GET ALL (paginated)
    @GetMapping
    public ResponseEntity<ApiResponse<List<EntityName>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "date") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {
        Page<EntityName> result = entityNameService.findAll(page, size, sortBy, direction);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), entityNameService.buildMeta(result)));
    }

    // GET BY ID
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<EntityName>> getById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(entityNameService.findById(id)));
    }

    // CREATE
    @PostMapping
    public ResponseEntity<ApiResponse<EntityName>> create(@Valid @RequestBody EntityName entity) {
        EntityName created = entityNameService.create(entity);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created));
    }

    // UPDATE
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<EntityName>> update(@PathVariable String id, @Valid @RequestBody EntityName entity) {
        return ResponseEntity.ok(ApiResponse.ok(entityNameService.update(id, entity)));
    }

    // DELETE
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        entityNameService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
```

**Key rules:**
- Every response wraps in `ApiResponse<T>` (never raw objects)
- Paginated list endpoints return `ApiResponse.ok(content, meta)`
- Single-object endpoints return `ApiResponse.ok(data)`
- POST returns `HttpStatus.CREATED`
- DELETE returns `204 No Content`
- Use `@Valid` on `@RequestBody`

### 3.5 API Response Envelope

All API responses use this envelope:

```json
{
  "status": "ok",
  "data": { ... },
  "meta": {                    // Only on paginated endpoints
    "total": 150,
    "page": 0,
    "perPage": 20,
    "totalPages": 8
  }
}
```

Error responses:
```json
{
  "status": "error",
  "error": {
    "code": "NOT_FOUND",
    "message": "Transaction not found with id: 'xyz'"
  }
}
```

### 3.6 API URL Convention

All endpoints: `http://localhost:3000/api/{resource-kebab-case}`

| Resource | Base URL |
|----------|----------|
| Transactions | `/api/transactions` |
| Sites | `/api/sites` |
| Materials | `/api/materials` |
| GST Outward | `/api/gst-outward` |
| GST Inward | `/api/gst-inward` |
| Balance Sheet | `/api/balance-sheet` |
| Profit & Loss | `/api/profit-loss` |
| Invoices | `/api/invoices` |
| Dimensions | `/api/dimensions` |
| Dashboard | `/api/dashboard` |
| Auth | `/api/auth` |
| Users | `/api/users` |

### 3.7 Security & Authentication

- JWT Bearer token authentication
- Roles: `ADMIN`, `ACCOUNTANT`, `VIEWER`
- Public endpoints: `/api/auth/**`, `/api/health`
- DELETE operations require `ROLE_ADMIN`
- `/api/users/**` requires `ROLE_ADMIN`
- All other `/api/**` require authentication
- Token in header: `Authorization: Bearer <token>`

### 3.8 Exception Handling

Use `GlobalExceptionHandler` (@RestControllerAdvice):
- `ResourceNotFoundException` → 404
- `DuplicateResourceException` → 409
- `MethodArgumentNotValidException` → 400 (validation errors)
- `AccessDeniedException` → 403
- `Exception` → 500

---

## 4. Frontend Patterns & Conventions

### 4.1 General Architecture

- **Angular 17.3** with **standalone components** (no NgModules per page)
- **Angular Material 17.3** for UI
- **SharedModule** re-exports CommonModule, FormsModule, ReactiveFormsModule, and all Material modules
- **Lazy-loaded routes** with `loadComponent`
- **Functional guards and interceptors** (not class-based)
- **Signals** for AuthService state (`currentUser`)
- **New control flow syntax**: `@if`, `@for`, `@switch` (NOT *ngIf/*ngFor)

### 4.2 Model (TypeScript Interface)

**Location:** `amc-frontend/src/app/models/`

One file per entity, named `{entity-kebab}.model.ts`:

```typescript
export interface EntityName {
  id: string;
  fieldName: string;
  dateField: string;      // Dates come as ISO strings from backend
  numericField: number;
  optionalField?: string;
}
```

**Standard shared model (`api-response.model.ts`):**
```typescript
export interface ApiResponse<T> {
  status: 'ok' | 'error';
  data: T;
  meta?: PaginationMeta;
  error?: ApiError;
}
export interface PaginationMeta {
  total: number; page: number; perPage: number; totalPages: number;
}
export interface ApiError { code: string; message: string; }
```

### 4.3 Service (HttpClient)

**Location:** `amc-frontend/src/app/services/`

One file per entity, named `{entity-kebab}.service.ts`:

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { EntityName } from '../models/entity-name.model';
import { ApiResponse, PaginationMeta } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class EntityNameService {

  private url = `${environment.apiUrl}/entity-name`;  // kebab-case

  constructor(private http: HttpClient) {}

  // Paginated list — unwrap ApiResponse
  getAll(page = 0, size = 50, sortBy = 'date', direction = 'desc'): Observable<{ data: EntityName[]; meta?: PaginationMeta }> {
    const params = new HttpParams()
      .set('page', page).set('size', size)
      .set('sortBy', sortBy).set('direction', direction);
    return this.http.get<ApiResponse<EntityName[]>>(this.url, { params })
      .pipe(map(res => ({ data: res.data, meta: res.meta })));
  }

  // Non-paginated list — unwrap to array
  // getAll(): Observable<EntityName[]> {
  //   return this.http.get<ApiResponse<EntityName[]>>(this.url)
  //     .pipe(map(res => res.data));
  // }

  getById(id: string): Observable<EntityName> {
    return this.http.get<ApiResponse<EntityName>>(`${this.url}/${id}`)
      .pipe(map(res => res.data));
  }

  create(entity: Partial<EntityName>): Observable<EntityName> {
    return this.http.post<ApiResponse<EntityName>>(this.url, entity)
      .pipe(map(res => res.data));
  }

  update(id: string, entity: Partial<EntityName>): Observable<EntityName> {
    return this.http.put<ApiResponse<EntityName>>(`${this.url}/${id}`, entity)
      .pipe(map(res => res.data));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
```

**Key rules:**
- Always unwrap `ApiResponse` with `.pipe(map(res => res.data))` — components never see the envelope
- Use `environment.apiUrl` (never hardcode URLs)
- `Injectable({ providedIn: 'root' })` — no need to add to providers
- Auth token is automatically attached by `authInterceptor`

### 4.4 Page Component (Standalone)

**Location:** `amc-frontend/src/app/pages/{page-name}/`

Each page has 3 files:
- `{page-name}.component.ts`
- `{page-name}.component.html`
- `{page-name}.component.scss`

**Component pattern:**

```typescript
import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { EntityNameService } from '../../services/entity-name.service';
import { EntityName } from '../../models/entity-name.model';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-page-name',
  standalone: true,                    // ALWAYS standalone
  imports: [SharedModule],             // ALWAYS import SharedModule
  templateUrl: './page-name.component.html',
  styleUrl: './page-name.component.scss'
})
export class PageNameComponent implements OnInit, AfterViewInit {
  displayedColumns = ['col1', 'col2', 'actions'];
  dataSource = new MatTableDataSource<EntityName>();
  searchText = '';
  loading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private service: EntityNameService, private snackBar: MatSnackBar) {}

  ngOnInit(): void { this.loadData(); }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadData(): void {
    this.loading = true;
    this.service.getAll(0, 500).subscribe({
      next: (res) => {
        this.dataSource.data = res.data;
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load data', 'OK', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
    this.dataSource.filter = this.searchText.trim().toLowerCase();
  }

  deleteRow(id: string): void {
    if (confirm('Delete this item?')) {
      this.service.delete(id).subscribe({
        next: () => {
          this.loadData();
          this.snackBar.open('Deleted', 'OK', { duration: 2000 });
        },
        error: () => this.snackBar.open('Failed to delete', 'OK', { duration: 3000 })
      });
    }
  }
}
```

**Key rules:**
- Components are always `standalone: true`
- Always import `SharedModule` (contains all Material modules)
- Use `MatTableDataSource<T>` for table pages
- `loading` boolean for spinner state
- Use `subscribe({ next, error })` — never `.then()`
- Error handling via `MatSnackBar` with 3000ms duration
- Success messages via `MatSnackBar` with 2000ms duration
- Delete always uses `confirm()` before calling API

### 4.5 Template Conventions (HTML)

- Use Angular 17 `@if` / `@for` / `@switch` control flow (NOT `*ngIf` / `*ngFor`)
- Loading spinner: `@if (loading) { <div class="loading-container"><mat-spinner diameter="40"></mat-spinner></div> }`
- Page header: `<div class="page-header"><h2>Title</h2><button>Action</button></div>`
- Table pattern: `<mat-card><mat-card-content><table mat-table ...>`
- Search field: `<mat-form-field appearance="outline">` with `(keyup)="applyFilter()"`
- Actions column: icon buttons for edit/delete
- Currency display: `₹{{ value | number }}` or `formatCurrency(value)` helper

### 4.6 Adding a New Route

1. Add route in `app.routes.ts` inside the `children` array of the LayoutComponent path:
   ```typescript
   { path: 'new-page', loadComponent: () => import('./pages/new-page/new-page.component').then(m => m.NewPageComponent) },
   ```

2. Add nav item in `layout.component.ts` → `navItems` array:
   ```typescript
   { label: 'New Page', icon: 'material_icon_name', route: '/new-page' },
   ```

### 4.7 Auth Flow

- Login/Register → POST `/api/auth/login` or `/api/auth/register` → receives JWT + refresh token
- Token stored in `localStorage` as `amc_token`
- `authInterceptor` attaches `Authorization: Bearer <token>` to all API requests (except auth endpoints)
- `authGuard` checks `isLoggedIn()` before allowing route activation
- `roleGuard('ADMIN')` factory for admin-only routes
- On 401 response, interceptor clears session and redirects to `/login`

---

## 5. Existing Entities — Quick Reference

### 5.1 Backend File Map

| Entity | Model | Repository | Service | Controller |
|--------|-------|-----------|---------|-----------|
| Transaction | `Transaction.java` | `TransactionRepository.java` | `TransactionService.java` | `TransactionController.java` |
| Site | `Site.java` | `SiteRepository.java` | `SiteService.java` | `SiteController.java` |
| Material | `Material.java` | `MaterialRepository.java` | `MaterialService.java` | `MaterialController.java` |
| GstOutward | `GstOutward.java` | `GstOutwardRepository.java` | `GstOutwardService.java` | `GstOutwardController.java` |
| GstInward | `GstInward.java` | `GstInwardRepository.java` | `GstInwardService.java` | `GstInwardController.java` |
| BalanceRow | `BalanceRow.java` | `BalanceRowRepository.java` | `BalanceSheetService.java` | `BalanceSheetController.java` |
| PnlEntry | `PnlEntry.java` | `PnlEntryRepository.java` | `PnlService.java` | `PnlController.java` |
| Invoice | `Invoice.java` | `InvoiceRepository.java` | `InvoiceService.java` | `InvoiceController.java` |
| Dimension | `Dimension.java` | `DimensionRepository.java` | `DimensionService.java` | `DimensionController.java` |
| User | `User.java` | `UserRepository.java` | `UserService.java` / `AuthService.java` | `UserController.java` / `AuthController.java` |
| Dashboard | — | — | `DashboardService.java` | `DashboardController.java` |

### 5.2 Frontend File Map

| Entity | Model | Service | Page Component |
|--------|-------|---------|----------------|
| Transaction | `transaction.model.ts` | `transaction.service.ts` | `pages/transactions/` |
| Site | `site.model.ts` | `site.service.ts` | `pages/sites/` |
| Material | `material.model.ts` | `material.service.ts` | `pages/materials/` |
| GstOutward | `gst-outward.model.ts` | `gst-outward.service.ts` | `pages/gst-outward/` |
| GstInward | `gst-inward.model.ts` | `gst-inward.service.ts` | `pages/gst-inward/` |
| BalanceRow | `balance-sheet.model.ts` | `balance-sheet.service.ts` | `pages/balance-sheet/` |
| PnlEntry | `pnl.model.ts` | `pnl.service.ts` | `pages/profit-loss/` |
| Invoice | `invoice.model.ts` | `invoice.service.ts` | `pages/invoices/` |
| Dimension | `dimension.model.ts` | `dimension.service.ts` | `pages/dimensions/` |
| Dashboard | `dashboard.model.ts` | `dashboard.service.ts` | `pages/dashboard/` |
| User/Auth | `user.model.ts` | `auth.service.ts` | `pages/login/`, `pages/register/` |
| API Shared | `api-response.model.ts` | — | — |

---

## 6. How to Add a New Feature (Checklist)

When given a new requirement, follow these steps **in order**:

### Step 1: Analyse
- Read this instruction file
- Identify which existing entities/files are affected
- Read the relevant existing model, service, controller, and component files
- Plan what new files to create and what existing files to modify

### Step 2: Backend (if needed)
1. **Model** → `amc-backend/src/main/java/com/amc/backend/model/NewEntity.java`
2. **Repository** → `amc-backend/src/main/java/com/amc/backend/repository/NewEntityRepository.java`
3. **Service** → `amc-backend/src/main/java/com/amc/backend/service/NewEntityService.java`
4. **Controller** → `amc-backend/src/main/java/com/amc/backend/controller/NewEntityController.java`
5. **DTO** (if needed) → `amc-backend/src/main/java/com/amc/backend/dto/`

### Step 3: Frontend (if needed)
1. **Model** → `amc-frontend/src/app/models/new-entity.model.ts`
2. **Service** → `amc-frontend/src/app/services/new-entity.service.ts`
3. **Page Component** → `amc-frontend/src/app/pages/new-page/` (3 files: .ts, .html, .scss)
4. **Route** → Add to `app.routes.ts` children array
5. **Nav Item** → Add to `layout.component.ts` navItems array
6. **npm packages** (if needed) → Install and add to `package.json`

### Step 4: Validate
- Check all files for TypeScript/Java errors
- Ensure model fields match between backend and frontend
- Ensure API URL in service matches controller `@RequestMapping`
- Verify route and nav item are added

---

## 7. Company Information (for Invoices)

```
AMIRTHAM CONSTRUCTIONS
1A, Subramani Nagar, Keelkattalai, Chennai 600117
Phone: +91 9092 212121
Email: amirthamconstructions@yahoo.com
GSTIN: 33ACKFA9096N1ZO

Bank Details:
  A/C Name: Amirtham Constructions
  Bank: STATE BANK OF INDIA
  A/C No: 44427007958
  IFSC: SBIN0016545
  Branch: KILKATTALAI

Logo: amc-frontend/src/assets/logo.jpg
Authorized Signatory: Tharun
```

---

## 8. Database Info

- **MongoDB Atlas** cluster: `cluster0.aszzz.mongodb.net`
- **Database name:** `amc_business`
- **Collections:** `transactions`, `sites`, `materials`, `gst_outward`, `gst_inward`, `balance_sheet`, `profit_loss`, `invoices`, `dimensions`, `users`
- **Data was migrated** from CSV files using Node.js scripts in `migration/`

---

## 9. Critical Conventions — DO NOT VIOLATE

1. **Never return raw objects from API** — always wrap in `ApiResponse<T>`
2. **Never use `*ngIf`/`*ngFor` in templates** — use `@if`/`@for`
3. **All page components must be `standalone: true`** and import `SharedModule`
4. **All services use `Injectable({ providedIn: 'root' })`** — never add to module providers
5. **All HTTP calls use Observable pattern** with `subscribe({ next, error })` — never use `.then()` or `async/await` on HTTP
6. **Backend models always have `createdAt` and `updatedAt` fields** (LocalDateTime)
7. **Frontend services always unwrap `ApiResponse`** with `.pipe(map(res => res.data))` — components never see the envelope
8. **Use `MatSnackBar` for user notifications** — success: 2000ms, error: 3000ms
9. **Use `confirm()` before delete operations**
10. **Backend uses Lombok** — `@Data @Builder @NoArgsConstructor @AllArgsConstructor @RequiredArgsConstructor`
11. **Java 8 compatibility** — no `var`, no records, no text blocks, use `javax.validation` (not `jakarta`)
12. **Frontend uses reactive forms** (`FormBuilder`, `FormGroup`, `FormArray`) for complex forms, `[(ngModel)]` for simple bindings
13. **Currency format:** `₹` prefix, Indian number format (`toLocaleString('en-IN')`)
14. **Backend server port:** `3000`, Frontend dev port: `4200`
15. **All API URLs are kebab-case:** `/api/gst-outward`, `/api/balance-sheet`, `/api/profit-loss`

---

## 10. Installed npm Packages (Frontend)

| Package | Purpose |
|---------|---------|
| `@angular/material` + `@angular/cdk` | UI components |
| `rxjs` | Reactive programming |
| `jspdf` | PDF generation |
| `html2canvas` | HTML to canvas (for PDF) |

---

## 11. Key File Paths (Quick Access)

```
# Backend entry point
amc-backend/src/main/java/com/amc/backend/AmcBackendApplication.java

# Backend config
amc-backend/src/main/resources/application.properties
amc-backend/src/main/java/com/amc/backend/config/SecurityConfig.java

# Frontend entry point
amc-frontend/src/app/app.config.ts
amc-frontend/src/app/app.routes.ts

# Frontend layout shell
amc-frontend/src/app/layout/layout.component.ts
amc-frontend/src/app/layout/layout.component.html

# Shared module (all Material imports)
amc-frontend/src/app/shared/shared.module.ts

# Environment / API URL
amc-frontend/src/environments/environment.ts

# Auth
amc-frontend/src/app/services/auth.service.ts
amc-frontend/src/app/interceptors/auth.interceptor.ts
amc-frontend/src/app/guards/auth.guard.ts
```
