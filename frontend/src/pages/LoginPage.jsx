import React, { useState } from 'react';
import { Lock, User, Sparkles, MapPin, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage = () => {
  const { login, loading } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('RaisAdmin@2026');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await login(username, password);
    if (!res.success) {
      setError(res.error);
    }
  };

  const setDemoUser = (u, p) => {
    setUsername(u);
    setPassword(p);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-amber-500 selection:text-slate-950">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-2xl text-slate-950 mx-auto shadow-xl shadow-amber-500/20">
            R
          </div>
          <h1 className="text-2xl font-black tracking-wider text-white">RAIS AGENCIES</h1>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-500">
            Business Management & Billing Platform
          </p>
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
            <MapPin className="w-3 h-3 text-amber-500" />
            Near Reddies Colony, Rayachoty - 516269
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-semibold text-center">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 mt-2"
          >
            {loading ? 'Authenticating...' : 'Sign In to Workspace'}
          </button>
        </form>

        {/* One-Click Role Accounts */}
        <div className="pt-4 border-t border-slate-800">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 text-center mb-2.5">
            Quick Select User Account:
          </p>
          <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
            <button
              onClick={() => setDemoUser('admin', 'RaisAdmin@2026')}
              className={`p-2 rounded-lg border font-bold uppercase transition-all ${
                username === 'admin'
                  ? 'bg-amber-500/10 border-amber-500/50 text-amber-400'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              Administrator
            </button>
            <button
              onClick={() => setDemoUser('operator', 'RaisOperator@2026')}
              className={`p-2 rounded-lg border font-bold uppercase transition-all ${
                username === 'operator'
                  ? 'bg-amber-500/10 border-amber-500/50 text-amber-400'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              Operator
            </button>
            <button
              onClick={() => setDemoUser('viewer', 'RaisViewer@2026')}
              className={`p-2 rounded-lg border font-bold uppercase transition-all ${
                username === 'viewer'
                  ? 'bg-amber-500/10 border-amber-500/50 text-amber-400'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              Viewer
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
