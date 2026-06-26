import React, { useState } from 'react';
import { TournamentConfig, SystemUser, RolePermission, Player } from '../types';
import { Settings, Shield, Key, UserPlus, Trash2, Award, Info, Lock, Unlock, Eye, EyeOff, Check, AlertCircle, Plus, Link, Copy, ExternalLink, Upload } from 'lucide-react';
import { generateGroups } from '../utils/groupGenerator';

interface SettingsTabProps {
  config: TournamentConfig;
  onUpdateConfig: (newConfig: TournamentConfig) => void;
  users: SystemUser[];
  players: Player[];
  onUpdateUsers: (newUsers: SystemUser[]) => void;
  currentUser: SystemUser | null;
  onLogin: (user: SystemUser | null) => void;
  isTournamentStarted: boolean;
  rolePermissions: RolePermission[];
  onUpdateRolePermissions: (newPermissions: RolePermission[]) => void;
  publicRegistrationEnabled?: boolean;
  onPublicRegistrationEnabledChange?: (enabled: boolean) => void;
  systemLogo?: string;
  onUpdateSystemLogo?: (newLogo: string) => void;
}

export default function SettingsTab({
  config,
  onUpdateConfig,
  users,
  players,
  onUpdateUsers,
  currentUser,
  onLogin,
  isTournamentStarted,
  rolePermissions,
  onUpdateRolePermissions,
  publicRegistrationEnabled = true,
  onPublicRegistrationEnabledChange,
  systemLogo = '',
  onUpdateSystemLogo,
}: SettingsTabProps) {
  // Logo upload states
  const [logoUrl, setLogoUrl] = useState(systemLogo);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setLogoUrl(systemLogo);
  }, [systemLogo]);

  const handleLogoFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showTemporarySuccess('Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showTemporarySuccess('Logo file size exceeds the 2MB limit.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const resultStr = e.target.result as string;
        setLogoUrl(resultStr);
        onUpdateSystemLogo?.(resultStr);
        showTemporarySuccess('System logo updated successfully.');
      }
    };
    reader.readAsDataURL(file);
  };
  // Login input states
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState('');

  // Add User input states
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState<string>('Scorer');
  const [newPin, setNewPin] = useState('');
  const [userError, setUserError] = useState('');

  // Custom role states
  const [customRoleName, setCustomRoleName] = useState('');
  const [roleError, setRoleError] = useState('');

  // Edit Tournament info states
  const [tourneyName, setTourneyName] = useState(config.tournamentName);
  const [tourneyVenue, setTourneyVenue] = useState(config.venue);
  const [tourneyStartDate, setTourneyStartDate] = useState(config.dateRange.split(' to ')[0] || '');
  const [tourneyEndDate, setTourneyEndDate] = useState(config.dateRange.split(' to ')[1] || '');
  const [tourneyFormat, setTourneyFormat] = useState(config.format);
  const [formatType, setFormatType] = useState<'knockout' | 'group'>(config.formatType || 'knockout');
  const [tourneyDuration, setTourneyDuration] = useState(config.durationDays);
  const [prize1, setPrize1] = useState(config.prizes.first);
  const [prize2, setPrize2] = useState(config.prizes.second);
  const [prize3, setPrize3] = useState(config.prizes.third);
  const [prizeBreak, setPrizeBreak] = useState(config.prizes.highestBreak || '');

  // Dynamic configuration states
  const [playersCount, setPlayersCount] = useState(config.playersCount);
  const [setsToPlay, setSetsToPlay] = useState(config.setsToPlay);
  const [numberOfGroups, setNumberOfGroups] = useState(config.numberOfGroups || 2);
  const [teamsPerGroup, setTeamsPerGroup] = useState(config.teamsPerGroup || 4);
  const [matchesPerTeamInGroup, setMatchesPerTeamInGroup] = useState(config.matchesPerTeamInGroup || 3);
  const [winPoints, setWinPoints] = useState(config.winPoints || 3);
  const [drawPoints, setDrawPoints] = useState(config.drawPoints || 1);
  const [lossPoints, setLossPoints] = useState(config.lossPoints || 0);

  React.useEffect(() => {
    if (formatType === 'group') {
      setPlayersCount(numberOfGroups * teamsPerGroup);
    }
  }, [numberOfGroups, teamsPerGroup, formatType]);

  const [successMsg, setSuccessMsg] = useState('');
  const [showPins, setShowPins] = useState<Record<string, boolean>>({});

  // Public registration link states
  const [copiedLink, setCopiedLink] = useState(false);
  const [publicRegEnabled, setPublicRegEnabled] = useState(publicRegistrationEnabled);

  React.useEffect(() => {
    setPublicRegEnabled(publicRegistrationEnabled);
  }, [publicRegistrationEnabled]);


  const hasPermission = (action: string) => {
    if (!currentUser) return false;
    const userPerm = rolePermissions.find(rp => rp.role === currentUser.role);
    return userPerm?.allowedActions.includes(action) || false;
  };

  const isConfigEditable = hasPermission('editSettings');
  const isUserMgmtAllowed = hasPermission('userManagement');

  const handleUserLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const found = users.find(
      (u) => u.username.toLowerCase() === loginUsername.toLowerCase().trim() && u.pin === loginPin.trim()
    );

    if (found) {
      onLogin(found);
      setLoginUsername('');
      setLoginPin('');
    } else {
      setLoginError('Invalid username or 4-digit PIN code.');
    }
  };

  const handleLogout = () => {
    onLogin(null);
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');

    if (!newUsername.trim()) {
      setUserError('Username is required.');
      return;
    }
    if (newPin.trim().length !== 4 || isNaN(Number(newPin))) {
      setUserError('PIN must be exactly 4 digits.');
      return;
    }

    const exists = users.some((u) => u.username.toLowerCase() === newUsername.toLowerCase().trim());
    if (exists) {
      setUserError('Username already exists in system.');
      return;
    }

    const newUser: SystemUser = {
      id: `u-${Date.now()}`,
      username: newUsername.trim(),
      role: newRole,
      pin: newPin.trim(),
    };

    onUpdateUsers([...users, newUser]);
    setNewUsername('');
    setNewPin('');
    showTemporarySuccess('New user added successfully.');
  };

  const handleDeleteUser = (userId: string) => {
    const userToDelete = users.find((u) => u.id === userId);
    if (userToDelete?.username === 'admin') {
      setUserError('Cannot delete the master admin account.');
      return;
    }
    if (currentUser?.id === userId) {
      setUserError('Cannot delete your own logged-in account.');
      return;
    }

    onUpdateUsers(users.filter((u) => u.id !== userId));
    showTemporarySuccess('User deleted.');
  };

  const handleGeneratePin = (userId: string) => {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    const updated = users.map((u) => {
      if (u.id === userId) {
        return { ...u, pin: randomPin };
      }
      return u;
    });
    onUpdateUsers(updated);
    
    // Auto show the pin for confirmation
    setShowPins(prev => ({ ...prev, [userId]: true }));
    showTemporarySuccess('Generated new 4-digit PIN.');
  };

  const handleGenerateGroups = () => {
    const groups = generateGroups(players, numberOfGroups);
    onUpdateConfig({ ...config, groups, numberOfGroups, teamsPerGroup });
    showTemporarySuccess('Groups generated successfully.');
  };
  
  const handleSaveTournamentSettings = (e: React.FormEvent) => {
    e.preventDefault();
    
    const start = new Date(tourneyStartDate);
    const end = new Date(tourneyEndDate);
    const duration = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const formatTypeVal = formatType;

    const updated: TournamentConfig = {
      ...config,
      tournamentName: tourneyName,
      venue: tourneyVenue,
      dateRange: `${tourneyStartDate} to ${tourneyEndDate}`,
      format: tourneyFormat,
      durationDays: duration,
      formatType: formatTypeVal,
      numberOfGroups: Number(numberOfGroups),
      teamsPerGroup: Number(teamsPerGroup),
      matchesPerTeamInGroup: Number(matchesPerTeamInGroup),
      winPoints: Number(winPoints),
      drawPoints: Number(drawPoints),
      lossPoints: Number(lossPoints),
      playersCount: Number(playersCount),
      setsToPlay: Number(setsToPlay),
      prizes: {
        first: prize1,
        second: prize2,
        third: prize3,
        highestBreak: prizeBreak,
      }
    };

    onUpdateConfig(updated);
    showTemporarySuccess('Tournament settings and prizes updated successfully.');
  };

  const handleToggleTabPermission = (roleName: string, tabId: string) => {
    const updated = rolePermissions.map((rp) => {
      if (rp.role === roleName) {
        const allowedTabs = rp.allowedTabs.includes(tabId)
          ? rp.allowedTabs.filter((t) => t !== tabId)
          : [...rp.allowedTabs, tabId];
        return { ...rp, allowedTabs };
      }
      return rp;
    });
    onUpdateRolePermissions(updated);
    showTemporarySuccess(`Toggled "${tabId}" screen access for role: ${roleName}`);
  };

  const handleToggleActionPermission = (roleName: string, actionId: string) => {
    const updated = rolePermissions.map((rp) => {
      if (rp.role === roleName) {
        const allowedActions = rp.allowedActions.includes(actionId)
          ? rp.allowedActions.filter((a) => a !== actionId)
          : [...rp.allowedActions, actionId];
        return { ...rp, allowedActions };
      }
      return rp;
    });
    onUpdateRolePermissions(updated);
    showTemporarySuccess(`Toggled "${actionId}" permission for role: ${roleName}`);
  };

  const handleAddCustomRole = (e: React.FormEvent) => {
    e.preventDefault();
    setRoleError('');

    const trimmed = customRoleName.trim();
    if (!trimmed) {
      setRoleError('Role name is required.');
      return;
    }

    const exists = rolePermissions.some((rp) => rp.role.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setRoleError('This role already exists.');
      return;
    }

    const newRoleObj: RolePermission = {
      role: trimmed,
      allowedTabs: ['dashboard', 'info', 'bracket', 'display'],
      allowedActions: []
    };

    onUpdateRolePermissions([...rolePermissions, newRoleObj]);
    setCustomRoleName('');
    showTemporarySuccess(`Custom role "${trimmed}" created successfully.`);
  };

  const handleDeleteRole = (roleName: string) => {
    const standardRoles = ['Admin', 'Owner', 'Referee', 'Scorer', 'Player'];
    if (standardRoles.includes(roleName)) {
      setRoleError(`Cannot delete the system default role "${roleName}".`);
      return;
    }
    onUpdateRolePermissions(rolePermissions.filter((rp) => rp.role !== roleName));
    showTemporarySuccess(`Deleted custom role "${roleName}".`);
  };


  const showTemporarySuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const togglePinVisibility = (userId: string) => {
    setShowPins(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  return (
    <div className="space-y-8">
      {/* Dynamic Success Toast */}
      {successMsg && (
        <div className="bg-emerald-500 text-white p-3.5 rounded-xl font-bold text-xs shadow-lg flex items-center gap-2 max-w-sm ml-auto border border-emerald-600 animate-in fade-in slide-in-from-top-4 duration-300">
          ✓ {successMsg}
        </div>
      )}

      {/* 1. SESSION MANAGEMENT ROW */}
      <div className="bg-white dark:bg-[#1A1D23] border border-slate-200 dark:border-[#2A2E37] rounded-2xl p-6 shadow-xl transition-colors duration-300">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="font-serif font-bold text-slate-800 dark:text-[#E0E2E6] text-sm uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#D4AF37]" /> Access Management & Sessions
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#9CA3AF]">
              Control dashboard permissions. Referees, scorers, and admins must sign in using their PINs to edit tournament events.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3.5 bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-[#2A2E37] px-4.5 py-2.5 rounded-xl">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <div className="text-xs">
                  <p className="font-bold text-slate-800 dark:text-[#E0E2E6]">Logged in: {currentUser.username}</p>
                  <p className="text-[10px] text-slate-500 dark:text-[#9CA3AF] capitalize font-medium">Role: {currentUser.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/15 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl uppercase tracking-wide">
                  Guest Browsing Mode
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Login form if not logged in */}
        {!currentUser && (
          <div className="mt-6 border-t border-slate-100 dark:border-[#2A2E37]/50 pt-5">
            <form onSubmit={handleUserLogin} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end max-w-2xl">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-[#6B7280] uppercase tracking-wider mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  placeholder="e.g. admin"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-[#2A2E37] focus:border-[#D4AF37] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-[#E0E2E6] placeholder-slate-400 dark:placeholder-slate-700 outline-none w-full transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-[#6B7280] uppercase tracking-wider mb-1.5">
                  4-Digit PIN Code
                </label>
                <input
                  type="password"
                  placeholder="••••"
                  maxLength={4}
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value)}
                  className="bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-[#2A2E37] focus:border-[#D4AF37] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-[#E0E2E6] placeholder-slate-400 dark:placeholder-slate-700 outline-none w-full tracking-widest font-mono transition-colors"
                />
              </div>
              <button
                type="submit"
                className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#0F1115] font-bold text-xs px-5 py-2.5 rounded-xl shadow-md border border-[#BFA032] transition-colors cursor-pointer w-full flex items-center justify-center gap-1.5"
              >
                <Key className="w-4 h-4" /> Authenticate Session
              </button>
            </form>
            {loginError && (
              <p className="text-red-500 font-bold text-[11px] mt-2.5">⚠ {loginError}</p>
            )}
            <p className="text-[10px] text-slate-400 dark:text-[#6B7280] mt-3">
              * Note: Default Admin credentials are Username: <span className="font-semibold text-slate-600 dark:text-slate-300">admin</span> • PIN: <span className="font-semibold text-slate-600 dark:text-slate-300">1234</span>. Sign in to edit configs!
            </p>
          </div>
        )}
      </div>

      {/* PUBLIC PLAYER REGISTRATION LINK CARD */}
      <div className="bg-white dark:bg-[#1A1D23] border border-slate-200 dark:border-[#2A2E37] rounded-2xl p-6 shadow-xl space-y-5 transition-colors duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#2A2E37]/50 pb-4">
          <div className="space-y-1">
            <h3 className="font-serif font-bold text-slate-800 dark:text-[#E0E2E6] text-sm uppercase tracking-wider flex items-center gap-2">
              <Link className="w-5 h-5 text-[#D4AF37]" /> Public Tournament Portal Link
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#9CA3AF]">
              Generate a link to share with public so they can view tournament info, fixtures, and live results.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const newToken = Math.random().toString(36).substring(2, 15);
              onUpdateConfig({ ...config, publicPortalToken: newToken });
              showTemporarySuccess('Portal link regenerated!');
            }}
            className="text-[10px] font-bold text-[#D4AF37] hover:text-[#D4AF37]/80 uppercase tracking-widest cursor-pointer"
          >
            Regenerate Link
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-8 relative">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}${window.location.pathname}?public=true&token=${config.publicPortalToken}`}
                className="w-full bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-[#2A2E37] rounded-xl px-4 py-2.5 text-xs text-slate-600 dark:text-slate-300 font-mono select-all outline-none"
              />
            </div>
            
            <div className="md:col-span-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}${window.location.pathname}?public=true&token=${config.publicPortalToken}`;
                  navigator.clipboard.writeText(url);
                  showTemporarySuccess('Public link copied to clipboard!');
                }}
                className="flex-1 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#0F1115] text-[10px] font-bold py-2.5 px-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-4 h-4" /> Copy
              </button>
              <a
                href={`${window.location.origin}${window.location.pathname}?public=true&token=${config.publicPortalToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-slate-100 hover:bg-slate-200 dark:bg-[#12151A] dark:hover:bg-[#1C1F26] border border-slate-200 dark:border-[#2A2E37] text-slate-700 dark:text-[#E0E2E6] text-xs font-bold p-2.5 rounded-xl transition-all flex items-center justify-center cursor-pointer"
                title="Open public portal"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
      
      {/* EXISTING PLAYER REGISTRATION CARD */}
      <div className="bg-white dark:bg-[#1A1D23] border border-slate-200 dark:border-[#2A2E37] rounded-2xl p-6 shadow-xl space-y-5 transition-colors duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#2A2E37]/50 pb-4">
          <div className="space-y-1">
            <h3 className="font-serif font-bold text-slate-800 dark:text-[#E0E2E6] text-sm uppercase tracking-wider flex items-center gap-2">
              <Link className="w-5 h-5 text-[#D4AF37]" /> Public Player Registration Link
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#9CA3AF]">
              Generate a secure link to share with snooker players so they can submit their applications online.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 dark:text-[#6B7280] uppercase tracking-widest font-mono">STATUS:</span>
            <button
              type="button"
              disabled={!isConfigEditable}
              onClick={() => {
                const nextVal = !publicRegEnabled;
                setPublicRegEnabled(nextVal);
                localStorage.setItem('snooker_public_registration_enabled', String(nextVal));
                onPublicRegistrationEnabledChange?.(nextVal);
                showTemporarySuccess(`Public registration link has been ${nextVal ? 'ENABLED' : 'DISABLED'}.`);
              }}
              className={`px-3 py-1 text-[11px] font-extrabold rounded-full uppercase tracking-wider transition-all border shrink-0 ${
                !isConfigEditable ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
              } ${
                publicRegEnabled
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/15'
                  : 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/15'
              }`}
            >
              {publicRegEnabled ? '● Active' : '○ Inactive'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-8 relative">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}${window.location.pathname}?apply=true&token=${config.registrationToken}`}
                className="w-full bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-[#2A2E37] rounded-xl px-4 py-2.5 text-xs text-slate-600 dark:text-slate-300 font-mono select-all outline-none"
              />
            </div>
            
            <div className="md:col-span-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const newToken = Math.random().toString(36).substring(2, 15);
                  onUpdateConfig({ ...config, registrationToken: newToken });
                  showTemporarySuccess('Registration link regenerated successfully.');
                }}
                className="bg-slate-800 dark:bg-[#2A2E37] hover:bg-slate-700 dark:hover:bg-[#3A3F4A] text-white text-[10px] font-bold py-2.5 px-3 rounded-xl transition-all shadow-md cursor-pointer"
              >
                Regenerate
              </button>
              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}${window.location.pathname}?apply=true&token=${config.registrationToken}`;
                  navigator.clipboard.writeText(url);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                  showTemporarySuccess('Registration link copied to clipboard!');
                }}
                className="flex-1 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#0F1115] text-[10px] font-bold py-2.5 px-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copy
                  </>
                )}
              </button>

              <a
                href={`${window.location.origin}${window.location.pathname}?apply=true&token=${config.registrationToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-slate-100 hover:bg-slate-200 dark:bg-[#12151A] dark:hover:bg-[#1C1F26] border border-slate-200 dark:border-[#2A2E37] text-slate-700 dark:text-[#E0E2E6] text-xs font-bold p-2.5 rounded-xl transition-all flex items-center justify-center cursor-pointer"
                title="Open registration form preview"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-[#0F1115] p-4 rounded-xl border border-slate-150 dark:border-[#2A2E37]/50 text-xs text-slate-500 dark:text-[#9CA3AF] leading-relaxed space-y-2">
            <p className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-[#D4AF37]" /> Instructions for Organizers:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[11px]">
              <li>Copy and share the link above to WhatsApp groups, club flyers, or social media pages.</li>
              <li>Players fill in their <span className="font-semibold text-slate-600 dark:text-slate-300">Full Name, Nickname, Photo, represent Club, and Phone/WhatsApp numbers</span>.</li>
              <li>Go to the <span className="font-semibold text-[#D4AF37] hover:underline">Player Registration</span> tab, click <span className="font-semibold text-slate-600 dark:text-slate-300">Applications Register</span> to view submissions.</li>
              <li>Organizers can review applicants and assign them a specific available Seed Slot to sync them into the knockout bracket tree.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* SYSTEM BRANDING & LOGO SETTINGS */}
      <div className="bg-white dark:bg-[#1A1D23] border border-slate-200 dark:border-[#2A2E37] rounded-2xl p-6 shadow-xl space-y-5 transition-colors duration-300">
        <div className="border-b border-slate-100 dark:border-[#2A2E37]/50 pb-4">
          <h3 className="font-serif font-bold text-slate-800 dark:text-[#E0E2E6] text-sm uppercase tracking-wider flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#D4AF37]" /> System Branding & Logo Settings
          </h3>
          <p className="text-xs text-slate-500 dark:text-[#9CA3AF] mt-0.5">
            Upload your organization's logo or custom championship banner. This will represent the official brand identity in the Public Player Application Portal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Logo Preview */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-[#2A2E37] rounded-2xl h-40">
            {logoUrl ? (
              <div className="relative group w-full h-full flex items-center justify-center">
                <img
                  src={logoUrl}
                  alt="System Logo Preview"
                  className="max-h-28 max-w-full object-contain rounded shadow-md border border-slate-300 dark:border-slate-800 p-1 bg-white dark:bg-[#12151A]"
                  referrerPolicy="no-referrer"
                />
                {isConfigEditable && (
                  <button
                    type="button"
                    onClick={() => {
                      setLogoUrl('');
                      onUpdateSystemLogo?.('');
                      showTemporarySuccess('System logo removed.');
                    }}
                    className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full shadow-lg transition-colors cursor-pointer"
                    title="Remove custom logo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center space-y-1.5 text-slate-400">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-850 flex items-center justify-center mx-auto">
                  <Award className="w-6 h-6 text-slate-400 dark:text-slate-600" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-600">Default Logo</p>
                <p className="text-[9px] text-slate-500">Championship Trophy</p>
              </div>
            )}
          </div>

          {/* Logo Upload Dropzone */}
          <div className="md:col-span-2">
            {isConfigEditable ? (
              <div className="space-y-3">
                <label className="block text-[10px] font-bold text-slate-400 dark:text-[#6B7280] uppercase tracking-wider">
                  Upload Logo File
                </label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
                  onDragLeave={() => setIsDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragActive(false);
                    const file = e.dataTransfer.files[0];
                    if (file) handleLogoFile(file);
                  }}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-2 ${
                    isDragActive
                      ? 'border-[#D4AF37] bg-[#D4AF37]/5'
                      : 'border-slate-200 dark:border-[#2A2E37] hover:border-[#D4AF37]/50 hover:bg-slate-50/50 dark:hover:bg-[#12151A]/20'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoFile(file);
                    }}
                  />
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[#D4AF37]">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Click to upload or drag & drop logo
                    </p>
                    <p className="text-[9px] text-slate-400 dark:text-slate-600 mt-1">
                      PNG, JPEG, SVG or WEBP • Max size 2MB
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-[#0F1115]/30 border border-slate-200 dark:border-[#2A2E37] p-4 rounded-xl flex items-start gap-3">
                <Lock className="w-5 h-5 text-slate-400 shrink-0" />
                <div className="text-xs">
                  <p className="font-semibold text-slate-700 dark:text-[#E0E2E6]">Upload Disabled</p>
                  <p className="text-slate-400 dark:text-[#6B7280] mt-0.5">
                    Your currently logged-in account does not have permission to modify system branding or logos.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 2. TOURNAMENT DETAILS & PRIZES CONFIGURATION */}
        <div className="bg-white dark:bg-[#1A1D23] border border-slate-200 dark:border-[#2A2E37] rounded-2xl p-6 shadow-xl space-y-6 transition-colors duration-300">
          <div className="border-b border-slate-200 dark:border-[#2A2E37] pb-4">
            <h4 className="font-serif font-bold text-slate-800 dark:text-[#E0E2E6] text-sm uppercase tracking-wider flex items-center gap-2">
              <Award className="w-5 h-5 text-[#D4AF37]" /> Edit Tournament & Prizes
            </h4>
            <p className="text-xs text-slate-500 dark:text-[#9CA3AF] mt-0.5">
              Customize dates, venue, match sizing, and standard podium prize amounts.
            </p>
          </div>

          {isConfigEditable ? (
            <form onSubmit={handleSaveTournamentSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-[#6B7280] uppercase tracking-wider mb-1">
                    Tournament Name
                  </label>
                  <input
                    type="text"
                    value={tourneyName}
                    onChange={(e) => setTourneyName(e.target.value)}
                    className="bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-[#2A2E37] focus:border-[#D4AF37] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-[#E0E2E6] outline-none w-full transition-colors font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-[#6B7280] uppercase tracking-wider mb-1">
                    Arena Venue Location
                  </label>
                  <input
                    type="text"
                    value={tourneyVenue}
                    onChange={(e) => setTourneyVenue(e.target.value)}
                    className="bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-[#2A2E37] focus:border-[#D4AF37] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-[#E0E2E6] outline-none w-full transition-colors font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-[#6B7280] uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={tourneyStartDate}
                    onChange={(e) => setTourneyStartDate(e.target.value)}
                    className="bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-[#2A2E37] focus:border-[#D4AF37] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-[#E0E2E6] outline-none w-full transition-colors [&::-webkit-calendar-picker-indicator]:invert-0 dark:[&::-webkit-calendar-picker-indicator]:invert"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-[#6B7280] uppercase tracking-wider mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={tourneyEndDate}
                    onChange={(e) => setTourneyEndDate(e.target.value)}
                    className="bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-[#2A2E37] focus:border-[#D4AF37] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-[#E0E2E6] outline-none w-full transition-colors [&::-webkit-calendar-picker-indicator]:invert-0 dark:[&::-webkit-calendar-picker-indicator]:invert"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-[10px] font-bold text-slate-400 dark:text-[#6B7280] uppercase tracking-wider mb-1">
                  Calculated Duration (Days)
                </label>
                <input
                  type="text"
                  readOnly
                  value={Math.max(1, Math.ceil((new Date(tourneyEndDate).getTime() - new Date(tourneyStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1) || 1}
                  className="bg-slate-100 dark:bg-[#0F1115] border border-slate-200 dark:border-[#2A2E37] rounded-xl px-3 py-2 text-xs text-slate-500 dark:text-[#9CA3AF] w-full"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-[#6B7280] uppercase tracking-wider mb-1">
                  Tournament Format Type
                </label>
                <select
                  value={formatType}
                  onChange={(e) => setFormatType(e.target.value as 'knockout' | 'group')}
                  className="bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-[#2A2E37] focus:border-[#D4AF37] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-[#E0E2E6] outline-none w-full transition-colors cursor-pointer"
                >
                  <option value="knockout">Knockout</option>
                  <option value="group">Group Stage</option>
                </select>
                {formatType === 'group' && (
                  <button
                    type="button"
                    onClick={handleGenerateGroups}
                    className="mt-2 w-full bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 text-[10px] font-bold py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    Generate Groups
                  </button>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-[#6B7280] uppercase tracking-wider mb-1">
                  Tournament Format
                </label>
                <input
                  type="text"
                  value={tourneyFormat}
                  onChange={(e) => setTourneyFormat(e.target.value)}
                  className="bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-[#2A2E37] focus:border-[#D4AF37] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-[#E0E2E6] outline-none w-full transition-colors font-semibold"
                />
              </div>

              {/* Tournament structure configs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-[#0F1115] p-3 rounded-xl border border-slate-200/50 dark:border-[#2A2E37]/50">
                {formatType === 'knockout' && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-[#6B7280] uppercase tracking-wider mb-1">
                      Bracket Size (Players)
                    </label>
                    <select
                      value={playersCount}
                      disabled={isTournamentStarted}
                      onChange={(e) => setPlayersCount(Number(e.target.value))}
                      className="bg-white dark:bg-[#1A1D23] border border-slate-200 dark:border-[#2A2E37] focus:border-[#D4AF37] rounded-xl px-2 py-2 text-xs text-slate-800 dark:text-[#E0E2E6] outline-none w-full cursor-pointer transition-colors"
                    >
                      <option value={8}>8 Players (Quarter Finals Start)</option>
                      <option value={16}>16 Players (Round of 16 Start)</option>
                      <option value={32}>32 Players (Round of 32 Start)</option>
                    </select>
                    {isTournamentStarted && (
                      <span className="text-[9px] text-amber-500 font-bold block mt-1">
                        🔒 Locked: Tournament has started
                      </span>
                    )}
                  </div>
                )}
                {formatType === 'group' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-[#6B7280] uppercase tracking-wider mb-1">
                        Number of Groups
                      </label>
                      <input
                        type="number"
                        value={numberOfGroups}
                        onChange={(e) => setNumberOfGroups(Number(e.target.value))}
                        className="bg-white dark:bg-[#1A1D23] border border-slate-200 dark:border-[#2A2E37] focus:border-[#D4AF37] rounded-xl px-2 py-2 text-xs text-slate-800 dark:text-[#E0E2E6] outline-none w-full transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-[#6B7280] uppercase tracking-wider mb-1">
                        Teams per Group
                      </label>
                      <input
                        type="number"
                        value={teamsPerGroup}
                        onChange={(e) => setTeamsPerGroup(Number(e.target.value))}
                        className="bg-white dark:bg-[#1A1D23] border border-slate-200 dark:border-[#2A2E37] focus:border-[#D4AF37] rounded-xl px-2 py-2 text-xs text-slate-800 dark:text-[#E0E2E6] outline-none w-full transition-colors"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2 col-span-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-[#6B7280] uppercase tracking-wider mb-1">Win Pts</label>
                        <input type="number" value={winPoints} onChange={(e) => setWinPoints(Number(e.target.value))} className="bg-white dark:bg-[#1A1D23] border border-slate-200 dark:border-[#2A2E37] focus:border-[#D4AF37] rounded-xl px-2 py-2 text-xs text-slate-800 dark:text-[#E0E2E6] outline-none w-full transition-colors" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-[#6B7280] uppercase tracking-wider mb-1">Draw Pts</label>
                        <input type="number" value={drawPoints} onChange={(e) => setDrawPoints(Number(e.target.value))} className="bg-white dark:bg-[#1A1D23] border border-slate-200 dark:border-[#2A2E37] focus:border-[#D4AF37] rounded-xl px-2 py-2 text-xs text-slate-800 dark:text-[#E0E2E6] outline-none w-full transition-colors" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-[#6B7280] uppercase tracking-wider mb-1">Loss Pts</label>
                        <input type="number" value={lossPoints} onChange={(e) => setLossPoints(Number(e.target.value))} className="bg-white dark:bg-[#1A1D23] border border-slate-200 dark:border-[#2A2E37] focus:border-[#D4AF37] rounded-xl px-2 py-2 text-xs text-slate-800 dark:text-[#E0E2E6] outline-none w-full transition-colors" />
                      </div>
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-[#6B7280] uppercase tracking-wider mb-1">
                    {formatType === 'group' ? 'Matches per Team in Group' : 'Sets to play per Match'}
                  </label>
                  {formatType === 'group' ? (
                    <input
                      type="number"
                      value={matchesPerTeamInGroup}
                      onChange={(e) => setMatchesPerTeamInGroup(Number(e.target.value))}
                      className="bg-white dark:bg-[#1A1D23] border border-slate-200 dark:border-[#2A2E37] focus:border-[#D4AF37] rounded-xl px-2 py-2 text-xs text-slate-800 dark:text-[#E0E2E6] outline-none w-full transition-colors"
                    />
                  ) : (
                    <select
                      value={setsToPlay}
                      onChange={(e) => setSetsToPlay(Number(e.target.value))}
                      className="bg-white dark:bg-[#1A1D23] border border-slate-200 dark:border-[#2A2E37] focus:border-[#D4AF37] rounded-xl px-2 py-2 text-xs text-slate-800 dark:text-[#E0E2E6] outline-none w-full cursor-pointer transition-colors"
                    >
                      <option value={3}>Best of 3 Sets</option>
                      <option value={5}>Best of 5 Sets</option>
                      <option value={7}>Best of 7 Sets</option>
                      <option value={9}>Best of 9 Sets</option>
                      <option value={11}>Best of 11 Sets</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Prizes setup */}
              <div className="space-y-3 pt-2">
                <p className="text-[10px] font-extrabold text-slate-500 dark:text-[#9CA3AF] uppercase tracking-wider">PODIUM PRIZES</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 dark:text-[#6B7280] uppercase tracking-wider mb-1">
                      1st Place Champion
                    </label>
                    <input
                      type="text"
                      value={prize1}
                      onChange={(e) => setPrize1(e.target.value)}
                      className="bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-[#2A2E37] focus:border-[#D4AF37] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-[#E0E2E6] outline-none w-full transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 dark:text-[#6B7280] uppercase tracking-wider mb-1">
                      2nd Place Runner-Up
                    </label>
                    <input
                      type="text"
                      value={prize2}
                      onChange={(e) => setPrize2(e.target.value)}
                      className="bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-[#2A2E37] focus:border-[#D4AF37] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-[#E0E2E6] outline-none w-full transition-colors"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 dark:text-[#6B7280] uppercase tracking-wider mb-1">
                      3rd Place Finish
                    </label>
                    <input
                      type="text"
                      value={prize3}
                      onChange={(e) => setPrize3(e.target.value)}
                      className="bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-[#2A2E37] focus:border-[#D4AF37] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-[#E0E2E6] outline-none w-full transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 dark:text-[#6B7280] uppercase tracking-wider mb-1">
                      Highest Break Bonus
                    </label>
                    <input
                      type="text"
                      value={prizeBreak}
                      placeholder="e.g. ₦50,000"
                      onChange={(e) => setPrizeBreak(e.target.value)}
                      className="bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-[#2A2E37] focus:border-[#D4AF37] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-[#E0E2E6] outline-none w-full transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#0F1115] font-bold text-xs px-5 py-2.5 rounded-xl shadow-md border border-[#BFA032] transition-colors cursor-pointer"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-slate-50 dark:bg-[#0F1115]/40 border border-slate-200 dark:border-[#2A2E37] p-6 rounded-2xl flex flex-col items-center justify-center text-center py-12">
              <Lock className="w-8 h-8 text-[#D4AF37] mb-3" />
              <p className="text-xs font-bold text-slate-700 dark:text-[#E0E2E6] uppercase tracking-wider">Access Restricted</p>
              <p className="text-[11px] text-slate-400 dark:text-[#6B7280] mt-1.5 max-w-xs">
                Your currently logged-in role does not have authorization to edit tournament details, brackets, sets, or prizes.
              </p>
            </div>
          )}
        </div>

        {/* 3. RBAC USER SYSTEM PANEL */}
        <div className="bg-white dark:bg-[#1A1D23] border border-slate-200 dark:border-[#2A2E37] rounded-2xl p-6 shadow-xl space-y-6 transition-colors duration-300">
          <div className="border-b border-slate-200 dark:border-[#2A2E37] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-serif font-bold text-slate-800 dark:text-[#E0E2E6] text-sm uppercase tracking-wider flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#D4AF37]" /> RBAC System User Management
              </h4>
              <p className="text-xs text-slate-500 dark:text-[#9CA3AF] mt-0.5">
                Add and manage accounts directly inside the system. Generate 4-digit PIN access.
              </p>
            </div>
          </div>

          {isUserMgmtAllowed ? (
            <div className="space-y-6">
              {/* Form to add user */}
              <form onSubmit={handleAddUser} className="bg-slate-50 dark:bg-[#0F1115]/30 p-4 rounded-xl border border-slate-200 dark:border-[#2A2E37] space-y-3.5">
                <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-[#D4AF37]" /> Create New System User
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 dark:text-[#6B7280] uppercase tracking-wider mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. john_ref"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="bg-white dark:bg-[#1A1D23] border border-slate-200 dark:border-[#2A2E37] focus:border-[#D4AF37] rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-[#E0E2E6] outline-none w-full transition-colors font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 dark:text-[#6B7280] uppercase tracking-wider mb-1">
                      System Role
                    </label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="bg-white dark:bg-[#1A1D23] border border-slate-200 dark:border-[#2A2E37] focus:border-[#D4AF37] rounded-xl px-2 py-1.5 text-xs text-slate-800 dark:text-[#E0E2E6] outline-none w-full cursor-pointer transition-colors font-medium"
                    >
                      {rolePermissions.map((rp) => (
                        <option key={rp.role} value={rp.role}>
                          {rp.role}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 dark:text-[#6B7280] uppercase tracking-wider mb-1">
                      4-Digit PIN Code
                    </label>
                    <input
                      type="password"
                      placeholder="e.g. 8822"
                      maxLength={4}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      className="bg-white dark:bg-[#1A1D23] border border-slate-200 dark:border-[#2A2E37] focus:border-[#D4AF37] rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-[#E0E2E6] outline-none w-full tracking-widest font-mono transition-colors"
                    />
                  </div>
                </div>

                {userError && (
                  <p className="text-red-500 font-bold text-[10px]">⚠ {userError}</p>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="bg-[#D4AF37]/15 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#0F1115] border border-[#D4AF37]/35 font-bold text-xs px-4 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                  >
                    + Add New User
                  </button>
                </div>
              </form>

              {/* Active Users Table list */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 dark:text-[#6B7280] uppercase tracking-wider">Registered Accounts list</span>
                
                <div className="border border-slate-200 dark:border-[#2A2E37] rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-[#12151A] border-b border-slate-200 dark:border-[#2A2E37] text-slate-400 dark:text-[#6B7280] font-bold uppercase tracking-wider">
                          <th className="py-2.5 px-3">Username</th>
                          <th className="py-2.5 px-3">Role</th>
                          <th className="py-2.5 px-3 text-center">PIN Code</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-[#2A2E37]/40 text-slate-600 dark:text-[#9CA3AF]">
                        {users.map((u) => {
                          const isShowingPin = !!showPins[u.id];
                          const hasCustomBadge = !['Admin', 'Referee', 'Scorer', 'Player'].includes(u.role);
                          return (
                            <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-[#12151A]/30 transition-colors">
                              <td className="py-2 px-3 font-bold text-slate-800 dark:text-[#E0E2E6]">
                                {u.username}
                              </td>
                              <td className="py-2 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                                  u.role === 'Admin' 
                                    ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/15'
                                    : u.role === 'Referee'
                                    ? 'bg-blue-500/10 text-blue-500 dark:text-blue-400'
                                    : u.role === 'Scorer'
                                    ? 'bg-emerald-500/10 text-emerald-500'
                                    : hasCustomBadge
                                    ? 'bg-purple-500/10 text-purple-500 dark:text-purple-400 border border-purple-500/15'
                                    : 'bg-slate-100 dark:bg-[#0F1115] text-slate-500 dark:text-slate-400'
                                }`}>
                                  {u.role}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center font-mono font-bold text-slate-700 dark:text-[#E0E2E6]">
                                <div className="flex items-center justify-center gap-1.5">
                                  <span>{isShowingPin ? u.pin : '••••'}</span>
                                  <button
                                    type="button"
                                    onClick={() => togglePinVisibility(u.id)}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-[#12151A] rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                    title="Show/Hide PIN"
                                  >
                                    {isShowingPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </td>
                              <td className="py-2 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleGeneratePin(u.id)}
                                    className="bg-[#D4AF37]/10 hover:bg-[#D4AF37]/25 text-[#D4AF37] text-[10px] font-bold px-2 py-1 rounded transition-colors cursor-pointer"
                                    title="Generate new PIN if user forgot"
                                  >
                                    New PIN
                                  </button>
                                  {u.username !== 'admin' && (
                                    <button
                                      onClick={() => handleDeleteUser(u.id)}
                                      className="p-1 text-red-500 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                                      title="Remove User"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Role-Based Access Control Permissions Matrix */}
              <div className="space-y-4 pt-5 border-t border-slate-200 dark:border-[#2A2E37]/50">
                <div>
                  <h5 className="font-serif font-bold text-slate-800 dark:text-[#E0E2E6] text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-[#D4AF37]" /> Dynamic Role Permissions Matrix
                  </h5>
                  <p className="text-[11px] text-slate-500 dark:text-[#9CA3AF] mt-0.5">
                    Define and toggle exactly what screens, tabs, and administrative capabilities are granted to each system role.
                  </p>
                </div>

                {/* Form to create a custom role */}
                <form onSubmit={handleAddCustomRole} className="bg-slate-50 dark:bg-[#0F1115]/30 p-3.5 rounded-xl border border-slate-200 dark:border-[#2A2E37] flex flex-col sm:flex-row items-end gap-3 max-w-xl">
                  <div className="flex-1 w-full">
                    <label className="block text-[9px] font-extrabold text-slate-400 dark:text-[#6B7280] uppercase tracking-wider mb-1">
                      Create Custom Role Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Owner, Game Admin, Tech Support"
                      value={customRoleName}
                      onChange={(e) => setCustomRoleName(e.target.value)}
                      className="bg-white dark:bg-[#1A1D23] border border-slate-200 dark:border-[#2A2E37] focus:border-[#D4AF37] rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-[#E0E2E6] outline-none w-full transition-colors font-medium"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-[#D4AF37]/15 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#0F1115] border border-[#D4AF37]/35 font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0 w-full sm:w-auto justify-center"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create Role
                  </button>
                </form>
                {roleError && (
                  <p className="text-red-500 font-semibold text-[10px] mt-1">⚠ {roleError}</p>
                )}

                {/* Matrix Table */}
                <div className="border border-slate-200 dark:border-[#2A2E37] rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-[#12151A] border-b border-slate-200 dark:border-[#2A2E37] text-slate-400 dark:text-[#6B7280] font-bold uppercase tracking-wider">
                          <th className="py-2.5 px-3">System Role</th>
                          <th className="py-2.5 px-3 text-center">Allowed Screen Tabs</th>
                          <th className="py-2.5 px-3 text-center">Allowed Operations</th>
                          <th className="py-2.5 px-3 text-right">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-[#2A2E37]/40 text-slate-600 dark:text-[#9CA3AF]">
                        {rolePermissions.map((rp) => {
                          const tabs = [
                            { id: 'dashboard', label: 'Dashboard' },
                            { id: 'info', label: 'Info' },
                            { id: 'registration', label: 'Registration' },
                            { id: 'bracket', label: 'Bracket' },
                            { id: 'display', label: 'Live Display' },
                            { id: 'settings', label: 'Settings' }
                          ];
                          const actions = [
                            { id: 'scoreMatches', label: 'Score Matches' },
                            { id: 'userManagement', label: 'Manage Users (RBAC)' },
                            { id: 'editSettings', label: 'Edit Tourney details' },
                            { id: 'quickSimulate', label: 'Auto-Simulate' },
                            { id: 'wipeSystem', label: 'Wipe System' }
                          ];

                          return (
                            <tr key={rp.role} className="hover:bg-slate-50 dark:hover:bg-[#12151A]/30 transition-colors">
                              <td className="py-3.5 px-3 font-bold text-slate-800 dark:text-[#E0E2E6] align-top">
                                <span className="block">{rp.role}</span>
                                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-normal">
                                  {rp.role === 'Admin' ? '★ Master Role (Locked)' : 'Configurable'}
                                </span>
                              </td>
                              
                              {/* Tabs Allowed check cells */}
                              <td className="py-3.5 px-3 align-top">
                                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 max-w-xs mx-auto">
                                  {tabs.map((t) => {
                                    const isChecked = rp.allowedTabs.includes(t.id);
                                    return (
                                      <label key={t.id} className="flex items-center gap-1.5 cursor-pointer text-[10px] hover:text-slate-900 hover:dark:text-white transition-colors">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          disabled={rp.role === 'Admin'} // Admin is completely locked
                                          onChange={() => handleToggleTabPermission(rp.role, t.id)}
                                          className="rounded border-slate-300 dark:border-[#2A2E37] text-[#D4AF37] focus:ring-[#D4AF37] w-3 h-3 cursor-pointer"
                                        />
                                        <span className={isChecked ? 'font-semibold text-[#D4AF37]' : ''}>
                                          {t.label}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </td>

                              {/* Actions Allowed check cells */}
                              <td className="py-3.5 px-3 align-top">
                                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 max-w-sm mx-auto">
                                  {actions.map((a) => {
                                    const isChecked = rp.allowedActions.includes(a.id);
                                    return (
                                      <label key={a.id} className="flex items-center gap-1.5 cursor-pointer text-[10px] hover:text-slate-900 hover:dark:text-white transition-colors">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          disabled={rp.role === 'Admin'} // Admin is completely locked
                                          onChange={() => handleToggleActionPermission(rp.role, a.id)}
                                          className="rounded border-slate-300 dark:border-[#2A2E37] text-[#D4AF37] focus:ring-[#D4AF37] w-3 h-3 cursor-pointer"
                                        />
                                        <span className={isChecked ? 'font-semibold text-[#D4AF37]' : ''}>
                                          {a.label}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </td>

                              <td className="py-3.5 px-3 text-right align-top">
                                {!['Admin', 'Owner', 'Referee', 'Scorer', 'Player'].includes(rp.role) ? (
                                  <button
                                    onClick={() => handleDeleteRole(rp.role)}
                                    className="p-1 text-red-500 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                                    title={`Delete custom role "${rp.role}"`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono italic">System</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-[#0F1115]/40 border border-slate-200 dark:border-[#2A2E37] p-6 rounded-2xl flex flex-col items-center justify-center text-center py-12">
              <Lock className="w-8 h-8 text-[#D4AF37] mb-3 animate-pulse" />
              <p className="text-xs font-bold text-slate-700 dark:text-[#E0E2E6] uppercase tracking-wider">Access Restricted</p>
              <p className="text-[11px] text-slate-400 dark:text-[#6B7280] mt-1.5 max-w-xs">
                The Role-Based User Management (RBAC) panel is restricted. Your currently logged-in role does not have authorization to view, create users, or edit security permissions.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
