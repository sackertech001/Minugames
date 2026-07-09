import React, { useState, useRef } from 'react';
import { Player, PlayerApplication, TournamentConfig } from '../types';
import { 
  UserPlus, Trash2, Upload, Sparkles, AlertCircle, Edit, ShieldCheck, CheckCircle2, Trophy,
  Check, XCircle, Users, FileText, Globe, Phone, MessageSquare, Calendar, ListFilter, Search, ArrowUpDown, Filter
} from 'lucide-react';
import { getDemoPlayers } from '../utils/demoData';
import { generateSnookerAvatar } from '../utils/avatar';
import ConfirmModal from './ConfirmModal';
import { getSupabase, safeInsertPlayer } from '../utils/supabaseClient';

interface RegistrationPortalProps {
  players: Player[];
  onPlayersChange: (players: Player[]) => void;
  onStartTournament: () => void;
  isTournamentStarted: boolean;
  playersCount: number;
  applications: PlayerApplication[];
  onApplicationsChange: (apps: PlayerApplication[]) => void;
  config: TournamentConfig;
  rounds?: Array<{ stage: string; status: 'active' | 'not started' | 'ended' }>;
}

export default function RegistrationPortal({
  players,
  onPlayersChange,
  onStartTournament,
  isTournamentStarted,
  playersCount,
  applications,
  onApplicationsChange,
  config,
  rounds = [],
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
  const [tournamentType, setTournamentType] = useState(config.selectedTournamentType || config.tournamentTypes?.[0] || 'Snooker');
  
  const pendingApplications = applications.filter(a => a.status === 'pending');

  React.useEffect(() => {
    setTournamentType(config.selectedTournamentType || config.tournamentTypes?.[0] || 'Snooker');
  }, [config.selectedTournamentType, config.tournamentTypes]);

  // Search and Sort states for Roster list
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterSortBy, setRosterSortBy] = useState<'name' | 'seed'>('seed');
  const [rosterSortOrder, setRosterSortOrder] = useState<'asc' | 'desc'>('asc');

  // Search and filter states for Applications list
  const [appSearch, setAppSearch] = useState('');
  const [appFilter, setAppFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedSeeds, setSelectedSeeds] = useState<Record<string, number>>({});
  const [profileSeeds, setProfileSeeds] = useState<number[]>([]);
  const [seedingMode, setSeedingMode] = useState<'random' | 'serial'>('random');
  const [hasApprovedInDb, setHasApprovedInDb] = useState(false);

  const playersLength = players.length;
  const appsLength = applications.length;

  React.useEffect(() => {
    const fetchProfileSeedsAndApprovedStatus = async () => {
      const supabase = getSupabase();
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('seed, status');
          if (!error && data) {
            const seeds = data
              .map((p: any) => p.seed)
              .filter((s: any) => s !== null && s !== undefined && typeof s === 'number');
            setProfileSeeds(seeds);

            const approvedStatuses = ['approved', 'active', 'eliminated', 'champion', 'runner_up', 'third_place', 'fourth_place'];
            const hasApprovedProfile = data.some((p: any) => approvedStatuses.includes(p.status));
            if (hasApprovedProfile) {
              setHasApprovedInDb(true);
            } else {
              const { count, error: countError } = await supabase
                .from('players')
                .select('*', { count: 'exact', head: true });
              if (!countError && count !== null) {
                setHasApprovedInDb(count > 0);
              }
            }
          }
        } catch (err) {
          console.log('[RegistrationPortal] Error fetching profile seeds / approved status:', err);
        }
      }
    };
    fetchProfileSeedsAndApprovedStatus();
  }, [playersLength, appsLength]);

  // Find next available seed
  const getNextAvailableSeed = (): number => {
    const registeredSeeds = players.map((p) => p.seed);
    const maxSearch = Math.max(playersCount, players.length + 100);
    for (let s = 1; s <= maxSearch; s++) {
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
      setError('Player Name is required.');
      return;
    }

    if (seed === '' || seed < 1) {
      setError('A valid Seed Rank is required.');
      return;
    }

    // Check seed duplication only if registering a new player or if seed is being changed
    const originalPlayer = editingPlayerId ? players.find((p) => p.id === editingPlayerId) : null;
    const isSeedChanged = !originalPlayer || originalPlayer.seed !== Number(seed);

    if (isSeedChanged) {
      const duplicateSeed = players.find(
        (p) => p.seed === Number(seed) && p.id !== editingPlayerId
      );
      if (duplicateSeed) {
        setError(`Seed #${seed} is already assigned to ${duplicateSeed.name}.`);
        return;
      }
    }

    const finalPhoto = photoDataUrl || generateSnookerAvatar(name, Number(seed) || 5);

    if (editingPlayerId) {
      // Edit Player
      const updated = players.map((p) => {
        if (p.id === editingPlayerId) {
          return {
            ...p,
            name: name.trim(),
            nickname: nickname.trim() || undefined,
            club: club.trim() || undefined,
            seed: Number(seed),
            photoUrl: finalPhoto,
            tournamentType: tournamentType,
          };
        }
        return p;
      });
      onPlayersChange(updated.sort((a, b) => a.seed - b.seed));
      setEditingPlayerId(null);
    } else {
      // Create Player
      if (players.length >= playersCount) {
        setError(`Roster is already full (${playersCount}/${playersCount} players).`);
        return;
      }

      const newPlayer: Player = {
        id: `P-${Date.now()}`,
        name: name.trim(),
        nickname: nickname.trim() || undefined,
        club: club.trim() || undefined,
        seed: Number(seed),
        photoUrl: finalPhoto,
        matchesPlayed: 0,
        matchesWon: 0,
        totalPoints: 0,
        highestBreak: 0,
        status: 'active',
        tournamentType: tournamentType,
      };

      onPlayersChange([...players, newPlayer].sort((a, b) => a.seed - b.seed));
    }

    // Reset Form
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
    if (p.tournamentType) {
      setTournamentType(p.tournamentType);
    }
  };

  const handleDelete = (id: string) => {
    setPlayerToDelete(id);
  };

  const handleConfirmDelete = () => {
    if (playerToDelete) {
      onPlayersChange(players.filter((p) => p.id !== playerToDelete));
      
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(playerToDelete);
      if (isUuid) {
        // Direct Supabase update for immediate, rock-solid consistency
        const supabase = getSupabase();
        if (supabase) {
          // Update profile status to pending and seed to null
          supabase
            .from('profiles')
            .update({ status: 'pending', seed: null })
            .eq('id', playerToDelete)
            .then(({ error: err }) => {
              if (err) console.log('[RegistrationPortal] Supabase direct status/seed update error on delete:', err.message);
            });

          // Delete from players table
          supabase
            .from('players')
            .delete()
            .or(`profile_id.eq.${playerToDelete},id.eq.${playerToDelete}`)
            .then(({ error: err }) => {
              if (err) console.log('[RegistrationPortal] Supabase direct players deletion error:', err.message);
            });
        }

        // Also update local application status back to pending so it instantly reflects in applications tab
        if (onApplicationsChange && applications) {
          const updated = applications.map((a) => {
            if (a.id === playerToDelete) {
              return { ...a, status: 'pending' as const };
            }
            return a;
          });
          onApplicationsChange(updated);
        }
      }

      setPlayerToDelete(null);
      if (editingPlayerId === playerToDelete) {
        setEditingPlayerId(null);
        setName('');
        setNickname('');
        setClub('');
        setPhotoDataUrl('');
        setSeed('');
      }
    }
  };

  // Helper for available seeds calculation
  const getAvailableSeeds = (): number[] => {
    const counts: Record<number, number> = {};
    for (let s = 1; s <= 32; s++) {
      counts[s] = 0;
    }

    if (profileSeeds.length > 0) {
      profileSeeds.forEach((s) => {
        if (counts[s] !== undefined) {
          counts[s]++;
        }
      });
    } else {
      players.forEach((p) => {
        if (p.seed && counts[p.seed] !== undefined) {
          counts[p.seed]++;
        }
      });
    }

    const available: number[] = [];
    for (let s = 1; s <= 32; s++) {
      if (counts[s] < 1) { // Strictly 1 player per seed
        available.push(s);
      }
    }
    return available;
  };

  const availableSeeds = getAvailableSeeds();
  const isRosterFull = players.length >= playersCount;

  // Filter & Sort registered players
  const filteredPlayers = players
    .filter((p) => {
      const term = rosterSearch.toLowerCase();
      return (
        p.name.toLowerCase().includes(term) ||
        (p.nickname && p.nickname.toLowerCase().includes(term)) ||
        (p.club && p.club.toLowerCase().includes(term))
      );
    })
    .sort((a, b) => {
      let comparison = 0;
      if (rosterSortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else {
        comparison = a.seed - b.seed;
      }
      return rosterSortOrder === 'asc' ? comparison : -comparison;
    });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start animate-in fade-in duration-300">
      
      {/* Registration Form Column */}
      <div className="bg-[#121F32] border border-[#1A2740] rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#1A6DFF]/5 rounded-full filter blur-2xl pointer-events-none" />
        
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-[#1A6DFF]/15 border border-[#1A6DFF]/30 text-[#1A6DFF] rounded-xl">
            <UserPlus className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h3 className="font-display font-black text-white text-base uppercase leading-none">
              {editingPlayerId ? 'Modify Contender' : 'Register Contender'}
            </h3>
            <p className="text-[11px] text-[#B2B6C2] font-sans uppercase mt-1 tracking-wider">
              {editingPlayerId ? 'Update player properties' : 'Enlist new contender on system'}
            </p>
          </div>
        </div>

        {isTournamentStarted && !editingPlayerId ? (
          <div className="p-4 bg-[#1A6DFF]/10 border border-[#1A6DFF]/25 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#1A6DFF] shrink-0 mt-0.5" />
            <div className="text-left">
              <span className="text-xs font-black text-[#1A6DFF] uppercase tracking-wider block">Registration Closed</span>
              <p className="text-xs text-[#B2B6C2] mt-1 leading-relaxed">
                The tournament has started, closing new registrations. However, you can still <strong>update contender profiles (portrait, full name, nickname)</strong> by clicking the edit pencil icon on any player in the Active Roster list.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-xs text-red-400 font-bold text-left flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Avatar Uploader */}
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-sans font-black text-[#787E90] uppercase tracking-wider block">Profile Portrait</label>
              <div 
                onClick={triggerFileInput}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all duration-300 ${
                  isDragActive
                    ? 'border-[#1A6DFF] bg-[#1A6DFF]/5'
                    : photoDataUrl 
                    ? 'border-[#1A2740] bg-[#04142B]' 
                    : 'border-[#1A2740] hover:border-[#1A6DFF]/50 bg-[#04142B]'
                }`}
              >
                {photoDataUrl ? (
                  <div className="relative inline-block">
                    <img 
                      src={photoDataUrl || null} 
                      alt="Selected avatar" 
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-[#1A6DFF] mx-auto shadow-md"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPhotoDataUrl('');
                      }}
                      className="absolute -top-1.5 -right-1.5 bg-[#EF4444] hover:bg-red-600 text-white p-1 rounded-full shadow transition-all hover:scale-110"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Upload className="w-6 h-6 text-[#787E90] mx-auto" />
                    <p className="text-xs font-semibold text-[#EEF1F5]">
                      Drag & Drop portrait or <span className="text-[#1A6DFF] hover:underline">Browse</span>
                    </p>
                    <p className="text-[10px] text-[#787E90]">JPG, PNG, Base64 (max 2MB)</p>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            </div>

            {/* Tournament Type Selector */}
            {config.tournamentTypes && config.tournamentTypes.length > 0 && (
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-sans font-black text-[#787E90] uppercase tracking-wider block">Game Category</label>
                <div className="relative">
                  <select
                    value={tournamentType}
                    onChange={(e) => setTournamentType(e.target.value)}
                    className="w-full bg-[#04142B] border border-[#1A2740] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#1A6DFF] transition-colors appearance-none cursor-pointer"
                  >
                    {config.tournamentTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#787E90]">
                    ▼
                  </div>
                </div>
              </div>
            )}

            {/* Form Inputs */}
            <div className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[10px] font-sans font-black text-[#787E90] uppercase tracking-wider block">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Stephen Hendry"
                  className="w-full bg-[#04142B] border border-[#1A2740] rounded-xl px-4 py-3 text-sm text-[#EEF1F5] placeholder-[#787E90] outline-none focus:border-[#1A6DFF] transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-sans font-black text-[#787E90] uppercase tracking-wider block">Alias / Nickname</label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder='e.g. "The Maverick"'
                    className="w-full bg-[#04142B] border border-[#1A2740] rounded-xl px-4 py-3 text-sm text-[#EEF1F5] placeholder-[#787E90] outline-none focus:border-[#1A6DFF] transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-sans font-black text-[#787E90] uppercase tracking-wider block">Seed / Rank</label>
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value === '' ? '' : Number(e.target.value))}
                    min="1"
                    max={playersCount}
                    placeholder="e.g. 1"
                    disabled={isTournamentStarted}
                    className={`w-full bg-[#04142B] border border-[#1A2740] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1A6DFF] transition-colors ${
                      isTournamentStarted 
                        ? 'text-[#787E90] bg-[#04142B]/50 border-[#1A2740]/40 cursor-not-allowed' 
                        : 'text-[#EEF1F5] placeholder-[#787E90]'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-sans font-black text-[#787E90] uppercase tracking-wider block">Club Affiliation</label>
                <input
                  type="text"
                  value={club}
                  onChange={(e) => setClub(e.target.value)}
                  placeholder="e.g. Crucible Club"
                  className="w-full bg-[#04142B] border border-[#1A2740] rounded-xl px-4 py-3 text-sm text-[#EEF1F5] placeholder-[#787E90] outline-none focus:border-[#1A6DFF] transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-3.5 pt-2">
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
                  className="flex-1 bg-[#04142B] hover:bg-[#1A2740] border border-[#1A2740] text-[#B2B6C2] font-black text-xs py-3.5 rounded-xl transition-all cursor-pointer uppercase tracking-wider"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-[#1A6DFF] to-[#0C48B8] hover:from-[#4088FF] hover:to-[#1A6DFF] text-white font-black text-xs tracking-wider py-3.5 rounded-xl transition-all shadow-lg shadow-[#1A6DFF]/10 flex items-center justify-center gap-2 cursor-pointer uppercase hover:scale-[1.01]"
              >
                {editingPlayerId ? <Edit className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                {editingPlayerId ? 'Update Contender' : 'Register Contender'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Roster & Applications Registers */}
      <div className="xl:col-span-2 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-[#1A2740] gap-6 pb-px">
          <button
            type="button"
            onClick={() => setActiveSubTab('roster')}
            className={`pb-3 text-xs uppercase tracking-widest font-black transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'roster'
                ? 'border-[#F1C317] text-[#EEF1F5]'
                : 'border-transparent text-[#787E90] hover:text-[#EEF1F5]'
            }`}
          >
            <Users className="w-4 h-4" /> Active Roster ({players.length}/{playersCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('applications')}
            className={`pb-3 text-xs uppercase tracking-widest font-black transition-all border-b-2 flex items-center gap-2 relative cursor-pointer ${
              activeSubTab === 'applications'
                ? 'border-[#F1C317] text-[#EEF1F5]'
                : 'border-transparent text-[#787E90] hover:text-[#EEF1F5]'
            }`}
          >
            <FileText className="w-4 h-4" /> Applications ({pendingApplications.length})
          </button>
        </div>

        {activeSubTab === 'roster' ? (
          <>
            {/* Readiness Card */}
            <div className="bg-[#121F32] border border-[#1A2740] rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-[#F1C317]/10 border border-[#F1C317]/20 flex items-center justify-center shrink-0">
                    <Trophy className="w-5 h-5 text-[#F1C317]" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-sans font-black text-white text-sm uppercase tracking-wider mb-0.5">
                      Championship Readiness
                    </h4>
                    <p className="text-xs text-[#B2B6C2]">
                      A total of {playersCount} contestants are required to compile brackets.
                    </p>
                  </div>
                </div>

                {!isTournamentStarted && players.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="self-start sm:self-center text-xs font-black text-[#EF4444] hover:text-white hover:bg-[#EF4444] border border-[#EF4444]/20 hover:border-transparent px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Wipe Board
                  </button>
                )}
              </div>

              {/* Progress Indicator */}
              <div className="mt-5">
                <div className="flex justify-between text-[10px] font-sans font-black text-[#787E90] tracking-widest uppercase mb-2">
                  <span>Registered Contenders</span>
                  <span className="text-[#F1C317]">{players.length} / {playersCount} REGISTERED</span>
                </div>
                <div className="w-full bg-[#04142B] rounded-full h-3.5 overflow-hidden border border-[#1A2740]">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-[#1A6DFF] to-[#0C48B8] shadow-[0_0_12px_rgba(26,109,255,0.4)]"
                    style={{ width: `${Math.min(100, (players.length / playersCount) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Draw Lock State / CTA */}
              {!isTournamentStarted && (
                <div className="mt-6 pt-5 border-t border-[#1A2740]/60 flex flex-wrap items-center justify-between gap-4">
                  {players.length < playersCount ? (
                    <div className="flex items-center gap-2.5 text-[#B2B6C2]">
                      <AlertCircle className="w-5 h-5 text-[#F1C317] shrink-0" />
                      <span className="text-xs">
                        Need <strong className="text-white">{playersCount - players.length}</strong> more players. Use manual entry or enrollees above.
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 text-emerald-400">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      <span className="text-xs font-bold uppercase tracking-wider">ROSTER COMPLETELY LOADED</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    {players.length === 0 && !isTournamentStarted && (
                      <button
                        onClick={handleAutoFill}
                        className="bg-[#04142B] border border-[#1A2740] hover:bg-[#1A2740] text-xs font-black px-4.5 py-3 rounded-xl text-[#B2B6C2] hover:text-white transition-all uppercase tracking-wider cursor-pointer"
                      >
                        ⚡ Autofill Demo Roster
                      </button>
                    )}

                    {players.length === playersCount && !isTournamentStarted && (() => {
                      const isInitializeActive = rounds.every(r => r.status !== 'active');
                      return (
                        <button
                          onClick={onStartTournament}
                          disabled={!isInitializeActive}
                          className={`text-xs font-black px-5 py-3 rounded-xl transition-all shadow-lg flex items-center gap-1.5 uppercase tracking-widest ${
                            isInitializeActive
                              ? "bg-gradient-to-r from-[#F1C317] to-[#FFD43B] hover:from-[#FFD43B] hover:to-[#F1C317] text-[#010C1E] shadow-[#F1C317]/10 animate-pulse hover:scale-[1.01] cursor-pointer"
                              : "bg-gray-700 text-gray-500 border border-gray-600 cursor-not-allowed opacity-50 font-semibold"
                          }`}
                          title={isInitializeActive ? "Initialize tournament brackets" : "Cannot initialize: some rounds are already active"}
                        >
                          <ShieldCheck className="w-4 h-4 fill-current" /> Initialize Tournament Brackets
                        </button>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Advanced Filters & Roster List */}
            <div className="bg-[#121F32] border border-[#1A2740] rounded-3xl p-6 shadow-xl space-y-6">
              
              {/* Filter controls panel */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1A2740]/40 pb-5">
                {/* Search bar */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#787E90]" />
                  <input
                    type="text"
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    placeholder="Search name, nickname, club..."
                    className="w-full bg-[#04142B] border border-[#1A2740] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#EEF1F5] placeholder-[#787E90] outline-none focus:border-[#1A6DFF] transition-colors"
                  />
                </div>

                {/* Sort control */}
                <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
                  <span className="text-[#787E90] font-sans font-black uppercase tracking-wider text-[10px]">Sort by:</span>
                  <select
                    value={rosterSortBy}
                    onChange={(e) => setRosterSortBy(e.target.value as 'name' | 'seed')}
                    className="bg-[#04142B] border border-[#1A2740] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer"
                  >
                    <option value="seed">Seed Rank</option>
                    <option value="name">Full Name</option>
                  </select>
                  
                  <button
                    onClick={() => setRosterSortOrder(p => p === 'asc' ? 'desc' : 'asc')}
                    className="p-1.5 rounded-lg bg-[#04142B] border border-[#1A2740] hover:bg-[#1A2740] text-[#B2B6C2] hover:text-white transition-colors"
                    title="Toggle Sort Order"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Roster Cards List */}
              {filteredPlayers.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-[#1A2740] rounded-2xl">
                  <Users className="w-8 h-8 text-[#787E90]/40 mx-auto mb-2" />
                  <p className="text-xs text-[#B2B6C2]">No registered contenders found matching search filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredPlayers.map((p) => (
                    <div 
                      key={p.id}
                      className="group bg-[#04142B] border border-[#1A2740] hover:border-[#1A6DFF]/30 p-4 rounded-2xl flex items-center justify-between gap-4 transition-all duration-300 hover:shadow-lg relative overflow-hidden"
                    >
                      {/* Interactive decorative line */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1A6DFF] opacity-0 group-hover:opacity-100 transition-opacity" />

                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={p.photoUrl || null}
                            alt={p.name}
                            className="w-11 h-11 rounded-2xl object-cover border-2 border-[#1A2740] group-hover:border-[#1A6DFF]/50 transition-colors"
                            referrerPolicy="no-referrer"
                          />
                          <span className="absolute -top-1.5 -left-1.5 bg-[#121F32] text-[9px] font-black text-[#F1C317] border border-[#1A2740] px-1.5 py-0.5 rounded-md shadow-sm font-mono">
                            #{p.seed}
                          </span>
                        </div>
                        <div className="min-w-0 text-left">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h5 className="text-xs font-black text-white truncate leading-none">
                              {p.name}
                            </h5>
                            {p.tournamentType && (
                              <span className="text-[8px] font-sans font-black bg-[#1A6DFF]/15 text-[#1A6DFF] px-1.5 py-0.5 rounded border border-[#1A6DFF]/20 uppercase">
                                {p.tournamentType}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-[#B2B6C2] mt-1 font-sans truncate italic">
                            {p.nickname ? `"${p.nickname}"` : p.club || 'Independent Contender'}
                          </p>
                        </div>
                      </div>

                      {/* Hover action tray */}
                      <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all shrink-0">
                        <button
                          onClick={() => handleEdit(p)}
                          className="p-1.5 hover:bg-[#1A6DFF]/15 text-[#787E90] hover:text-[#1A6DFF] rounded-lg transition-colors cursor-pointer"
                          title="Edit Player"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        {!isTournamentStarted && (
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 hover:bg-[#EF4444]/15 text-[#787E90] hover:text-[#EF4444] rounded-lg transition-colors cursor-pointer"
                            title="Delete Player"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Empty Slots visualization */}
                  {players.length < playersCount &&
                    Array.from({ length: playersCount - players.length }).map((_, idx) => {
                      const emptySeed = getNextAvailableSeed() + idx;
                      if (emptySeed <= playersCount) {
                        return (
                          <div
                            key={`empty-${idx}`}
                            className="border border-dashed border-[#1A2740] bg-[#04142B]/20 rounded-2xl p-4 flex items-center gap-3 text-[#787E90] italic text-xs text-left"
                          >
                            <div className="w-10 h-10 rounded-xl bg-[#04142B] border border-dashed border-[#1A2740] flex items-center justify-center font-black text-[10px] text-[#787E90] shrink-0">
                              #{emptySeed}
                            </div>
                            <span>Empty Bracket Rank Slot</span>
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
          /* Application sub-tab screen */
          <div className="bg-[#121F32] border border-[#1A2740] rounded-3xl p-6 shadow-xl space-y-6">
            
            {/* Filter controls panel */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1A2740]/40 pb-5">
              {/* Search bar */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#787E90]" />
                <input
                  type="text"
                  value={appSearch}
                  onChange={(e) => setAppSearch(e.target.value)}
                  placeholder="Search pending applicants..."
                  className="w-full bg-[#04142B] border border-[#1A2740] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#EEF1F5] placeholder-[#787E90] outline-none focus:border-[#1A6DFF] transition-colors"
                />
              </div>

              {/* Status Info Badge */}
              <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
                <span className="text-[10px] font-sans font-black uppercase tracking-widest bg-[#F1C317]/10 text-[#F1C317] border border-[#F1C317]/20 px-3 py-1.5 rounded-xl animate-pulse">
                  ● PENDING APPLICATIONS ONLY
                </span>
              </div>
            </div>

            {/* Seeding Mode Toggle */}
            {(() => {
              const isSeedingToggleDisabled = hasApprovedInDb || players.length > 0 || applications.some(a => a.status === 'approved');
              return (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#04142B] border border-[#1A2740] rounded-2xl p-4">
                  <div className="text-left">
                    <span className="text-xs font-black text-white uppercase tracking-wider block">Automatic Seeding Mode</span>
                    <p className="text-[11px] text-[#B2B6C2] mt-0.5">
                      Choose how seed ranks (1 to 32) are assigned upon applicant approval.
                    </p>
                    {isSeedingToggleDisabled && (
                      <p className="text-[10px] text-[#F1C317] font-semibold mt-1">
                        ⚠️ Toggle locked: approved players exist in the tournament records.
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center bg-[#121F32] p-1 rounded-xl border border-[#1A2740] self-start sm:self-auto shrink-0">
                    <button
                      type="button"
                      disabled={isSeedingToggleDisabled}
                      onClick={() => setSeedingMode('random')}
                      className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                        seedingMode === 'random'
                          ? 'bg-gradient-to-r from-[#1A6DFF] to-[#0C48B8] text-white shadow'
                          : 'text-[#787E90] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    >
                      🎲 Random (1-32)
                    </button>
                    <button
                      type="button"
                      disabled={isSeedingToggleDisabled}
                      onClick={() => setSeedingMode('serial')}
                      className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                        seedingMode === 'serial'
                          ? 'bg-gradient-to-r from-[#1A6DFF] to-[#0C48B8] text-white shadow'
                          : 'text-[#787E90] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    >
                      🔢 Serial (1-32)
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Applications List overflow block */}
            {pendingApplications.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-[#1A2740] rounded-2xl">
                <FileText className="w-10 h-10 text-[#787E90]/30 mx-auto mb-3" />
                <p className="text-xs text-[#B2B6C2] max-w-sm mx-auto leading-relaxed">
                  No pending online applications registered. Players can apply publicly using the Registration Token.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingApplications
                  .filter((app) => {
                    // Filter logic
                    const matchSearch = 
                      app.fullName.toLowerCase().includes(appSearch.toLowerCase()) ||
                      (app.club && app.club.toLowerCase().includes(appSearch.toLowerCase())) ||
                      app.phoneNumber.includes(appSearch);
                    
                    return matchSearch;
                  })
                  .map((app) => {
                    const selectedSeed = selectedSeeds[app.id] || availableSeeds[0];
                    return (
                      <div 
                        key={app.id} 
                        className="bg-[#04142B] border border-[#1A2740] rounded-2xl p-5 space-y-4 text-left transition-all hover:border-[#1A2740]/80 relative overflow-hidden"
                      >
                        {/* Status tag */}
                        <div className="absolute top-4 right-4">
                          <span className={`text-[9px] font-sans font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                            app.status === 'pending'
                              ? 'bg-[#F1C317]/10 text-[#F1C317] border-[#F1C317]/20 animate-pulse'
                              : app.status === 'approved'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            {app.status}
                          </span>
                        </div>

                        {/* Profile segment */}
                        <div className="flex gap-4 items-start pr-16">
                          <img
                            src={app.photoUrl || null}
                            alt={app.fullName}
                            className="w-12 h-12 rounded-2xl object-cover border border-[#1A2740] shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-black text-white">{app.fullName}</h4>
                              {app.tournamentType && (
                                <span className="text-[8px] font-sans font-black bg-[#1A6DFF]/10 text-[#1A6DFF] px-1.5 py-0.5 rounded border border-[#1A6DFF]/20 uppercase">
                                  {app.tournamentType}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#B2B6C2] mt-0.5">
                              {app.nickname ? `"${app.nickname}"` : 'No nickname'} • {app.club || 'Independent'}
                            </p>
                            <p className="text-[10px] text-[#787E90] mt-1.5">
                              Applied on {new Date(app.appliedAt).toLocaleDateString()} at {new Date(app.appliedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>

                        {/* Contact segment info */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs pt-1">
                          <div className="flex items-center gap-2 text-[#B2B6C2] bg-[#121F32]/40 px-3 py-2 rounded-xl border border-[#1A2740]/40">
                            <Phone className="w-3.5 h-3.5 text-[#1A6DFF]" />
                            <span className="truncate">{app.phoneNumber}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-[#B2B6C2] bg-[#121F32]/40 px-3 py-2 rounded-xl border border-[#1A2740]/40">
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="truncate">{app.whatsappNumber || 'No WhatsApp'}</span>
                          </div>

                          <div className="flex items-center gap-2 text-[#B2B6C2] bg-[#121F32]/40 px-3 py-2 rounded-xl border border-[#1A2740]/40">
                            <Globe className="w-3.5 h-3.5 text-[#F1C317]" />
                            <span className="truncate">{app.socialMediaPage || 'No Social Handle'}</span>
                          </div>
                        </div>

                        {/* Verification Docs */}
                        {app.documentUrl && (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121F32] border border-[#1A2740] p-3 rounded-2xl text-[11px]">
                            <div className="flex items-center gap-2.5 truncate text-[#B2B6C2]">
                              <FileText className="w-4 h-4 text-[#1A6DFF]" />
                              <span className="truncate">Payment Proof: <strong className="text-white font-black">{app.documentName || 'receipt.pdf'}</strong></span>
                            </div>
                            <a
                              href={app.documentUrl}
                              download={app.documentName || 'verification'}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-[#1A6DFF]/10 hover:bg-[#1A6DFF]/20 text-[#1A6DFF] font-sans font-black text-[10px] uppercase tracking-wider rounded-lg border border-[#1A6DFF]/20 transition-all cursor-pointer text-center"
                            >
                              Verify Proof Document
                            </a>
                          </div>
                        )}

                        {/* Pending Review Actions */}
                        {app.status === 'pending' && (
                          <div className="pt-3 border-t border-[#1A2740]/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <span className="text-[10px] font-sans font-black text-[#787E90] uppercase tracking-widest">Assign Seed:</span>
                              <select
                                value={selectedSeed || ''}
                                disabled={isRosterFull}
                                onChange={(e) => {
                                  setSelectedSeeds(prev => ({ ...prev, [app.id]: Number(e.target.value) }));
                                }}
                                className="bg-[#121F32] border border-[#1A2740] text-xs font-mono font-black text-white px-3 py-1.5 rounded-xl focus:border-[#1A6DFF] outline-none cursor-pointer"
                              >
                                {availableSeeds.map((s) => (
                                  <option key={s} value={s}>Seed #{s}</option>
                                ))}
                                {availableSeeds.length === 0 && <option value="">Roster Full</option>}
                              </select>
                            </div>

                            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = applications.map(a => {
                                    if (a.id === app.id) return { ...a, status: 'rejected' as const };
                                    return a;
                                  });
                                  onApplicationsChange(updated);
                                }}
                                className="flex-1 sm:flex-none text-xs font-black text-[#EF4444] hover:bg-[#EF4444]/10 px-4 py-2.5 rounded-xl border border-[#EF4444]/20 transition-all flex items-center justify-center gap-1 cursor-pointer uppercase tracking-wider"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Reject
                              </button>

                              <button
                                type="button"
                                disabled={isRosterFull || isTournamentStarted || availableSeeds.length === 0}
                                onClick={() => {
                                  if (isTournamentStarted) {
                                    setError('Cannot register. Tournament has already locked brackets.');
                                    return;
                                  }
                                  
                                  // Pick seed based on active seeding mode if not manually selected
                                  let finalSeed = selectedSeeds[app.id];
                                  if (!finalSeed && availableSeeds.length > 0) {
                                    if (seedingMode === 'random') {
                                      const randomIndex = Math.floor(Math.random() * availableSeeds.length);
                                      finalSeed = availableSeeds[randomIndex];
                                    } else {
                                      finalSeed = availableSeeds[0];
                                    }
                                  }
                                  
                                  if (!finalSeed) {
                                    setError('No available seeds left.');
                                    return;
                                  }

                                  const newPlayer: Player = {
                                    id: app.id,
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
                                    tournamentType: app.tournamentType,
                                  };

                                  // Direct Supabase update for immediate, rock-solid consistency
                                  const supabase = getSupabase();
                                  if (supabase) {
                                    supabase
                                      .from('profiles')
                                      .update({ status: 'approved', seed: finalSeed })
                                      .eq('id', app.id)
                                      .then(({ error: err }) => {
                                        if (err) console.log('[RegistrationPortal] Supabase direct status/seed update error:', err.message);
                                      });

                                    // Direct insert to the players table to ensure it always exists immediately
                                    safeInsertPlayer(supabase, {
                                      profile_id: app.id,
                                      player_name: app.fullName,
                                      name: app.fullName,
                                      nickname: app.nickname || null,
                                      club: app.club || null,
                                      seed: finalSeed,
                                      photo_url: app.photoUrl || null,
                                      photoUrl: app.photoUrl || null,
                                      matches_played: 0,
                                      matches_won: 0,
                                      total_points: 0,
                                      highest_break: 0,
                                      status: 'active',
                                      tournament_type: app.tournamentType || null,
                                      tournamentType: app.tournamentType || null
                                    });
                                  }

                                  onPlayersChange([...players, newPlayer].sort((a, b) => a.seed - b.seed));

                                  const updated = applications.map(a => {
                                    if (a.id === app.id) return { ...a, status: 'approved' as const };
                                    return a;
                                  });
                                  onApplicationsChange(updated);
                                }}
                                className={`flex-1 sm:flex-none text-xs font-black px-4.5 py-2.5 rounded-xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase ${
                                  isRosterFull || isTournamentStarted || availableSeeds.length === 0
                                    ? 'bg-[#04142B] border-[#1A2740]/40 text-[#787E90] cursor-not-allowed'
                                    : 'bg-gradient-to-r from-[#1A6DFF] to-[#0C48B8] border-transparent text-white shadow-md'
                                }`}
                              >
                                <Check className="w-4 h-4" /> Approve & Sync
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {app.status === 'pending' && isRosterFull && (
                          <p className="text-[10px] text-[#EF4444] font-sans font-black text-right italic uppercase tracking-wider">
                            * Roster is full ({playersCount}/{playersCount}). Free up a seed slot to sync player.
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
