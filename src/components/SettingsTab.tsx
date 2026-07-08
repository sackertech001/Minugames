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
  systemUsersTableMissing?: boolean;
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
  systemUsersTableMissing = false,
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

  // Dynamic configuration states
  const [playersCount, setPlayersCount] = useState(config.playersCount);
  const [setsToPlay, setSetsToPlay] = useState(config.setsToPlay);
  const [numberOfGroups, setNumberOfGroups] = useState(config.numberOfGroups || 2);
  const [teamsPerGroup, setTeamsPerGroup] = useState(config.teamsPerGroup || 4);
  const [matchesPerTeamInGroup, setMatchesPerTeamInGroup] = useState(config.matchesPerTeamInGroup || 3);
  const [winPoints, setWinPoints] = useState(config.winPoints || 3);
  const [drawPoints, setDrawPoints] = useState(config.drawPoints || 1);
  const [lossPoints, setLossPoints] = useState(config.lossPoints || 0);
  const [newTournamentType, setNewTournamentType] = useState('');
  const [typeError, setTypeError] = useState('');

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

  const handleAddTournamentType = (e: React.FormEvent) => {
    e.preventDefault();
    setTypeError('');
    const trimmed = newTournamentType.trim();
    if (!trimmed) {
      setTypeError('Tournament type cannot be empty.');
      return;
    }
    const currentTypes = config.tournamentTypes || ['Soccer', 'Snooker', 'Table Tennis'];
    if (currentTypes.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      setTypeError('This tournament type already exists.');
      return;
    }
    const updatedTypes = [...currentTypes, trimmed];
    onUpdateConfig({ ...config, tournamentTypes: updatedTypes });
    setNewTournamentType('');
    showTemporarySuccess(`Added "${trimmed}" to tournament types master list.`);
  };

  const handleSelectTournamentType = (type: string) => {
    onUpdateConfig({ ...config, selectedTournamentType: type });
    showTemporarySuccess(`"${type}" selected as the active tournament discipline.`);
  };

  const handleDeleteTournamentType = (typeToDelete: string) => {
    setTypeError('');
    const currentTypes = config.tournamentTypes || ['Soccer', 'Snooker', 'Table Tennis'];
    if (currentTypes.length <= 1) {
      setTypeError('You must keep at least one tournament type in the master list.');
      return;
    }
    const updatedTypes = currentTypes.filter(t => t !== typeToDelete);
    
    let nextSelected = config.selectedTournamentType;
    if (config.selectedTournamentType === typeToDelete) {
      nextSelected = updatedTypes[0];
    }
    
    onUpdateConfig({ 
      ...config, 
      tournamentTypes: updatedTypes,
      selectedTournamentType: nextSelected 
    });
    showTemporarySuccess(`Deleted "${typeToDelete}" from tournament types master list.`);
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
        <div className="bg-[#05101E] text-emerald-400 p-4 rounded-xl font-sans font-black text-xs shadow-[0_0_20px_rgba(16,185,129,0.15)] flex items-center gap-2.5 max-w-sm ml-auto border border-emerald-500/30 animate-in fade-in slide-in-from-top-4 duration-300">
          <span className="text-emerald-500">✓</span> {successMsg}
        </div>
      )}

      {/* 1. SESSION MANAGEMENT ROW */}
      <div className="bg-[#091A2E] border border-rose-500/15 rounded-2xl p-6 shadow-[0_0_15px_rgba(239,68,68,0.03)] transition-colors duration-300">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <h3 className="font-sans font-black text-slate-100 text-sm uppercase tracking-[0.1em] flex items-center gap-2">
              <Shield className="w-5 h-5 text-rose-500" /> Access Management & Sessions
            </h3>
            <p className="text-xs text-slate-400 font-sans font-medium">
              Control dashboard permissions. Referees, scorers, and admins must sign in using their PINs to edit tournament events.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3.5 bg-[#05101E] border border-rose-500/15 px-4.5 py-2.5 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <div className="text-xs">
                  <p className="font-sans font-black text-white">Logged in: {currentUser.username}</p>
                  <p className="text-[10px] text-slate-400 capitalize font-bold font-sans tracking-wide">Role: {currentUser.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/20 text-[10px] font-sans font-black px-3.5 py-1.5 rounded-lg transition-all cursor-pointer uppercase tracking-wider"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-sans font-black text-rose-500 bg-rose-500/5 border border-rose-500/20 px-4 py-2 rounded-xl uppercase tracking-widest">
                  Guest Browsing Mode
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Login form if not logged in */}
        {!currentUser && (
          <div className="mt-6 border-t border-rose-500/10 pt-5">
            <form onSubmit={handleUserLogin} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end max-w-2xl">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-sans font-black text-slate-400 uppercase tracking-widest">
                  Username
                </label>
                <input
                  type="text"
                  placeholder="e.g. admin"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="bg-[#05101E] border border-rose-500/15 focus:border-rose-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none w-full transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-sans font-black text-slate-400 uppercase tracking-widest">
                  4-Digit PIN Code
                </label>
                <input
                  type="password"
                  placeholder="••••"
                  maxLength={4}
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value)}
                  className="bg-[#05101E] border border-rose-500/15 focus:border-rose-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none w-full tracking-widest font-sans font-bold transition-all"
                />
              </div>
              <button
                type="submit"
                className="bg-rose-500 hover:bg-rose-600 text-white font-sans font-black text-xs px-5 py-2.5 rounded-xl border border-rose-500/30 transition-all cursor-pointer w-full flex items-center justify-center gap-2 uppercase tracking-wider shadow-[0_0_12px_rgba(239,68,68,0.2)]"
              >
                <Key className="w-4 h-4" /> Authenticate Session
              </button>
            </form>
            {loginError && (
              <p className="text-rose-500 font-sans font-bold text-[11px] mt-3">⚠ {loginError}</p>
            )}
            <p className="text-[10px] text-slate-500 font-sans font-medium mt-3.5">
              * Note: Default Admin credentials are Username: <span className="font-bold text-slate-400">admin</span> • PIN: <span className="font-bold text-slate-400">1234</span>. Sign in to edit configs!
            </p>
          </div>
        )}
      </div>

      {/* PUBLIC PLAYER REGISTRATION LINK CARD */}
      <div className="bg-[#091A2E] border border-rose-500/15 rounded-2xl p-6 shadow-[0_0_15px_rgba(239,68,68,0.03)] space-y-5 transition-colors duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-500/10 pb-4">
          <div className="space-y-1.5">
            <h3 className="font-sans font-black text-slate-100 text-sm uppercase tracking-[0.1em] flex items-center gap-2">
              <Link className="w-5 h-5 text-rose-500" /> Public Tournament Portal Link
            </h3>
            <p className="text-xs text-slate-400 font-sans font-medium">
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
            className="text-[10px] font-sans font-black text-rose-500 hover:text-rose-400 uppercase tracking-widest cursor-pointer"
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
                className="w-full bg-[#05101E] border border-rose-500/15 rounded-xl px-4 py-3 text-xs text-slate-300 font-sans font-bold select-all outline-none"
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
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-sans font-black py-3 px-4 rounded-xl transition-all uppercase tracking-wider shadow-[0_0_12px_rgba(239,68,68,0.2)] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-4 h-4" /> Copy
              </button>
              <a
                href={`${window.location.origin}${window.location.pathname}?public=true&token=${config.publicPortalToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#05101E] hover:bg-rose-500/10 border border-rose-500/15 text-slate-300 hover:text-rose-500 text-xs font-sans font-black p-3 rounded-xl transition-all flex items-center justify-center cursor-pointer"
                title="Open public portal"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
      
      {/* EXISTING PLAYER REGISTRATION CARD */}
      <div className="bg-[#091A2E] border border-rose-500/15 rounded-2xl p-6 shadow-[0_0_15px_rgba(239,68,68,0.03)] space-y-5 transition-colors duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-500/10 pb-4">
          <div className="space-y-1.5">
            <h3 className="font-sans font-black text-slate-100 text-sm uppercase tracking-[0.1em] flex items-center gap-2">
              <Link className="w-5 h-5 text-rose-500" /> Public Player Registration Link
            </h3>
            <p className="text-xs text-slate-400 font-sans font-medium">
              Generate a secure link to share with snooker players so they can submit their applications online.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-sans font-black text-slate-500 uppercase tracking-widest">STATUS:</span>
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
              className={`px-3.5 py-1.5 text-[11px] font-sans font-black rounded-full uppercase tracking-widest transition-all border shrink-0 ${
                !isConfigEditable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              } ${
                publicRegEnabled
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/15'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/15'
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
                className="w-full bg-[#05101E] border border-rose-500/15 rounded-xl px-4 py-3 text-xs text-slate-300 font-sans font-bold select-all outline-none"
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
                className="bg-[#05101E] hover:bg-rose-500/10 border border-rose-500/15 text-rose-500 text-[10px] font-sans font-black py-3 px-4 rounded-xl transition-all uppercase tracking-wider cursor-pointer"
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
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-sans font-black py-3 px-4 rounded-xl transition-all uppercase tracking-wider shadow-[0_0_12px_rgba(239,68,68,0.2)] flex items-center justify-center gap-1.5 cursor-pointer"
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
                className="bg-bg-primary hover:bg-rose-500/10 border border-rose-500/15 text-text-secondary hover:text-rose-500 text-xs font-sans font-black p-3 rounded-xl transition-all flex items-center justify-center cursor-pointer"
                title="Open registration form preview"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="bg-bg-primary p-4.5 rounded-xl border border-rose-500/10 text-xs text-text-muted font-sans font-medium leading-relaxed space-y-2.5">
            <p className="font-sans font-black text-text-primary flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <Info className="w-4 h-4 text-rose-500" /> Instructions for Organizers:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-[11px] text-text-muted font-sans font-bold">
              <li>Copy and share the registration link above to WhatsApp groups, club flyers, or social media pages.</li>
              <li>Players fill in their <span className="text-rose-500 font-sans font-black">Full Name, Nickname, Photo, represent Club, and Phone/WhatsApp numbers</span>.</li>
              <li>Go to the <span className="text-rose-500 font-sans font-black hover:underline cursor-pointer">Player Registration</span> tab, click <span className="text-text-primary">Applications Register</span> to view submissions.</li>
              <li>Organizers can review applicants and assign them a specific available Seed Slot to sync them into the knockout bracket tree.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* SYSTEM BRANDING & LOGO SETTINGS */}
      <div className="bg-bg-secondary border border-rose-500/10 dark:border-rose-500/15 rounded-2xl p-6 shadow-[0_0_15px_rgba(239,68,68,0.03)] space-y-5 transition-colors duration-300">
        <div className="border-b border-rose-500/10 pb-4">
          <h3 className="font-sans font-black text-text-primary text-sm uppercase tracking-[0.1em] flex items-center gap-2">
            <Settings className="w-5 h-5 text-rose-500" /> System Branding & Logo Settings
          </h3>
          <p className="text-xs text-text-muted font-sans font-medium mt-0.5">
            Upload your organization's logo or custom championship banner. This will represent the official brand identity in the Public Player Application Portal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Logo Preview */}
          <div className="flex flex-col items-center justify-center p-4 bg-bg-primary border border-rose-500/15 rounded-2xl h-40">
            {logoUrl ? (
              <div className="relative group w-full h-full flex items-center justify-center">
                <img
                  src={logoUrl || null}
                  alt="System Logo Preview"
                  className="max-h-28 max-w-full object-contain rounded-lg shadow-md border border-rose-500/20 p-1.5 bg-bg-primary"
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
                    className="absolute -top-1 -right-1 bg-rose-600 hover:bg-rose-700 text-white p-1.5 rounded-full shadow-lg transition-colors cursor-pointer"
                    title="Remove custom logo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center space-y-1.5 text-text-muted">
                <div className="w-12 h-12 rounded-full bg-bg-tertiary border border-rose-500/10 flex items-center justify-center mx-auto">
                  <Award className="w-6 h-6 text-rose-500/60" />
                </div>
                <p className="text-[10px] font-sans font-black uppercase tracking-wider text-rose-500">Default Logo</p>
                <p className="text-[9px] text-text-muted font-medium font-sans">Championship Trophy</p>
              </div>
            )}
          </div>

          {/* Logo Upload Dropzone */}
          <div className="md:col-span-2">
            {isConfigEditable ? (
              <div className="space-y-3">
                <label className="block text-[10px] font-sans font-black text-text-muted uppercase tracking-widest">
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
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-2.5 ${
                    isDragActive
                      ? 'border-rose-500 bg-rose-500/5'
                      : 'border-rose-500/15 hover:border-rose-500/30 hover:bg-rose-500/5'
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
                  <div className="w-10 h-10 rounded-full bg-bg-primary border border-rose-500/15 flex items-center justify-center text-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.1)]">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-sans font-bold text-text-primary">
                      Click to upload or drag & drop logo
                    </p>
                    <p className="text-[10px] text-text-muted font-sans font-medium mt-1">
                      PNG, JPEG, SVG or WEBP • Max size 2MB
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-bg-primary border border-rose-500/15 p-4 rounded-xl flex items-start gap-3">
                <Lock className="w-5 h-5 text-rose-500 shrink-0" />
                <div className="text-xs font-sans">
                  <p className="font-sans font-black text-text-primary uppercase tracking-wider">Upload Disabled</p>
                  <p className="text-text-muted font-sans font-medium mt-0.5">
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
        <div className="bg-bg-secondary border border-rose-500/10 dark:border-rose-500/15 rounded-2xl p-6 shadow-[0_0_15px_rgba(239,68,68,0.03)] space-y-6 transition-colors duration-300">
          <div className="border-b border-rose-500/10 pb-4">
            <h4 className="font-sans font-black text-text-primary text-sm uppercase tracking-[0.1em] flex items-center gap-2">
              <Award className="w-5 h-5 text-rose-500" /> Edit Tournament & Prizes
            </h4>
            <p className="text-xs text-text-muted font-sans font-medium mt-0.5">
              Customize dates, venue, match sizing, and standard podium prize amounts.
            </p>
          </div>

          {isConfigEditable ? (
            <form onSubmit={handleSaveTournamentSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-sans font-black text-text-muted uppercase tracking-widest">
                    Tournament Name
                  </label>
                  <input
                    type="text"
                    value={tourneyName}
                    onChange={(e) => setTourneyName(e.target.value)}
                    className="bg-bg-primary border border-rose-500/15 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-xs text-text-primary outline-none w-full transition-all font-sans font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-sans font-black text-text-muted uppercase tracking-widest">
                    Arena Venue Location
                  </label>
                  <input
                    type="text"
                    value={tourneyVenue}
                    onChange={(e) => setTourneyVenue(e.target.value)}
                    className="bg-bg-primary border border-rose-500/15 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-xs text-text-primary outline-none w-full transition-all font-sans font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-sans font-black text-text-muted uppercase tracking-widest">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={tourneyStartDate}
                    onChange={(e) => setTourneyStartDate(e.target.value)}
                    className="bg-bg-primary border border-rose-500/15 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-xs text-text-primary outline-none w-full transition-all font-sans font-bold [&::-webkit-calendar-picker-indicator]:invert-0 dark:[&::-webkit-calendar-picker-indicator]:invert"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-sans font-black text-text-muted uppercase tracking-widest">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={tourneyEndDate}
                    onChange={(e) => setTourneyEndDate(e.target.value)}
                    className="bg-bg-primary border border-rose-500/15 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-xs text-text-primary outline-none w-full transition-all font-sans font-bold [&::-webkit-calendar-picker-indicator]:invert-0 dark:[&::-webkit-calendar-picker-indicator]:invert"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-sans font-black text-text-muted uppercase tracking-widest">
                  Calculated Duration (Days)
                </label>
                <input
                  type="text"
                  readOnly
                  value={Math.max(1, Math.ceil((new Date(tourneyEndDate).getTime() - new Date(tourneyStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1) || 1}
                  className="bg-bg-primary border border-rose-500/10 rounded-xl px-3.5 py-2.5 text-xs text-text-muted w-full font-sans font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-sans font-black text-text-muted uppercase tracking-widest">
                  Tournament Format Type
                </label>
                <select
                  value={formatType}
                  onChange={(e) => setFormatType(e.target.value as 'knockout' | 'group')}
                  className="bg-bg-primary border border-rose-500/15 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-xs text-text-primary outline-none w-full transition-all cursor-pointer font-sans font-bold"
                >
                  <option value="knockout">Knockout</option>
                  <option value="group">Group Stage</option>
                </select>
                {formatType === 'group' && (
                  <button
                    type="button"
                    onClick={handleGenerateGroups}
                    className="mt-2 w-full bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 border border-rose-500/25 text-[10px] font-sans font-black py-2 rounded-xl transition-all cursor-pointer uppercase tracking-wider"
                  >
                    Generate Groups
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-sans font-black text-text-muted uppercase tracking-widest">
                  Tournament Format
                </label>
                <input
                  type="text"
                  value={tourneyFormat}
                  onChange={(e) => setTourneyFormat(e.target.value)}
                  className="bg-bg-primary border border-rose-500/15 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-xs text-text-primary outline-none w-full transition-all font-sans font-bold"
                />
              </div>

              {/* Tournament structure configs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-bg-primary p-4.5 rounded-xl border border-rose-500/10">
                {formatType === 'knockout' && (
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-sans font-black text-text-muted uppercase tracking-widest">
                      Bracket Size (Players)
                    </label>
                    <select
                      value={playersCount}
                      disabled={isTournamentStarted}
                      onChange={(e) => setPlayersCount(Number(e.target.value))}
                      className="bg-bg-primary border border-rose-500/15 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-xs text-text-primary outline-none w-full cursor-pointer transition-all font-sans font-bold"
                    >
                      <option value={8}>8 Players (Quarter Finals Start)</option>
                      <option value={16}>16 Players (Round of 16 Start)</option>
                      <option value={32}>32 Players (Round of 32 Start)</option>
                    </select>
                    {isTournamentStarted && (
                      <span className="text-[9px] text-rose-500 font-sans font-black block mt-1.5 uppercase tracking-wider">
                        🔒 Locked: Tournament has started
                      </span>
                    )}
                  </div>
                )}
                {formatType === 'group' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-sans font-black text-text-muted uppercase tracking-widest">
                        Number of Groups
                      </label>
                      <input
                        type="number"
                        value={numberOfGroups}
                        onChange={(e) => setNumberOfGroups(Number(e.target.value))}
                        className="bg-bg-primary border border-rose-500/15 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-xs text-text-primary outline-none w-full transition-all font-sans font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-sans font-black text-text-muted uppercase tracking-widest">
                        Teams per Group
                      </label>
                      <input
                        type="number"
                        value={teamsPerGroup}
                        onChange={(e) => setTeamsPerGroup(Number(e.target.value))}
                        className="bg-bg-primary border border-rose-500/15 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-xs text-text-primary outline-none w-full transition-all font-sans font-bold"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2.5 col-span-2">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-sans font-black text-text-muted uppercase tracking-widest">Win Pts</label>
                        <input type="number" value={winPoints} onChange={(e) => setWinPoints(Number(e.target.value))} className="bg-bg-primary border border-rose-500/15 focus:border-rose-500 rounded-xl px-2 py-2 text-xs text-text-primary outline-none w-full transition-all font-sans font-bold text-center" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-sans font-black text-text-muted uppercase tracking-widest">Draw Pts</label>
                        <input type="number" value={drawPoints} onChange={(e) => setDrawPoints(Number(e.target.value))} className="bg-bg-primary border border-rose-500/15 focus:border-rose-500 rounded-xl px-2 py-2 text-xs text-text-primary outline-none w-full transition-all font-sans font-bold text-center" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-sans font-black text-text-muted uppercase tracking-widest">Loss Pts</label>
                        <input type="number" value={lossPoints} onChange={(e) => setLossPoints(Number(e.target.value))} className="bg-bg-primary border border-rose-500/15 focus:border-rose-500 rounded-xl px-2 py-2 text-xs text-text-primary outline-none w-full transition-all font-sans font-bold text-center" />
                      </div>
                    </div>
                  </>
                )}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-sans font-black text-text-muted uppercase tracking-widest">
                    {formatType === 'group' ? 'Matches per Team in Group' : 'Sets to play per Match'}
                  </label>
                  {formatType === 'group' ? (
                    <input
                      type="number"
                      value={matchesPerTeamInGroup}
                      onChange={(e) => setMatchesPerTeamInGroup(Number(e.target.value))}
                      className="bg-bg-primary border border-rose-500/15 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-xs text-text-primary outline-none w-full transition-all font-sans font-bold"
                    />
                  ) : (
                    <select
                      value={setsToPlay}
                      onChange={(e) => setSetsToPlay(Number(e.target.value))}
                      className="bg-bg-primary border border-rose-500/15 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-xs text-text-primary outline-none w-full cursor-pointer transition-all font-sans font-bold"
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
              <div className="space-y-3.5 pt-2">
                <p className="text-[10px] font-sans font-black text-rose-500 uppercase tracking-widest">PODIUM PRIZES</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-sans font-black text-text-muted uppercase tracking-widest">
                      1st Place Champion
                    </label>
                    <input
                      type="text"
                      value={prize1}
                      onChange={(e) => setPrize1(e.target.value)}
                      className="bg-bg-primary border border-rose-500/15 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-xs text-text-primary outline-none w-full transition-all font-sans font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-sans font-black text-text-muted uppercase tracking-widest">
                      2nd Place Runner-Up
                    </label>
                    <input
                      type="text"
                      value={prize2}
                      onChange={(e) => setPrize2(e.target.value)}
                      className="bg-bg-primary border border-rose-500/15 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-xs text-text-primary outline-none w-full transition-all font-sans font-bold"
                    />
                  </div>
                </div>

              </div>

              <div className="pt-3.5 flex justify-end">
                <button
                  type="submit"
                  className="bg-rose-500 hover:bg-rose-600 text-white font-sans font-black text-xs px-6 py-3 rounded-xl border border-rose-500/30 transition-all cursor-pointer uppercase tracking-wider shadow-[0_0_12px_rgba(239,68,68,0.2)]"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-bg-primary border border-rose-500/15 p-6 rounded-2xl flex flex-col items-center justify-center text-center py-12">
              <Lock className="w-8 h-8 text-rose-500 mb-3" />
              <p className="text-xs font-sans font-black text-text-primary uppercase tracking-widest">Access Restricted</p>
              <p className="text-[11px] text-text-muted font-sans font-medium mt-2 max-w-xs leading-relaxed">
                Your currently logged-in role does not have authorization to edit tournament details, brackets, sets, or prizes.
              </p>
            </div>
          )}
        </div>

        {/* 3. RBAC USER SYSTEM PANEL */}
        <div className="bg-bg-secondary border border-rose-500/10 dark:border-rose-500/15 rounded-2xl p-6 shadow-[0_0_15px_rgba(239,68,68,0.03)] space-y-6 transition-colors duration-300">
          <div className="border-b border-rose-500/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-sans font-black text-text-primary text-sm uppercase tracking-[0.1em] flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-rose-500" /> RBAC System User Management
              </h4>
              <p className="text-xs text-text-muted font-sans font-medium mt-0.5">
                Add and manage accounts directly inside the system. Generate 4-digit PIN access.
              </p>
            </div>
          </div>

          {systemUsersTableMissing && (
            <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-5 space-y-3.5 text-left">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                <span className="text-xs font-sans font-black uppercase tracking-wider">
                  Supabase "system_users" Table Missing
                </span>
              </div>
              <p className="text-xs text-amber-200 leading-relaxed">
                The <code className="bg-black/45 px-1 py-0.5 rounded font-mono text-xs text-white">system_users</code> table does not exist in your live Supabase database. System users created or edited below will only persist temporarily in the server's cache and will be reset when the container restarts.
              </p>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Copy & Run this SQL in your Supabase SQL Editor to enable database users:
                </p>
                <div className="relative">
                  <pre className="bg-[#030914] text-[#EEF1F5] text-[10px] font-mono p-4 rounded-xl border border-slate-800 overflow-x-auto leading-relaxed select-all max-h-48">
{`-- Create system_users table for Role-Based Access Control
CREATE TABLE IF NOT EXISTS public.system_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  pin TEXT NOT NULL CHECK (length(pin) >= 4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;

-- Define fully permissive policies
CREATE POLICY "Allow public read access for system_users" ON public.system_users FOR SELECT USING (true);
CREATE POLICY "Allow public insert access for system_users" ON public.system_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access for system_users" ON public.system_users FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete access for system_users" ON public.system_users FOR DELETE USING (true);

-- Seed initial default users
INSERT INTO public.system_users (username, role, pin) VALUES
  ('admin', 'Admin', '1234'),
  ('owner', 'Owner', '5555'),
  ('game_admin', 'Game Admin', '7777'),
  ('referee', 'Referee', '2222'),
  ('scorer', 'Scorer', '3333'),
  ('player', 'Player', '4444')
ON CONFLICT (username) DO NOTHING;`}
                  </pre>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`-- Create system_users table for Role-Based Access Control
CREATE TABLE IF NOT EXISTS public.system_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  pin TEXT NOT NULL CHECK (length(pin) >= 4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;

-- Define fully permissive policies
CREATE POLICY "Allow public read access for system_users" ON public.system_users FOR SELECT USING (true);
CREATE POLICY "Allow public insert access for system_users" ON public.system_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access for system_users" ON public.system_users FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete access for system_users" ON public.system_users FOR DELETE USING (true);

-- Seed initial default users
INSERT INTO public.system_users (username, role, pin) VALUES
  ('admin', 'Admin', '1234'),
  ('owner', 'Owner', '5555'),
  ('game_admin', 'Game Admin', '7777'),
  ('referee', 'Referee', '2222'),
  ('scorer', 'Scorer', '3333'),
  ('player', 'Player', '4444')
ON CONFLICT (username) DO NOTHING;`);
                      alert('SQL Script copied to clipboard!');
                    }}
                    className="absolute top-2 right-2 bg-slate-850 hover:bg-slate-750 border border-slate-700 text-amber-400 hover:text-amber-300 text-[10px] px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy SQL
                  </button>
                </div>
              </div>
            </div>
          )}

          {isUserMgmtAllowed ? (
            <div className="space-y-6">
              {/* Form to add user */}
              <form onSubmit={handleAddUser} className="bg-bg-primary p-4.5 rounded-xl border border-rose-500/10 space-y-3.5">
                <span className="text-[10px] font-sans font-black text-rose-500 uppercase tracking-widest flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-rose-500" /> Create New System User
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-sans font-black text-text-muted uppercase tracking-widest">
                      Username
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. john_ref"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="bg-bg-primary border border-rose-500/15 focus:border-rose-500 rounded-xl px-3 py-2 text-xs text-text-primary outline-none w-full transition-all font-sans font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                                    <label className="block text-[9px] font-sans font-black text-text-muted uppercase tracking-widest">
                      System Role
                    </label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="bg-bg-primary border border-rose-500/15 focus:border-rose-500 rounded-xl px-3 py-2 text-xs text-text-primary outline-none w-full cursor-pointer transition-all font-sans font-bold"
                    >
                      {rolePermissions.map((rp) => (
                        <option key={rp.role} value={rp.role}>
                          {rp.role}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-sans font-black text-text-muted uppercase tracking-widest">
                      4-Digit PIN Code
                    </label>
                    <input
                      type="password"
                      placeholder="e.g. 8822"
                      maxLength={4}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      className="bg-bg-primary border border-rose-500/15 focus:border-rose-500 rounded-xl px-3 py-2 text-xs text-text-primary outline-none w-full tracking-widest font-sans font-bold transition-all"
                    />
                  </div>
                </div>

                {userError && (
                  <p className="text-rose-500 font-sans font-bold text-[10px]">⚠ {userError}</p>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="bg-rose-500 hover:bg-rose-600 text-white font-sans font-black text-xs px-4 py-2 rounded-xl border border-rose-500/30 transition-all cursor-pointer flex items-center gap-1 uppercase tracking-wider shadow-[0_0_10px_rgba(239,68,68,0.15)]"
                  >
                    + Add New User
                  </button>
                </div>
              </form>

              {/* Active Users Table list */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-sans font-black text-text-muted uppercase tracking-widest">Registered Accounts list</span>
                
                <div className="border border-rose-500/15 rounded-xl overflow-hidden bg-bg-primary">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-bg-primary border-b border-rose-500/15 text-text-muted font-sans font-black uppercase tracking-widest">
                          <th className="py-3 px-3">Username</th>
                          <th className="py-3 px-3">Role</th>
                          <th className="py-3 px-3 text-center">PIN Code</th>
                          <th className="py-3 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-500/10 text-text-secondary">
                        {users.map((u) => {
                          const isShowingPin = !!showPins[u.id];
                          const hasCustomBadge = !['Admin', 'Referee', 'Scorer', 'Player'].includes(u.role);
                          return (
                            <tr key={u.id} className="hover:bg-rose-500/5 transition-all">
                              <td className="py-2.5 px-3 font-sans font-bold text-text-primary">
                                {u.username}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-black uppercase tracking-wider ${
                                  u.role === 'Admin' 
                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/15'
                                    : u.role === 'Referee'
                                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/15'
                                    : u.role === 'Scorer'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                                    : hasCustomBadge
                                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/15'
                                    : 'bg-bg-primary border border-rose-500/10 text-text-muted'
                                }`}>
                                  {u.role}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-sans font-bold text-text-primary">
                                <div className="flex items-center justify-center gap-1.5">
                                  <span>{isShowingPin ? u.pin : '••••'}</span>
                                  <button
                                    type="button"
                                    onClick={() => togglePinVisibility(u.id)}
                                    className="p-1 hover:bg-bg-secondary rounded text-text-muted hover:text-rose-500 transition-colors cursor-pointer"
                                    title="Show/Hide PIN"
                                  >
                                    {isShowingPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleGeneratePin(u.id)}
                                    className="bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 border border-rose-500/20 text-[10px] font-sans font-black px-2.5 py-1 rounded transition-all cursor-pointer uppercase tracking-wider"
                                    title="Generate new PIN if user forgot"
                                  >
                                    New PIN
                                  </button>
                                  {u.username !== 'admin' && (
                                    <button
                                      onClick={() => handleDeleteUser(u.id)}
                                      className="p-1 text-rose-500 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
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
              <div className="space-y-4 pt-5 border-t border-rose-500/10">
                <div>
                  <h5 className="font-sans font-black text-text-primary text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-rose-500" /> Dynamic Role Permissions Matrix
                  </h5>
                  <p className="text-[11px] text-text-muted font-sans font-medium mt-0.5">
                    Define and toggle exactly what screens, tabs, and administrative capabilities are granted to each system role.
                  </p>
                </div>

                {/* Form to create a custom role */}
                <form onSubmit={handleAddCustomRole} className="bg-bg-primary p-3.5 rounded-xl border border-rose-500/10 flex flex-col sm:flex-row items-end gap-3 max-w-xl">
                  <div className="flex-1 w-full">
                    <label className="block text-[9px] font-sans font-black text-text-muted uppercase tracking-widest mb-1">
                      Create Custom Role Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Owner, Game Admin, Tech Support"
                      value={customRoleName}
                      onChange={(e) => setCustomRoleName(e.target.value)}
                      className="bg-bg-primary border border-rose-500/15 focus:border-rose-500 rounded-xl px-3 py-2 text-xs text-text-primary outline-none w-full transition-all font-sans font-bold"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-rose-500 hover:bg-rose-600 text-white border border-rose-500/30 font-sans font-black text-xs px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-center uppercase tracking-wider shadow-[0_0_8px_rgba(239,68,68,0.15)]"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create Role
                  </button>
                </form>
                {roleError && (
                  <p className="text-rose-500 font-sans font-bold text-[10px] mt-1">⚠ {roleError}</p>
                )}

                {/* Matrix Table */}
                <div className="border border-rose-500/15 rounded-xl overflow-hidden bg-bg-primary shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-bg-primary border-b border-rose-500/15 text-text-muted font-sans font-black uppercase tracking-widest">
                          <th className="py-3 px-3">System Role</th>
                          <th className="py-3 px-3 text-center">Allowed Screen Tabs</th>
                          <th className="py-3 px-3 text-center">Allowed Operations</th>
                          <th className="py-3 px-3 text-right">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-500/10 text-text-secondary">
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
                            <tr key={rp.role} className="hover:bg-rose-500/5 transition-all">
                              <td className="py-3.5 px-3 font-sans font-bold text-text-primary align-top">
                                <span className="block">{rp.role}</span>
                                <span className="text-[9px] text-text-muted font-sans font-bold uppercase tracking-wider block mt-1">
                                  {rp.role === 'Admin' ? '★ Master Role (Locked)' : 'Configurable'}
                                </span>
                              </td>
                              
                              {/* Tabs Allowed check cells */}
                              <td className="py-3.5 px-3 align-top">
                                <div className="grid grid-cols-2 gap-x-2.5 gap-y-1.5 max-w-xs mx-auto">
                                  {tabs.map((t) => {
                                    const isChecked = rp.allowedTabs.includes(t.id);
                                    return (
                                      <label key={t.id} className="flex items-center gap-1.5 cursor-pointer text-[10px] hover:text-text-primary transition-colors">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          disabled={rp.role === 'Admin'} // Admin is completely locked
                                          onChange={() => handleToggleTabPermission(rp.role, t.id)}
                                          className="rounded border-rose-500/15 text-rose-500 focus:ring-rose-500 w-3 h-3 cursor-pointer accent-rose-500"
                                        />
                                        <span className={isChecked ? 'font-sans font-black text-rose-400' : 'font-sans font-medium text-text-muted'}>
                                          {t.label}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </td>

                              {/* Actions Allowed check cells */}
                              <td className="py-3.5 px-3 align-top">
                                <div className="grid grid-cols-2 gap-x-2.5 gap-y-1.5 max-w-sm mx-auto">
                                  {actions.map((a) => {
                                    const isChecked = rp.allowedActions.includes(a.id);
                                    return (
                                      <label key={a.id} className="flex items-center gap-1.5 cursor-pointer text-[10px] hover:text-text-primary transition-colors">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          disabled={rp.role === 'Admin'} // Admin is completely locked
                                          onChange={() => handleToggleActionPermission(rp.role, a.id)}
                                          className="rounded border-rose-500/15 text-rose-500 focus:ring-rose-500 w-3 h-3 cursor-pointer accent-rose-500"
                                        />
                                        <span className={isChecked ? 'font-sans font-black text-rose-400' : 'font-sans font-medium text-text-muted'}>
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
                                    className="p-1 text-rose-500 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                                    title={`Delete custom role "${rp.role}"`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <span className="text-[9px] text-text-muted font-sans font-black uppercase tracking-widest">System</span>
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
            <div className="bg-bg-primary border border-rose-500/15 p-6 rounded-2xl flex flex-col items-center justify-center text-center py-12">
              <Lock className="w-8 h-8 text-rose-500 mb-3 animate-pulse" />
              <p className="text-xs font-sans font-black text-text-primary uppercase tracking-widest">Access Restricted</p>
              <p className="text-[11px] text-text-muted font-sans font-medium mt-2 max-w-xs leading-relaxed">
                The Role-Based User Management (RBAC) panel is restricted. Your currently logged-in role does not have authorization to view, create users, or edit security permissions.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* 4. MASTER LIST OF TOURNAMENT TYPES */}
      <div className="bg-bg-secondary border border-rose-500/10 dark:border-rose-500/15 rounded-2xl p-6 shadow-[0_0_15px_rgba(239,68,68,0.03)] space-y-6 transition-colors duration-300 mt-8">
        <div className="border-b border-rose-500/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-sans font-black text-text-primary text-sm uppercase tracking-[0.1em] flex items-center gap-2">
              <Award className="w-5 h-5 text-rose-500" /> Master List of Tournament Types
            </h4>
            <p className="text-xs text-text-muted font-sans font-medium mt-0.5">
              Manage the central register of tournament disciplines. These options populate the mandatory tournament type dropdown on public and admin player registration forms.
            </p>
          </div>
        </div>

        {isConfigEditable ? (
          <div className="space-y-6">
            {/* Input Row */}
            <form onSubmit={handleAddTournamentType} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end max-w-2xl">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-[10px] font-sans font-black text-slate-400 uppercase tracking-widest">
                  New Tournament Type (e.g. Soccer, Snooker, Table Tennis)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chess, Basketball, Snooker"
                  value={newTournamentType}
                  onChange={(e) => setNewTournamentType(e.target.value)}
                  className="bg-bg-primary border border-rose-500/15 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-xs text-text-primary placeholder-slate-600 outline-none w-full transition-all font-sans font-bold"
                />
              </div>
              <button
                type="submit"
                className="bg-rose-500 hover:bg-rose-600 text-white font-sans font-black text-xs px-5 py-3 rounded-xl border border-rose-500/30 transition-all cursor-pointer w-full flex items-center justify-center gap-2 uppercase tracking-wider shadow-[0_0_12px_rgba(239,68,68,0.2)]"
              >
                <Plus className="w-4 h-4" /> Add Type
              </button>
            </form>

            {typeError && (
              <p className="text-rose-500 font-sans font-bold text-[11px]">⚠ {typeError}</p>
            )}

            {/* List Table */}
            <div className="bg-bg-primary rounded-xl border border-rose-500/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-rose-500/10 bg-bg-tertiary">
                    <th className="py-2.5 px-4 text-[10px] font-sans font-black text-slate-400 uppercase tracking-widest">Tournament Type Name</th>
                    <th className="py-2.5 px-4 text-center text-[10px] font-sans font-black text-slate-400 uppercase tracking-widest w-40">Status</th>
                    <th className="py-2.5 px-4 text-right text-[10px] font-sans font-black text-slate-400 uppercase tracking-widest w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(config.tournamentTypes || ['Soccer', 'Snooker', 'Table Tennis']).map((type, i) => {
                    const isSelected = type === (config.selectedTournamentType || config.tournamentTypes?.[0] || 'Snooker');
                    return (
                      <tr key={i} className="border-b border-rose-500/5 last:border-none hover:bg-bg-tertiary/50 transition-colors">
                        <td className="py-3 px-4 text-xs font-sans font-black text-slate-200">
                          {type}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isSelected ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-sans font-black tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase">
                              <Check className="w-3 h-3 text-emerald-400" /> Selected Active
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSelectTournamentType(type)}
                              className="inline-flex items-center gap-1 text-[9px] font-sans font-black tracking-wider bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 px-2 py-1 rounded-full uppercase cursor-pointer transition-colors"
                            >
                              Set Active
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteTournamentType(type)}
                            className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            title={`Delete "${type}"`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-bg-primary border border-rose-500/15 p-6 rounded-2xl flex flex-col items-center justify-center text-center py-12">
            <Lock className="w-8 h-8 text-rose-500 mb-3 animate-pulse" />
            <p className="text-xs font-sans font-black text-text-primary uppercase tracking-widest">Access Restricted</p>
            <p className="text-[11px] text-text-muted font-sans font-medium mt-2 max-w-xs leading-relaxed">
              Your currently logged-in role does not have authorization to modify the Tournament Types Master List.
            </p>
            {/* View only table of current types */}
            <div className="mt-4 w-full max-w-md bg-bg-secondary rounded-xl border border-rose-500/5 overflow-hidden text-left">
              <div className="py-2 px-3 bg-bg-tertiary text-[10px] font-sans font-black text-slate-400 uppercase tracking-widest border-b border-rose-500/5">
                Current Registered Disciplines
              </div>
              <ul className="divide-y divide-rose-500/5">
                {(config.tournamentTypes || ['Soccer', 'Snooker', 'Table Tennis']).map((type, i) => {
                  const isSelected = type === (config.selectedTournamentType || config.tournamentTypes?.[0] || 'Snooker');
                  return (
                    <li key={i} className="py-2 px-3 text-xs font-sans text-slate-300 font-medium flex items-center justify-between">
                      <span>• {type}</span>
                      {isSelected && (
                        <span className="text-[8px] font-sans font-black tracking-widest bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 uppercase">
                          Active
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
