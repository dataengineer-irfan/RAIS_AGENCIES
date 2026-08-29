# RAIS AGENCIES — Business Management & Billing Platform

![RAIS Agencies](https://img.shields.io/badge/Status-Production--Ready-emerald.svg)
![Architecture](https://img.shields.io/badge/Architecture-Modular%20Monolith-blue.svg)
![Python](https://img.shields.io/badge/Python-3.12-yellow.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-green.svg)
![React](https://img.shields.io/badge/React-18-cyan.svg)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-sky.svg)

A production-grade, enterprise-disciplined business management and billing platform specifically designed and engineered for **RAIS Agencies** (Wholesale Frozen Food Products, Dairy, Sauces, Bakery Mixes, Spices, and Packaging Solutions) located near **Reddies Colony, Rayachoty - 516269** (Contacts: `9347453135`, `9573261696`).

---

## 🌟 Key Capabilities & Modules

1. **First-Class Billing & Invoicing Engine**:
   - Deterministic server-side arithmetic using `Decimal(12,2)` precision.
   - Collision-safe atomic document numbering (`INV-YYYYMM-XXXXX`, `PAY-YYYYMM-XXXXX`, `CUST-XXXXX`).
   - Line-item discounts, GST tax calculations, and printable tax invoice generation with UPI QR codes.
2. **Payment Settlement & Allocation**:
   - Real-time allocation of payments against outstanding invoice balances with overpayment prevention.
   - Automatic status transitions: `DRAFT` ➔ `ISSUED` ➔ `PARTIALLY_PAID` ➔ `PAID` / `OVERDUE`.
3. **Authoritative Master Catalogue**:
   - Complete 38 master SKUs across 8 categories (*Chicken Items, Veg Items, Ketchup & Sauces, Bread Mix & Powders, Cheese & Slices, Pizza & Burger Boxes, Spices, Mojitos*).
   - Official wholesale rates and brand affiliations (ITC Master Chef, Milky Mist, Del Monte, VKL, etc.).
4. **Customer Management & Real-Time Ledgers**:
   - B2B restaurant profiles, credit limits, and chronological statement/ledger timelines.
5. **Business Intelligence & Receivables Aging**:
   - Real-time aging buckets (0-15, 16-30, 31-60, 60+ days), customer debt exposure, and product sales velocity.
6. **Permission-Aware Semantic AI Assistant**:
   - Grounded in the RAIS business ontology; executes verified backend application queries rather than fabricating numbers.
7. **Immutable Audit Trail & RBAC**:
   - Role-based authorization (`Administrator`, `Operator`, `Viewer`) with audit snapshots for every state mutation.

---

## 🚀 Quick Start Guide

### 1. Backend Server Setup
```bash
cd backend
pip install -r requirements.txt
python seed_data.py
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive API documentation: `http://localhost:8000/api/docs`

### 2. Frontend Development Server
```bash
cd frontend
npm install
npm run dev
```
UI Dashboard: `http://localhost:3000`

---

## 🔑 Default Seeded Accounts

| Role | Username | Password |
| :--- | :--- | :--- |
| **Administrator** | `admin` | `RaisAdmin@2026` |
| **Operator** | `operator` | `RaisOperator@2026` |
| **Viewer** | `viewer` | `RaisViewer@2026` |

---

## 🧪 Automated Testing
Run the complete backend test suite:
```bash
python -m pytest -v
```

---

## 📚 Project Documentation
- [Architecture Specification](docs/ARCHITECTURE.md)
- [Database Schema & ERD](docs/DATABASE_SCHEMA.md)
- [Official Catalogue Specification](docs/CATALOGUE_SPECIFICATION.md)
- [Operations, Deployment & Backup Guide](docs/OPERATIONS_AND_BACKUP.md)
