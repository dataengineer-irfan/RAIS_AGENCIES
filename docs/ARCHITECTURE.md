# RAIS Agencies Platform — Architecture Specification

## 1. Executive Summary
The **RAIS Agencies Business Management Platform** is a production-grade, modular monolith system designed for commercial distribution of wholesale frozen food products, bakery solutions, spices, sauces, and packaging materials located in **Rayachoty, Andhra Pradesh (516269)**.

## 2. Architectural Principles
- **Enterprise Engineering Discipline + Small Business Operational Simplicity**: Built with clean domain boundaries, deterministic server-side arithmetic, role-based authorization, and auditable transactions without unnecessary distributed systems complexity.
- **Billing as a First-Class Domain**: Invoicing is directly integrated with Master Data, Catalogue, Pricing, Transactions, Payments, Allocations, and Real-Time Receivables.
- **Deterministic Business Services**: All monetary computations occur on the backend using `Decimal(12,2)` precision to prevent rounding discrepancies.
- **Permission-Aware Semantic AI**: AI operates through verified application services and an authoritative Business Knowledge ontology rather than executing arbitrary raw SQL.

## 3. System Architecture Diagram

```text
                               +------------------------------------------+
                               |        RAIS Agencies Web Client          |
                               |  (React 18 + Tailwind CSS + Lucide UI)   |
                               +--------------------+---------------------+
                                                    |
                                                    | REST / JWT HTTP (JSON)
                                                    v
                               +--------------------+---------------------+
                               |           FastAPI Gateway                |
                               |    (Authentication & RBAC Security)      |
                               +--+-----------------+------------------+--+
                                  |                 |                  |
           +----------------------+                 v                  +---------------------+
           |                             +----------+-----------+                            |
           v                             |   Semantic AI &      |                            v
+----------+------------+                |  Business Knowledge  |                 +----------+-----------+
|  Billing & Financial  |                +----------+-----------+                 | Real-Time Reporting  |
|     Core Service      |                           |                             |  & Receivables Aging |
+----------+------------+                           v                             +----------+-----------+
           |                             +----------+-----------+                            |
           |                             | Deterministic Tools  |                            |
           |                             +----------+-----------+                            |
           +----------------------------------------+----------------------------------------+
                                                    |
                                                    v
                               +--------------------+---------------------+
                               |          SQLAlchemy 2.0 ORM              |
                               |  (Atomic Transactions & FK Constraints)  |
                               +--------------------+---------------------+
                                                    |
                                                    v
                               +--------------------+---------------------+
                               |     PostgreSQL / SQLite Database         |
                               | (Master Data, Ledger, Audit, Sequences)  |
                               +------------------------------------------+
```

## 4. Technology Stack
- **Backend API**: Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic v2, PyJWT, Bcrypt.
- **Frontend SPA**: React 18, Vite 5, Tailwind CSS, Lucide React, Axios.
- **Database**: PostgreSQL (Production) / SQLite (Zero-config local testing).
- **Testing**: pytest (unit calculations, integration workflows, RBAC tests).
