import time
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.ai.knowledge import RAIS_KNOWLEDGE_BASE
from app.services.reporting_service import ReportingService
from app.services.customer_service import CustomerService
from app.services.catalogue_service import CatalogueService
from app.services.billing_service import BillingService
from app.models.system import AITelemetry
from app.domain.enums import UserRole

class SemanticAIEngine:
    @staticmethod
    def process_query(
        db: Session,
        query: str,
        user_id: Optional[str] = None,
        username: Optional[str] = None,
        user_role: Optional[str] = None
    ) -> Dict[str, Any]:
        start_time = time.time()
        q_lower = query.strip().lower()
        intent = "UNKNOWN"
        tool_executed = None
        answer = ""
        context_data = None

        # 1. Product / Pricing Lookup Intent
        if any(w in q_lower for w in ["price", "cost", "sku", "item", "product", "fries", "momos", "paneer", "ketchup", "sauce", "powder", "cheese", "box", "mojito", "stock"]):
            intent = "PRODUCT_LOOKUP"
            tool_executed = "CatalogueService.list_products"
            
            # Extract possible search terms
            search_term = ""
            for word in q_lower.split():
                if word not in ["what", "is", "the", "price", "of", "how", "much", "for", "do", "we", "have", "in", "stock", "a", "an"]:
                    search_term = word
                    break
                    
            products = CatalogueService.list_products(db, search=search_term if search_term else None, limit=10)
            if products:
                prod_lines = [
                    f"• **{p.name}** ({p.brand}) — SKU: `{p.sku}`, Unit: `{p.packaging_unit}`, Wholesale Price: **₹{p.base_price:.2f}** (GST: {p.tax_rate}%)"
                    for p in products[:6]
                ]
                answer = f"Here is the verified pricing from the RAIS Agencies catalogue:\n\n" + "\n".join(prod_lines)
                context_data = [{"sku": p.sku, "name": p.name, "price": float(p.base_price)} for p in products[:6]]
            else:
                answer = f"No matching products found in the RAIS Agencies catalogue for '{query}'. Please check the spelling or view the full catalogue."

        # 2. Receivables / Outstanding / Overdue Intent
        elif any(w in q_lower for w in ["outstanding", "overdue", "due", "receivables", "balance", "aging"]):
            intent = "FINANCIAL_RECEIVABLES"
            tool_executed = "ReportingService.get_dashboard_kpis + get_aging_summary"
            
            kpis = ReportingService.get_dashboard_kpis(db)
            aging = ReportingService.get_aging_summary(db)
            
            answer = (
                f"📊 **RAIS Agencies Receivables Summary**:\n\n"
                f"• **Total Outstanding Balance**: ₹{kpis.total_outstanding:,.2f}\n"
                f"• **Total Overdue (Past Due Date)**: ₹{kpis.total_overdue:,.2f}\n"
                f"• **Open Invoices Count**: {kpis.open_invoices_count}\n\n"
                f"**Aging Breakdown**:\n"
                f"- 0-15 Days (Current): ₹{aging.current_0_15_days:,.2f}\n"
                f"- 16-30 Days: ₹{aging.aging_16_30_days:,.2f}\n"
                f"- 31-60 Days: ₹{aging.aging_31_60_days:,.2f}\n"
                f"- 60+ Days: ₹{aging.aging_60_plus_days:,.2f}"
            )
            context_data = {
                "total_outstanding": float(kpis.total_outstanding),
                "total_overdue": float(kpis.total_overdue),
                "aging": {
                    "0_15": float(aging.current_0_15_days),
                    "16_30": float(aging.aging_16_30_days),
                    "31_60": float(aging.aging_31_60_days),
                    "60_plus": float(aging.aging_60_plus_days)
                }
            }

        # 3. Revenue / Sales Performance Intent
        elif any(w in q_lower for w in ["revenue", "sales", "month", "best selling", "top product", "performance"]):
            intent = "SALES_PERFORMANCE"
            tool_executed = "ReportingService.get_dashboard_kpis + get_product_sales_performance"
            
            kpis = ReportingService.get_dashboard_kpis(db)
            prods = ReportingService.get_product_sales_performance(db)
            
            top_lines = [
                f"1. {p.product_name} ({p.brand}) — Sold: {p.total_quantity_sold} units, Revenue: ₹{p.total_revenue:,.2f}"
                for p in prods[:4] if p.total_revenue > 0
            ]
            
            if not top_lines:
                top_summary = "No sales records recorded yet this month."
            else:
                top_summary = "\n".join(top_lines)

            answer = (
                f"📈 **Sales & Revenue Overview**:\n\n"
                f"• **This Month's Invoiced Revenue**: ₹{kpis.total_revenue_month:,.2f}\n"
                f"• **Total Invoices Issued**: {kpis.total_invoices_count}\n"
                f"• **Active Customers**: {kpis.active_customers_count}\n\n"
                f"**Top Performing Products**:\n{top_summary}"
            )
            context_data = {
                "revenue_month": float(kpis.total_revenue_month),
                "invoices_count": kpis.total_invoices_count
            }

        # 4. Customer Lookup Intent
        elif any(w in q_lower for w in ["customer", "client", "buyer", "account"]):
            intent = "CUSTOMER_LOOKUP"
            tool_executed = "CustomerService.list_customers"
            
            customers = CustomerService.list_customers(db, limit=5)
            if customers:
                lines = [
                    f"• **{c.business_name}** (`{c.customer_code}`) — Contact: {c.contact_person} ({c.phone}), Outstanding: **₹{c.outstanding_balance:,.2f}**"
                    for c in customers
                ]
                answer = "Here are the registered customers and their live account status:\n\n" + "\n".join(lines)
                context_data = [{"code": c.customer_code, "name": c.business_name, "due": float(c.outstanding_balance)} for c in customers]
            else:
                answer = "No customer accounts registered in the system yet."

        # 5. Business Knowledge / Formula / Policy Intent
        elif any(w in q_lower for w in ["formula", "rule", "calculate", "gst", "discount", "tax", "status", "who is", "address", "phone", "contact", "about"]):
            intent = "BUSINESS_KNOWLEDGE"
            tool_executed = "KnowledgeBase.lookup"
            
            profile = RAIS_KNOWLEDGE_BASE["business_profile"]
            answer = (
                f"ℹ️ **About {profile['name']}**\n"
                f"• **Tagline**: {profile['tagline']}\n"
                f"• **Location**: {profile['location']}\n"
                f"• **Phone Support**: {', '.join(profile['phones'])}\n"
                f"• **Key Brands**: {', '.join(profile['partner_brands'][:8])}\n\n"
                f"**Financial Calculation Standard**:\n"
                f"• `Line Total = (Quantity × Unit Price - Line Discount) × (1 + GST Rate / 100)`\n"
                f"• `Outstanding Balance = Total Invoice Amount - Allocated Payments`\n"
                f"• All monetary numbers use exact Decimal precision with deterministic server-side execution."
            )
            context_data = RAIS_KNOWLEDGE_BASE

        # Default fallback
        else:
            intent = "GENERAL_ASSISTANCE"
            answer = (
                "I am your **RAIS Agencies Business Assistant**.\n\n"
                "You can ask me questions such as:\n"
                "• *'What is the price of French Fries and Momos?'*\n"
                "• *'What is our total outstanding balance and overdue amount?'*\n"
                "• *'Show me top selling products and revenue this month'* \n"
                "• *'What is the customer status for registered accounts?'*\n"
                "• *'Explain the billing calculation formula and GST rules'*"
            )

        latency_ms = int((time.time() - start_time) * 1000)

        # Log AI telemetry
        telemetry = AITelemetry(
            user_id=user_id,
            username=username,
            query=query,
            intent_detected=intent,
            tool_executed=tool_executed,
            success="true",
            latency_ms=latency_ms
        )
        db.add(telemetry)
        db.commit()

        return {
            "answer": answer,
            "intent": intent,
            "tool_executed": tool_executed,
            "latency_ms": latency_ms,
            "data": context_data
        }
