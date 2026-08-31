import React, { useState, useEffect, useRef } from 'react';
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
import { AIAssistantPage } from './pages/AIAssistantPage';
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

  // ─── LEFT PANEL TOGGLE & TOP-LEFT CORNER HOVER ENGINE ───
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarPeeked, setSidebarPeeked] = useState(false);
  const peekTimeoutRef = useRef(null);

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

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setSidebarOpen(prev => !prev);
        setSidebarPeeked(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleSidebar = () => {
    setSidebarOpen(prev => !prev);
    setSidebarPeeked(false);
  };

  const handleTopLeftHover = () => {
    if (!sidebarOpen) {
      if (peekTimeoutRef.current) clearTimeout(peekTimeoutRef.current);
      setSidebarPeeked(true);
    }
  };

  const handleTopLeftLeave = () => {
    if (!sidebarOpen) {
      peekTimeoutRef.current = setTimeout(() => {
        setSidebarPeeked(false);
      }, 400);
    }
  };

  const handleSidebarMouseEnter = () => {
    if (peekTimeoutRef.current) clearTimeout(peekTimeoutRef.current);
  };

  const handleSidebarMouseLeave = () => {
    if (!sidebarOpen && sidebarPeeked) {
      peekTimeoutRef.current = setTimeout(() => {
        setSidebarPeeked(false);
      }, 400);
    }
  };

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
    <div className="h-screen w-screen overflow-hidden bg-slate-950 flex relative">
      
      {/* ─── TOP-LEFT CORNER HOVER TRIGGER HOTSPOT (Active when collapsed) ─── */}
      {!sidebarOpen && (
        <div 
          onMouseEnter={handleTopLeftHover}
          onMouseLeave={handleTopLeftLeave}
          className="fixed top-0 left-0 w-20 h-16 z-50 pointer-events-auto cursor-pointer"
          title="Hover or Click Top-Left Corner to Peek Navigation"
        />
      )}

      {/* ─── FLOATING BACKDROP (When peeked over content) ─── */}
      {!sidebarOpen && sidebarPeeked && (
        <div 
          onClick={() => setSidebarPeeked(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 transition-opacity duration-300"
        />
      )}

      {/* ─── LEFT SIDEBAR PANEL ─── */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (sidebarPeeked) setSidebarPeeked(false);
        }}
        isOpen={sidebarOpen}
        isPeeked={sidebarPeeked}
        onToggle={handleToggleSidebar}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
        onOpenInvoiceBuilder={() => setInvoiceBuilderOpen(true)}
      />

      {/* ─── MAIN CONTENT AREA ─── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden transition-all duration-300">
        <Header
          sidebarOpen={sidebarOpen}
          onToggleSidebar={handleToggleSidebar}
          onHoverTopLeft={handleTopLeftHover}
          onLeaveTopLeft={handleTopLeftLeave}
          onToggleAI={() => setAiDrawerOpen(!aiDrawerOpen)}
          globalSearchTerm={globalSearchTerm}
          onGlobalSearch={setGlobalSearchTerm}
        />

        <main className={`flex-1 overflow-hidden flex flex-col ${activeTab === 'dashboard' ? 'p-2 sm:p-3 overflow-hidden' : 'p-4 sm:p-6 overflow-y-auto'} max-w-7xl w-full mx-auto`}>
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

          {activeTab === 'ai' && <AIAssistantPage />}

          {activeTab === 'audit' && <AuditPage />}
        </main>
      </div>

      {/* Global Modals */}
      <InvoiceBuilderModal
        isOpen={invoiceBuilderOpen}
        onClose={() => setInvoiceBuilderOpen(false)}
      />

      <OrderBuilderModal
        isOpen={orderBuilderOpen}
        onClose={() => setOrderBuilderOpen(false)}
        initialCustomerId={selectedCustForOrder}
      />

      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        initialCustomer={selectedCustForPayment}
        initialInvoice={selectedInvForPayment}
      />

      <CustomerModal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        customerToEdit={customerToEdit}
      />

      <AIAssistantDrawer
        isOpen={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
      />

      {/* Mobile Bottom Navigation (Visible on mobile screens) */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAI={() => setAiDrawerOpen(true)}
      />
    </div>
  );
};
