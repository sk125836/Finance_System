import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Check,
  ChevronDown,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useInvoice } from '../../context/InvoiceContext';
import { useAuth } from '../../context/AuthContext';
import { SUPPORTED_CURRENCIES } from '../../utils/currencyService';
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
    getRateBetween,
    exportToCSV,
    exportToExcelData,
    filteredInvoices,
    setSelectedInvoiceForReminder,
  } = useInvoice();

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [currencySearchQuery, setCurrencySearchQuery] = useState('');

  const currencyMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close open dropdowns when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (currencyMenuRef.current && !currencyMenuRef.current.contains(target)) {
        setShowCurrencyDropdown(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(target)) {
        setShowExportMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserMenu(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowCurrencyDropdown(false);
        setShowExportMenu(false);
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleCurrencyDropdown = () => {
    setShowCurrencyDropdown((prev) => !prev);
    setShowExportMenu(false);
    setShowUserMenu(false);
  };

  const toggleExportMenu = () => {
    setShowExportMenu((prev) => !prev);
    setShowCurrencyDropdown(false);
    setShowUserMenu(false);
  };

  const toggleUserMenu = () => {
    setShowUserMenu((prev) => !prev);
    setShowCurrencyDropdown(false);
    setShowExportMenu(false);
  };

  const filteredCurrencies = useMemo(() => {
    if (!currencySearchQuery.trim()) return SUPPORTED_CURRENCIES;
    const q = currencySearchQuery.toLowerCase().trim();
    return SUPPORTED_CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q)
    );
  }, [currencySearchQuery]);

  return (
    <header className="h-16 px-3 sm:px-4 md:px-6 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-20 transition-colors duration-300">
      {/* Left: Mobile menu toggle + Live Search Bar */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 max-w-2xl">
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
          className="relative w-full max-w-md group cursor-pointer min-w-0"
        >
          <div className="flex items-center w-full px-2.5 sm:px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-orange-500/50 dark:hover:border-orange-500/50 text-zinc-500 dark:text-zinc-400 text-sm transition-all shadow-inner">
            <Search className="w-4 h-4 mr-1.5 sm:mr-2.5 text-zinc-400 dark:text-zinc-500 group-hover:text-orange-500 transition-colors shrink-0" />
            <input
              type="text"
              placeholder="Search invoices, clients..."
              value={filters.searchQuery}
              onChange={(e) => {
                e.stopPropagation();
                setFilters((prev) => ({ ...prev, searchQuery: e.target.value }));
              }}
              className="bg-transparent border-none outline-none w-full min-w-0 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 text-xs sm:text-sm focus:ring-0 truncate"
            />
            <div className="hidden sm:flex items-center gap-1 pl-2 text-[11px] font-mono bg-zinc-200/80 dark:bg-zinc-800 px-2 py-0.5 rounded-md text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700 shrink-0">
              <Command className="w-3 h-3" />
              <span>K</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Currency, User Auth, Dark mode, Export, Create */}
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
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

        {/* Live Currency Switcher with Real-Time Rates Indicator */}
        <div className="relative" ref={currencyMenuRef}>
          <button
            onClick={toggleCurrencyDropdown}
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 transition cursor-pointer group"
            title="Live Google Exchange Rates Converter"
          >
            <div className="flex items-center gap-1 sm:gap-1.5 font-bold text-xs">
              {activeCurrency.flag ? (
                <span className="text-sm leading-none">{activeCurrency.flag}</span>
              ) : (
                <span className="w-5 h-5 rounded-lg bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs">
                  {activeCurrency.symbol}
                </span>
              )}
              <span className="text-xs">{activeCurrency.code}</span>
            </div>

            <div className="hidden xl:flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Live Rate</span>
            </div>

            <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${showCurrencyDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showCurrencyDropdown && (
            <div
              className="fixed inset-x-3 top-16 max-w-sm sm:max-w-none sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 mx-auto sm:mx-0 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Currency Search Input */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search currency, country (e.g. USD, Taka, Japan)..."
                  value={currencySearchQuery}
                  onChange={(e) => setCurrencySearchQuery(e.target.value)}
                  autoFocus
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1.5 focus:ring-orange-500"
                />
              </div>

              {/* Currency list */}
              <div className="max-h-64 overflow-y-auto space-y-0.5 custom-scrollbar">
                {filteredCurrencies.length === 0 ? (
                  <div className="py-6 text-center text-xs text-zinc-400">
                    No currency found for "{currencySearchQuery}"
                  </div>
                ) : (
                  filteredCurrencies.map((cur) => {
                    const isSelected = cur.code === activeCurrency.code;
                    return (
                      <button
                        key={cur.code}
                        onClick={() => {
                          setActiveCurrency(cur);
                          setShowCurrencyDropdown(false);
                          setCurrencySearchQuery('');
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between text-xs transition cursor-pointer ${
                          isSelected
                            ? 'bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-bold'
                            : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-lg shrink-0 leading-none">
                            {cur.flag || '🌐'}
                          </span>
                          <div className="font-semibold truncate text-xs">
                            <span className="font-bold">{cur.code}</span>
                            <span className="text-zinc-400 font-normal ml-1.5">- {cur.name}</span>
                          </div>
                        </div>

                        {isSelected && <Check className="w-4 h-4 text-orange-500 shrink-0 ml-2" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Export Data Dropdown */}
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={toggleExportMenu}
            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
            title="Export Spreadsheet & Data"
          >
            <Download className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-orange-500" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {showExportMenu && (
            <div
              className="fixed inset-x-3 top-16 max-w-xs sm:max-w-none sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-56 mx-auto sm:mx-0 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
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
        <div className="relative" ref={userMenuRef}>
          {user ? (
            <div>
              <button
                onClick={toggleUserMenu}
                className="flex items-center gap-1.5 p-1.5 sm:pl-2 sm:pr-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 transition cursor-pointer"
                title={user.name}
              >
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-bold text-xs flex items-center justify-center shadow-sm shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-semibold max-w-[90px] truncate hidden md:inline">
                  {user.name.split(' ')[0]}
                </span>
              </button>

              {showUserMenu && (
                <div
                  className="fixed inset-x-3 top-16 max-w-xs sm:max-w-none sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-52 mx-auto sm:mx-0 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
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
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/20 transition cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Account</span>
            </button>
          )}
        </div>

        {/* Quick New Invoice Button (Desktop & Tablet only - Mobile has bottom bar) */}
        {onOpenCreateInvoice && (
          <button
            onClick={onOpenCreateInvoice}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white text-xs font-semibold shadow-md shadow-orange-500/20 transition active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Bill</span>
          </button>
        )}
      </div>
    </header>
  );
};
