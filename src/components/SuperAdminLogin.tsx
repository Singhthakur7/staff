import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Shield } from 'lucide-react';
import { useStaffOnline } from '../context/StaffOnlineContext';
import { BrandLogo } from './BrandLogo';

export const SuperAdminLogin: React.FC = () => {
  const { loginSuperAdmin } = useStaffOnline();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = loginSuperAdmin(email, password);
    if (!res.ok) {
      setError(res.error || 'Authentication failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-white flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="space-y-3">
          <BrandLogo variant="dark" size="md" />
          <div>
            <h1 className="text-xl font-display font-extrabold text-white">
              Super Admin Control Plane
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Exclusive owner console for managing all registered companies, plans, and ledgers.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Super Admin Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="super@staff.online"
              className="w-full h-12 px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-sky-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Super Admin password"
                className="w-full h-12 pl-3.5 pr-11 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-sky-400"
              />
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                aria-label="Toggle password visibility"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-500/15 border border-rose-500/40 px-3.5 py-2.5 text-xs font-medium text-rose-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full min-h-[48px] px-5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors"
          >
            <Shield className="w-4 h-4" />
            Access Super Admin Console
          </button>
        </form>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-sky-400" />
            Restricted Owner Route
          </span>
          <span>Staff. Online</span>
        </div>
      </div>
    </div>
  );
};
