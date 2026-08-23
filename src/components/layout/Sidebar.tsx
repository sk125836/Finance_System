import React from 'react';
import {
  LayoutDashboard,
  FilePlus2,
  ReceiptText,
  Users,
  BarChart3,
  Settings,
  Sparkles,
  ArrowUpRight,
  Clock,
  AlertCircle,
  Building2,
  PhoneCall,
  MapPin,
  Bell,
  TrendingDown,
  Receipt,
  X,
  Bot,
} from 'lucide-react';
import { useInvoice } from '../../context/InvoiceContext';
import { ZoolyumLogo } from '../common/ZoolyumLogo';

export type NavigationTab =
  | 'dashboard'
  | 'create'
  | 'invoices'
  | 'expenses'
  | 'reminders'
  | 'vendors'
  | 'reports'
  | 'settings';

interface SidebarProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  onOpenCreate?: () => void;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onOpenCreate, onCloseMobile }) => {
  const { metrics, companyProfile, attentionSummary } = useInvoice();

  const attentionCount = attentionSummary.allAttentionInvoices.length;

  const handleSelectTab = (tab: NavigationTab) => {
    setActiveTab(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const navItems = [
    {
      id: 'dashboard' as NavigationTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'create' as NavigationTab,
      label: 'Invoice Generator',
      icon: FilePlus2,
      badge: 'Quick',
      badgeColor: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
    },
    {
      id: 'invoices' as NavigationTab,
      label: 'Invoice History',
      icon: ReceiptText,
      badge: metrics.totalInvoicesCount,
      badgeColor: 'bg-zinc-800 text-zinc-300 border border-zinc-700',
    },
    {
      id: 'expenses' as NavigationTab,
      label: 'Expense Manager',
      icon: TrendingDown,
      badge: metrics.expensesCount > 0 ? metrics.expensesCount : null,
      badgeColor: 'bg-red-500/10 text-red-500 border border-red-500/20',
    },
    {
      id: 'reminders' as NavigationTab,
      label: 'Payment Reminders',
      icon: Bell,
      badge: attentionCount > 0 ? `${attentionCount} Alerts` : null,
      badgeColor: attentionSummary.overdueInvoices.length > 0
        ? 'bg-red-500/20 text-red-500 border border-red-500/40 animate-pulse'
        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    },
    {
      id: 'vendors' as NavigationTab,
      label: 'Clients & Vendors',
      icon: Users,
      badge: null,
    },
    {
      id: 'reports' as NavigationTab,
      label: 'Financial Reports',
      icon: BarChart3,
      badge: 'Auto',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    },
    {
      id: 'settings' as NavigationTab,
      label: 'Company Settings',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <aside className="w-72 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border-r border-zinc-200 dark:border-zinc-800/80 flex flex-col h-full select-none shrink-0 transition-all duration-300 z-30">
      {/* Brand Header */}
      <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-gradient-to-b dark:from-zinc-900/60 dark:to-zinc-950 overflow-hidden">
        <div className="flex items-center justify-between gap-2 min-w-0">
          {/* Official Logo */}
          <div className="min-w-0 flex-1 overflow-hidden">
            <ZoolyumLogo size="md" customName={companyProfile.name} customLogoUrl={companyProfile.logoUrl} />
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-orange-500/15 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30 shrink-0">
              PRO
            </span>
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                title="Close Navigation"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Action Button */}
        <button
          onClick={() => {
            if (onOpenCreate) onOpenCreate();
            handleSelectTab('create');
          }}
          className="w-full mt-3.5 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-semibold text-xs sm:text-sm shadow-md shadow-orange-500/25 transition-all duration-200 active:scale-[0.98] group cursor-pointer"
        >
          <Sparkles className="w-4 h-4 transition-transform group-hover:rotate-12" />
          <span>New Invoice</span>
          <ArrowUpRight className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-3 sm:py-4 space-y-1 custom-scrollbar">
        <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Main Menu
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all duration-200 group cursor-pointer ${
                isActive
                  ? 'bg-orange-50 dark:bg-gradient-to-r dark:from-orange-500/15 dark:via-orange-500/10 dark:to-transparent text-orange-600 dark:text-orange-400 border-l-4 border-orange-500 shadow-sm font-semibold pl-3'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900/70'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 shrink-0 ${
                    isActive ? 'text-orange-600 dark:text-orange-400' : 'text-zinc-400 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== null && (
                <span
                  className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                    item.badgeColor || 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Live Status Quick Summary */}
        <div className="pt-4 mt-3 border-t border-zinc-200 dark:border-zinc-800/80 px-1 space-y-2">
          <div className="px-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center justify-between">
            <span>Financial Alerts</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
          </div>

          <div
            onClick={() => handleSelectTab('invoices')}
            className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition cursor-pointer flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
              <span>Pending Bills</span>
            </div>
            <span className="font-bold text-xs text-zinc-700 dark:text-zinc-200 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-500/20">
              {metrics.pendingCount}
            </span>
          </div>

          {metrics.overdueCount > 0 && (
            <div
              onClick={() => handleSelectTab('invoices')}
              className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 hover:border-red-300 dark:hover:border-red-800/50 transition cursor-pointer flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 dark:text-red-400 shrink-0" />
                <span>Overdue Action</span>
              </div>
              <span className="font-bold text-xs text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-500/20 px-2 py-0.5 rounded-md border border-red-200 dark:border-red-500/30 animate-pulse">
                {metrics.overdueCount}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer info */}
      <div className="p-3.5 border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/40 text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
        <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-300 font-semibold truncate">
          <Building2 className="w-3.5 h-3.5 text-orange-500 shrink-0" />
          <span className="truncate">{companyProfile.name}</span>
        </div>
        <div className="flex items-center gap-2 truncate text-[11px]">
          <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span className="truncate">{companyProfile.address || 'Mirpur 10, Dhaka'}</span>
        </div>
        <div className="flex items-center gap-2 truncate text-[11px]">
          <PhoneCall className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span>{companyProfile.phone || '01601000950'}</span>
        </div>
      </div>
    </aside>
  );
};

