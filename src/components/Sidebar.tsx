import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Users, GitFork, Tv, Info, Settings, LayoutDashboard, ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isTabAllowed: (tab: string) => boolean;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ activeTab, setActiveTab, isTabAllowed, isCollapsed, setIsCollapsed }: SidebarProps) {
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
      animate={{ width: isCollapsed ? '80px' : '260px' }}
      className="fixed left-0 top-0 h-full p-4 bg-[#04142B] border-r border-[#1A2740]/80 flex flex-col z-50 transition-all duration-300 shadow-[4px_0_24px_rgba(0,0,0,0.3)]"
    >
      {/* Brand Logo area */}
      <div className={`mb-8 px-2 py-3 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} border-b border-[#1A2740]/40 pb-5`}>
        {!isCollapsed && (
          <div className="text-xl font-display tracking-wider font-extrabold uppercase flex items-center gap-2">
            <span className="text-white">MINU</span>
            <span className="text-[#1A6DFF]">GAMES</span>
          </div>
        )}
        {isCollapsed && (
          <div className="w-10 h-10 rounded-xl bg-[#1A6DFF] flex items-center justify-center font-display font-black text-white text-lg shadow-[0_0_15px_rgba(26,109,255,0.4)]">
            M
          </div>
        )}
      </div>
      
      {/* Menu items list */}
      <div className="flex-1 space-y-2">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center py-3.5' : 'gap-3 px-4 py-3'} rounded-xl transition-all duration-300 relative group ${
                isActive 
                  ? 'bg-gradient-to-r from-[#1A6DFF]/15 to-transparent text-[#EEF1F5] border border-[#1A6DFF]/30 shadow-[inset_0_0_12px_rgba(26,109,255,0.1)]'
                  : 'text-[#B2B6C2] hover:text-[#EEF1F5] hover:bg-[#1A2740]/60'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-[#F1C317]' : ''}`} />
              
              {!isCollapsed && (
                <span className="font-sans font-black text-xs uppercase tracking-widest leading-none mt-0.5">{item.label}</span>
              )}
              
              {isActive && (
                <motion.div 
                  layoutId="activeTabIndicator" 
                  className="absolute left-0 w-1.5 h-8 bg-[#F1C317] rounded-r-full shadow-[0_0_10px_rgba(241,195,23,0.5)]" 
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Collapse toggle at the bottom */}
      <div className="border-t border-[#1A2740]/60 pt-4 flex justify-center">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2.5 rounded-xl bg-[#121F32] border border-[#1A2740] hover:bg-[#1A2740] text-[#B2B6C2] hover:text-[#EEF1F5] transition-all cursor-pointer shadow-md"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </motion.nav>
  );
}
