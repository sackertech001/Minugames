import React, { useState } from 'react';
import { Lock, User, Trophy, Eye, EyeOff, ShieldAlert, Sun, Moon, Sparkles, LogIn, Award } from 'lucide-react';
import { SystemUser, TournamentConfig } from '../types';

interface LoginPageProps {
  users: SystemUser[];
  onLogin: (user: SystemUser | null) => void;
  tournamentConfig: TournamentConfig;
  theme: string;
  setTheme: (theme: string) => void;
  systemLogo?: string;
  onBackToHome?: () => void;
  systemUsersTableMissing?: boolean;
}

export default function LoginPage({
  users,
  onLogin,
  tournamentConfig,
  theme,
  setTheme,
  systemLogo = '',
  onBackToHome,
  systemUsersTableMissing = false,
}: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Please enter your username.');
      return;
    }
    if (!pin.trim()) {
      setError('Please enter your security PIN.');
      return;
    }

    const foundUser = users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase().trim() && u.pin === pin.trim()
    );

    if (foundUser) {
      onLogin(foundUser);
    } else {
      setError('Access Denied: Invalid username or security PIN.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between text-[#EEF1F5] font-sans transition-colors duration-300 relative overflow-hidden select-none bg-[#010C1E]">
      
      {/* Absolute Radial Gradient Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#1A6DFF]/10 rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#F1C317]/5 rounded-full filter blur-[120px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full border-b border-[#1A2740]/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {systemLogo ? (
            <img
              src={systemLogo || null}
              alt="System Logo"
              className="w-10 h-10 object-contain rounded-xl border border-[#1A2740] p-1 bg-[#121F32]"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 rounded-xl bg-[#F1C317] flex items-center justify-center shadow-[0_0_15px_rgba(241,195,23,0.3)]">
              <div className="w-2.5 h-2.5 rounded-full bg-[#010C1E]"></div>
            </div>
          )}
          <div className="text-left">
            <h1 className="text-sm font-black font-display tracking-widest text-[#F1C317]">CLASS 46</h1>
            <p className="text-[9px] text-[#787E90] font-sans font-black tracking-wider uppercase">SNOOKER CHAMPIONSHIP</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="text-xs font-black uppercase tracking-wider text-[#B2B6C2] hover:text-[#F1C317] transition-all bg-[#121F32] hover:bg-[#1A2740] border border-[#1A2740] px-3.5 py-2.5 rounded-xl cursor-pointer"
            >
              Back to Home
            </button>
          )}

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center justify-center p-2.5 rounded-xl bg-[#121F32] border border-[#1A2740] hover:bg-[#1A2740] text-[#B2B6C2] hover:text-[#F1C317] transition-all cursor-pointer"
            title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Login Card Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-[#121F32] border border-[#1A2740] rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden">
          
          {/* Subtle Accent top glow */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#1A6DFF] to-transparent"></div>

          {/* Logo Badge */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-[#04142B] border-2 border-[#F1C317] flex items-center justify-center mb-6 shadow-inner relative overflow-hidden">
            {systemLogo ? (
              <img
                src={systemLogo || null}
                alt="System Logo"
                className="w-full h-full object-cover p-1"
                referrerPolicy="no-referrer"
              />
            ) : (
              <Trophy className="w-7 h-7 text-[#F1C317] drop-shadow-[0_2px_8px_rgba(241,195,23,0.3)]" />
            )}
          </div>

          <div className="text-center mb-8">
            <h2 className="font-display font-black text-2xl text-white tracking-tight uppercase">
              {tournamentConfig.tournamentName}
            </h2>
            <p className="text-[10px] text-[#F1C317] font-black uppercase tracking-widest mt-2 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> OFFICIAL ADMIN SECURITY GATE
            </p>
            <p className="text-xs text-[#B2B6C2] mt-3 leading-relaxed">
              Enter your assigned credentials and 4-digit security PIN to log into your panel (Admin, Referee, Scorer, Player).
            </p>
          </div>

          {/* Database Sync Alert */}
          {systemUsersTableMissing && (
            <div className="mb-6 bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 text-left">
              <p className="text-[10px] font-black text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" /> Database Table Missing
              </p>
              <p className="text-xs text-amber-200 leading-normal">
                The <code className="bg-black/30 px-1 py-0.5 rounded font-mono text-[11px]">system_users</code> table does not exist in your Supabase live database.
              </p>
              <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                Please copy and run the SQL script in the System Settings (User Management section) or the <code className="bg-black/30 px-1 py-0.5 rounded font-mono text-[10px]">supabase/setup.sql</code> file in your Supabase SQL Editor.
              </p>
            </div>
          )}

          {/* Loading users status */}
          {!systemUsersTableMissing && users.length === 0 && (
            <div className="mb-6 bg-[#1A6DFF]/10 border border-[#1A6DFF]/25 rounded-2xl p-4 text-left">
              <p className="text-[10px] font-black text-[#1A6DFF] uppercase tracking-wider mb-1 flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-[#1A6DFF] inline-block animate-ping" /> Loading live security keys...
              </p>
              <p className="text-xs text-slate-300 leading-normal">
                Connecting to Supabase to retrieve active credentials. Please wait...
              </p>
            </div>
          )}

          {/* Error Message Alert */}
          {error && (
            <div className="mb-6 bg-[#EF4444]/10 border border-[#EF4444]/25 rounded-2xl p-4 flex items-start gap-3 text-[#EF4444] text-xs font-black uppercase tracking-wide">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-[#EF4444]" />
              <p className="leading-relaxed text-left">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5 text-left">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-[#787E90] uppercase tracking-wider">
                Username / Call Sign
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#787E90]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#04142B] border border-[#1A2740] focus:border-[#1A6DFF] rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-[#787E90] outline-none transition-all font-medium"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-[#787E90] uppercase tracking-wider">
                4-Digit Key PIN
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#787E90]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPin ? 'text' : 'password'}
                  maxLength={4}
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-[#04142B] border border-[#1A2740] focus:border-[#1A6DFF] rounded-xl pl-11 pr-12 py-3 text-sm text-white placeholder-[#787E90] tracking-[0.25em] outline-none transition-all font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#787E90] hover:text-[#EEF1F5] transition-colors cursor-pointer"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#1A6DFF] to-[#0C48B8] hover:from-[#4088FF] hover:to-[#1A6DFF] text-white font-black text-xs py-3.5 rounded-xl shadow-lg shadow-[#1A6DFF]/15 transition-all uppercase tracking-widest flex items-center justify-center gap-2 mt-4 cursor-pointer hover:scale-[1.01]"
            >
              <LogIn className="w-4 h-4" /> Secure Auth Sign In
            </button>
          </form>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="relative z-10 py-6 text-center text-[10px] text-[#787E90] tracking-wider bg-[#04142B]/40 border-t border-[#1A2740]/40 font-sans uppercase">
        <p>© 2026 CLASS 46 CHAMPIONSHIP ADMINISTRATION • ESL ENTERPRISE POWERED</p>
      </footer>
    </div>
  );
}
