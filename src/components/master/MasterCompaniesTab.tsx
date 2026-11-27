import React, { useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Edit3,
  Eye,
  Link2,
  MessageCircle,
  Pause,
  Play,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { CompanyProfile, EMPTY_COMPANY_DB } from '../../types';
import {
  formatINR,
  getAppOrigin,
  getCompanyInitials,
  getTodayISO,
  safeCopyText,
  slugifyCompany,
} from '../../utils/helpers';

export const MasterCompaniesTab: React.FC = () => {
  const {
    companies,
    allCompanyDatabases,
    createCompany,
    updateCompany,
    toggleCompanyActive,
    deleteCompany,
    setInspectingCompanyId,
    openWhatsAppModal,
    pushToast,
  } = useErp();

  // Add Company Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [tagline, setTagline] = useState('Corporate ERP & Payroll Suite');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [upi, setUpi] = useState('');
  const [badge, setBadge] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [creating, setCreating] = useState(false);

  // Newly created credentials card
  const [provisionedCompany, setProvisionedCompany] = useState<CompanyProfile | null>(null);

  // Edit Company Modal
  const [editingComp, setEditingComp] = useState<CompanyProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editTagline, setEditTagline] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editUpi, setEditUpi] = useState('');
  const [editBadge, setEditBadge] = useState('');
  const [editAdminEmail, setEditAdminEmail] = useState('');

  // Delete Confirmation Modal
  const [deletingComp, setDeletingComp] = useState<CompanyProfile | null>(null);

  const origin = getAppOrigin();
  const todayISO = getTodayISO();

  const handleNameChange = (nextName: string) => {
    setName(nextName);
    const autoSlug = slugifyCompany(nextName);
    setSlug(nextName.trim() ? autoSlug : '');
    setBadge(nextName.trim() ? getCompanyInitials(nextName) : '');
    if (nextName.trim()) {
      const compact = autoSlug.replace(/-/g, '').slice(0, 18) || 'company';
      if (!upi) setUpi(`${compact}@okicici`);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim() || !adminEmail.trim()) {
      pushToast({ type: 'error', title: 'Fill Company Name, Slug, and Admin Google Email' });
      return;
    }
    setCreating(true);
    const created = await createCompany({
      name: name.trim(),
      slug: slugifyCompany(slug),
      tagline: tagline.trim() || 'Corporate ERP & Payroll Suite',
      address: address.trim(),
      phone: phone.trim(),
      upi: upi.trim(),
      badge: (badge.trim() || getCompanyInitials(name)).slice(0, 3).toUpperCase(),
      adminEmail: adminEmail.trim().toLowerCase(),
      active: true,
    });
    setCreating(false);
    if (created) {
      setProvisionedCompany(created);
      setName('');
      setSlug('');
      setTagline('Corporate ERP & Payroll Suite');
      setAddress('');
      setPhone('');
      setUpi('');
      setBadge('');
      setAdminEmail('');
    }
  };

  const getCompanyLinks = (c: CompanyProfile) => ({
    adminUrl: `${origin}/c/${c.slug}/admin`,
    staffUrl: `${origin}/c/${c.slug}`,
  });

  const handleCopyLinksAndCreds = async (c: CompanyProfile) => {
    const { adminUrl, staffUrl } = getCompanyLinks(c);
    const text = [
      `${c.name} — Cloud ERP & Payroll Portals`,
      `Company Admin Panel: ${adminUrl}`,
      `Authorized Admin Google Email: ${c.adminEmail}`,
      `Sign in with Google using the email above.`,
      `Staff Portal Link: ${staffUrl}`,
    ].join('\n');
    const ok = await safeCopyText(text);
    pushToast({
      type: ok ? 'success' : 'error',
      title: ok ? 'Admin & Staff Portal Links Copied' : 'Copy failed',
    });
  };

  const handleShareCredentialsWA = (c: CompanyProfile) => {
    const { adminUrl, staffUrl } = getCompanyLinks(c);
    openWhatsAppModal({
      phone: c.phone,
      recipientName: c.name,
      message: [
        `Welcome to *${c.name}* Dedicated Cloud ERP!`,
        ``,
        `*Company Admin Panel (Private):*`,
        adminUrl,
        `Sign in with Google Email: ${c.adminEmail}`,
        ``,
        `*Staff Field Portal Link (Share with your staff):*`,
        staffUrl,
      ].join('\n'),
    });
  };

  const openEditModal = (c: CompanyProfile) => {
    setEditingComp(c);
    setEditName(c.name);
    setEditTagline(c.tagline);
    setEditAddress(c.address);
    setEditPhone(c.phone);
    setEditUpi(c.upi);
    setEditBadge(c.badge);
    setEditAdminEmail(c.adminEmail);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingComp) return;
    await updateCompany(editingComp.id, {
      name: editName.trim(),
      tagline: editTagline.trim(),
      address: editAddress.trim(),
      phone: editPhone.trim(),
      upi: editUpi.trim(),
      badge: editBadge.trim().slice(0, 3).toUpperCase() || getCompanyInitials(editName),
      adminEmail: editAdminEmail.trim().toLowerCase(),
    });
    setEditingComp(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingComp) return;
    await deleteCompany(deletingComp.id);
    setDeletingComp(null);
  };

  return (
    <div className="space-y-6">
      {/* Newly Provisioned Direct Links Banner */}
      {provisionedCompany && (
        <div className="bg-[#0B1120] text-white rounded-2xl p-5 sm:p-6 border border-emerald-500/40 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-white">
                  Company Provisioned &amp; Isolated Firestore Workspace Ready:{' '}
                  {provisionedCompany.name}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Share these dedicated portal URLs with the Company Administrator (Google Sign-In
                  enabled).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setProvisionedCompany(null)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-1">
              <p className="text-[#FBBF24] font-sans font-bold">Company Admin Panel Link</p>
              <p className="break-all text-slate-200">{getCompanyLinks(provisionedCompany).adminUrl}</p>
              <p className="text-slate-400 pt-1">
                Admin Google Email: <span className="text-white">{provisionedCompany.adminEmail}</span>
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-1">
              <p className="text-emerald-300 font-sans font-bold">Staff Portal Link (Public)</p>
              <p className="break-all text-slate-200">{getCompanyLinks(provisionedCompany).staffUrl}</p>
              <p className="text-slate-400 pt-1 font-sans">
                Zero Admin links shown on this route.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => handleCopyLinksAndCreds(provisionedCompany)}
              className="min-h-[42px] px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Copy className="w-4 h-4" />
              Copy Portal Links
            </button>
            <button
              type="button"
              onClick={() => handleShareCredentialsWA(provisionedCompany)}
              className="min-h-[42px] px-4 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <MessageCircle className="w-4 h-4" />
              Send Invite on WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setInspectingCompanyId(provisionedCompany.id)}
              className="min-h-[42px] px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Eye className="w-4 h-4" />
              Open Company Database
            </button>
          </div>
        </div>
      )}

      {/* Add New Company & Auto Company Admin Panel Generator */}
      <form
        onSubmit={handleCreateCompany}
        className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-[#0B1120]">
              Add New Company &amp; Provision Isolated Firestore Workspace
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Creates a strictly isolated Cloud Firestore tenant, dedicated `/c/slug/admin` panel,
              and `/c/slug` staff portal using Google Sign-In.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Company Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Malanadu Media Solutions & Live On Connect"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              URL Slug * (/c/slug)
            </label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(slugifyCompany(e.target.value))}
              placeholder="malanadu-media"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Badge Initials
            </label>
            <input
              type="text"
              maxLength={3}
              value={badge}
              onChange={(e) => setBadge(e.target.value.toUpperCase())}
              placeholder="MM"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-mono font-bold"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Tagline / Subtitle
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Corporate Broadcast ERP & Payroll Suite"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Address / Location
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Manimala & Kanjirappally, Kottayam, Kerala"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Contact Phone(s)
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 85909 52476"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Company GPay UPI ID
            </label>
            <input
              type="text"
              value={upi}
              onChange={(e) => setUpi(e.target.value)}
              placeholder="company@okicici"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-mono"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Company Admin Google Email *
            </label>
            <input
              type="email"
              required
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="owner@gmail.com"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-mono"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={creating}
          className="min-h-[46px] px-5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {creating ? 'Provisioning in Firestore...' : 'Create Company & Generate Portals'}
        </button>
      </form>

      {/* Company Directory */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-[#0B1120]">
          Provisioned Companies Directory ({companies.length})
        </h3>

        {companies.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
            No companies created yet. Use the form above to launch your first isolated company ERP.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {companies.map((c) => {
              const db = allCompanyDatabases[c.id] || EMPTY_COMPANY_DB;
              const todayAtt = db.attendance.filter(
                (a) => a.date === todayISO || a.status === 'working'
              ).length;
              const totalInc =
                db.ledger.filter((l) => l.type === 'income').reduce((s, l) => s + l.amount, 0) +
                db.works.reduce((s, w) => s + w.billReceived, 0);
              const totalOut =
                db.ledger.filter((l) => l.type === 'expense').reduce((s, l) => s + l.amount, 0) +
                db.expenses
                  .filter((e) => e.status === 'approved')
                  .reduce((s, e) => s + e.amount, 0) +
                db.works
                  .filter((w) => w.hasSubContract)
                  .reduce((s, w) => s + w.subContractTotal, 0) +
                db.attendance.reduce((s, a) => s + a.wageEarned, 0);
              const netPnl = totalInc - totalOut;

              return (
                <div
                  key={c.id}
                  className={`bg-white border rounded-2xl p-5 flex flex-col justify-between gap-4 ${
                    c.active ? 'border-slate-200' : 'border-red-200 bg-red-50/20'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-[#0B1120] text-white font-extrabold text-sm flex items-center justify-center shrink-0">
                          {(c.badge || 'CO').slice(0, 3).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-base font-bold text-[#0B1120] truncate">{c.name}</h4>
                          <p className="text-xs text-slate-500 truncate">
                            {c.address || c.tagline}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-bold shrink-0 ${
                          c.active ? 'text-[#059669]' : 'text-[#DC2626]'
                        }`}
                      >
                        {c.active ? 'Active' : 'Suspended'}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 bg-[#F4F7FB] rounded-xl p-3 text-center">
                      <div>
                        <p className="text-[10px] text-slate-500">Staff</p>
                        <p className="text-xs font-mono font-bold text-[#0B1120] tabular-nums">
                          {db.staff.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500">Works</p>
                        <p className="text-xs font-mono font-bold text-[#0B1120] tabular-nums">
                          {db.works.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500">Today</p>
                        <p className="text-xs font-mono font-bold text-[#2563EB] tabular-nums">
                          {todayAtt}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500">Net P&amp;L</p>
                        <p
                          className={`text-xs font-mono font-bold tabular-nums ${
                            netPnl >= 0 ? 'text-[#059669]' : 'text-[#DC2626]'
                          }`}
                        >
                          {formatINR(netPnl)}
                        </p>
                      </div>
                    </div>

                    <div className="text-xs font-mono text-slate-600 space-y-1">
                      <p className="truncate">
                        Admin Google Email: <strong>{c.adminEmail}</strong>
                      </p>
                      <p className="truncate text-slate-500">
                        Admin URL: /c/{c.slug}/admin · Staff URL: /c/{c.slug}
                      </p>
                    </div>
                  </div>

                  {/* Action Controls */}
                  <div className="space-y-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setInspectingCompanyId(c.id)}
                      className="w-full min-h-[42px] px-4 rounded-xl bg-[#0B1120] hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <Eye className="w-4 h-4 text-[#FBBF24]" />
                      Inspect Live Database / Open Company View
                    </button>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(c)}
                        className="min-h-[38px] px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit Profile
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleCompanyActive(c.id)}
                        className={`min-h-[38px] px-3 rounded-xl text-xs font-bold inline-flex items-center gap-1 border ${
                          c.active
                            ? 'border-amber-300 bg-amber-50 hover:bg-amber-100 text-[#B45309]'
                            : 'border-emerald-300 bg-[#059669] hover:bg-[#047857] text-white'
                        }`}
                      >
                        {c.active ? (
                          <>
                            <Pause className="w-3.5 h-3.5" /> Suspend
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" /> Activate
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyLinksAndCreds(c)}
                        className="min-h-[38px] px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1"
                      >
                        <Link2 className="w-3.5 h-3.5 text-[#2563EB]" />
                        Copy Links
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShareCredentialsWA(c)}
                        className="min-h-[38px] px-3 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold inline-flex items-center gap-1"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingComp(c)}
                        className="min-h-[38px] px-3 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-[#DC2626] text-xs font-semibold inline-flex items-center gap-1 ml-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Company Modal */}
      {editingComp && (
        <div
          className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setEditingComp(null)}
        >
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#0B1120]">
                  Edit Company &amp; Admin Google Account
                </h3>
                <p className="text-xs font-mono text-slate-500">/c/{editingComp.slug}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingComp(null)}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-5 space-y-3 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Badge</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={editBadge}
                    onChange={(e) => setEditBadge(e.target.value.toUpperCase())}
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tagline</label>
                <input
                  type="text"
                  value={editTagline}
                  onChange={(e) => setEditTagline(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Address</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Company UPI ID
                  </label>
                  <input
                    type="text"
                    value={editUpi}
                    onChange={(e) => setEditUpi(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Authorized Company Admin Google Email
                </label>
                <input
                  type="email"
                  required
                  value={editAdminEmail}
                  onChange={(e) => setEditAdminEmail(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingComp(null)}
                  className="min-h-[42px] px-4 rounded-xl border border-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[42px] px-5 rounded-xl bg-[#2563EB] text-white text-xs font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Company Confirmation Modal */}
      {deletingComp && (
        <div
          className="fixed inset-0 z-[70] bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setDeletingComp(null)}
        >
          <div
            className="bg-white w-full max-w-md rounded-2xl border border-red-200 shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-[#DC2626]">
              Permanently Delete {deletingComp.name}?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              This will permanently remove <strong>{deletingComp.name}</strong> and its entire
              isolated Cloud Firestore collections (all staff accounts, attendance logs, works,
              P&amp;L entries, salary payments, and studio CRM records). This action cannot be
              undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingComp(null)}
                className="min-h-[42px] px-4 rounded-xl border border-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="min-h-[42px] px-5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold"
              >
                Delete Company &amp; Firestore Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
