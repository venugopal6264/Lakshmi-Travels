import { LogIn } from 'lucide-react';
import { useState } from 'react';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pwdBusy, setPwdBusy] = useState(false);

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
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data: unknown = await res.json().catch(() => ({}));
        const msg = (data && typeof data === 'object' && 'message' in data) ? (data as { message?: string }).message : undefined;
        throw new Error(msg || `Login failed (${res.status})`);
      }
      const data: { bounce?: string } = await res.json().catch(() => ({}));
      // On iOS Chrome/Edge (WebKit-based), cookies set via fetch may not persist; bounce via top-level navigation
      const ua = navigator.userAgent;
      const isiOS = /iPad|iPhone|iPod/.test(ua);
      const isWebKit = /WebKit/i.test(ua);
      const isSafari = /Safari/i.test(ua) && !/CriOS|EdgiOS/i.test(ua);
      const isNonSafari = isiOS && isWebKit && !isSafari; // e.g., CriOS (Chrome on iOS) or EdgiOS (Edge on iOS)
      if (isNonSafari && data?.bounce) {
        window.location.href = data.bounce as string;
        return;
      }
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
    <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8 mt-10 text-center">
      <h2 className="text-2xl font-semibold mb-2">Sign in to Lakshmi Travels</h2>
      <p className="text-gray-600 mb-6">Use your account to continue.</p>
      <form onSubmit={passwordLogin} className="space-y-3 mb-6">
        <div className="text-left">
          <label className="block text-sm text-gray-700 mb-1">Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full border rounded-md px-3 py-2" autoComplete="username" required />
        </div>
        <div className="text-left">
          <label className="block text-sm text-gray-700 mb-1">Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="w-full border rounded-md px-3 py-2" autoComplete="current-password" required />
        </div>
        <button type="submit" disabled={pwdBusy} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
          <LogIn className="w-4 h-4" /> {pwdBusy ? 'Signing in…' : 'Login'}
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
