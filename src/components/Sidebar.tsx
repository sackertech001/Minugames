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
      <div className="text-2xl font-display text-accent-blue mb-8 px-4 py-2">
        CUE MASTER
      </div>
      
      <div className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
              activeTab === item.id 
                ? 'bg-accent-blue/20 text-white border border-accent-blue/30'
                : 'text-text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-semibold text-sm uppercase tracking-wider">{item.label}</span>
            {activeTab === item.id && (
              <motion.div layoutId="activeTab" className="absolute left-0 w-1 h-8 bg-accent-blue rounded-r-full" />
            )}
          </button>
        ))}
      </div>
    </motion.nav>
  );
}
