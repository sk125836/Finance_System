import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  FileText,
  DollarSign,
  Edit,
  Trash2,
  Receipt,
  ArrowRight,
  Building2,
} from 'lucide-react';
import { useInvoice } from '../../context/InvoiceContext';
import { ClientVendor } from '../../types/invoice';
import { NavigationTab } from '../layout/Sidebar';

interface VendorManagerProps {
  setActiveTab: (tab: NavigationTab) => void;
  onOpenCreateWithClient?: (client: ClientVendor) => void;
}

export const VendorManager: React.FC<VendorManagerProps> = ({
  setActiveTab,
  onOpenCreateWithClient,
}) => {
  const {
    clients,
    addClient,
    updateClient,
    deleteClient,
    setFilters,
    invoices,
  } = useInvoice();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingClient, setEditingClient] = useState<ClientVendor | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    address: '',
    taxId: '',
    notes: '',
  });

  const handleOpenAdd = () => {
    setEditingClient(null);
    setFormData({
      name: '',
      company: '',
      email: '',
      phone: '',
      address: '',
      taxId: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (client: ClientVendor) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      company: client.company || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      taxId: client.taxId || '',
      notes: client.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingClient) {
      updateClient(editingClient.id, formData);
    } else {
      addClient(formData);
    }
    setIsModalOpen(false);
  };

  const handleViewClientBills = (clientId: string) => {
    setFilters((prev) => ({ ...prev, vendorId: clientId, status: 'all', searchQuery: '' }));
    setActiveTab('invoices');
  };

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.company && c.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.phone.includes(searchQuery) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
            Clients & Vendor Directory
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Manage your client profiles, track cumulative revenue, and create instant bills.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white shadow-md shadow-orange-500/25 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Client</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search clients by name, company, email or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredClients.map((client) => {
          const clientInvoices = invoices.filter(
            (inv) => inv.client.id === client.id || inv.client.name.toLowerCase() === client.name.toLowerCase()
          );
          const totalSpent = clientInvoices.reduce((sum, i) => sum + i.totalAmount, 0);

          return (
            <div
              key={client.id}
              className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-orange-500/40 transition-all flex flex-col justify-between group space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 font-black text-sm flex items-center justify-center border border-orange-500/20">
                      {client.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-orange-500 transition">
                        {client.name}
                      </h3>
                      {client.company && (
                        <p className="text-xs text-zinc-400 font-medium">{client.company}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(client)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition"
                      title="Edit"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteClient(client.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400 pt-1">
                  {client.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-center gap-2 truncate">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="truncate">{client.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Client Billing Stats Footer */}
              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Total Billed</span>
                    <span className="font-extrabold text-orange-600 dark:text-orange-400 text-sm">
                      ৳ {totalSpent.toLocaleString()}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Invoices</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      {clientInvoices.length} bills
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => handleViewClientBills(client.id)}
                    className="py-1.5 px-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold text-center transition"
                  >
                    View History
                  </button>

                  <button
                    onClick={() => {
                      if (onOpenCreateWithClient) onOpenCreateWithClient(client);
                    }}
                    className="py-1.5 px-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/20 text-xs font-bold text-center transition flex items-center justify-center gap-1"
                  >
                    <span>+ New Bill</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-orange-500" />
              <span>{editingClient ? 'Edit Client Profile' : 'Add New Vendor / Client'}</span>
            </h3>

            <form onSubmit={handleSaveClient} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                    Client / Contact Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
                    placeholder="e.g. John Dewey"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
                    placeholder="e.g. Apex Footwear Ltd."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
                    placeholder="billing@company.com"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
                    placeholder="+880 1711-XXXXXX"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                  Billing Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
                  placeholder="Address, City, Bangladesh"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
