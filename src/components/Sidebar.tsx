import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Users, GitFork, Tv, Info, Settings, LayoutDashboard } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isTabAllowed: (tab: string) => boolean;
}

export default function Sidebar({ activeTab, setActiveTab, isTabAllowed }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'info', label: 'Tournament Info', icon: Info },
    { id: 'registration', label: 'Players', icon: Users },
    { id: 'bracket', label: 'Fixtures', icon: GitFork },
    { id: 'display', label: 'Live Center', icon: Tv },
    { id: 'settings', label: 'Settings', icon: Settings },
  ].filter(item => isTabAllowed(item.id));

  return (
    <motion.nav 
      initial={{ x: -100 }}
      animate={{ x: 0 }}
      className="fixed left-0 top-0 h-full w-64 p-4 glass-panel m-4 flex flex-col z-50"
    >
      <div className="text-2xl font-display mb-8 px-4 py-2 tracking-widest font-black uppercase shadow-sm flex items-center gap-2">
        <span className="text-white">MINU</span>
        <span className="text-rose-500">GAMES</span>
      </div>
      
      <div className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative ${
              activeTab === item.id 
                ? 'bg-rose-500/15 text-white border border-rose-500/20'
                : 'text-text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-rose-500' : ''}`} />
            <span className="font-sans font-black text-xs uppercase tracking-widest">{item.label}</span>
            {activeTab === item.id && (
              <motion.div layoutId="activeTab" className="absolute left-0 w-1 h-8 bg-rose-500 rounded-r-full" />
            )}
          </button>
        ))}
      </div>
    </motion.nav>
  );
}
