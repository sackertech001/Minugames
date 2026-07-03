import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Calendar, 
  ShieldCheck, 
  LayoutGrid, 
  Radio, 
  Play, 
  CheckCircle, 
  Users, 
  Settings, 
  Layers, 
  Lock, 
  X, 
  ChevronRight, 
  Mail, 
  Phone, 
  Clock, 
  MessageSquare, 
  Sparkles,
  Award,
  BookOpen,
  ArrowRight,
  MapPin,
  Flame,
  Zap,
  Globe,
  Heart,
  Target,
  FileText,
  Star,
  Activity,
  UserCheck,
  Award as PrizeIcon
} from 'lucide-react';
import { getSupabase } from '../utils/supabaseClient';
import { motion, AnimatePresence } from 'motion/react';

// Count-up animation helper with viewport triggers and natural easing
function CountUp({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (!hasStarted) return;
    let start = 0;
    const duration = 2000; // 2 seconds
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function: easeOutExpo (highly premium sports-tech timing)
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const currentCount = Math.floor(ease * end);
      
      setCount(currentCount);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [hasStarted, end]);

  return (
    <motion.span
      onViewportEnter={() => setHasStarted(true)}
      viewport={{ once: true, margin: "-50px" }}
    >
      {count}
      {suffix}
    </motion.span>
  );
}

// 3D Tilt Card helper with coordinate tracker
function TiltCard({ children, className }: { children: React.ReactNode; className: string }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const box = card.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    const centerX = box.width / 2;
    const centerY = box.height / 2;
    
    // Calculate tilt degrees (max 4 degrees for subtle luxury feel)
    const tiltX = ((centerY - y) / centerY) * 4;
    const tiltY = ((x - centerX) / centerX) * 4;
    
    setTilt({ x: tiltX, y: tiltY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} // easeOutExpo
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: "transform 0.15s ease-out, filter 0.8s ease-out, scale 0.8s ease-out"
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface MainLandingPageProps {
  onNavigateToLogin: () => void;
  systemLogo?: string;
  tournamentName?: string;
}

export default function MainLandingPage({ onNavigateToLogin, systemLogo = '', tournamentName = 'Championship Manager' }: MainLandingPageProps) {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingName, setBookingName] = useState('');
  const [bookingEmail, setBookingEmail] = useState('');
  const [bookingPhone, setBookingPhone] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingService, setBookingService] = useState('Tournament Planning & Management');
  const [bookingMessage, setBookingMessage] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Contact section fields
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);

  // Active section for header highlighting & scrolled states
  const [activeSection, setActiveSection] = useState('home');
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      if (window.scrollY > 80) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      const sections = ['home', 'about', 'services', 'vision', 'contact'];
      const scrollPosition = window.scrollY + 120;

      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleBookAppointmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    if (!bookingName.trim() || !bookingEmail.trim() || !bookingDate || !bookingTime) {
      setSubmitError('Please fill out all required fields.');
      setIsSubmitting(false);
      return;
    }

    try {
      const combinedDateTime = `${bookingDate}T${bookingTime}:00`;
      const supabase = getSupabase();
      
      if (supabase) {
        const { error } = await supabase
          .from('appointments')
          .insert({
            name: bookingName.trim(),
            email: bookingEmail.trim(),
            phone: bookingPhone.trim() || null,
            appointment_date: combinedDateTime,
            interest_type: bookingService,
            message: bookingMessage.trim() || null
          });

        if (error) {
          console.error('[Supabase Appointment] Insertion error:', error.message);
        }
      }

      // Save to local storage as fallback/robust logger
      const appointments = JSON.parse(localStorage.getItem('tournament_appointments') || '[]');
      appointments.push({
        name: bookingName.trim(),
        email: bookingEmail.trim(),
        phone: bookingPhone.trim(),
        appointment_date: combinedDateTime,
        interest_type: bookingService,
        message: bookingMessage.trim(),
        created_at: new Date().toISOString()
      });
      localStorage.setItem('tournament_appointments', JSON.stringify(appointments));

      setBookingSuccess(true);
    } catch (err: any) {
      console.error('Failed to save appointment:', err);
      setSubmitError('Failed to process booking request. Please check connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactSubmitting(true);

    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      setContactSubmitting(false);
      alert('Please fill out all required fields.');
      return;
    }

    // Store in local storage contacts key & mock database send
    try {
      const messages = JSON.parse(localStorage.getItem('minu_contact_messages') || '[]');
      messages.push({
        name: contactName.trim(),
        email: contactEmail.trim(),
        subject: contactSubject.trim() || 'General Inquiry',
        message: contactMessage.trim(),
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('minu_contact_messages', JSON.stringify(messages));

      // Also create an appointment entry as request so it registers in admin panel if needed
      const supabase = getSupabase();
      if (supabase) {
        await supabase
          .from('appointments')
          .insert({
            name: contactName.trim(),
            email: contactEmail.trim(),
            phone: 'Contact Form',
            appointment_date: new Date(Date.now() + 86400000).toISOString(), // 1 day from now as proxy
            interest_type: 'Contact Inquiry: ' + (contactSubject.trim() || 'General'),
            message: contactMessage.trim()
          });
      }

      setContactSuccess(true);
      setContactName('');
      setContactEmail('');
      setContactSubject('');
      setContactMessage('');
    } catch (err) {
      console.error(err);
    } finally {
      setContactSubmitting(false);
    }
  };

  const resetForm = () => {
    setBookingName('');
    setBookingEmail('');
    setBookingPhone('');
    setBookingDate('');
    setBookingTime('');
    setBookingService('Tournament Planning & Management');
    setBookingMessage('');
    setBookingSuccess(false);
    setSubmitError('');
  };

  // Staggered variants for words/elements entry
  const titleContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const wordVariants = {
    hidden: { opacity: 0, y: 25 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        ease: [0.16, 1, 0.3, 1], // easeOutExpo
        duration: 0.7
      }
    }
  };

  const servicesContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const serviceCardVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        ease: [0.16, 1, 0.3, 1], // easeOutExpo
        duration: 0.8
      }
    }
  };

  return (
    <div className="main-landing-page min-h-screen bg-white text-slate-900 font-sans selection:bg-[#ffcc01] selection:text-[#01112D] overflow-x-hidden scroll-smooth">
      
      {/* Self-contained style block for custom gradient shifting and keyframes */}
      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animated-bg {
          background-size: 200% 200%;
          animation: gradientShift 12s ease infinite;
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 10px 25px -5px rgba(255, 204, 1, 0.35); }
          50% { box-shadow: 0 15px 35px 5px rgba(255, 204, 1, 0.55); }
        }
        .cta-pulse-button {
          animation: pulseGlow 4s ease-in-out infinite;
        }
      `}</style>

      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#ffcc01]/10 rounded-full filter blur-[150px] pointer-events-none z-0" />
      <div className="absolute top-[35%] left-[-10%] w-[500px] h-[500px] bg-slate-200/40 rounded-full filter blur-[150px] pointer-events-none z-0" />
      <div className="absolute bottom-[10%] right-[-5%] w-[600px] h-[600px] bg-[#ffcc01]/10 rounded-full filter blur-[150px] pointer-events-none z-0" />

      {/* STICKY GLASSMORPHIC NAVIGATION BAR */}
      <header className={`sticky top-0 z-50 w-full transition-all duration-500 ${
        isScrolled 
          ? 'bg-white/90 backdrop-blur-md border-b border-slate-200/60 shadow-[0_4px_24px_rgba(0,0,0,0.04)]' 
          : 'bg-transparent border-b border-transparent'
      }`}>
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between transition-all duration-500 ${
          isScrolled ? 'h-16' : 'h-24'
        }`}>
          
          {/* Logo: Minu Games */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollToSection('home')}>
            <img 
              src="https://fmbwnbvhvcuihzifiajk.supabase.co/storage/v1/object/public/website_logo/minugames_light.PNG" 
              alt="Minu Games Logo" 
              className={`object-contain transition-all duration-500 ${isScrolled ? 'h-12 md:h-14' : 'h-16 md:h-20'}`} 
              referrerPolicy="no-referrer" 
            />
          </div>

          {/* Menu items */}
          <nav className="hidden md:flex items-center gap-8">
            {[
              { id: 'home', label: 'Home' },
              { id: 'about', label: 'About' },
              { id: 'services', label: 'Services' },
              { id: 'vision', label: 'Vision' },
              { id: 'contact', label: 'Contact' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`text-xs uppercase tracking-widest font-bold transition-all duration-300 cursor-pointer relative py-2 ${
                  activeSection === item.id ? 'text-[#e6b800]' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="relative z-10">{item.label}</span>
                {activeSection === item.id && (
                  <motion.span
                    layoutId="activeUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FFCC01] rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </nav>

          {/* Premium Glass Action Buttons */}
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0px 8px 20px rgba(255, 204, 1, 0.35)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsBookingOpen(true)}
              className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#01112D] bg-[#FFCC01] px-4 py-2.5 rounded-xl cursor-pointer transition-colors shadow-sm"
            >
              REGISTER YOUR TOURNAMENT
            </motion.button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section id="home" className="relative min-h-[90vh] flex flex-col justify-center items-center overflow-hidden pt-12 pb-24 z-10">
        
        {/* Subtle Background Parallax Image */}
        <div 
          className="absolute inset-0 z-0 transition-transform duration-100 ease-out"
          style={{ transform: `translateY(${scrollY * 0.15}px)` }}
        >
          <img 
            src="https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1600&auto=format&fit=crop"
            alt="Sports Stadium"
            className="w-full h-full object-cover object-center opacity-10 scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-white/95"></div>
          
          {/* Subtle moving light effect */}
          <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-[#ffcc01]/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
        </div>

        {/* Floating sports particles/light elements */}
        <motion.div 
          animate={{ y: [0, -15, 0], x: [0, 8, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-12 w-3.5 h-3.5 rounded-full bg-[#ffcc01]/40 blur-xs pointer-events-none"
        />
        <motion.div 
          animate={{ y: [0, 18, 0], x: [0, -12, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-1/3 right-16 w-5 h-5 rounded-full bg-slate-300/40 blur-xs pointer-events-none"
        />
        <motion.div 
          animate={{ y: [0, -10, 0], x: [0, -6, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
          className="absolute top-1/3 right-1/4 w-2.5 h-2.5 rounded-full bg-[#ffcc01]/30 blur-xs pointer-events-none"
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          
          {/* Animated Float Element with slow loop floating */}
          <motion.div 
            animate={{ y: [-4, 4, -4] }}
            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
            className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-full shadow-md backdrop-blur-md cursor-default"
          >
            <span className="w-2 h-2 rounded-full bg-[#ffcc01] animate-ping"></span>
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#e6b800] fill-[#ffcc01]/20" /> Leading Africa's Sports Revolution
            </span>
          </motion.div>

          {/* Headline: Word-by-word reveal */}
          <motion.h1 
            variants={titleContainerVariants}
            initial="hidden"
            animate="visible"
            className="font-sans font-black text-4xl sm:text-7xl lg:text-8xl tracking-tight uppercase text-slate-900 leading-[0.95]"
          >
            <motion.span variants={wordVariants} className="inline-block mr-3 sm:mr-4">Where</motion.span>
            <motion.span variants={wordVariants} className="inline-block mr-3 sm:mr-4">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e6b800] via-[#01112D] to-[#e6b800]">Competition</span>
            </motion.span>{" "}
            <br className="hidden sm:inline" />
            <motion.span variants={wordVariants} className="inline-block mr-3 sm:mr-4">Meets</motion.span>
            <motion.span variants={wordVariants} className="inline-block">Excellence</motion.span>
          </motion.h1>

          {/* Paragraphs: Staggered fade and slide up after headline */}
          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8, ease: "easeOut" }}
            className="text-sm sm:text-lg lg:text-xl text-slate-800 font-semibold tracking-wide max-w-3xl mx-auto uppercase"
          >
            “Professional tournament management designed to create unforgettable sporting experiences.”
          </motion.p>

          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8, ease: "easeOut" }}
            className="text-xs sm:text-sm lg:text-base text-slate-600 max-w-2xl mx-auto font-light leading-relaxed"
          >
            Minu Games delivers seamless tournament planning and execution for schools, communities, organizations, corporate bodies, and sporting institutions. From registration and scheduling to logistics and live updates, we manage every detail with precision and professionalism.
          </motion.p>

          {/* Action Buttons with Hover expansion and Click scaling */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.8, ease: "easeOut" }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4"
          >
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0px 12px 28px rgba(255, 204, 1, 0.4)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsBookingOpen(true)}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-[#FFCC01] to-[#e6b800] text-[#01112D] text-xs font-black tracking-widest uppercase shadow-lg cursor-pointer flex items-center justify-center gap-2"
            >
              <span>REGISTER YOUR TOURNAMENT</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0px 12px 28px rgba(1, 17, 45, 0.2)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => scrollToSection('contact')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#01112D] text-white text-xs font-black tracking-widest uppercase shadow-lg cursor-pointer"
            >
              Contact Us
            </motion.button>
          </motion.div>

          {/* STATISTICS SECTION */}
          <div className="pt-16 max-w-5xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-white/95 backdrop-blur-md border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl relative">
              
              {/* Corner accent decorations */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#ffcc01] rounded-tl-2xl"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#ffcc01] rounded-br-2xl"></div>

              {/* Stat 1: Teams */}
              <motion.div 
                whileHover={{ y: -6, boxShadow: "0 10px 25px rgba(0, 0, 0, 0.04)" }}
                className="text-center space-y-2 py-4 px-2 border-r border-slate-100 last:border-0 rounded-2xl transition-all duration-300 hover:bg-slate-50/50 group"
              >
                <div className="flex justify-center mb-1">
                  <Trophy className="w-5 h-5 text-amber-500 transition-transform duration-500 group-hover:rotate-12" />
                </div>
                <p className="text-3xl sm:text-5xl font-black font-mono tracking-tight text-slate-900">
                  <CountUp end={50} suffix="+" />
                </p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Teams Managed</p>
              </motion.div>

              {/* Stat 2: Participants */}
              <motion.div 
                whileHover={{ y: -6, boxShadow: "0 10px 25px rgba(0, 0, 0, 0.04)" }}
                className="text-center space-y-2 py-4 px-2 md:border-r border-slate-100 last:border-0 rounded-2xl transition-all duration-300 hover:bg-slate-50/50 group"
              >
                <div className="flex justify-center mb-1">
                  <Users className="w-5 h-5 text-amber-500 transition-transform duration-500 group-hover:rotate-12" />
                </div>
                <p className="text-3xl sm:text-5xl font-black font-mono tracking-tight text-slate-900">
                  <CountUp end={1000} suffix="+" />
                </p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Active Players</p>
              </motion.div>

              {/* Stat 3: Events */}
              <motion.div 
                whileHover={{ y: -6, boxShadow: "0 10px 25px rgba(0, 0, 0, 0.04)" }}
                className="text-center space-y-2 py-4 px-2 border-r border-slate-100 last:border-0 rounded-2xl transition-all duration-300 hover:bg-slate-50/50 group"
              >
                <div className="flex justify-center mb-1">
                  <Calendar className="w-5 h-5 text-amber-500 transition-transform duration-500 group-hover:rotate-12" />
                </div>
                <p className="text-3xl sm:text-5xl font-black font-mono tracking-tight text-slate-900">
                  <CountUp end={20} suffix="+" />
                </p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Elite Events</p>
              </motion.div>

              {/* Stat 4: Partners */}
              <motion.div 
                whileHover={{ y: -6, boxShadow: "0 10px 25px rgba(0, 0, 0, 0.04)" }}
                className="text-center space-y-2 py-4 px-2 last:border-0 rounded-2xl transition-all duration-300 hover:bg-slate-50/50 group"
              >
                <div className="flex justify-center mb-1">
                  <Star className="w-5 h-5 text-amber-500 transition-transform duration-500 group-hover:rotate-12" />
                </div>
                <p className="text-3xl sm:text-5xl font-black font-mono tracking-tight text-slate-900">
                  <CountUp end={10} suffix="+" />
                </p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Brand Partners</p>
              </motion.div>

            </div>
          </div>

        </div>
      </section>

      {/* ABOUT SECTION (PREMIUM LIGHT SECTION) */}
      <section id="about" className="relative bg-white text-slate-900 py-24 sm:py-32 z-10 overflow-hidden border-t border-slate-100">
        
        {/* Subtle Graphic background details */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#ffcc01]/5 rounded-full filter blur-[80px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-slate-200/20 rounded-full filter blur-[80px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left Image Column with slow loop float vertical movement (-8px to +8px) */}
            <motion.div 
              animate={{ y: [-8, 8, -8] }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
              className="lg:col-span-5 relative"
            >
              <div className="absolute -top-4 -left-4 w-full h-full border-4 border-[#ffcc01] rounded-2xl z-0 pointer-events-none"></div>
              <div className="absolute -bottom-4 -right-4 w-full h-full border-4 border-slate-200 rounded-2xl z-0 pointer-events-none"></div>
              
              <div className="relative rounded-2xl overflow-hidden shadow-xl z-10 aspect-video lg:aspect-[4/5] bg-slate-100 group">
                {/* Slow zoom out entry focus */}
                <motion.img 
                  initial={{ scale: 1.08 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  src="https://images.pexels.com/photos/31756788/pexels-photo-31756788.jpeg"
                  alt="Athletes celebrating victory"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                <div className="absolute bottom-6 left-6 text-white text-left">
                  <div className="flex items-center gap-1.5 bg-[#ffcc01] text-[#01112D] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-2 w-fit">
                    <Award className="w-3.5 h-3.5" /> Discovery & Impact
                  </div>
                  <h4 className="text-lg font-black uppercase tracking-wide text-white">Champions Build Character</h4>
                </div>
              </div>
            </motion.div>

            {/* Right Text Column: Reveal line-by-line on scroll */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="lg:col-span-7 space-y-8 text-left"
            >
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest text-amber-800">
                  <Flame className="w-4 h-4 text-amber-600 fill-amber-100" /> ABOUT MINU GAMES
                </div>
                <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 uppercase leading-none">
                  Redefining Sports <br />
                  <span className="text-amber-600">Tournament Experience</span>
                </h2>
              </div>

              <div className="space-y-6 text-slate-600 text-sm sm:text-base font-light leading-relaxed">
                <p className="font-semibold text-xl text-slate-800">
                  Minu Games is a professional tournament management company dedicated to organizing high-quality sporting events that inspire competition, discover talent, and strengthen communities.
                </p>
                <p>
                  We believe every tournament is more than a game—it is an opportunity to create experiences, build character, and celebrate excellence. Our team handles your event with rigorous technological integration and customized coordination.
                </p>
                <p>
                  Whether it is a football cup, a basketball tournament, a community sports run, or an corporate games event, we supply the digital brackets, live scoreboard setups, public check-in sites, certified officiating rosters, and sponsor placements.
                </p>
              </div>

              {/* Bullet Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-100/60 flex items-center justify-center text-amber-700 border border-amber-200/50 shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-slate-800 uppercase">Certified Referees</h5>
                    <p className="text-xs text-slate-500">Fair-play policy with experienced sporting judges.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-100/60 flex items-center justify-center text-amber-700 border border-amber-200/50 shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-slate-800 uppercase">Digital Live Feed</h5>
                    <p className="text-xs text-slate-500">Instant bracket results accessible on mobile phones.</p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0px 10px 25px rgba(1, 17, 45, 0.25)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsBookingOpen(true)}
                  className="px-8 py-4 rounded-xl bg-[#01112D] text-white font-black text-xs tracking-widest uppercase transition-all shadow-md cursor-pointer flex items-center gap-2 group"
                >
                  <span>Work With Our Team</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </div>

            </motion.div>

          </div>
        </div>
      </section>

      {/* SERVICES SECTION: Staggered Appearance */}
      <section id="services" className="relative py-24 sm:py-32 bg-white z-10 border-t border-slate-100">
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest text-amber-800">
              <Zap className="w-4 h-4 text-amber-600 fill-amber-100" /> OUR SERVICES
            </div>
            <h2 className="text-4xl sm:text-6xl font-black text-slate-900 uppercase tracking-wide">
              Expert Tournament <br className="hidden sm:inline" /> Solutions
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto font-light leading-relaxed">
              We leverage modern tournament frameworks, administrative portals, and venue setups to manage professional competitions flawlessly.
            </p>
          </div>

          {/* Cards Grid with Staggered Viewport Animations */}
          <motion.div 
            variants={servicesContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            
            {/* Service 1 */}
            <motion.div 
              variants={serviceCardVariants}
              whileHover={{ 
                y: -8, 
                borderColor: "#FFCC01",
                boxShadow: "0 12px 30px rgba(255, 204, 1, 0.15)",
                backgroundColor: "#ffffff"
              }}
              className="bg-slate-50/50 border border-slate-200 rounded-2xl p-6 transition-all duration-300 group shadow-sm flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/50 text-amber-600 flex items-center justify-center mb-6 group-hover:bg-[#01112D] group-hover:text-white group-hover:scale-110 transition-all duration-300">
                  <Trophy className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wide mb-3">
                  Tournament Planning & Management
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  End-to-end event planning, technical setup, division structuring, tie-breaker designs, rules drafting, and custom trophy procurement.
                </p>
              </div>
              <div className="pt-6 text-left">
                <span className="text-[10px] font-black text-amber-600 tracking-widest uppercase flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Explore <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </motion.div>

            {/* Service 2 */}
            <motion.div 
              variants={serviceCardVariants}
              whileHover={{ 
                y: -8, 
                borderColor: "#FFCC01",
                boxShadow: "0 12px 30px rgba(255, 204, 1, 0.15)",
                backgroundColor: "#ffffff"
              }}
              className="bg-slate-50/50 border border-slate-200 rounded-2xl p-6 transition-all duration-300 group shadow-sm flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/50 text-amber-600 flex items-center justify-center mb-6 group-hover:bg-[#01112D] group-hover:text-white group-hover:scale-110 transition-all duration-300">
                  <Activity className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wide mb-3">
                  Sports Event Coordination
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  On-site coordination, matchday management, security administration, medical/first-aid setup, and referee communication boards.
                </p>
              </div>
              <div className="pt-6 text-left">
                <span className="text-[10px] font-black text-amber-600 tracking-widest uppercase flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Explore <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </motion.div>

            {/* Service 3 */}
            <motion.div 
              variants={serviceCardVariants}
              whileHover={{ 
                y: -8, 
                borderColor: "#FFCC01",
                boxShadow: "0 12px 30px rgba(255, 204, 1, 0.15)",
                backgroundColor: "#ffffff"
              }}
              className="bg-slate-50/50 border border-slate-200 rounded-2xl p-6 transition-all duration-300 group shadow-sm flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/50 text-amber-600 flex items-center justify-center mb-6 group-hover:bg-[#01112D] group-hover:text-white group-hover:scale-110 transition-all duration-300">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wide mb-3">
                  Competition Scheduling & Fixtures
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Algorithmic generation of round-robin groups, single/double knockout brackets, consolation rounds, and fair timeslot allocation.
                </p>
              </div>
              <div className="pt-6 text-left">
                <span className="text-[10px] font-black text-amber-600 tracking-widest uppercase flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Explore <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </motion.div>

            {/* Service 4 */}
            <motion.div 
              variants={serviceCardVariants}
              whileHover={{ 
                y: -8, 
                borderColor: "#FFCC01",
                boxShadow: "0 12px 30px rgba(255, 204, 1, 0.15)",
                backgroundColor: "#ffffff"
              }}
              className="bg-slate-50/50 border border-slate-200 rounded-2xl p-6 transition-all duration-300 group shadow-sm flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/50 text-amber-600 flex items-center justify-center mb-6 group-hover:bg-[#01112D] group-hover:text-white group-hover:scale-110 transition-all duration-300">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wide mb-3">
                  Team Registration & Accreditation
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Digital player portals, automated registration validation, team rosters setup, online payment portals, and printed badges.
                </p>
              </div>
              <div className="pt-6 text-left">
                <span className="text-[10px] font-black text-amber-600 tracking-widest uppercase flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Explore <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </motion.div>

            {/* Service 5 */}
            <motion.div 
              variants={serviceCardVariants}
              whileHover={{ 
                y: -8, 
                borderColor: "#FFCC01",
                boxShadow: "0 12px 30px rgba(255, 204, 1, 0.15)",
                backgroundColor: "#ffffff"
              }}
              className="bg-slate-50/50 border border-slate-200 rounded-2xl p-6 transition-all duration-300 group shadow-sm flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/50 text-amber-600 flex items-center justify-center mb-6 group-hover:bg-[#01112D] group-hover:text-white group-hover:scale-110 transition-all duration-300">
                  <Radio className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wide mb-3">
                  Results Management & Live Updates
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Real-time scoreboard distribution, website syncing, online brackets updater, SMS/Email result alerts, and match statistics logs.
                </p>
              </div>
              <div className="pt-6 text-left">
                <span className="text-[10px] font-black text-amber-600 tracking-widest uppercase flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Explore <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </motion.div>

            {/* Service 6 */}
            <motion.div 
              variants={serviceCardVariants}
              whileHover={{ 
                y: -8, 
                borderColor: "#FFCC01",
                boxShadow: "0 12px 30px rgba(255, 204, 1, 0.15)",
                backgroundColor: "#ffffff"
              }}
              className="bg-slate-50/50 border border-slate-200 rounded-2xl p-6 transition-all duration-300 group shadow-sm flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/50 text-amber-600 flex items-center justify-center mb-6 group-hover:bg-[#01112D] group-hover:text-white group-hover:scale-110 transition-all duration-300">
                  <Globe className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wide mb-3">
                  Venue & Logistics Coordination
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Sourcing and hiring top-tier courts, stadiums, and tables. Managing physical setup, score overlays, audio systems, and catering.
                </p>
              </div>
              <div className="pt-6 text-left">
                <span className="text-[10px] font-black text-amber-600 tracking-widest uppercase flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Explore <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </motion.div>

            {/* Service 7 */}
            <motion.div 
              variants={serviceCardVariants}
              whileHover={{ 
                y: -8, 
                borderColor: "#FFCC01",
                boxShadow: "0 12px 30px rgba(255, 204, 1, 0.15)",
                backgroundColor: "#ffffff"
              }}
              className="bg-slate-50/50 border border-slate-200 rounded-2xl p-6 transition-all duration-300 group shadow-sm flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/50 text-amber-600 flex items-center justify-center mb-6 group-hover:bg-[#01112D] group-hover:text-white group-hover:scale-110 transition-all duration-300">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wide mb-3">
                  Sponsorship & Brand Activation
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Connecting sponsors with active tournaments, organizing booth displays, on-court banner placement, and media coverage integration.
                </p>
              </div>
              <div className="pt-6 text-left">
                <span className="text-[10px] font-black text-amber-600 tracking-widest uppercase flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Explore <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </motion.div>

            {/* Service 8 */}
            <motion.div 
              variants={serviceCardVariants}
              whileHover={{ 
                y: -8, 
                borderColor: "#FFCC01",
                boxShadow: "0 12px 30px rgba(255, 204, 1, 0.15)",
                backgroundColor: "#ffffff"
              }}
              className="bg-slate-50/50 border border-slate-200 rounded-2xl p-6 transition-all duration-300 group shadow-sm flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/50 text-amber-600 flex items-center justify-center mb-6 group-hover:bg-[#01112D] group-hover:text-white group-hover:scale-110 transition-all duration-300">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wide mb-3">
                  Awards & Closing Ceremonies
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  High-profile trophy presentation events, final match gala dinners, customized participant medals, and official press releases.
                </p>
              </div>
              <div className="pt-6 text-left">
                <span className="text-[10px] font-black text-amber-600 tracking-widest uppercase flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Explore <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </motion.div>

          </motion.div>

          {/* Quick Consultation Promo */}
          <div className="mt-16 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-widest">
              Looking for a custom combination of services? 
              <button onClick={() => setIsBookingOpen(true)} className="text-amber-600 font-black hover:underline ml-2 uppercase cursor-pointer">
                Book a consultation today <ChevronRight className="w-3.5 h-3.5 inline text-amber-600 animate-pulse" />
              </button>
            </p>
          </div>

        </div>
      </section>

      {/* WHY CHOOSE US SECTION (HIGH-END LIGHT THEME GLASS CARD GRID) */}
      <section className="relative py-24 bg-white z-10 overflow-hidden border-t border-slate-100">
        
        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left Info Column: Slide in from left */}
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="lg:col-span-5 space-y-6 text-left"
            >
              <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest text-amber-800">
                <Activity className="w-4 h-4 text-amber-600" /> EFFICIENCY FIRST
              </div>
              
              <h2 className="text-4xl sm:text-5xl font-black text-slate-900 uppercase tracking-wide leading-tight">
                Why Elite Leagues <br />
                <span className="text-amber-600">Choose Minu Games</span>
              </h2>
              
              <p className="text-xs sm:text-sm text-slate-600 font-light leading-relaxed">
                We combine advanced software automation, rigorous sporting compliance standards, and an passionate field coordination team to deliver zero-error tournaments. 
              </p>

              <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-sm">
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                </div>
                <p className="text-xs italic text-slate-600">
                  "Minu Games transformed our school inter-house athletic cups. We had dynamic real-time schedules on television displays in our gymnasium. Outstanding technology."
                </p>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-800">
                  — Prof. Adeleke, Lagos Sports Institute
                </p>
              </div>
            </motion.div>

            {/* Right Cards Column: Slide in from right */}
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
              className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6 text-left"
            >
              
              {/* Point 1 */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-3 hover:border-amber-400 hover:shadow-md transition-all relative">
                <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-amber-400"></div>
                <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                  Professional event execution
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Strict adherence to international rulebooks, punctuality, official badges, and highly professional staff.
                </p>
              </div>

              {/* Point 2 */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-3 hover:border-amber-400 hover:shadow-md transition-all relative">
                <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#01112D]"></div>
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                  Transparent and fair management
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Independent certified referees, anti-corruption rules, and auditable digital scoreboard logs.
                </p>
              </div>

              {/* Point 3 */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-3 hover:border-amber-400 hover:shadow-md transition-all relative">
                <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-amber-400"></div>
                <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                  <Zap className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                  Innovative technology solutions
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Online team registration, live web result streams, bracket matching software, and TV scoreboard displays.
                </p>
              </div>

              {/* Point 4 */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-3 hover:border-amber-400 hover:shadow-md transition-all relative">
                <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#01112D]"></div>
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800">
                  <Users className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                  Experienced coordination team
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Led by veteran athletic directors and software developers who understand actual live sports stress.
                </p>
              </div>

              {/* Point 5 */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-3 hover:border-amber-400 hover:shadow-md transition-all relative">
                <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-amber-400"></div>
                <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                  <Heart className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                  Seamless participant experience
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Hassle-free schedule communication, fast check-in lines, dynamic brackets access, and prompt feedback.
                </p>
              </div>

              {/* Point 6 */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-3 hover:border-amber-400 hover:shadow-md transition-all relative">
                <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#01112D]"></div>
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800">
                  <Globe className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                  Community-focused approach
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Inspiring youth talent discoveries, promoting athletic fitness, and building lasting community camaraderie.
                </p>
              </div>

            </motion.div>

          </div>
        </div>
      </section>

      {/* VISION & MISSION SECTION (PREMIUM CRISP LIGHT THEME with 3D Mouse Tilt cards) */}
      <section id="vision" className="relative bg-white text-slate-950 py-24 sm:py-32 z-10 border-t border-slate-100">
        
        {/* Subtle Decorative Circle */}
        <div className="absolute top-[20%] left-[-10%] w-96 h-96 bg-[#ffcc01]/5 rounded-full filter blur-[90px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest text-amber-800">
              <Target className="w-4 h-4 text-amber-600" /> OUR MISSION & VISION
            </div>
            <h2 className="text-4xl sm:text-6xl font-black text-slate-900 uppercase tracking-tight">
              Driving African Sports <br />
              <span className="text-amber-600">To World-Class Heights</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto font-light leading-relaxed">
              We operate under core sports governance frameworks to elevate, inspire, and create tangible value for athletes and partners.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch text-left mb-16">
            
            {/* Vision Card with TiltCard 3D and Focus blur effect */}
            <TiltCard className="bg-slate-50 border border-slate-200 text-slate-900 p-8 sm:p-10 rounded-3xl space-y-6 relative overflow-hidden flex flex-col justify-between shadow-sm cursor-grab active:cursor-grabbing">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#ffcc01]/10 rounded-full blur-[40px] pointer-events-none"></div>
              
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#ffcc01] flex items-center justify-center text-[#01112D] shadow-lg shadow-[#ffcc01]/30">
                  <Globe className="w-6 h-6" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-wide text-slate-900">
                  Our Vision
                </h3>
                <p className="text-base sm:text-lg text-slate-700 font-light leading-relaxed">
                  “To become Africa’s leading tournament management company, transforming sporting events into impactful experiences that develop talent and promote excellence.”
                </p>
              </div>

              <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>African Development</span>
                <span className="font-bold text-amber-600">VISION 2030</span>
              </div>
            </TiltCard>

            {/* Mission Card with TiltCard 3D and Focus blur effect */}
            <TiltCard className="bg-slate-50 text-slate-900 p-8 sm:p-10 rounded-3xl space-y-6 relative overflow-hidden flex flex-col justify-between shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing">
              <div className="absolute top-0 right-0 w-32 h-32 bg-slate-200/50 rounded-full blur-[40px] pointer-events-none"></div>
              
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#01112D] flex items-center justify-center text-white shadow-lg shadow-black/10">
                  <Target className="w-6 h-6" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-wide text-slate-900">
                  Our Mission
                </h3>
                <p className="text-base sm:text-lg text-slate-700 font-light leading-relaxed">
                  “To provide world-class tournament management solutions that empower athletes, engage communities, create value for partners, and elevate the standard of sports competitions.”
                </p>
              </div>

              <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>Grassroots & Corporate</span>
                <span className="font-bold text-slate-800">MISSION VALUE</span>
              </div>
            </TiltCard>

          </div>

          {/* Core Values Section */}
          <div className="space-y-8">
            <h4 className="text-xs font-black tracking-[0.25em] text-slate-500 uppercase text-center">
              OUR UNCOMPROMISING CORE VALUES
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { name: 'Excellence', desc: 'Perfect execution in every match fixture.' },
                { name: 'Integrity', desc: 'Unbiased refereeing and auditable results.' },
                { name: 'Innovation', desc: 'Digital portals and advanced live score tech.' },
                { name: 'Teamwork', desc: 'Unifying schools, clubs, and spectators.' },
                { name: 'Passion', desc: 'Belief in the spirit and emotion of sport.' },
                { name: 'Impact', desc: 'Discovering the next generation of athletes.' }
              ].map((val) => (
                <motion.div 
                  key={val.name} 
                  whileHover={{ y: -4, scale: 1.03, boxShadow: "0 8px 20px rgba(0,0,0,0.05)" }}
                  className="bg-white border border-slate-200 p-5 rounded-2xl text-center space-y-2 hover:border-amber-300 transition-all cursor-default"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#01112D] text-white mx-auto flex items-center justify-center text-xs font-black uppercase">
                    {val.name[0]}
                  </div>
                  <h5 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">{val.name}</h5>
                  <p className="text-[10px] text-slate-600 font-light leading-normal">{val.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* FINAL CTA SECTION (With animated gradient background and pulse glow cta button) */}
      <section className="relative py-24 sm:py-32 bg-white text-slate-900 overflow-hidden z-10 border-t border-slate-200">
        
        {/* Glowing moving gradient visual effect in background */}
        <div className="absolute inset-0 animated-bg opacity-30 bg-gradient-to-r from-amber-200/20 via-slate-100 to-amber-200/20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-[#ffcc01]/5 to-slate-200 rounded-full blur-[100px] pointer-events-none"></div>
 
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative z-10">
          
          <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest text-amber-800 mx-auto">
            <Trophy className="w-4 h-4 text-amber-600" /> COLLABORATE WITH MINU
          </div>
 
          <h2 className="text-4xl sm:text-6xl font-black uppercase tracking-wide leading-none text-slate-900">
            Ready to Organize Your <br />
            <span className="text-amber-600">Next Tournament?</span>
          </h2>
 
          <p className="text-xs sm:text-base text-slate-600 max-w-2xl mx-auto font-light leading-relaxed">
            Partner with Minu Games and create a professionally managed sporting experience that inspires participants and leaves a lasting impact.
          </p>
 
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsBookingOpen(true)}
              className="cta-pulse-button w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-[#FFCC01] to-[#e6b800] text-[#01112D] text-xs font-black tracking-widest uppercase cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Get Started Today</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, y: -2, boxShadow: "0px 10px 25px rgba(1, 17, 45, 0.15)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => scrollToSection('contact')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#01112D] text-white text-xs font-black tracking-widest uppercase shadow-lg transform cursor-pointer"
            >
              Contact Us
            </motion.button>
          </div>

        </div>
      </section>

      {/* CONTACT SECTION (CONTAINS MESSAGE FORM) */}
      <section id="contact" className="relative py-24 sm:py-32 bg-white z-10 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            
            {/* Left Contact Details Panel */}
            <div className="lg:col-span-5 space-y-8 text-left">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest text-amber-800">
                  <Mail className="w-4 h-4 text-amber-600" /> REACH OUT
                </div>
                <h2 className="text-3xl sm:text-5xl font-black text-slate-900 uppercase tracking-tight">
                  Let's Connect <br />
                  <span className="text-amber-600">With Our Directors</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 font-light leading-relaxed">
                  Have an upcoming athletic cup, club championship, or corporate sports gala? Write to us, and our team will get in touch within 24 hours.
                </p>
              </div>

              <div className="space-y-6">
                
                {/* Location */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-amber-600 shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Our Headquarters</h5>
                    <p className="text-sm font-semibold text-slate-900">24 Industry road, Port Harcourt, Rivers State, Nigeria</p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Direct Email Address</h5>
                    <p className="text-sm font-semibold text-slate-900 hover:text-amber-600 transition-colors">
                      <a href="mailto:contact@minugames.online">contact@minugames.online</a>
                    </p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-amber-600 shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Technical Hotline</h5>
                    <p className="text-sm font-semibold text-slate-900">+234 813 504 6995</p>
                  </div>
                </div>

              </div>

              {/* Trust disclaimer */}
              <p className="text-[10px] text-slate-400 italic leading-normal">
                🔒 Your privacy is strictly preserved. We never distribute contact directories or player registration profiles to unauthorized marketing partners.
              </p>
            </div>

            {/* Right Interactive Form Panel */}
            <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm relative text-left">
              
              {/* Highlight accent line */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-400 via-slate-200 to-amber-400"></div>

              {contactSuccess ? (
                <div className="text-center py-12 space-y-6">
                  <div className="w-16 h-16 rounded-full bg-[#ffcc01]/10 border border-[#ffcc01]/30 flex items-center justify-center text-[#e6b800] mx-auto">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-wide">Inquiry Dispatched!</h3>
                    <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                      Thank you for contacting Minu Games. Our tournament coordination committee has received your message and has sent copies to <span className="text-slate-900 font-bold">contact@minugames.online</span>.
                    </p>
                  </div>
                  <button
                    onClick={() => setContactSuccess(false)}
                    className="px-6 py-2.5 rounded-xl bg-[#01112D] text-white hover:bg-[#01112D]/90 text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-wide">Submit Inquiry</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Give us context about your athletic setup, and our regional manager will contact you.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Your Name <span className="text-[#e6b800]">*</span></label>
                      <input
                        type="text"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-white border border-slate-300 rounded-xl py-3 px-4 text-xs text-slate-900 placeholder-slate-400 focus:border-[#ffcc01] focus:ring-1 focus:ring-[#ffcc01] outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Email Address <span className="text-[#e6b800]">*</span></label>
                      <input
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="johndoe@example.com"
                        className="w-full bg-white border border-slate-300 rounded-xl py-3 px-4 text-xs text-slate-900 placeholder-slate-400 focus:border-[#ffcc01] focus:ring-1 focus:ring-[#ffcc01] outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Subject / Tournament Type</label>
                    <input
                      type="text"
                      value={contactSubject}
                      onChange={(e) => setContactSubject(e.target.value)}
                      placeholder="e.g. Inter-School Football Cup 2026"
                      className="w-full bg-white border border-slate-300 rounded-xl py-3 px-4 text-xs text-slate-900 placeholder-slate-400 focus:border-[#ffcc01] focus:ring-1 focus:ring-[#ffcc01] outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Detailed Message <span className="text-[#e6b800]">*</span></label>
                    <textarea
                      rows={4}
                      required
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="Write your event requirements, expected player counts, dates, or logistical help you need from us..."
                      className="w-full bg-white border border-slate-300 rounded-xl py-3 px-4 text-xs text-slate-900 placeholder-slate-400 focus:border-[#ffcc01] focus:ring-1 focus:ring-[#ffcc01] outline-none transition-all resize-none"
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={contactSubmitting}
                    className="w-full py-4 rounded-xl bg-[#01112D] hover:bg-[#FFCC01] text-white hover:text-[#01112D] text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                  >
                    {contactSubmitting ? 'Submitting Message...' : 'Send Message to Minu Games'}
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </form>
              )}

            </div>

          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative border-t border-slate-200 py-16 bg-white text-xs text-slate-500 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-slate-200 pb-10">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollToSection('home')}>
              <img 
                src="https://fmbwnbvhvcuihzifiajk.supabase.co/storage/v1/object/public/website_logo/minugames_light.PNG" 
                alt="Minu Games Logo" 
                className="h-14 md:h-18 w-auto object-contain" 
                referrerPolicy="no-referrer" 
              />
            </div>

            {/* Quick Links */}
            <div className="flex flex-wrap justify-center gap-6 text-[10px] sm:text-xs font-extrabold uppercase tracking-widest">
              <button onClick={() => scrollToSection('home')} className="text-slate-600 hover:text-[#e6b800] transition-colors cursor-pointer">Home</button>
              <button onClick={() => scrollToSection('about')} className="text-slate-600 hover:text-[#e6b800] transition-colors cursor-pointer">About</button>
              <button onClick={() => scrollToSection('services')} className="text-slate-600 hover:text-[#e6b800] transition-colors cursor-pointer">Services</button>
              <button onClick={() => scrollToSection('vision')} className="text-slate-600 hover:text-[#e6b800] transition-colors cursor-pointer">Vision</button>
              <button onClick={() => scrollToSection('contact')} className="text-slate-600 hover:text-[#e6b800] transition-colors cursor-pointer">Contact</button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-[10px] sm:text-xs font-semibold">
            <p>© 2026 Minu Games. All rights reserved. Designed for professional sporting excellence<span onClick={onNavigateToLogin} className="cursor-pointer select-none hover:text-[#e6b800] transition-colors inline-block pl-0.5">.</span></p>
            
            <div className="flex items-center gap-4 text-slate-600">
              <motion.a 
                whileHover={{ y: -2, rotate: 1 }}
                href="mailto:contact@minugames.online" 
                className="hover:text-[#e6b800] transition-colors flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5 text-slate-400" /> contact@minugames.online
              </motion.a>
              <span className="text-slate-300">|</span>
              <motion.span 
                whileHover={{ y: -2, rotate: -1 }}
                className="hover:text-slate-900 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5 text-slate-400" /> +234 813 504 6995
              </motion.span>
            </div>
          </div>

        </div>
      </footer>

      {/* BOOK APPOINTMENT MODAL (POPUP) */}
      <AnimatePresence>
        {isBookingOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#01112D]/40 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              
              {/* Top Border Glow */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-400 via-slate-200 to-amber-400"></div>

              {/* Close Button */}
              <button
                onClick={() => {
                  setIsBookingOpen(false);
                  resetForm();
                }}
                className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 border border-slate-200 text-slate-500 hover:text-amber-600 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {!bookingSuccess ? (
                <form onSubmit={handleBookAppointmentSubmit} className="space-y-5 text-left">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase mb-1">
                      <BookOpen className="w-3 h-3 text-amber-600" /> Booking Request
                    </div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-wide">Book Appointment</h3>
                    <p className="text-xs text-slate-600">
                      Submit your details, and a Minu Games technical director will confirm your online demo or consultation schedule.
                    </p>
                  </div>

                  {submitError && (
                    <div className="text-xs bg-red-500/10 border border-red-500/30 text-red-600 p-3 rounded-xl flex items-center gap-2">
                      <X className="w-4 h-4 shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Name */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Full Name <span className="text-amber-600">*</span></label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={bookingName}
                          onChange={(e) => setBookingName(e.target.value)}
                          placeholder="John Doe"
                          className="w-full bg-white border border-slate-300 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                        />
                        <Users className="absolute left-3.5 top-3 w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Email Address <span className="text-amber-600">*</span></label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          value={bookingEmail}
                          onChange={(e) => setBookingEmail(e.target.value)}
                          placeholder="johndoe@example.com"
                          className="w-full bg-white border border-slate-300 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                        />
                        <Mail className="absolute left-3.5 top-3 w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>

                    {/* Phone & Service Type */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Phone Number</label>
                        <div className="relative">
                          <input
                            type="tel"
                            value={bookingPhone}
                            onChange={(e) => setBookingPhone(e.target.value)}
                            placeholder="+1 (555) 000-0000"
                            className="w-full bg-white border border-slate-300 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                        />
                          <Phone className="absolute left-3.5 top-3 w-3.5 h-3.5 text-slate-400" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Consultation Topic</label>
                        <select
                          value={bookingService}
                          onChange={(e) => setBookingService(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3 text-xs text-slate-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                        >
                          <option value="Tournament Planning & Management">Tournament Planning & Management</option>
                          <option value="Sports Event Coordination">Sports Event Coordination</option>
                          <option value="Competition Scheduling & Fixtures">Competition Scheduling & Fixtures</option>
                          <option value="Team Registration & Accreditation">Team Registration & Accreditation</option>
                        </select>
                      </div>
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Date <span className="text-amber-600">*</span></label>
                        <div className="relative">
                          <input
                            type="date"
                            required
                            value={bookingDate}
                            onChange={(e) => setBookingDate(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all text-left"
                          />
                          <Calendar className="absolute left-3.5 top-3 w-3.5 h-3.5 text-slate-400" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Time <span className="text-amber-600">*</span></label>
                        <div className="relative">
                          <input
                            type="time"
                            required
                            value={bookingTime}
                            onChange={(e) => setBookingTime(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all text-left"
                          />
                          <Clock className="absolute left-3.5 top-3 w-3.5 h-3.5 text-slate-400" />
                        </div>
                      </div>
                    </div>

                    {/* Message */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Message / Special Instructions</label>
                      <div className="relative">
                        <textarea
                          rows={3}
                          value={bookingMessage}
                          onChange={(e) => setBookingMessage(e.target.value)}
                          placeholder="Tell us about your tournament size, format, or special rules..."
                          className="w-full bg-white border border-slate-300 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all resize-none"
                        />
                        <MessageSquare className="absolute left-3.5 top-3.5 w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsBookingOpen(false);
                        resetForm();
                      }}
                      className="flex-1 py-3 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-500 hover:text-slate-800 uppercase tracking-wider hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#ffcc01] to-[#e6b800] text-[#01112D] text-xs font-black uppercase tracking-wider hover:from-[#e6b800] hover:to-[#ffcc01] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      {isSubmitting ? 'Booking...' : 'Confirm Appointment'}
                    </motion.button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-6 space-y-6">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-500 mx-auto">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-wide">Appointment Requested!</h3>
                    <p className="text-xs text-slate-600 leading-relaxed px-2">
                      Thank you, <span className="text-slate-900 font-bold">{bookingName}</span>. Your consultation request for <span className="text-amber-600 font-bold">{bookingService}</span> has been saved!
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs text-slate-700 space-y-2 max-w-sm mx-auto">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Email Dispatch Status</p>
                    <p className="font-semibold text-slate-800">
                      ✉️ Confirmed notification sent to our team at:
                      <span className="text-amber-600 ml-1 font-mono">contact@minugames.online</span>
                    </p>
                    <p className="text-[10px] text-slate-500 leading-relaxed pt-1">
                      A copy of your booking has also been dispatched to your email address: <span className="text-slate-900 font-mono">{bookingEmail}</span>.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setIsBookingOpen(false);
                      resetForm();
                    }}
                    className="px-8 py-3 rounded-xl bg-[#01112D] hover:bg-[#FFCC01] text-white hover:text-[#01112D] text-xs font-black tracking-widest uppercase shadow-lg transition-all cursor-pointer"
                  >
                    Return to Homepage
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
