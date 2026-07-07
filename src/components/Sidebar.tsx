import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Users, GitFork, Tv, Info, Settings, LayoutDashboard, ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isTabAllowed: (tab: string) => boolean;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  systemLogo?: string;
}

export default function Sidebar({ activeTab, setActiveTab, isTabAllowed, isCollapsed, setIsCollapsed, systemLogo }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'info', label: 'Tournament Info', icon: Info },
    { id: 'registration', label: 'Players', icon: Users },
    { id: 'bracket', label: 'Fixtures', icon: GitFork },
    { id: 'display', label: 'Live Center', icon: Tv },
    { id: 'settings', label: 'Settings', icon: Settings },
  ].filter(item => isTabAllowed(item.id));

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.nav 
        animate={{ width: isCollapsed ? '80px' : '260px' }}
        className="hidden md:flex fixed left-0 top-0 h-full p-4 bg-[#04142B] border-r border-[#1A2740]/80 flex-col z-50 transition-all duration-300 shadow-[4px_0_24px_rgba(0,0,0,0.3)]"
      >
        {/* Brand Logo area */}
        <div className={`mb-8 px-2 py-3 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} border-b border-[#1A2740]/40 pb-5`}>
          <img 
            src={systemLogo || "https://fmbwnbvhvcuihzifiajk.supabase.co/storage/v1/object/public/website_logo/46.png"} 
            alt="Brand Logo" 
            className="w-10 h-10 object-contain rounded-xl"
            referrerPolicy="no-referrer"
          />
          {!isCollapsed && (
            <div className="text-sm font-display tracking-wider font-extrabold uppercase flex flex-col leading-none">
              <span className="text-white">MINU</span>
              <span className="text-[#1A6DFF]">GAMES</span>
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

      {/* Mobile Fixed Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#04142B] border-t border-[#1A2740]/80 flex items-center justify-around z-50 px-1 shadow-[0_-4px_24px_rgba(0,0,0,0.5)] pb-safe">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          let mobileLabel = item.label;
          if (item.id === 'dashboard') mobileLabel = 'Dash';
          if (item.id === 'info') mobileLabel = 'Info';
          if (item.id === 'registration') mobileLabel = 'Players';
          if (item.id === 'bracket') mobileLabel = 'Fixtures';
          if (item.id === 'display') mobileLabel = 'Live';
          if (item.id === 'settings') mobileLabel = 'Settings';

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="flex-1 flex flex-col items-center justify-center py-1.5 px-0.5 relative transition-all duration-300 active:scale-95"
            >
              <item.icon className={`w-[18px] h-[18px] mb-1 transition-transform duration-300 ${isActive ? 'text-[#F1C317] scale-110' : 'text-[#B2B6C2]'}`} />
              <span className={`text-[8px] font-sans font-black uppercase tracking-wider leading-none mt-0.5 transition-colors duration-300 ${isActive ? 'text-white font-extrabold' : 'text-[#B2B6C2]/70'}`}>
                {mobileLabel}
              </span>
              
              {isActive && (
                <div className="absolute top-0 w-8 h-1 bg-[#F1C317] rounded-b-full shadow-[0_2px_10px_rgba(241,195,23,0.6)]" />
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
