import React, { useState } from 'react';
import {
  Search,
  Sun,
  Moon,
  Download,
  Plus,
  Command,
  FileSpreadsheet,
  FileText,
  Menu,
  LogOut,
  LogIn,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useInvoice } from '../../context/InvoiceContext';
import { useAuth } from '../../context/AuthContext';
import { SUPPORTED_CURRENCIES } from '../../types/mockData';
import { NotificationCenter } from '../reminders/NotificationCenter';
import { NavigationTab } from './Sidebar';
import { Invoice } from '../../types/invoice';

interface NavbarProps {
  onToggleSidebar?: () => void;
  onOpenCreateInvoice?: () => void;
  onSelectInvoiceForReminder?: (invoice: Invoice) => void;
  onNavigateToTab?: (tab: NavigationTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onOpenCreateInvoice,
  onSelectInvoiceForReminder,
  onNavigateToTab,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout, openAuthModal } = useAuth();
  const {
    filters,
    setFilters,
    setIsCommandPaletteOpen,
    activeCurrency,
    setActiveCurrency,
    exportToCSV,
    exportToExcelData,
    filteredInvoices,
    setSelectedInvoiceForReminder,
  } = useInvoice();

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="h-16 px-4 md:px-6 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4 sticky top-0 z-20 transition-colors duration-300">
      {/* Left: Mobile menu toggle + Live Search Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-2xl">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition shrink-0 cursor-pointer"
          aria-label="Toggle Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar with Command+K shortcut trigger */}
        <div
          onClick={() => setIsCommandPaletteOpen(true)}
          className="relative w-full max-w-md group cursor-pointer"
        >
          <div className="flex items-center w-full px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-orange-500/50 dark:hover:border-orange-500/50 text-zinc-500 dark:text-zinc-400 text-sm transition-all shadow-inner">
            <Search className="w-4 h-4 mr-2.5 text-zinc-400 dark:text-zinc-500 group-hover:text-orange-500 transition-colors" />
            <input
              type="text"
              placeholder="Search vendor, invoice #, amount, or items..."
              value={filters.searchQuery}
              onChange={(e) => {
                e.stopPropagation();
                setFilters((prev) => ({ ...prev, searchQuery: e.target.value }));
              }}
              className="bg-transparent border-none outline-none w-full text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 text-sm focus:ring-0"
            />
            <div className="hidden sm:flex items-center gap-1 pl-2 text-[11px] font-mono bg-zinc-200/80 dark:bg-zinc-800 px-2 py-0.5 rounded-md text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700 shrink-0">
              <Command className="w-3 h-3" />
              <span>K</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Currency, User Auth, Dark mode, Export, Create */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Automated Payment Reminder Notification Center */}
        <NotificationCenter
          onSelectInvoiceForReminder={(inv) => {
            if (onSelectInvoiceForReminder) {
              onSelectInvoiceForReminder(inv);
            } else {
              setSelectedInvoiceForReminder(inv);
            }
          }}
          onNavigateToTab={onNavigateToTab}
        />

        {/* Currency Switcher */}
        <div className="relative">
          <select
            value={activeCurrency.code}
            onChange={(e) => {
              const selected = SUPPORTED_CURRENCIES.find((c) => c.code === e.target.value);
              if (selected) setActiveCurrency(selected);
            }}
            aria-label="Currency"
            className="text-xs font-semibold px-2.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-orange-500 cursor-pointer"
          >
            {SUPPORTED_CURRENCIES.map((cur) => (
              <option key={cur.code} value={cur.code}>
                {cur.symbol} {cur.code}
              </option>
            ))}
          </select>
        </div>

        {/* Export Data Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
            title="Export Spreadsheet & Data"
          >
            <Download className="w-3.5 h-3.5 text-orange-500" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {showExportMenu && (
            <div
              className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
              onClick={() => setShowExportMenu(false)}
            >
              <div className="px-3 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Export Options ({filteredInvoices.length} records)
              </div>
              <button
                onClick={() => exportToCSV()}
                className="w-full text-left px-3.5 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-400 flex items-center gap-2.5 transition"
              >
                <FileText className="w-4 h-4 text-emerald-500" />
                <div>
                  <div className="font-semibold">Export to CSV</div>
                  <div className="text-[10px] text-zinc-400">Comma separated spreadsheet</div>
                </div>
              </button>

              <button
                onClick={() => exportToExcelData()}
                className="w-full text-left px-3.5 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-400 flex items-center gap-2.5 transition"
              >
                <FileSpreadsheet className="w-4 h-4 text-orange-500" />
                <div>
                  <div className="font-semibold">Export Excel (.xls)</div>
                  <div className="text-[10px] text-zinc-400">Formatted billing ledger</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Dark / Light Mode Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 transition-all duration-300 cursor-pointer group"
          aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
          ) : (
            <Moon className="w-4 h-4 text-zinc-600 group-hover:-rotate-12 transition-transform duration-300" />
          )}
        </button>

        {/* User Account / Login Button */}
        <div className="relative">
          {user ? (
            <div>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1 pl-2 pr-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 transition cursor-pointer"
              >
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-semibold max-w-[90px] truncate hidden md:inline">
                  {user.name.split(' ')[0]}
                </span>
              </button>

              {showUserMenu && (
                <div
                  className="absolute right-0 mt-2 w-52 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                  onClick={() => setShowUserMenu(false)}
                >
                  <div className="px-3.5 py-2 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">{user.name}</div>
                    <div className="text-[11px] text-zinc-500 truncate">{user.email}</div>
                  </div>
                  <button
                    onClick={logout}
                    className="w-full text-left px-3.5 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 font-medium transition cursor-pointer mt-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={openAuthModal}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/20 transition cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Account</span>
            </button>
          )}
        </div>

        {/* Quick New Invoice Button */}
        {onOpenCreateInvoice && (
          <button
            onClick={onOpenCreateInvoice}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white text-xs font-semibold shadow-md shadow-orange-500/20 transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Create Bill</span>
          </button>
        )}
      </div>
    </header>
  );
};
