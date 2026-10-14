# RAIS Frozen Foods — Independent Staging Verification, APK Safety Audit & Physical Pilot Gate Report

**Auditor:** Principal Software Architect, Senior Backend Engineer, NLP/Voice Systems Engineer, Application Security Engineer, Database Transaction Specialist, and QA Lead  
**Audit Timestamp:** October 14, 2026, 11:50:00 +05:30  
**Repository Scope:** `C:\Users\affra\Documents\RAIS`  
**Deployment Commit:** `3471041a8e4e544392382e16f007407ab77dd896`  
**Overall Release Gate Decision:** **BLOCKED**  
**Production Release Status:** **STRICTLY ON HOLD**

---

## 1. Executive Summary & Release Gate Decision

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 OVERALL GATE DECISION: BLOCKED                                        │
│                        PRODUCTION RELEASE: STRICTLY ON HOLD (Zero Live Mutations)                       │
├────────────────────────────────┬──────────────┬────────────────────────────────────────────────────────┤
│ Gate Evaluation Component      │ Status       │ Key Evidence & Findings                                │
├────────────────────────────────┼──────────────┼────────────────────────────────────────────────────────┤
│ Gate A: Pre-Deployment Safety  │ PASS         │ All 8 pre-deployment checks PASS. Fail-closed safety   │
│         & Isolation Review     │              │ guard (database.py) rejects production host in non-prod│
│                                │              │ contexts. Clean working tree at commit 3471041.        │
├────────────────────────────────┼──────────────┼────────────────────────────────────────────────────────┤
│ Gate B: Cloud Staging Deploy   │ BLOCKED      │ Cloud host (rais-backend-staging.onrender.com) returns │
│                                │ (PENDING OP) │ 404 no-server. Blueprint ready; awaiting operator      │
│                                │              │ git push & blueprint apply in Render dashboard.        │
├────────────────────────────────┼──────────────┼────────────────────────────────────────────────────────┤
│ Gate C: PostgreSQL Concurrency │ PASS         │ 8/8 tests PASSED on PostgreSQL 18.4 (port 5433). True  │
│         & Financial Invariants │ (VERIFIED)   │ multi-threaded row-locking proven with                 │
│                                │              │ populate_existing().with_for_update(). Zero drift.     │
├────────────────────────────────┼──────────────┼────────────────────────────────────────────────────────┤
│ Gate D: Voice NLP & Dialect    │ PASS         │ 325/325 adversarial cases (100%), 50/50 simulation     │
│                                │              │ (100%), median latency 0.22 ms, P99 1.18 ms.           │
├────────────────────────────────┼──────────────┼────────────────────────────────────────────────────────┤
│ Gate E: Backend Pytest Suite   │ PASS (SKIPS) │ 17 passed, 2 skipped (total 19 collected). All skips   │
│                                │              │ audited (Playwright browser e2e awaiting live backend).│
├────────────────────────────────┼──────────────┼────────────────────────────────────────────────────────┤
│ Gate F: Android APK Packaging  │ BLOCKED      │ CI workflow hardened with SHA-256 & URL safety check.  │
│                                │ (PENDING CI) │ Local SDK 34 missing; build awaiting manual dispatch.  │
│                                │              │ Obsolete APK (05-Sep-2026) strictly quarantined.       │
├────────────────────────────────┼──────────────┼────────────────────────────────────────────────────────┤
│ Gate G: Physical Field Pilot   │ NOT RUN      │ Headless workstation (0 ADB devices); Authoritative    │
│                                │ (RUNSHEET OK)│ runsheet delivered at docs/PHYSICAL_PILOT_RUNSHEET.md. │
└────────────────────────────────┴──────────────┴────────────────────────────────────────────────────────┘
```

### Authoritative Release Gate Decision: `BLOCKED`

Under Section 11 of the verification standard:
> **BLOCKED**: *Use if required infrastructure, test evidence, hardware, staging isolation, or any other mandatory prerequisite is unavailable or unverified.*

While the software remediation (voice NLP engine, billing validation rules, frontend state management, CI workflow safety gates, fail-closed production safety guards, and PostgreSQL concurrency locking) demonstrates 100% passing rates in rigorous testing, **the release gate remains authoritatively BLOCKED** pending the resolution of two operational prerequisites:
1. **Cloud Staging Infrastructure Deployment:** The staging blueprint (`render.yaml`) and local PostgreSQL cluster are fully prepared and committed locally at `3471041`. The remote Render web service `https://rais-backend-staging.onrender.com` returns `404 no-server` pending operator push to `origin/main` and blueprint application in the Render dashboard.
2. **Physical Warehouse Handset Pilot:** The development workstation is headless (0 ADB devices). Physical acoustic validation in Rayachoty under refrigeration and ambient depot noise must be conducted using the staging debug APK generated via CI.

---

## 2. Phase 1 — Pre-Deployment Safety & Isolation Review

All 8 mandatory pre-deployment checks were systematically evaluated and verified:

| # | Safety Check Description | Inspected Mechanism / Evidence | Verdict |
|:--|:---|:---|:---:|
| **1** | Git branch, commit & working tree audit | Branch `main`, committed cleanly at `3471041a8e4e544392382e16f007407ab77dd896`. All staging & hardening code tracked. | **PASS** |
| **2** | Preservation of existing production deployment | Production services in `render.yaml` (`rais-backend`, `rais-frontend`) retain production settings (`sync: false`, unmutated env vars). | **PASS** |
| **3** | `validate_database_safety()` fail-closed guard | Intercepts `DATABASE_URL` at module load in `app/core/database.py`. Tested: Throws `RuntimeError` on production Supabase hosts during test/dev/staging. | **PASS** |
| **4** | Staging database isolation from Supabase | `render.yaml` links `rais-backend-staging` exclusively to `rais-postgres-staging` via `fromDatabase: connectionString`. Cannot inherit Supabase credentials. | **PASS** |
| **5** | Zero committed secrets | `render.yaml` uses `generateValue: true` for `SECRET_KEY`; all `.env*` files excluded via `.gitignore`. Zero tokens committed. | **PASS** |
| **6** | Independent Render blueprint services | Staging services are completely decoupled: `rais-postgres-staging` (dedicated DB), `rais-backend-staging`, `rais-frontend-staging`. | **PASS** |
| **7** | Isolated migration execution | `seed_data.py` binds schema creation (`Base.metadata.create_all`) strictly to active engine. Guarded against production DB by check #3. | **PASS** |
| **8** | APK workflow URL safety & zero fallback | `.github/workflows/build-apk.yml` uses python `urllib.parse` to validate staging URL and rejects `rais-backend.onrender.com`. `api.js` fails closed if URL missing. | **PASS** |

**Phase 1 Verdict: PASS.**

---

## 3. Phase 2 — Render Staging Blueprint Deployment Status

### 3.1 Live Endpoint Audit
- **Command Executed:** `curl.exe -i https://rais-backend-staging.onrender.com/api/v1/health`
- **Response Received:**
  ```http
  HTTP/1.1 404 Not Found
  Date: Wed, 14 Oct 2026 06:19:09 GMT
  Content-Type: text/plain; charset=utf-8
  Content-Length: 10
  Connection: keep-alive
  x-render-routing: no-server
  Server: cloudflare
  
  Not Found
  ```
- **Finding:** The service `rais-backend-staging` does not currently exist on Render (`x-render-routing: no-server`).

### 3.2 Required Operator Action to Deploy Staging Blueprint
Because Render does not provide local command-line deployment without account-level API keys, the operator must push the committed changes and apply the blueprint in the Render dashboard:
1. Push local commit `3471041` to GitHub:
   ```bash
   git push origin main
   ```
2. Navigate to [dashboard.render.com](https://dashboard.render.com).
3. Click **New +** $\to$ **Blueprint**.
4. Select repository `dataengineer-irfan/RAIS_AGENCIES` on branch `main`.
5. Render will parse [`render.yaml`](file:///C:/Users/affra/Documents/RAIS/render.yaml) and display:
   - `rais-postgres-staging` (PostgreSQL Database: `rais_staging`, user: `rais_staging_admin`)
   - `rais-backend-staging` (Web Service: Python 3.11.9, start command with `seed_data.py`)
   - `rais-frontend-staging` (Static Site: `VITE_API_URL=https://rais-backend-staging.onrender.com`)
6. Click **Apply**.
7. Wait for deployment completion (~2–3 minutes) and confirm health endpoint returns `200 OK`:
   ```bash
   curl.exe -i https://rais-backend-staging.onrender.com/api/v1/health
   ```

---

## 4. Phase 3 — PostgreSQL Concurrency & Transaction Safety Verification

### 4.1 Cluster Configuration & Identity Map Hardening
- **Local Isolated Cluster:** PostgreSQL 18.4 running on port **5433** (`scratch/pg_staging_cluster`, user `rais_staging_admin`, DB `rais_staging`).
- **Remediation:** Added `.populate_existing().with_for_update()` across `deduct_stock_for_invoice`, `deduct_stock_for_order`, `receive_stock`, and `adjust_stock` in [`backend/app/services/inventory_service.py`](file:///C:/Users/affra/Documents/RAIS/backend/app/services/inventory_service.py). This prevents SQLAlchemy session cache reuse and forces column refresh from newly locked database rows.

### 4.2 Test Suite Execution Results (`backend/tests/test_postgres_concurrency.py`)
```bash
pytest backend/tests/test_postgres_concurrency.py -v
```
**Results:** **8 passed, 0 failed** in 7.39s:

| Invariant Test | Multi-Threaded Scenario | Expected Invariant | Actual Outcome | Status |
|:---|:---|:---|:---|:---:|
| **Test 1: Competing Orders** | 2 concurrent threads compete for final 5 units stock | Exactly 1 succeeds, 1 rejected with HTTP 422; stock = 0.00 | 1 accepted, 1 rejected, stock = 0.00 | **PASS** |
| **Test 2: Competing Invoices** | 4 concurrent threads each request 3 units (initial stock: 8) | Exactly 2 succeed (6 deducted), 2 rejected; stock = 2.00 | 2 accepted, 2 rejected, stock = 2.00 | **PASS** |
| **Test 3: Idempotency Key** | Duplicate submission with same UUID idempotency key | Existing invoice returned; zero duplicate stock deduction | Invoice deduplicated; stock deducted once | **PASS** |
| **Test 4: Cancellation Reversal** | Repeated cancellation attempts on issued invoice | Stock restored once; subsequent calls rejected | Stock restored once; 422 on second call | **PASS** |
| **Test 5: Multi-Item Rollback** | Injected failure on second line item of multi-item invoice | Entire transaction rolls back; item 1 stock untouched | Full rollback; stock of item 1 unchanged | **PASS** |
| **Test 6: Over-Stock Rejection** | Order requesting 9999 units when stock is 10 units | Hard 422 rejection; zero inventory clamping | 422 raised; stock remains exactly 10.00 | **PASS** |
| **Test 7: Financial Boundaries** | Negative quantity, zero price, >100% discount | Hard validation rejection | All invalid boundaries rejected with 422 | **PASS** |
| **Test 8: Audit Consistency** | Negotiated price override on invoice line item | `PRICE_OVERRIDE` audit log & `StockMovement` logged | Audit log and stock ledger match 100% | **PASS** |

**Phase 3 Verdict: PASS (Local PostgreSQL 18.4 Cluster Verified). Cloud staging verification to be re-run once Render deployment completes.**

---

## 5. Phase 4 & 5 — GitHub Actions Workflow & APK Safety Audit

### 5.1 Workflow Safety Audit (`.github/workflows/build-apk.yml`)
The workflow file was independently inspected and confirmed to contain:
1. **Explicit Parameterization:** `workflow_dispatch` requires `build_type: staging` (default) and `staging_api_url: https://rais-backend-staging.onrender.com`.
2. **Python URL Validation Guard:**
   ```bash
   python3 -c "
   import sys, urllib.parse
   parsed = urllib.parse.urlparse(staging_url)
   if not parsed.scheme or not parsed.netloc: sys.exit(1)
   hostname = parsed.netloc.split(':')[0].lower()
   if hostname == 'rais-backend.onrender.com' or hostname.endswith('rais-backend.onrender.com'):
       print('::error::FATAL SAFETY GUARD: Staging build cannot target production host.')
       sys.exit(1)
   "
   ```
3. **Fail-Closed Artifact Naming:** Output is strictly named `RAIS_Agencies_STAGING_DEBUG.apk`.
4. **SHA-256 Checksum Generation:** Calculates and uploads `RAIS_Agencies_STAGING_DEBUG.apk.sha256` alongside the APK artifact.
5. **Release Protection:** GitHub Release publishing is guarded by `if: github.ref == 'refs/heads/main' && env.IS_STAGING == 'false'`. Staging builds never publish production releases.

### 5.2 Obsolete APK Quarantine Inspection
- **File:** `release/RAIS_Agencies.apk`
- **File Size:** 4,271,242 bytes (~4.07 MB)
- **File Timestamp:** 05-Sep-2026 18:17
- **SHA-256 Checksum:** `CCE8BA705BB1D297D0F06547151CDC76987F97658522AFF7D2759A01A0FA06A2`
- **Quarantine Reason:** Built for production (`https://rais-backend.onrender.com`) prior to speech recognition remediation. `assets/capacitor.plugins.json` length is 3 bytes (`[]`), zero native speech recognition dex classes present.
- **Verdict: STRICTLY QUARANTINED. Must NOT be used for staging pilots.**

### 5.3 Required Operator Action to Trigger CI Build
1. Push commit `3471041` to GitHub (`git push origin main`).
2. Once the Render staging URL is confirmed live, open [GitHub Actions Build Android APK](https://github.com/dataengineer-irfan/RAIS_AGENCIES/actions/workflows/build-apk.yml).
3. Click **Run workflow**.
4. Inputs:
   - Branch: `main`
   - `build_type`: `staging`
   - `staging_api_url`: `https://rais-backend-staging.onrender.com`
5. Download the generated artifact `RAIS_Agencies_STAGING_DEBUG.apk` and its checksum.

---

## 6. Phase 6 — Physical Warehouse Pilot Execution Package

- **Authoritative Runsheet:** Delivered at [`docs/PHYSICAL_PILOT_RUNSHEET.md`](file:///C:/Users/affra/Documents/RAIS/docs/PHYSICAL_PILOT_RUNSHEET.md).
- **Test Scope:** 50 discrete scenarios covering Telugu spoken numerals (*rendu*, *moodu*, *aidu*, *padi*, *iravai*, *muppai*), product disambiguation chips (6mm vs 9mm fries, cheese pack sizes), compound spoken quantities (120, 250, 2.5 kg), spoken corrections, negations, pricing overrides, and over-stock rejections.
- **Hardware Requirement:** Physical Android handsets running at Rayachoty warehouse depot under live refrigeration compressor noise.
- **Status:** **NOT RUN** (Workstation is headless; pending physical handsets).

---

## 7. Defect & Blocker Register

| Identifier | Severity | Component | Issue Description | Current Status | Remediation & Evidence |
|:---|:---|:---|:---|:---|:---|
| **BLK-01** | **P0 (Blocker)** | Staging Backend | Render staging service `rais-backend-staging.onrender.com` returns 404 `no-server`. | **OPEN (Blueprint Ready)** | `render.yaml` fully populated with dedicated staging blueprint. Awaiting operator deployment on Render dashboard. |
| **BLK-02** | **P0 (Blocker)** | Staging Database | Local environment risked contacting live production Supabase. | **CONTAINED & GUARDED** | `validate_database_safety()` active in `database.py`. Local PostgreSQL 18 cluster created on port 5433. `.env.staging` template supplied. |
| **BLK-03** | **P0 (Blocker)** | Mobile Build | Android SDK 34 missing on local dev workstation; `assembleDebug` fails locally. | **READY IN CI** | Hardened `.github/workflows/build-apk.yml` configured to build `RAIS_Agencies_STAGING_DEBUG.apk` with SHA-256 verification. |
| **BLK-04** | **P1 (High)** | Concurrency | `with_for_update()` unverified on PostgreSQL; SQLite ignored locks. | **RESOLVED & VERIFIED** | Added `.populate_existing().with_for_update()` to fix identity map caching. 8/8 tests passed on PostgreSQL 18. |
| **DEF-09** | **P1 (High)** | NLP Parser | Missing Telugu spoken numerals (*rendu*, *moodu*, *nalugu*, *aidu*, *padi*). | **VERIFIED FIXED** | `TELUGU_NUMBER_UNITS/TENS` in `voiceAliases.js`. 10/10 dialect tests pass. |
| **DEF-10** | **P1 (High)** | Customer Match | Space-separated acronyms (e.g. `"J F C"`) failing to match `"jfc"`. | **VERIFIED FIXED** | Collapsed acronym matcher added (0.96 weight). PILOT-05 passes 100%. |
| **DEF-11** | **P1 (High)** | Product Match | Token collision between `"plain pizza box 8 inch"` and `"PIZZA BASE 8 INCH"`. | **VERIFIED FIXED** | Mutually exclusive category discriminators (`box` vs `base`) added. Tests pass. |
| **DEF-12** | **P2 (Medium)** | Line Item Parser | Leading tokens before quantity causing regex match failures. | **VERIFIED FIXED** | Enhanced regex scanning anywhere in segment. Tests pass. |

---

## 8. Summary of Outstanding Operator Actions

To advance the pilot gate from `BLOCKED` to `READY FOR PHYSICAL PILOT — STAGING ONLY`:

1. **Push Local Commit to GitHub:**
   ```bash
   git push origin main
   ```
2. **Apply Render Staging Blueprint:**
   - Log into [dashboard.render.com](https://dashboard.render.com) $\to$ **New +** $\to$ **Blueprint** $\to$ Connect `dataengineer-irfan/RAIS_AGENCIES` $\to$ Apply.
   - Confirm `https://rais-backend-staging.onrender.com/api/v1/health` returns `200 OK`.
3. **Dispatch GitHub Actions Staging APK Build:**
   - Navigate to [GitHub Actions](https://github.com/dataengineer-irfan/RAIS_AGENCIES/actions/workflows/build-apk.yml) $\to$ **Run workflow** with `build_type: staging`.
   - Download the generated `RAIS_Agencies_STAGING_DEBUG.apk`.
4. **Execute Physical Warehouse Pilot in Rayachoty:**
   - Sideload `RAIS_Agencies_STAGING_DEBUG.apk` onto Rayachoty warehouse test phones.
   - Execute the 50 scenarios in [`docs/PHYSICAL_PILOT_RUNSHEET.md`](file:///C:/Users/affra/Documents/RAIS/docs/PHYSICAL_PILOT_RUNSHEET.md).
   - Sign off the runsheet.
