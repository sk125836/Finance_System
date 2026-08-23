/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { InvoiceProvider } from './context/InvoiceContext';
import { Sidebar, NavigationTab } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { CommandPalette } from './components/CommandPalette';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { InvoiceGenerator } from './components/invoice/InvoiceGenerator';
import { InvoiceList } from './components/invoice/InvoiceList';
import { VendorManager } from './components/vendors/VendorManager';
import { AutomatedReports } from './components/reports/AutomatedReports';
import { ExpenseManager } from './components/expenses/ExpenseManager';
import { SettingsModal } from './components/settings/SettingsModal';
import { InvoiceDetailModal } from './components/invoice/InvoiceDetailModal';
import { AutomatedRemindersView } from './components/reminders/AutomatedRemindersView';
import { ReminderComposerModal } from './components/reminders/ReminderComposerModal';
import { Invoice, ClientVendor } from './types/invoice';
import { useInvoice } from './context/InvoiceContext';
import { LayoutDashboard, ReceiptText, Plus, TrendingDown, Menu } from 'lucide-react';

function MainApp() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { selectedInvoiceForReminder, setSelectedInvoiceForReminder } = useInvoice();
  
  // Modals & Active Invoice States
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  const handleOpenCreate = () => {
    setEditingInvoice(null);
    setActiveTab('create');
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setActiveTab('create');
  };

  const handleOpenCreateWithClient = (client: ClientVendor) => {
    setEditingInvoice({
      id: '',
      invoiceNumber: `ZOO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'pending',
      client: {
        id: client.id,
        name: client.name,
        company: client.company || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        taxId: client.taxId || '',
      },
      company: null as any,
      currency: { symbol: '৳', code: 'BDT', name: 'Bangladeshi Taka' },
      items: [
        {
          id: 'item-1',
          description: 'Brand Strategy & Digital Innovation Consultancy',
          quantity: 1,
          unitPrice: 100000,
          amount: 100000,
        },
      ],
      subtotal: 100000,
      taxRate: 5,
      taxAmount: 5000,
      discountRate: 0,
      discountAmount: 0,
      shippingFee: 0,
      totalAmount: 105000,
      paidAmount: 0,
      balanceDue: 105000,
      paymentDetails: null as any,
      notes: '',
      terms: '',
      createdAt: '',
      updatedAt: '',
    });
    setActiveTab('create');
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#090a0d] text-zinc-900 dark:text-zinc-100 flex transition-colors duration-300 font-sans antialiased selection:bg-orange-500 selection:text-white">
      {/* Command+K Palette */}
      <CommandPalette
        setActiveTab={setActiveTab}
        onSelectInvoice={(inv) => setSelectedInvoiceForModal(inv)}
        onOpenCreate={handleOpenCreate}
      />

      {/* Mobile & Tablet Sidebar Drawer */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 lg:hidden animate-in fade-in"
          onClick={() => setIsMobileSidebarOpen(false)}
        >
          <div className="w-72 max-w-[85vw] h-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <Sidebar
              activeTab={activeTab}
              setActiveTab={(tab) => {
                setActiveTab(tab);
                setIsMobileSidebarOpen(false);
              }}
              onOpenCreate={handleOpenCreate}
              onCloseMobile={() => setIsMobileSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Desktop Persistent Sidebar (1024px+) */}
      <div className="hidden lg:block shrink-0 h-screen sticky top-0">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenCreate={handleOpenCreate}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Navbar */}
        <Navbar
          onToggleSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenCreateInvoice={handleOpenCreate}
          onSelectInvoiceForReminder={(inv) => setSelectedInvoiceForReminder(inv)}
          onNavigateToTab={(tab) => setActiveTab(tab)}
        />

        {/* Dynamic Page Views */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 lg:p-8 pb-24 sm:pb-8 custom-scrollbar">
          {activeTab === 'dashboard' && (
            <DashboardOverview
              setActiveTab={setActiveTab}
              onSelectInvoice={(inv) => setSelectedInvoiceForModal(inv)}
              onOpenCreate={handleOpenCreate}
              onEditInvoice={handleEditInvoice}
            />
          )}

          {activeTab === 'create' && (
            <InvoiceGenerator
              initialInvoice={editingInvoice}
              onSaved={() => {
                setEditingInvoice(null);
                setActiveTab('invoices');
              }}
              onCancel={() => {
                setEditingInvoice(null);
                setActiveTab('invoices');
              }}
            />
          )}

          {activeTab === 'invoices' && (
            <InvoiceList
              onSelectInvoice={(inv) => setSelectedInvoiceForModal(inv)}
              onEditInvoice={handleEditInvoice}
              onOpenCreate={handleOpenCreate}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpenseManager onOpenCreateInvoice={handleOpenCreate} />
          )}

          {activeTab === 'reminders' && (
            <AutomatedRemindersView
              onOpenReminderModal={(inv) => setSelectedInvoiceForReminder(inv)}
              onSelectInvoice={(inv) => setSelectedInvoiceForModal(inv)}
            />
          )}

          {activeTab === 'vendors' && (
            <VendorManager
              setActiveTab={setActiveTab}
              onOpenCreateWithClient={handleOpenCreateWithClient}
            />
          )}

          {activeTab === 'reports' && <AutomatedReports />}

          {activeTab === 'settings' && <SettingsModal />}
        </main>
      </div>

      {/* Mobile Bottom Quick Navigation Bar (Visible only on small mobile screens <640px) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 px-3 py-1.5 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg transition ${
            activeTab === 'dashboard' ? 'text-orange-500 font-bold' : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Home</span>
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg transition ${
            activeTab === 'invoices' ? 'text-orange-500 font-bold' : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <ReceiptText className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Invoices</span>
        </button>

        {/* Center Primary Action Button */}
        <button
          onClick={handleOpenCreate}
          className="flex flex-col items-center -mt-4 p-2.5 rounded-full bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-lg shadow-orange-500/30 active:scale-95 transition"
          title="Create Bill"
        >
          <Plus className="w-5 h-5" />
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg transition ${
            activeTab === 'expenses' ? 'text-orange-500 font-bold' : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <TrendingDown className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Expenses</span>
        </button>

        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="flex flex-col items-center py-1 px-2 rounded-lg text-zinc-500 dark:text-zinc-400"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Menu</span>
        </button>
      </nav>

      {/* Payment Reminder Composer Modal */}
      {selectedInvoiceForReminder && (
        <ReminderComposerModal
          invoice={selectedInvoiceForReminder}
          onClose={() => setSelectedInvoiceForReminder(null)}
        />
      )}

      {/* Invoice Detail / Print / Export Modal */}
      {selectedInvoiceForModal && (
        <InvoiceDetailModal
          invoice={selectedInvoiceForModal}
          onClose={() => setSelectedInvoiceForModal(null)}
          onEdit={(inv) => {
            setSelectedInvoiceForModal(null);
            handleEditInvoice(inv);
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <InvoiceProvider>
        <MainApp />
      </InvoiceProvider>
    </ThemeProvider>
  );
}
