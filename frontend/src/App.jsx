import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardPage } from './pages/DashboardPage';
import { CustomersPage } from './pages/CustomersPage';
import { CataloguePage } from './pages/CataloguePage';
import { InventoryPage } from './pages/InventoryPage';
import { OrdersPage } from './pages/OrdersPage';
import { BillingPage } from './pages/BillingPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditPage } from './pages/AuditPage';
import { InvoiceBuilderModal } from './components/InvoiceBuilderModal';
import { OrderBuilderModal } from './components/OrderBuilderModal';
import { PaymentModal } from './components/PaymentModal';
import { CustomerModal } from './components/CustomerModal';
import { AIAssistantDrawer } from './components/AIAssistantDrawer';
import { MobileBottomNav } from './components/MobileBottomNav';

export const App = () => {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');

  // Modals state
  const [invoiceBuilderOpen, setInvoiceBuilderOpen] = useState(false);
  const [orderBuilderOpen, setOrderBuilderOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

  // Contextual modal selections
  const [selectedCustForPayment, setSelectedCustForPayment] = useState(null);
  const [selectedInvForPayment, setSelectedInvForPayment] = useState(null);
  const [selectedCustForOrder, setSelectedCustForOrder] = useState(null);
  const [customerToEdit, setCustomerToEdit] = useState(null);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const handleOpenPayment = (cust = null, inv = null) => {
    setSelectedCustForPayment(cust);
    setSelectedInvForPayment(inv);
    setPaymentModalOpen(true);
  };

  const handleOpenCustomerModal = (cust = null) => {
    setCustomerToEdit(cust);
    setCustomerModalOpen(true);
  };

  const handleOpenOrder = (cust = null) => {
    setSelectedCustForOrder(cust ? cust.id : null);
    setOrderBuilderOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenInvoiceBuilder={() => setInvoiceBuilderOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onToggleAI={() => setAiDrawerOpen(!aiDrawerOpen)}
          globalSearchTerm={globalSearchTerm}
          onGlobalSearch={setGlobalSearchTerm}
        />

        <main className="flex-1 p-4 sm:p-6 pb-24 md:pb-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardPage
              onOpenInvoiceBuilder={() => setInvoiceBuilderOpen(true)}
              onOpenPaymentModal={() => handleOpenPayment()}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'customers' && (
            <CustomersPage
              onOpenCustomerModal={handleOpenCustomerModal}
              onOpenPaymentForCustomer={(cust) => handleOpenPayment(cust, null)}
              onOpenInvoiceForCustomer={(cust) => setInvoiceBuilderOpen(true)}
              onOpenOrderForCustomer={(cust) => handleOpenOrder(cust)}
            />
          )}

          {activeTab === 'catalogue' && <CataloguePage />}

          {activeTab === 'inventory' && <InventoryPage />}

          {activeTab === 'orders' && (
            <OrdersPage
              onOpenBillingForInvoice={(inv) => {
                setActiveTab('billing');
              }}
            />
          )}

          {activeTab === 'billing' && (
            <BillingPage
              onOpenInvoiceBuilder={() => setInvoiceBuilderOpen(true)}
              onOpenPaymentForInvoice={(inv) => handleOpenPayment(null, inv)}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentsPage
              onOpenPaymentModal={handleOpenPayment}
            />
          )}

          {activeTab === 'reports' && <ReportsPage />}

          {activeTab === 'ai' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-2">RAIS Agencies AI Knowledge Interface</h2>
              <p className="text-xs text-slate-400 mb-6">
                Use the dedicated AI Assistant drawer on the right to perform natural language inquiries, price lookups, and account balances.
              </p>
              <button
                onClick={() => setAiDrawerOpen(true)}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs uppercase tracking-wider"
              >
                Launch AI Assistant Drawer
              </button>
            </div>
          )}

          {activeTab === 'audit' && <AuditPage />}
        </main>
      </div>

      {/* Modals & Drawers */}
      <InvoiceBuilderModal
        isOpen={invoiceBuilderOpen}
        onClose={() => setInvoiceBuilderOpen(false)}
        onInvoiceCreated={() => {
          // Modal triggers clean data refresh
        }}
      />

      <OrderBuilderModal
        isOpen={orderBuilderOpen}
        onClose={() => setOrderBuilderOpen(false)}
        preselectedCustomerId={selectedCustForOrder}
        onOrderCreated={() => {
          // Modal triggers clean data refresh
        }}
      />

      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        preselectedCustomer={selectedCustForPayment}
        preselectedInvoice={selectedInvForPayment}
        onPaymentRecorded={() => {
          // Modal triggers clean data refresh
        }}
      />

      <CustomerModal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        customerToEdit={customerToEdit}
        onCustomerSaved={() => {
          // Modal triggers clean data refresh
        }}
      />

      <AIAssistantDrawer
        isOpen={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
      />

      {/* Mobile Bottom Navigation Bar (Phone Screen < 768px) */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onToggleAI={() => setAiDrawerOpen(!aiDrawerOpen)}
      />
    </div>
  );
};
