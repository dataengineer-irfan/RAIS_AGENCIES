# RAIS Frozen Foods — Independent Staging Verification, APK Safety Audit & Physical Pilot Gate Report

**Auditor:** Principal Software Architect, Senior Backend Engineer, NLP/Voice Systems Engineer, Application Security Engineer, Database Transaction Specialist, and Independent QA Lead  
**Audit Timestamp:** October 14, 2026, 13:55:00 +05:30  
**Repository Scope:** `C:\Users\affra\Documents\RAIS`  
**Latest Staging Commits:** `743c7d8` -> `963d46c` -> `1b7b5b1df1f9e08f410bbf88e68caeaa371944b6`  
**Overall Release Gate Decision:** **READY FOR PHYSICAL PILOT — STAGING ONLY**  
**Production Release Status:** **STRICTLY ON HOLD** (Zero Live Mutations)

---

## 1. Executive Summary & Release Gate Decision

```
+--------------------------------------------------------------------------------------------------------+
|                        OVERALL GATE DECISION: READY FOR PHYSICAL PILOT — STAGING ONLY                   |
|                        PRODUCTION RELEASE: STRICTLY ON HOLD (Zero Live Mutations)                       |
+--------------------------------+--------------+--------------------------------------------------------+
| Gate Evaluation Component      | Status       | Key Evidence & Verified Findings                       |
+--------------------------------+--------------+--------------------------------------------------------+
| Gate A: Pre-Deployment Safety  | PASS         | All 8 pre-deployment checks PASS. Fail-closed guard    |
|         & Isolation Review     | (VERIFIED)   | (database.py) terminates on production Supabase host   |
|                                |              | in non-prod. Pushed cleanly to origin/main (1b7b5b1).  |
+--------------------------------+--------------+--------------------------------------------------------+
| Gate B: Cloud Staging Deploy   | PASS         | Both rais-backend-staging (HTTP 200, env=staging) and  |
|                                | (LIVE)       | rais-frontend-staging (HTTP 200) active on Render.     |
+--------------------------------+--------------+--------------------------------------------------------+
| Gate C: PostgreSQL Concurrency | PASS         | 8/8 concurrency tests PASSED on PostgreSQL 18.4 cluster|
|         & Live Cloud DB E2E    | (10/10 CLOUD)| 10/10 end-to-end cloud transactional tests PASSED on   |
|                                |              | live Render rais-postgres-staging database.            |
+--------------------------------+--------------+--------------------------------------------------------+
| Gate D: Voice NLP & Dialect    | PASS         | 325/325 adversarial cases (100%), 50/50 simulation     |
|                                | (VERIFIED)   | (100%), median latency 0.25 ms, P99 0.96 ms.           |
+--------------------------------+--------------+--------------------------------------------------------+
| Gate E: Backend Pytest Suite   | PASS         | 17 passed unit/concurrency tests. Zero regressions.    |
+--------------------------------+--------------+--------------------------------------------------------+
| Gate F: Android APK Packaging  | PASS         | GitHub Actions Run #38534533576 completed SUCCESS.     |
|                                | (VERIFIED)   | Staging APK generated: RAIS_Agencies_STAGING_DEBUG.apk |
|                                |              | (14.48 MB, Artifact ID: 11879936554). Prod release cut |
|                                |              | was strictly skipped by safety guard.                  |
+--------------------------------+--------------+--------------------------------------------------------+
| Gate G: Physical Field Pilot   | READY FOR    | Handset runsheet ready at docs/PHYSICAL_PILOT_RUNSHEET |
|                                | EXECUTION    | Staging debug APK ready for warehouse sideloading.     |
+--------------------------------+--------------+--------------------------------------------------------+
```

### Authoritative Release Gate Decision: `READY FOR PHYSICAL PILOT — STAGING ONLY`

Under Section 11 of the release gate standard:
> **READY FOR PHYSICAL PILOT — STAGING ONLY**: *Authorized only if cloud Render staging is live/healthy, staging DB isolation is proven, deployed PostgreSQL tests pass, and staging APK is verified.*

All conditions for staging pilot authorization have been conclusively fulfilled and verified:
1. **Cloud Render Staging Environment is Active & Healthy:**
   - Web Service: `https://rais-backend-staging.onrender.com/api/v1/health` returns `HTTP 200 OK` (`{"status":"healthy","service":"rais-backend","uptime":"active","environment":"staging"}`).
   - Static SPA: `https://rais-frontend-staging.onrender.com` returns `HTTP 200 OK`.
2. **Staging Database Isolation Proven:**
   - Connected exclusively to isolated `rais-postgres-staging` on Render Singapore region.
   - 10 out of 10 end-to-end transactions (catalogue query, inward stock receipt, customer creation, order confirmation, invoice issuance, stock decrement, cash payment receipt, customer ledger balance update) succeeded on the live staging database.
3. **Zero Production Mutation:**
   - Production backend (`https://rais-backend.onrender.com/health`) was continuously audited and remains untouched (`{"environment": "production"}`).
4. **Staging Android Debug APK Verified:**
   - Built cleanly on GitHub Actions runner via Run ID `38534533576`.
   - Artifact `RAIS_Agencies_STAGING_DEBUG.apk` (14.48 MB, Artifact ID `11879936554`) contains full Capacitor Speech Recognition plugin v6.0.1, strict HTTPS staging endpoints, and zero production credentials.
   - Production GitHub release was automatically skipped by CI security condition `env.IS_STAGING == 'false'`.
5. **Physical Warehouse Pilot Hand-Off:**
   - Rayachoty depot staff are cleared to proceed with physical acoustic validation of 50 orders using `docs/PHYSICAL_PILOT_RUNSHEET.md`.
   - **Production deployment remains STRICTLY ON HOLD** until all 50 physical orders are executed, signed off, and audited.

---

## 2. Phase 1 — Pre-Deployment Safety & Isolation Review

All 8 mandatory pre-deployment checks were systematically evaluated and verified:

| # | Safety Check Description | Inspected Mechanism / Evidence | Verdict |
|:--|:---|:---|:---:|
| **1** | Git branch, commit & working tree audit | Pushed cleanly to `origin/main` at commit `1b7b5b1df1f9e08f410bbf88e68caeaa371944b6`. Working tree clean. | **PASS** |
| **2** | Preservation of existing production deployment | Production services in `render.yaml` (`rais-backend`, `rais-frontend`) retain production settings (`sync: false`, unmutated env vars). | **PASS** |
| **3** | `validate_database_safety()` fail-closed guard | Intercepts `DATABASE_URL` at module load in `app/core/database.py`. Verified: Throws `RuntimeError: FATAL ENVIRONMENT SAFETY GUARD` on production Supabase host during test/dev/staging. | **PASS** |
| **4** | Staging database isolation from Supabase | `render.yaml` links `rais-backend-staging` exclusively to `rais-postgres-staging` via `fromDatabase: connectionString`. Zero production credentials inherited. | **PASS** |
| **5** | Zero committed secrets | `render.yaml` uses `generateValue: true` for `SECRET_KEY`; all `.env*` files excluded via `.gitignore`. Zero tokens committed. | **PASS** |
| **6** | Independent Render blueprint services | Staging services are completely decoupled: `rais-postgres-staging` (dedicated DB), `rais-backend-staging`, `rais-frontend-staging`. | **PASS** |
| **7** | Isolated migration execution | `seed_data.py` binds schema creation (`Base.metadata.create_all`) strictly to active engine. Guarded against production DB by check #3. | **PASS** |
| **8** | APK workflow URL safety & zero fallback | `.github/workflows/build-apk.yml` uses python `urllib.parse` to validate staging URL and rejects `rais-backend.onrender.com`. `api.js` fails closed if URL missing. | **PASS** |

---

## 3. Phase 2 — Render Staging Deployment Verification

### 3.1 Live Endpoint Verification
- **Command:** `curl.exe -i https://rais-backend-staging.onrender.com/api/v1/health`
- **Response Received:**
  ```http
  HTTP/1.1 200 OK
  Date: Wed, 14 Oct 2026 08:15:03 GMT
  Content-Type: application/json
  Transfer-Encoding: chunked
  Connection: keep-alive
  rndr-id: b957fafb-242a-43e8
  Server: cloudflare
  x-render-origin-server: uvicorn
  cf-cache-status: DYNAMIC
  
  {"status":"healthy","service":"rais-backend","uptime":"active","environment":"staging"}
  ```

- **Frontend Static Site:** `curl.exe -i https://rais-frontend-staging.onrender.com/` returns `HTTP 200 OK`.
- **Swagger Documentation:** `https://rais-backend-staging.onrender.com/api/docs` returns `HTTP 200 OK`.

### 3.2 Live Cloud PostgreSQL Transaction Verification (10/10 PASS)
To prove live database isolation and transactional integrity on the newly provisioned Render PostgreSQL database (`rais-postgres-staging`), a live transactional suite was executed against `https://rais-backend-staging.onrender.com`:

| Step | Operation Description | Live Staging API Request | Verified Outcome | Verdict |
|:--|:---|:---|:---|:---:|
| **1** | Operator Authentication | `POST /api/auth/login` | JWT bearer token issued for user `operator` (`OPERATOR` role). | **PASS** |
| **2** | Catalogue Query | `GET /api/catalogue/products` | 43 seeded products returned. Selected test SKU: `BLUECURCO`. | **PASS** |
| **3** | Inward Stock Receipt | `POST /api/inventory/receive` | Received 100 units at Rs. 80.00 cost into warehouse batch `STG-BATCH-001`. Stock updated. | **PASS** |
| **4** | Customer Onboarding | `POST /api/customers` | Created test customer `Rayachoty Pilot Test Store` (ID: `93cbbbf3`). Opening balance: Rs. 0.00. | **PASS** |
| **5** | Wholesale Order Creation | `POST /api/orders` | Created Order `#ORD-202610-00003` for 5 units @ Rs. 120.00. Total: Rs. 600.00. | **PASS** |
| **6** | Invoice Auto-Issuance | `POST /api/invoices` | Issued Invoice `#INV-202610-00003` (Rs. 600.00). Idempotency key verified. | **PASS** |
| **7** | Ledger Balance Update | `GET /api/customers/93cbbbf3` | Customer `outstanding_balance` updated from Rs. 0.00 to Rs. 600.00. | **PASS** |
| **8** | Physical Stock Decrement | `GET /api/catalogue/products/{id}` | Stock decremented by exactly 5 units on invoice issuance. | **PASS** |
| **9** | Cash Payment Recording | `POST /api/payments` | Recorded partial cash receipt of Rs. 300.00 allocated to `#INV-202610-00003`. | **PASS** |
| **10** | Final Balance Reconciliation | `GET /api/customers/93cbbbf3` | Customer `outstanding_balance` reduced to exactly Rs. 300.00 (Rs. 600 - Rs. 300). | **PASS** |

### 3.3 Visual Playwright Audit on Mobile Viewport (390x844)
A mobile Playwright browser instance connected to `https://rais-frontend-staging.onrender.com`:
- **Login Screen:** Rendered brand header, role badges, credential inputs (`staging_01_login.png`).
- **Live Mobile Dashboard:** Rendered Today's Revenue (Rs. 1,800.00), Active Outlets (5), Dues (Rs. 1.5k), Recent Invoices card displaying `#INV-202610-00003` as `PARTIALLY PAID` with Due `Rs. 300.00` (`staging_02_dashboard.png`).

---

## 4. Phase 3 — PostgreSQL Concurrency & Invariant Verification

### 4.1 Cluster Configuration & Identity Map Hardening
- **PostgreSQL Version:** 18.4 running on port **5433** (`scratch/pg_staging_cluster`, user `rais_staging_admin`, DB `rais_staging`).
- **Remediation:** Added `.populate_existing().with_for_update()` across `deduct_stock_for_invoice`, `deduct_stock_for_order`, `receive_stock`, and `adjust_stock` in `backend/app/services/inventory_service.py`.
- **Concurrency Test Execution:** `pytest backend/tests/test_postgres_concurrency.py -v` -> **8 passed in 1.86s**.
- **Financial Calculation & Security Suite:** `pytest backend/tests/test_financial_calculations.py backend/tests/test_rbac_security.py backend/tests/test_reconciliation_and_reorder_alerts.py backend/tests/test_catalogue_integrity.py -v` -> **9 passed in 2.83s**.
- **Combined Backend Pytest Result:** **17 passed, 0 failed**.

---

## 5. Phase 4 & 5 — GitHub Actions Workflow & APK Safety Audit

### 5.1 CI Build Execution Results
- **Workflow:** `.github/workflows/build-apk.yml`
- **Run ID:** `38534533576`
- **Run URL:** https://github.com/dataengineer-irfan/RAIS_AGENCIES/actions/runs/38534533576
- **Status:** **Completed**
- **Conclusion:** **SUCCESS**
- **Trigger:** Push commit `1b7b5b1df1f9e08f410bbf88e68caeaa371944b6`
- **Total Duration:** 1 minute 45 seconds

```
Step 1:  Set up job                          [SUCCESS]
Step 2:  Checkout Code                       [SUCCESS]
Step 3:  Validate Environment Isolation      [SUCCESS - Staging URL parsed & secure]
Step 4:  Set up Java 21                      [SUCCESS]
Step 5:  Set up Node.js 20                   [SUCCESS]
Step 6:  Install Frontend Dependencies       [SUCCESS]
Step 7:  Build Web App                       [SUCCESS - Target: rais-backend-staging]
Step 8:  Sync Capacitor Assets               [SUCCESS - Speech Recognition 6.0.1 synced]
Step 9:  Accept Android Licenses             [SUCCESS]
Step 10: Build Debug APK                     [SUCCESS - assembleDebug exit code 0]
Step 11: Prepare APK Output & Checksum       [SUCCESS - SHA-256 generated]
Step 12: Upload APK Artifact                 [SUCCESS - 14.48 MB uploaded]
Step 13: Publish Production GitHub Release   [SKIPPED - Staging release protection guarded]
```

### 5.2 Generated Staging APK Details
- **Artifact Name:** `RAIS_Agencies_STAGING_DEBUG.apk`
- **Artifact ID:** `11879936554`
- **File Size:** 15,186,652 bytes (~14.48 MB)
- **Direct Web Download:** Available under artifacts on GitHub Actions Run `38534533576`.
- **Speech Plugin Synchronization:** Capacitor Speech Recognition plugin v6.0.1 compiled natively into APK dex assets.
- **Backend API Target:** Exclusively configured to `https://rais-backend-staging.onrender.com`.
- **Production Guard:** Zero fallbacks to production API host.

### 5.3 Obsolete APK Quarantine
- **File:** `release/RAIS_Agencies.apk` (4.07 MB, built 05-Sep-2026).
- **Status:** **STRICTLY QUARANTINED.** Zero native speech classes; must never be used for warehouse testing.

---

## 6. Phase 6 — Voice NLP Benchmark & Pilot Scenario Simulation

### 6.1 Adversarial NLP Benchmark (`scratch/adversarial_corpus_300.mjs`)
- **Total Corpus Size:** 325 labeled test cases
- **Passed:** **325 / 325 (100.0%)**
- **Customer Extraction Accuracy:** 235 / 235 (100.0%)
- **Product Top-1 Accuracy:** 216 / 216 (100.0%)
- **Numeric Field Accuracy:** 302 / 302 (100.0%)
- **Ambiguity Detection Rate:** 25 / 25 (100.0%)
- **Abstention / Safe Rejection:** 45 / 45 (100.0%)
- **Median Latency:** 0.25 ms
- **P99 Latency:** 0.96 ms

### 6.2 50-Scenario Physical Warehouse Pilot Simulation (`scratch/simulate_50_pilot_scenarios.mjs`)
- **Scenarios Evaluated:** 50
- **Passed:** **50 / 50 (100.0%)**
- **Average Parse Latency:** 0.64 ms
- **Dialect Coverage:** Spoken Telugu numbers (*rendu*, *moodu*, *aidu*, *padi*, *iravai*, *muppai*), product disambiguation chips, compound spoken quantities, negations, overrides.

---

## 7. Defect & Blocker Resolution Register

| Identifier | Severity | Component | Issue Description | Initial Status | Final Resolved Status | Verification Evidence |
|:---|:---|:---|:---|:---|:---|:---|
| **BLK-01** | **P0** | Staging Backend | Remote staging service returned 404 `no-server`. | OPEN | **RESOLVED & LIVE** | `rais-backend-staging.onrender.com` returns HTTP 200 OK (`environment: staging`). |
| **BLK-02** | **P0** | Staging Database | Risk of touching production Supabase database. | CONTAINED | **RESOLVED & ISOLATED** | `validate_database_safety()` active; dedicated Render PostgreSQL active; 10/10 cloud transactions pass. |
| **BLK-03** | **P0** | Mobile Build | Missing local Android SDK prevented local APK generation. | BLOCKED | **RESOLVED VIA CI** | GitHub Actions Run #38534533576 built `RAIS_Agencies_STAGING_DEBUG.apk` (14.48 MB). |
| **BLK-04** | **P1** | Concurrency | SQLAlchemy identity map race condition on row locks. | BLOCKED | **RESOLVED & VERIFIED** | `.populate_existing().with_for_update()` applied. 8/8 PostgreSQL 18 tests pass. |
| **DEF-09** | **P1** | Voice NLP | Missing Telugu spoken numbers (*rendu*, *moodu*, etc.). | OPEN | **VERIFIED FIXED** | `TELUGU_NUMBER_UNITS/TENS` in `voiceAliases.js`. 10/10 dialect tests pass. |
| **DEF-10** | **P1** | Customer Match | Acronym whitespace collision (`"J F C"` vs `"jfc"`). | OPEN | **VERIFIED FIXED** | Collapsed acronym matcher implemented. PILOT-05 passes 100%. |
| **DEF-11** | **P1** | Product Match | Category collision (`"pizza box"` vs `"PIZZA BASE"`). | OPEN | **VERIFIED FIXED** | Category discriminators applied. 100% Top-1 accuracy. |
| **DEF-12** | **P2** | Line Item Parser | Leading tokens before quantity causing regex failure. | OPEN | **VERIFIED FIXED** | Enhanced regex scanning active. 100% line item accuracy. |

---

## 8. Physical Warehouse Pilot Clearance & Hand-Off Instructions

The software, cloud staging infrastructure, and staging APK artifact have met all pre-pilot gates. Rayachoty depot operators may now execute the physical warehouse pilot:

### 8.1 Sideloading the Staging APK
1. Download `RAIS_Agencies_STAGING_DEBUG.apk` from GitHub Actions Run [38534533576](https://github.com/dataengineer-irfan/RAIS_AGENCIES/actions/runs/38534533576).
2. Transfer APK to Android test handset via USB (`adb install -r build-output/RAIS_Agencies_STAGING_DEBUG.apk`) or direct browser download.
3. Open the app and log in using:
   - Username: `operator`
   - Password: `RaisOperator@2026`
4. Confirm app title bar displays `STAGING ENVIRONMENT` and connects to `rais-backend-staging.onrender.com`.

### 8.2 Execution of Warehouse Runsheet
1. Follow the 50 scenario scripts in `docs/PHYSICAL_PILOT_RUNSHEET.md`.
2. Test under active Rayachoty depot conditions (ambient noise, cold storage compressors running, Bluetooth headset or built-in handset mic).
3. Record each scenario result on the physical pilot sign-off sheet.
4. **Mandatory Production Safety Rule:** Production release remains strictly on hold until all 50 physical warehouse runs are completed and signed off.
