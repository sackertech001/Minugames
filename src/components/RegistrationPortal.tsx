import React, { useState, useRef } from 'react';
import { Player, PlayerApplication } from '../types';
import { 
  UserPlus, Trash2, Upload, Sparkles, AlertCircle, Edit, ShieldCheck, CheckCircle2,
  Check, XCircle, Users, FileText, Globe, Phone, MessageSquare, Calendar, ListFilter
} from 'lucide-react';
import { getDemoPlayers } from '../utils/demoData';
import { generateSnookerAvatar } from '../utils/avatar';
import ConfirmModal from './ConfirmModal';

interface RegistrationPortalProps {
  players: Player[];
  onPlayersChange: (players: Player[]) => void;
  onStartTournament: () => void;
  isTournamentStarted: boolean;
  playersCount: number;
  applications: PlayerApplication[];
  onApplicationsChange: (apps: PlayerApplication[]) => void;
}

export default function RegistrationPortal({
  players,
  onPlayersChange,
  onStartTournament,
  isTournamentStarted,
  playersCount,
  applications,
  onApplicationsChange,
}: RegistrationPortalProps) {
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [club, setClub] = useState('');
  const [seed, setSeed] = useState<number | ''>('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string>('');
  const [isDragActive, setIsDragActive] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [error, setError] = useState('');
  
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sub-tabs and Application states
  const [activeSubTab, setActiveSubTab] = useState<'roster' | 'applications'>('roster');
  const [appFilter, setAppFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedSeeds, setSelectedSeeds] = useState<Record<string, number>>({});


  // Find next available seed (1-playersCount)
  const getNextAvailableSeed = (): number => {
    const registeredSeeds = players.map((p) => p.seed);
    for (let s = 1; s <= playersCount; s++) {
      if (!registeredSeeds.includes(s)) {
        return s;
      }
    }
    return 1;
  };

  // Pre-fill next seed when opening form
  React.useEffect(() => {
    if (seed === '') {
      setSeed(getNextAvailableSeed());
    }
  }, [players, seed]);

  // Handle file reader
  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setPhotoDataUrl(e.target.result as string);
        setError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleAutoFill = () => {
    const demo = getDemoPlayers().slice(0, playersCount);
    // Adjust seeds from 1 to playersCount
    const adjustedDemo = demo.map((p, index) => ({
      ...p,
      seed: index + 1
    }));
    onPlayersChange(adjustedDemo);
    setError('');
  };

  const handleClearAll = () => {
    setShowClearAllConfirm(true);
  };

  const handleConfirmClearAll = () => {
    onPlayersChange([]);
    setEditingPlayerId(null);
    setName('');
    setNickname('');
    setClub('');
    setPhotoDataUrl('');
    setSeed(1);
    setShowClearAllConfirm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Player name is required.');
      return;
    }

    const seedNum = Number(seed);
    if (isNaN(seedNum) || seedNum < 1 || seedNum > playersCount) {
      setError(`Seed must be a number between 1 and ${playersCount}.`);
      return;
    }

    // Check duplicate seed
    const duplicateSeedPlayer = players.find(
      (p) => p.seed === seedNum && p.id !== editingPlayerId
    );
    if (duplicateSeedPlayer) {
      setError(`Seed #${seedNum} is already assigned to ${duplicateSeedPlayer.name}.`);
      return;
    }

    const finalPhotoUrl = photoDataUrl || generateSnookerAvatar(name, seedNum);

    if (editingPlayerId) {
      // Edit mode
      const updated = players.map((p) => {
        if (p.id === editingPlayerId) {
          return {
            ...p,
            name: name.trim(),
            nickname: nickname.trim() || undefined,
            club: club.trim() || undefined,
            seed: seedNum,
            photoUrl: finalPhotoUrl,
          };
        }
        return p;
      });
      // Sort by seed
      updated.sort((a, b) => a.seed - b.seed);
      onPlayersChange(updated);
      setEditingPlayerId(null);
    } else {
      // Add mode
      if (players.length >= playersCount) {
        setError(`Maximum limit of ${playersCount} players reached. You cannot register more.`);
        return;
      }

      const newPlayer: Player = {
        id: `p-${Date.now()}`,
        name: name.trim(),
        nickname: nickname.trim() || undefined,
        club: club.trim() || undefined,
        seed: seedNum,
        photoUrl: finalPhotoUrl,
        matchesPlayed: 0,
        matchesWon: 0,
        totalPoints: 0,
        highestBreak: 0,
        status: 'active',
      };

      const updated = [...players, newPlayer].sort((a, b) => a.seed - b.seed);
      onPlayersChange(updated);
    }

    // Reset inputs
    setName('');
    setNickname('');
    setClub('');
    setPhotoDataUrl('');
    setSeed('');
  };

  const handleEdit = (p: Player) => {
    setEditingPlayerId(p.id);
    setName(p.name);
    setNickname(p.nickname || '');
    setClub(p.club || '');
    setSeed(p.seed);
    setPhotoDataUrl(p.photoUrl);
    setError('');
  };

  const handleDelete = (playerId: string) => {
    if (isTournamentStarted) {
      setError('Cannot delete players once the tournament has started.');
      return;
    }
    setPlayerToDelete(playerId);
  };

  const handleConfirmDelete = () => {
    if (!playerToDelete) return;
    const updated = players.filter((p) => p.id !== playerToDelete);
    onPlayersChange(updated);
    if (editingPlayerId === playerToDelete) {
      setEditingPlayerId(null);
      setName('');
      setNickname('');
      setClub('');
      setPhotoDataUrl('');
      setSeed(getNextAvailableSeed());
    }
    setPlayerToDelete(null);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      {/* Registration Form (1 Column on XL) */}
      <div className="stadium-panel rounded-2xl p-6 shadow-xl h-fit transition-colors duration-300">
        <div className="flex items-center justify-between border-b border-slate-200/20 dark:border-[#2A2E37] pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-5 h-5 text-[#D4AF37]" />
            <h3 className="font-serif font-bold text-lg text-slate-800 dark:text-[#E0E2E6] uppercase tracking-wider">
              {editingPlayerId ? 'Edit Player' : 'Register Player'}
            </h3>
          </div>
          {!isTournamentStarted && players.length === 0 && (
            <button
              onClick={handleAutoFill}
              id="btn-auto-fill-players"
              className="flex items-center gap-1 text-xs font-bold text-[#D4AF37] hover:text-[#D4AF37]/80 bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" /> Quick Fill {playersCount}
            </button>
          )}
        </div>

        {isTournamentStarted && !editingPlayerId ? (
          <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/15 text-[#D4AF37]/90 rounded-xl p-4 text-xs flex gap-3 animate-in fade-in duration-200">
            <ShieldCheck className="w-5 h-5 text-[#D4AF37] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold uppercase tracking-wider mb-1 font-serif">Tournament Active</p>
              <p className="leading-relaxed text-slate-600 dark:text-[#9CA3AF]">
                The championship has commenced. Adding new players or deleting existing slots is disabled, but you can select any player from the active roster list on the right to edit their profile details.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 p-3 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-[#9CA3AF] uppercase tracking-wider mb-1.5">
                Player Full Name *
              </label>
              <input
                type="text"
                value={name}
                id="input-player-name"
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ronnie O'Sullivan"
                className="w-full bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-[#2A2E37] focus:border-[#D4AF37] rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-[#E0E2E6] placeholder-slate-400 dark:placeholder-slate-700 outline-none transition-colors"
                maxLength={40}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-[#9CA3AF] uppercase tracking-wider mb-1.5">
                  Nickname <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={nickname}
                  id="input-player-nickname"
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="e.g. The Rocket"
                  className="w-full bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-[#2A2E37] focus:border-[#D4AF37] rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-[#E0E2E6] placeholder-slate-400 dark:placeholder-slate-700 outline-none transition-colors"
                  maxLength={30}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-[#9CA3AF] uppercase tracking-wider mb-1.5">
                  Seed Rank (1-{playersCount}) *
                </label>
                <input
                  type="number"
                  value={seed}
                  id="input-player-seed"
                  disabled={isTournamentStarted}
                  onChange={(e) => setSeed(e.target.value === '' ? '' : Number(e.target.value))}
                  min={1}
                  max={playersCount}
                  className="w-full bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-[#2A2E37] focus:border-[#D4AF37] rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-[#E0E2E6] placeholder-slate-400 dark:placeholder-slate-700 outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-[#9CA3AF] uppercase tracking-wider mb-1.5">
                Representing Club / Region <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={club}
                id="input-player-club"
                onChange={(e) => setClub(e.target.value)}
                placeholder="e.g. London Snooker Academy"
                className="w-full bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-[#2A2E37] focus:border-[#D4AF37] rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-[#E0E2E6] placeholder-slate-400 dark:placeholder-slate-700 outline-none transition-colors"
                maxLength={50}
              />
            </div>

            {/* Drag and Drop File Upload */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-[#9CA3AF] uppercase tracking-wider mb-1.5">
                Player Photo / Profile Cover
              </label>

              {photoDataUrl ? (
                <div className="relative border border-slate-200 dark:border-[#2A2E37] rounded-xl p-3 bg-slate-50 dark:bg-[#0F1115] flex items-center gap-4">
                  <img
                    src={photoDataUrl}
                    alt="Uploaded avatar preview"
                    className="w-16 h-16 rounded-lg object-cover border border-slate-200 dark:border-[#2A2E37]"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-[#E0E2E6] truncate">Custom photo loaded</p>
                    <p className="text-[10px] text-slate-400 dark:text-[#6B7280]">Will be stored locally in database</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPhotoDataUrl('')}
                    className="p-1.5 text-slate-400 dark:text-[#6B7280] hover:text-red-500 hover:bg-slate-100 dark:hover:bg-[#12151A] rounded-lg transition-colors cursor-pointer"
                    title="Remove Image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={triggerFileInput}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    isDragActive
                      ? 'border-[#D4AF37] bg-[#D4AF37]/5'
                      : 'border-slate-200 dark:border-[#2A2E37] hover:border-[#D4AF37]/50 bg-slate-50 dark:bg-[#0F1115]'
                  }`}
                >
                  <Upload className="w-6 h-6 text-slate-400 dark:text-[#6B7280] mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-800 dark:text-[#E0E2E6] mb-0.5">
                    Drag & Drop Player photo or <span className="text-[#D4AF37] font-semibold">Browse</span>
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-[#6B7280]">Supports PNG, JPG, WEBP. Max 2MB.</p>
                  <p className="text-[9px] text-[#D4AF37]/40 mt-1.5">Leave empty to auto-generate a premium thematic avatar</p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              {editingPlayerId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingPlayerId(null);
                    setName('');
                    setNickname('');
                    setClub('');
                    setPhotoDataUrl('');
                    setSeed(getNextAvailableSeed());
                    setError('');
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-[#12151A] dark:hover:bg-[#1A1D23] border border-slate-200 dark:border-[#2A2E37] text-slate-700 dark:text-[#E0E2E6] font-bold text-sm py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                id="btn-save-player"
                className="flex-1 bg-[#D4AF37] hover:bg-[#D4AF37]/85 text-[#0F1115] font-bold text-sm py-2.5 rounded-xl transition-all shadow-lg shadow-[#D4AF37]/10 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {editingPlayerId ? <Edit className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                {editingPlayerId ? 'Update Player' : 'Register Player'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Players Progress and Grid (2 Columns on XL) */}
      <div className="xl:col-span-2 space-y-6">
        
        {/* Registration Sub-tab Toggle */}
        <div className="flex border-b border-slate-200 dark:border-[#2A2E37] gap-6 pb-px">
          <button
            type="button"
            onClick={() => setActiveSubTab('roster')}
            className={`pb-3 text-xs uppercase tracking-wider font-extrabold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'roster'
                ? 'border-[#D4AF37] text-[#D4AF37]'
                : 'border-transparent text-slate-400 hover:text-slate-800 hover:dark:text-[#E0E2E6]'
            }`}
          >
            <Users className="w-4 h-4" /> Active Roster ({players.length}/{playersCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('applications')}
            className={`pb-3 text-xs uppercase tracking-wider font-extrabold transition-all border-b-2 flex items-center gap-2 relative cursor-pointer ${
              activeSubTab === 'applications'
                ? 'border-[#D4AF37] text-[#D4AF37]'
                : 'border-transparent text-slate-400 hover:text-slate-800 hover:dark:text-[#E0E2E6]'
            }`}
          >
            <FileText className="w-4 h-4" /> Applications Register
            {applications.filter(a => a.status === 'pending').length > 0 && (
              <span className="bg-amber-500 text-[#0F1115] font-mono text-[9px] font-black px-1.5 py-0.5 rounded-full ml-1 border border-amber-600 animate-pulse-subtle">
                {applications.filter(a => a.status === 'pending').length} New
              </span>
            )}
          </button>
        </div>

        {activeSubTab === 'roster' ? (
          <>
            {/* Progress & Quick Actions */}
            <div className="stadium-panel rounded-2xl p-6 shadow-xl transition-colors duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-serif font-bold text-slate-800 dark:text-[#E0E2E6] text-sm uppercase tracking-wider mb-1">
                    Championship Readiness
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-[#9CA3AF]">
                    A perfect {playersCount}-player registration is required to draw the knockout bracket.
                  </p>
                </div>
                {!isTournamentStarted && players.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    id="btn-clear-all-players"
                    className="self-start sm:self-center text-xs font-bold text-red-500 hover:text-red-400 bg-red-500/5 border border-red-500/15 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Reset Board
                  </button>
                )}
              </div>

              {/* Progress bar */}
              <div className="mt-5">
                <div className="flex justify-between text-xs font-bold font-mono text-slate-500 dark:text-[#9CA3AF] mb-2">
                  <span>REGISTERED PLAYERS</span>
                  <span className="text-[#D4AF37]">{players.length} / {playersCount} Slots Filled</span>
                </div>
                <div className="w-full bg-slate-50 dark:bg-[#0F1115] rounded-full h-3.5 overflow-hidden border border-slate-200 dark:border-[#2A2E37]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      players.length === playersCount
                        ? 'bg-gradient-to-r from-[#D4AF37] to-emerald-500'
                        : 'bg-gradient-to-r from-[#D4AF37]/60 to-[#D4AF37]'
                    }`}
                    style={{ width: `${(players.length / playersCount) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Unlock Tournament Action */}
              {players.length === playersCount && !isTournamentStarted && (
                <div className="mt-5 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-[#D4AF37] shrink-0" />
                    <div>
                      <h5 className="text-sm font-bold text-[#D4AF37] uppercase tracking-wide font-serif">Ready to Draw Bracket</h5>
                      <p className="text-xs text-slate-500 dark:text-[#9CA3AF]">All {playersCount} slots are registered. Generate the schedule now.</p>
                    </div>
                  </div>
                  <button
                    onClick={onStartTournament}
                    id="btn-draw-brackets"
                    className="w-full sm:w-auto bg-[#D4AF37] hover:bg-[#D4AF37]/85 text-[#0F1115] font-bold text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-[#D4AF37]/15 transition-all cursor-pointer"
                  >
                    Commence Championship
                  </button>
                </div>
              )}
            </div>

            {/* Players List Grid */}
            <div className="stadium-panel rounded-2xl p-6 shadow-xl transition-colors duration-300">
              <h4 className="font-serif font-bold text-slate-800 dark:text-[#E0E2E6] text-sm uppercase tracking-wider mb-4">
                Registered Slots (Sorted by Seed)
              </h4>

              {players.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-[#2A2E37] rounded-xl bg-slate-50 dark:bg-[#12151A]/20">
                  <UserPlus className="w-10 h-10 text-slate-400 dark:text-[#6B7280] mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-[#9CA3AF] text-sm font-medium">No players registered yet</p>
                  <p className="text-slate-400 dark:text-[#6B7280] text-xs mt-1 max-w-sm mx-auto leading-relaxed">
                    Use the form on the left to register players, or click the <span className="text-[#D4AF37] font-semibold cursor-pointer hover:underline" onClick={handleAutoFill}>Quick Fill {playersCount}</span> button to auto-populate with the world's finest professionals!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[480px] overflow-y-auto pr-1">
                  {players.map((p) => (
                    <div
                      key={p.id}
                      className="bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-[#2A2E37] rounded-xl p-3 hover:border-[#D4AF37]/45 dark:hover:border-[#D4AF37]/45 transition-all flex items-center gap-3 relative group"
                    >
                      <div className="relative">
                        <img
                          src={p.photoUrl}
                          alt={p.name}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-[#2A2E37] shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute -top-1.5 -left-1.5 bg-white dark:bg-[#12151A] text-[9px] font-bold font-mono text-[#D4AF37] px-1 rounded border border-slate-200 dark:border-[#2A2E37]">
                          #{p.seed}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-[#E0E2E6] truncate group-hover:text-[#D4AF37] transition-colors">
                          {p.name}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-[#6B7280] italic truncate">
                          {p.nickname ? `"${p.nickname}"` : p.club || 'Independent'}
                        </p>
                      </div>

                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(p)}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-[#12151A] text-slate-400 dark:text-[#6B7280] hover:text-[#D4AF37] rounded transition-colors cursor-pointer"
                          title="Edit Player"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        {!isTournamentStarted && (
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-[#12151A] text-slate-400 dark:text-[#6B7280] hover:text-red-500 rounded transition-colors cursor-pointer"
                            title="Delete Player"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Empty Slots visualization if players count is less than playersCount */}
                  {players.length < playersCount &&
                    Array.from({ length: playersCount - players.length }).map((_, idx) => {
                      const emptySeed = getNextAvailableSeed() + idx;
                      // Make sure we only show valid seed counts
                      if (emptySeed <= playersCount) {
                        return (
                          <div
                            key={`empty-${idx}`}
                            className="border border-dashed border-slate-200 dark:border-[#2A2E37] bg-slate-50/50 dark:bg-[#12151A]/10 rounded-xl p-3 flex items-center gap-3 text-slate-400 dark:text-[#6B7280]"
                          >
                            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-[#0F1115]/80 border border-dashed border-slate-200 dark:border-[#2A2E37] flex items-center justify-center font-mono text-xs text-slate-400 dark:text-[#6B7280]/60 shrink-0">
                              #{emptySeed}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-slate-400 dark:text-[#6B7280] italic">Empty Slot</p>
                              <p className="text-[10px] text-slate-300 dark:text-[#6B7280]/40">Awaiting...</p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                </div>
              )}
            </div>
          </>
        ) : (
          /* APPLICATIONS REGISTER DASHBOARD */
          <div className="stadium-panel rounded-2xl p-6 shadow-xl space-y-6 transition-colors duration-300">
            
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100/20 dark:border-[#2A2E37]/50 pb-4">
              <div>
                <h4 className="font-serif font-bold text-slate-800 dark:text-[#E0E2E6] text-sm uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#D4AF37]" /> Player Application Register
                </h4>
                <p className="text-[11px] text-slate-400 dark:text-[#6B7280] mt-0.5">
                  Review entries submitted via the public registration link and sync selected players into the tournament seeds.
                </p>
              </div>

              {/* Demo Simulate entries button */}
              <button
                type="button"
                onClick={() => {
                  const demoApps: PlayerApplication[] = [
                    {
                      id: `app-sim-1`,
                      fullName: 'Judd Trump',
                      nickname: 'The Ace in the Pack',
                      photoUrl: generateSnookerAvatar('Judd Trump', 5),
                      club: 'Bristol Snooker Centre',
                      phoneNumber: '+44 7700 900077',
                      whatsappNumber: '+44 7700 900077',
                      socialMediaPage: 'https://instagram.com/juddtrump',
                      status: 'pending',
                      appliedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
                      documentUrl: 'data:application/pdf;base64,JVBERi0xLjUKMSAwIG9iagogIDw8IC9UeXBlIC9DYXRhbG9nCiAgICAgL1BhZ2VzIDIgMCBSCiAgPj4KZW5kb2JqCjIgMCBvYmoKICA8PCAvVHlwZSAvUGFnZXMKICAgICAvS2lkcyBbIDMgMCBSIF0KICAgICAvQ291bnQgMQogID4+CmVuZG9iagozIDAgb2JqCiAgPDwgL1R5cGUgL1BhZ2UKICAgICAvUGFyZW50IDIgMCBSCiAgICAgL01lZGlhQm94IFsgMCAwIDU5NSA4NDIgXQogICAgIC9Db250ZW50cyA0IDAgUgoKICA+PgplbmRvYmoKNCAwIG9iagogIDw8IC9MZW5ndGggNTYgPj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgogNzAgNzAwIFRECiAoSlVERCBUUlVNUCBWRVJJRklDQVRJT04gRE9DVU1FTlQpIFRQCgVFVAplbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA1CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxNyAwMDAwMCBuIAowMDAwMDAwMDgxIDAwMDAwIG4gCjAwMDAwMDAxNDkgAwMDAwIG4gCjAwMDAwMDAyNTUgAwMDAwIG4gCnRyYWlsZXIKICA8PCAvU2l6ZSA1CiAgICAgL1Jvb3QgMSAwIFIKICA+PgpzdGFydHhyZWYKMzYwCiUlRU9GCg==',
                      documentName: 'judd_trump_license.pdf'
                    },
                    {
                      id: `app-sim-2`,
                      fullName: 'Mark Selby',
                      nickname: 'The Jester from Leicester',
                      photoUrl: generateSnookerAvatar('Mark Selby', 12),
                      club: 'Leicester Snooker Club',
                      phoneNumber: '+44 7700 900088',
                      socialMediaPage: 'https://twitter.com/markselby',
                      status: 'pending',
                      appliedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
                      documentUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
                      documentName: 'mark_selby_id.png'
                    },
                    {
                      id: `app-sim-3`,
                      fullName: 'Kyren Wilson',
                      nickname: 'The Warrior',
                      photoUrl: generateSnookerAvatar('Kyren Wilson', 15),
                      club: 'Kettering Snooker Centre',
                      phoneNumber: '+44 7700 900099',
                      whatsappNumber: '+44 7700 900099',
                      status: 'pending',
                      appliedAt: new Date(Date.now() - 3600000 * 12).toISOString()
                    }
                  ];
                  onApplicationsChange([...demoApps, ...applications]);
                }}
                className="text-[10px] font-bold text-[#D4AF37] hover:bg-[#D4AF37]/10 border border-[#D4AF37]/25 px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Sparkles className="w-3.5 h-3.5" /> Simulate 3 Applications
              </button>
            </div>

            {/* Filter buttons bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-[#0F1115] p-2.5 rounded-xl border border-slate-200/60 dark:border-[#2A2E37]/50">
              <div className="flex items-center gap-1.5">
                <ListFilter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400 dark:text-[#6B7280] uppercase tracking-wider mr-1">Filter status:</span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => {
                  const count = status === 'all' 
                    ? applications.length 
                    : applications.filter(a => a.status === status).length;
                  const isActive = appFilter === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setAppFilter(status)}
                      className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all capitalize cursor-pointer flex items-center gap-1 border ${
                        isActive
                          ? 'bg-[#D4AF37] text-[#0F1115] border-[#D4AF37]'
                          : 'bg-white dark:bg-[#1A1D23] text-slate-500 dark:text-[#9CA3AF] border-slate-200 dark:border-[#2A2E37] hover:border-[#D4AF37]/50'
                      }`}
                    >
                      {status}
                      <span className={`text-[9px] font-mono font-black px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-[#0F1115]/15 text-[#0F1115]' : 'bg-slate-100 dark:bg-[#0F1115] text-slate-400'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Applications List */}
            {applications.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-[#2A2E37] rounded-2xl bg-slate-50/45 dark:bg-[#12151A]/10">
                <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-600 dark:text-[#9CA3AF]">No applications in register yet</p>
                <p className="text-xs text-slate-400 dark:text-[#6B7280] max-w-sm mx-auto mt-1 leading-relaxed">
                  Generate the public registration link in the Settings page and share it to players, or use the simulator button above to load demo entries!
                </p>
              </div>
            ) : applications.filter(a => appFilter === 'all' ? true : a.status === appFilter).length === 0 ? (
              <div className="text-center py-16 text-slate-400 dark:text-slate-600 text-xs italic">
                No entries match the "{appFilter}" status filter.
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {applications
                  .filter(a => appFilter === 'all' ? true : a.status === appFilter)
                  .map((app) => {
                    const assignedSeeds = players.map(p => p.seed);
                    const availableSeeds = [];
                    for (let i = 1; i <= playersCount; i++) {
                      if (!assignedSeeds.includes(i)) {
                        availableSeeds.push(i);
                      }
                    }
                    
                    const isRosterFull = players.length >= playersCount;
                    const selectedSeed = selectedSeeds[app.id] || availableSeeds[0] || 1;

                    return (
                      <div 
                        key={app.id}
                        className={`border rounded-xl p-4 space-y-4 transition-all relative group ${
                          app.status === 'approved' 
                            ? 'bg-emerald-500/5 border-emerald-500/20' 
                            : app.status === 'rejected'
                            ? 'bg-red-500/5 border-red-500/20'
                            : 'bg-slate-50/50 dark:bg-[#12151A]/40 border-slate-200 dark:border-[#2A2E37] hover:border-[#D4AF37]/35'
                        }`}
                      >
                        {/* Upper row: Avatar + details */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="flex items-center gap-3.5">
                            <img
                              src={app.photoUrl}
                              alt={app.fullName}
                              className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-[#2A2E37] shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h5 className="font-serif font-bold text-slate-800 dark:text-[#E0E2E6] text-xs">
                                  {app.fullName}
                                </h5>
                                {app.nickname && (
                                  <span className="text-[10px] text-[#D4AF37] font-bold tracking-tight bg-[#D4AF37]/10 px-1.5 py-0.2 rounded border border-[#D4AF37]/20">
                                    "{app.nickname}"
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 dark:text-[#6B7280] italic mt-0.5">
                                Representing: {app.club || 'Independent'}
                              </p>
                              <div className="flex items-center gap-1 text-[9px] text-slate-400 font-mono mt-1">
                                <Calendar className="w-3 h-3" /> Applied: {new Date(app.appliedAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>

                          {/* Top right badges or actions */}
                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <span className={`px-2 py-1 rounded text-[9px] font-extrabold uppercase tracking-wider border ${
                              app.status === 'approved'
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                : app.status === 'rejected'
                                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            }`}>
                              {app.status === 'approved' ? '✓ Approved & Synced' : app.status === 'rejected' ? '✗ Rejected' : '● Pending Review'}
                            </span>
                            
                            {/* Delete button */}
                            <button
                              type="button"
                              onClick={() => {
                                const updated = applications.filter(a => a.id !== app.id);
                                onApplicationsChange(updated);
                              }}
                              className="p-1 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-[#12151A] rounded-lg transition-all cursor-pointer"
                              title="Delete application entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Middle row: contacts metadata */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white dark:bg-[#12151A] p-2.5 rounded-xl border border-slate-100 dark:border-[#2A2E37]/30 text-[11px] font-medium text-slate-600 dark:text-[#9CA3AF]">
                          <a href={`tel:${app.phoneNumber}`} className="flex items-center gap-1.5 hover:text-[#D4AF37] transition-all truncate">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{app.phoneNumber}</span>
                          </a>
                          
                          {app.whatsappNumber ? (
                            <a href={`https://wa.me/${app.whatsappNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-emerald-500 transition-all truncate">
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span className="truncate">{app.whatsappNumber}</span>
                            </a>
                          ) : (
                            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-600 italic">
                              <MessageSquare className="w-3.5 h-3.5 text-slate-300 dark:text-slate-800 shrink-0" /> No WhatsApp
                            </div>
                          )}

                          {app.socialMediaPage ? (
                            <a href={app.socialMediaPage.startsWith('http') ? app.socialMediaPage : `https://${app.socialMediaPage}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-[#D4AF37] transition-all truncate">
                              <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span className="truncate hover:underline">{app.socialMediaPage.replace('https://', '').replace('http://', '')}</span>
                            </a>
                          ) : (
                            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-600 italic">
                              <Globe className="w-3.5 h-3.5 text-slate-300 dark:text-slate-800 shrink-0" /> No Social Page
                            </div>
                          )}
                        </div>

                        {/* Document verification block */}
                        {app.documentUrl && (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-500/5 dark:bg-[#D4AF37]/5 border border-[#D4AF37]/20 p-2.5 rounded-xl text-[11px]">
                            <div className="flex items-center gap-2 truncate text-slate-700 dark:text-[#E0E2E6] font-medium">
                              <FileText className="w-4 h-4 text-[#D4AF37] shrink-0" />
                              <span className="truncate">Verification Doc: <strong className="text-slate-900 dark:text-slate-100">{app.documentName || 'document.pdf'}</strong></span>
                            </div>
                            <a
                              href={app.documentUrl}
                              download={app.documentName || 'verification_document'}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] font-extrabold text-[9px] uppercase tracking-wider rounded-lg border border-[#D4AF37]/30 transition-all cursor-pointer shrink-0 text-center"
                            >
                              View / Download Document
                            </a>
                          </div>
                        )}

                        {/* Bottom row: Sync/Selection actions if pending */}
                        {app.status === 'pending' && (
                          <div className="pt-2 border-t border-slate-100 dark:border-[#2A2E37]/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <span className="text-[10px] font-bold text-slate-400 dark:text-[#6B7280] uppercase tracking-wider">Assign Seed Rank:</span>
                              <select
                                value={selectedSeed}
                                disabled={isRosterFull}
                                onChange={(e) => {
                                  setSelectedSeeds(prev => ({ ...prev, [app.id]: Number(e.target.value) }));
                                }}
                                className="bg-white dark:bg-[#12151A] border border-slate-200 dark:border-[#2A2E37] text-xs font-mono font-bold text-slate-800 dark:text-[#E0E2E6] px-2 py-1 rounded-lg focus:border-[#D4AF37] outline-none cursor-pointer"
                              >
                                {availableSeeds.map((s) => (
                                  <option key={s} value={s}>Seed #{s}</option>
                                ))}
                                {availableSeeds.length === 0 && <option value="">Roster Full</option>}
                              </select>
                            </div>

                            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                              {/* Reject button */}
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = applications.map(a => {
                                    if (a.id === app.id) return { ...a, status: 'rejected' as const };
                                    return a;
                                  });
                                  onApplicationsChange(updated);
                                }}
                                className="flex-1 sm:flex-none text-xs font-bold text-red-500 hover:bg-red-500/10 px-3.5 py-1.5 rounded-lg border border-red-500/15 transition-all flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Reject
                              </button>

                              {/* Sync/Approve button */}
                              <button
                                type="button"
                                disabled={isRosterFull || isTournamentStarted || availableSeeds.length === 0}
                                onClick={() => {
                                  if (isTournamentStarted) {
                                    setError('Cannot register new players. Tournament bracket is already locked.');
                                    return;
                                  }
                                  
                                  const finalSeed = selectedSeeds[app.id] || availableSeeds[0];
                                  if (!finalSeed) {
                                    setError('No available seed ranks left to assign.');
                                    return;
                                  }

                                  // Create player
                                  const newPlayer: Player = {
                                    id: `p-${Date.now()}`,
                                    name: app.fullName,
                                    nickname: app.nickname,
                                    club: app.club,
                                    seed: finalSeed,
                                    photoUrl: app.photoUrl,
                                    matchesPlayed: 0,
                                    matchesWon: 0,
                                    totalPoints: 0,
                                    highestBreak: 0,
                                    status: 'active',
                                  };

                                  // Add player
                                  onPlayersChange([...players, newPlayer].sort((a, b) => a.seed - b.seed));

                                  // Approve application
                                  const updated = applications.map(a => {
                                    if (a.id === app.id) return { ...a, status: 'approved' as const };
                                    return a;
                                  });
                                  onApplicationsChange(updated);
                                }}
                                className={`flex-1 sm:flex-none text-xs font-black px-4.5 py-2 rounded-xl border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                  isRosterFull || isTournamentStarted || availableSeeds.length === 0
                                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed dark:bg-[#12151A] dark:border-[#2A2E37]'
                                    : 'bg-[#D4AF37] border-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#0F1115] shadow-md shadow-[#D4AF37]/5'
                                }`}
                              >
                                <Check className="w-4 h-4 text-inherit" /> Sync to Tournament
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {/* Status notification if roster is full */}
                        {app.status === 'pending' && isRosterFull && (
                          <p className="text-[10px] text-amber-500 font-bold text-right italic">
                            * Roster is full ({playersCount}/{playersCount}). Free up a seed slot in Active Roster to sync.
                          </p>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>


      {/* Clear All Confirmation */}
      <ConfirmModal
        isOpen={showClearAllConfirm}
        title="Clear All Players"
        message="Are you sure you want to clear all registered players? This will reset any progress in the tournament registration. This action cannot be undone."
        confirmText="Clear All"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmClearAll}
        onCancel={() => setShowClearAllConfirm(false)}
      />

      {/* Delete Player Confirmation */}
      <ConfirmModal
        isOpen={playerToDelete !== null}
        title="Delete Player"
        message={`Are you sure you want to delete ${
          playerToDelete ? (players.find((p) => p.id === playerToDelete)?.name || 'this player') : 'this player'
        }?`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPlayerToDelete(null)}
      />
    </div>
  );
}
