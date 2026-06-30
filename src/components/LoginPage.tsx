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
}

export default function LoginPage({
  users,
  onLogin,
  tournamentConfig,
  theme,
  setTheme,
  systemLogo = '',
}: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [showAccountsInfo, setShowAccountsInfo] = useState(false);

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
    <div className="min-h-screen flex flex-col justify-between text-slate-100 font-sans transition-colors duration-300 relative overflow-hidden select-none">
      
      {/* Background handles the theme via index.css */}

      {/* Floating Theme Switcher & System Title */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full border-b border-white/5 bg-slate-950/20 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {systemLogo ? (
            <img
              src={systemLogo || undefined}
              alt="System Logo"
              className="w-10 h-10 object-contain rounded border border-white/10 p-0.5 bg-slate-900"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.4)]">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-900"></div>
            </div>
          )}
          <div>
            <h1 className="text-sm font-bold font-serif tracking-widest text-[#D4AF37]">CLASS 46</h1>
            <p className="text-[9px] text-slate-400 font-mono tracking-wider">CLASS 46 SNOOKER CHAMPIONSHIP</p>
          </div>
        </div>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex items-center justify-center p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-[#D4AF37] transition-all cursor-pointer"
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      {/* Main Login Card Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md stadium-panel rounded-3xl p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-md relative overflow-hidden group">
          
          {/* Subtle Golden border top glow */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"></div>

          {/* Logo Badge */}
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-slate-900 to-slate-800 dark:from-[#1E222A] dark:to-[#12151A] border-2 border-[#D4AF37] flex items-center justify-center mb-6 shadow-inner relative overflow-hidden">
            {systemLogo ? (
              <img
                src={systemLogo || undefined}
                alt="System Logo"
                className="w-full h-full object-cover p-1"
                referrerPolicy="no-referrer"
              />
            ) : (
              <Trophy className="w-7 h-7 text-[#D4AF37] drop-shadow-[0_2px_8px_rgba(212,175,55,0.3)] animate-pulse-subtle" />
            )}
          </div>

          <div className="text-center mb-8">
            <h2 className="font-serif font-bold text-2xl text-white tracking-wide uppercase">
              {tournamentConfig.tournamentName}
            </h2>
            <p className="text-xs text-[#D4AF37] font-bold font-mono uppercase tracking-widest mt-1.5 flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-[#D4AF37]" /> OFFICIAL ADMIN PORTAL
            </p>
            <p className="text-[11px] text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
              Enter your assigned username and 4-digit security PIN to log into your roles (Admin, Referee, Scorer, Player).
            </p>
          </div>

          {/* Error Message Alert */}
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-2xl p-3.5 flex items-start gap-3 text-red-400 text-xs font-semibold animate-in fade-in duration-200">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 dark:text-[#9CA3AF] uppercase tracking-wider mb-2">
                Username / Registered Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. admin or player name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-900/50 dark:bg-[#090B0E]/50 border border-slate-700 dark:border-[#2A2E37] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 dark:text-[#9CA3AF] uppercase tracking-wider mb-2">
                4-Digit Security PIN
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPin ? 'text' : 'password'}
                  maxLength={4}
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-900/50 dark:bg-[#090B0E]/50 border border-slate-700 dark:border-[#2A2E37] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] rounded-2xl pl-11 pr-12 py-3 text-sm text-white placeholder-slate-500 tracking-[0.2em] outline-none transition-all font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-white transition-colors cursor-pointer"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#D4AF37] to-[#BFA032] hover:from-[#E5C158] hover:to-[#D4AF37] text-slate-950 font-bold text-xs py-3.5 rounded-2xl shadow-[0_4px_20px_rgba(212,175,55,0.25)] hover:shadow-[0_4px_25px_rgba(212,175,55,0.4)] transition-all uppercase tracking-widest flex items-center justify-center gap-2 mt-2 cursor-pointer border border-[#D4AF37]"
            >
              <LogIn className="w-4 h-4" /> Sign In securely
            </button>
          </form>
        </div>
      </main>

      {/* Elegant minimalist footer */}
      <footer className="relative z-10 py-6 text-center text-[10px] text-slate-500 tracking-wide bg-slate-950/20 border-t border-white/5 font-sans">
        <p>© 2026 CLASS 46 SNOOKER CHAMPIONSHIP Administration • Premium Tournament System</p>
      </footer>
    </div>
  );
}
