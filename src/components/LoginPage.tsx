import { LogIn, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pwdBusy, setPwdBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true); // default remember enabled

  const passwordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setPwdBusy(true);
      const base = import.meta.env?.VITE_API_URL || 'http://localhost:5050/api';
      // Detect mixed content (HTTPS page -> HTTP API) which iOS Safari blocks as "Load Failed"
      if (window.location.protocol === 'https:' && base.startsWith('http://')) {
        throw new Error('Insecure API URL (http) from secure site (https). Set VITE_API_URL to an https:// API.');
      }
      const res = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password, remember }),
      });
      if (!res.ok) {
        const data: unknown = await res.json().catch(() => ({}));
        const msg = (data && typeof data === 'object' && 'message' in data) ? (data as { message?: string }).message : undefined;
        throw new Error(msg || `Login failed (${res.status})`);
      }
      await res.json().catch(() => ({}));
      window.location.href = '/dashboard';
    } catch (e: unknown) {
      let message = e instanceof Error ? e.message : 'Login failed';
      // Safari/iOS reports network/CORS issues as "TypeError: Load failed" or similar
      if (typeof message === 'string' && /load failed|failed to fetch|networkerror/i.test(message)) {
        message = 'Network error contacting API. Ensure API URL is HTTPS and CORS allows this domain.';
      }
      setError(message);
    } finally {
      setPwdBusy(false);
    }
  };
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-100 via-white to-slate-200 py-8 px-4">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row ring-1 ring-black/5">
        {/* Left: Form */}
        <div className="w-full md:w-1/2 p-8 sm:p-10 flex flex-col justify-center">
          {/* Mobile branding (hidden on md and up) */}
          <div className="md:hidden mb-6 -mt-4">
            <div className="flex items-center gap-3 mb-3">
              <img src="/logo.png" alt="Lakshmi Travels" className="h-12 w-12 rounded-xl bg-white shadow ring-1 ring-black/10 p-1" />
              <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-emerald-600 bg-clip-text text-transparent">Lakshmi Travels</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Manage tickets, payments and fuel usage seamlessly.
            </p>
          </div>
          <div className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-emerald-600 bg-clip-text text-transparent tracking-tight">Welcome back</h1>
            <p className="mt-2 text-sm text-gray-600">Sign in to continue managing <span className="font-medium text-gray-800">Lakshmi Travels</span>.</p>
          </div>
          <form onSubmit={passwordLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  className="w-full border border-gray-300 rounded-lg pl-3 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm tracking-wide"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
                  tabIndex={0}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 select-none">
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                <span className="text-gray-700">Remember me</span>
              </label>
            </div>
            <button
              type="submit"
              disabled={pwdBusy}
              className="w-full relative inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-emerald-600 text-white font-medium shadow hover:from-indigo-500 hover:to-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogIn className="w-4 h-4" /> {pwdBusy ? 'Signing in…' : 'Login'}
            </button>
          </form>
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          <p className="mt-10 text-xs text-gray-400">© {new Date().getFullYear()} Lakshmi Travels. All rights reserved.</p>
        </div>
        {/* Right: Brand Panel */}
        <div className="hidden md:block md:w-1/2 relative bg-gradient-to-br from-indigo-600 via-blue-600 to-emerald-500">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_20%,white,transparent_60%)]" />
          <div className="absolute inset-0 mix-blend-overlay bg-[linear-gradient(120deg,rgba(255,255,255,0.15),rgba(255,255,255,0))]" />
          <div className="h-full w-full flex flex-col items-center justify-center text-center px-10">
            <div className="flex items-center gap-3 mb-6">
              <img src="/logo.png" alt="Lakshmi Travels" className="h-14 w-14 rounded-xl bg-white/90 p-1.5 shadow-lg ring-2 ring-white/40" />
              <span className="text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">Lakshmi Travels</span>
            </div>
            <p className="text-white/90 text-sm max-w-sm leading-relaxed font-medium">
              Reliable ticketing, fuel tracking and payment insights—all in one modern dashboard.
            </p>
            <div className="mt-10 grid grid-cols-2 gap-4 w-full max-w-sm text-left text-white/80 text-xs">
              <div className="p-3 rounded-lg bg-white/10 backdrop-blur-md ring-1 ring-white/20">
                <p className="font-semibold text-white text-sm mb-1">Secure Access</p>
                <p>Protected accounts with role-based controls.</p>
              </div>
              <div className="p-3 rounded-lg bg-white/10 backdrop-blur-md ring-1 ring-white/20">
                <p className="font-semibold text-white text-sm mb-1">Analytics</p>
                <p>Track revenue, fuel usage & settlements.</p>
              </div>
              <div className="p-3 rounded-lg bg-white/10 backdrop-blur-md ring-1 ring-white/20">
                <p className="font-semibold text-white text-sm mb-1">Automation</p>
                <p>Generate PDFs & streamline due tracking.</p>
              </div>
              <div className="p-3 rounded-lg bg-white/10 backdrop-blur-md ring-1 ring-white/20">
                <p className="font-semibold text-white text-sm mb-1">Performance</p>
                <p>Fast, responsive, mobile-ready UI.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
