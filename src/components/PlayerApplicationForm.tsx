import React, { useState, useRef } from 'react';
import { PlayerApplication } from '../types';
import { generateSnookerAvatar } from '../utils/avatar';
import { Upload, Trash2, Phone, MessageSquare, Globe, AlertCircle, CheckCircle2, Trophy, Sparkles, FileText, Star } from 'lucide-react';

interface PlayerApplicationFormProps {
  onSubmitApplication: (app: Omit<PlayerApplication, 'id' | 'status' | 'appliedAt'>) => void;
  tournamentName: string;
  systemLogo?: string;
  tournamentTypes?: string[];
  selectedTournamentType?: string;
}

export default function PlayerApplicationForm({ 
  onSubmitApplication, 
  tournamentName, 
  systemLogo = '',
  tournamentTypes = ['Soccer', 'Snooker', 'Table Tennis'],
  selectedTournamentType
}: PlayerApplicationFormProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [club, setClub] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [socialMediaPage, setSocialMediaPage] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState('');
  const [selectedType, setSelectedType] = useState(selectedTournamentType || tournamentTypes[0] || 'Snooker');

  React.useEffect(() => {
    setSelectedType(selectedTournamentType || tournamentTypes[0] || 'Snooker');
  }, [selectedTournamentType, tournamentTypes]);
  
  // Document states
  const [documentUrl, setDocumentUrl] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [isDocDragActive, setIsDocDragActive] = useState(false);
  
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('File size exceeds the 2MB limit.');
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

  const handleDocFile = (file: File) => {
    const validMimeTypes = ['application/pdf', 'image/png', 'image/jpeg'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['pdf', 'png', 'jpg', 'jpeg'];
    
    if (!validMimeTypes.includes(file.type) && !validExtensions.includes(fileExtension || '')) {
      setError('Please upload a valid document in PDF, PNG, or JPEG format.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Document file size exceeds the 5MB limit.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setDocumentUrl(e.target.result as string);
        setDocumentName(file.name);
        setError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDocDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDocDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDocDragActive(false);
    }
  };

  const handleDocDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDocDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleDocFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Full Name is required.');
      return;
    }
    if (!phoneNumber.trim()) {
      setError('Phone Number is required.');
      return;
    }
    if (!whatsappNumber.trim()) {
      setError('WhatsApp Number is required.');
      return;
    }

    const validateAndNormalizePhone = (num: string): string | null => {
      const cleaned = num.trim().replace(/[\s\-\(\)\+]/g, '');
      let normalized = cleaned;
      if (cleaned.startsWith('234')) {
        normalized = '0' + cleaned.slice(3);
      }
      return /^0\d{10}$/.test(normalized) ? normalized : null;
    };

    const validatedPhone = validateAndNormalizePhone(phoneNumber);
    if (!validatedPhone) {
      setError('Phone Number must be a valid 11-digit Nigerian phone number starting with 0 (e.g. 08033582299).');
      return;
    }

    const validatedWhatsapp = validateAndNormalizePhone(whatsappNumber);
    if (!validatedWhatsapp) {
      setError('WhatsApp Number must be a valid 11-digit Nigerian phone number starting with 0 (e.g. 08033582299).');
      return;
    }

    if (!photoDataUrl) {
      setError('Profile Photo is required.');
      return;
    }
    if (!documentUrl) {
      setError('Proof of payment (Verification document) is required.');
      return;
    }

    const finalPhoto = photoDataUrl || generateSnookerAvatar(fullName.trim(), Math.floor(Math.random() * 16) + 1);

    // Save normalized numbers
    setPhoneNumber(validatedPhone);
    setWhatsappNumber(validatedWhatsapp);

    onSubmitApplication({
      fullName: fullName.trim(),
      email: email.trim() || undefined,
      nickname: nickname.trim() || undefined,
      club: club.trim() || undefined,
      phoneNumber: validatedPhone,
      whatsappNumber: validatedWhatsapp,
      socialMediaPage: socialMediaPage.trim() || undefined,
      photoUrl: finalPhoto,
      documentUrl: documentUrl || undefined,
      documentName: documentName || undefined,
      tournamentType: selectedType
    });

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#010C1E] text-[#EEF1F5] flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-[#121F32] border border-[#1A2740] rounded-3xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#1A6DFF]/5 rounded-full filter blur-2xl pointer-events-none" />
          
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          
          <div className="space-y-2">
            <h2 className="font-display font-black text-2xl text-white uppercase tracking-wider">
              Application Enlisted!
            </h2>
            <p className="text-[11px] text-[#F1C317] font-black uppercase tracking-widest">
              {tournamentName}
            </p>
          </div>
          
          <div className="bg-[#04142B] p-5 rounded-2xl border border-[#1A2740] text-left space-y-3.5">
            <p className="text-xs text-[#B2B6C2] leading-relaxed">
              Thank you for applying, <span className="text-white font-bold">{fullName}</span>! Your entry registration form has been transmitted successfully to the championship administration panel.
            </p>
            <div className="h-px bg-[#1A2740]/60" />
            <p className="text-[10px] text-[#787E90] leading-relaxed">
              * The tournament organizers will review your submission. Only approved/selected players will be synced into the knockout tournament bracket. You will be reached via phone at <span className="font-semibold text-white">{phoneNumber}</span> if selected.
            </p>
          </div>

          <button
            onClick={() => {
              setFullName('');
              setEmail('');
              setNickname('');
              setClub('');
              setPhoneNumber('');
              setWhatsappNumber('');
              setSocialMediaPage('');
              setPhotoDataUrl('');
              setDocumentUrl('');
              setDocumentName('');
              setSubmitted(false);
            }}
            className="w-full bg-[#04142B] hover:bg-[#1A2740] border border-[#1A2740] text-white font-black text-xs py-3.5 rounded-xl transition-all cursor-pointer uppercase tracking-widest"
          >
            Submit Another Application
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#010C1E] text-[#EEF1F5] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative font-sans">
      <div className="absolute top-0 left-0 w-full h-full bg-radial-gradient from-[#1A6DFF]/5 via-transparent to-transparent pointer-events-none" />
      
      <div className="max-w-xl w-full mx-auto space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center space-y-3.5">
          {systemLogo && (
            <div className="flex justify-center mb-2 animate-in fade-in zoom-in duration-300">
              <img
                src={systemLogo || undefined}
                alt="System Logo"
                className="max-h-24 max-w-[240px] object-contain rounded-2xl shadow-2xl border border-[#1A2740] p-3 bg-[#121F32]"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1A6DFF]/10 border border-[#1A6DFF]/25 text-xs font-black text-[#1A6DFF] uppercase tracking-widest">
            <Trophy className="w-4 h-4 animate-pulse text-[#F1C317]" /> Championship Entry
          </div>
          <h2 className="font-display font-black text-3xl sm:text-4xl text-white uppercase tracking-tight">
            Player Application Portal
          </h2>
          <p className="text-sm text-[#B2B6C2]">
            Fill out the form below to apply for <span className="text-[#1A6DFF] font-black">{tournamentName}</span>.
          </p>
        </div>

        {/* Guidelines Box */}
        <div className="bg-[#121F32] border border-[#1A2740] rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 border-b border-[#1A2740] pb-3">
            <AlertCircle className="w-4 h-4 text-[#F1C317]" />
            <h3 className="font-display font-black text-xs text-white uppercase tracking-[0.15em]">Registration Guidelines</h3>
          </div>
          <div className="space-y-3.5 text-xs text-[#B2B6C2] leading-relaxed text-left">
            <div className="flex gap-2.5 items-start">
              <span className="text-[#F1C317] font-black text-sm leading-none">•</span>
              <p>Use a single whatsapp number and email per player for registration.</p>
            </div>
            <div className="flex gap-2.5 items-start">
              <span className="text-[#F1C317] font-black text-sm leading-none">•</span>
              <p>Interested players should pay the sum of <span className="text-[#F1C317] font-black">30,000 naira</span> to <span className="text-white font-semibold">CLASS 46 LIMITED</span> (ACC No: <span className="text-[#1A6DFF] font-mono font-black">8233375637</span>, MONIEPOINT)</p>
            </div>
            <div className="flex gap-2.5 items-start">
              <span className="text-[#F1C317] font-black text-sm leading-none">•</span>
              <p>Click <span className="text-[#1A6DFF] font-bold">Apply Now</span>, fill information and upload proof of payment as verification document.</p>
            </div>
            <div className="flex gap-2.5 items-start">
              <span className="text-[#F1C317] font-black text-sm leading-none">•</span>
              <p>Players must report to the tournament desk exactly <span className="text-[#F1C317] font-black">15 minutes</span> before their scheduled match time.</p>
            </div>
            <div className="flex gap-2.5 items-start">
              <span className="text-[#F1C317] font-black text-sm leading-none">•</span>
              <p>The organizing committee's decision is final and absolute in all disputes.</p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-[#121F32] border border-[#1A2740] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-left">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#1A6DFF]/5 rounded-full filter blur-2xl pointer-events-none" />
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-[#EF4444]/10 border border-[#EF4444]/25 text-[#EF4444] p-4 rounded-xl text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-bold">{error}</span>
              </div>
            )}

            {/* Profile Photo */}
            <div className="space-y-2">
              <label className="block text-[10px] font-sans font-black text-[#787E90] uppercase tracking-wider">
                Profile Photo / Avatar *
              </label>
              {photoDataUrl ? (
                <div className="relative border border-[#1A2740] rounded-2xl p-3 bg-[#04142B] flex items-center gap-4">
                  <img
                    src={photoDataUrl || undefined}
                    alt="Preview"
                    className="w-16 h-16 rounded-xl object-cover border border-[#1A2740]"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#EEF1F5] truncate">Photo Attached</p>
                    <p className="text-[10px] text-[#787E90]">Will be used on the brackets and stream feeds</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPhotoDataUrl('')}
                    className="p-1.5 text-[#787E90] hover:text-[#EF4444] hover:bg-[#121F32] rounded-lg transition-colors cursor-pointer"
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
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 ${
                    isDragActive
                      ? 'border-[#1A6DFF] bg-[#1A6DFF]/5'
                      : 'border-[#1A2740] hover:border-[#1A6DFF]/50 bg-[#04142B]'
                  }`}
                >
                  <Upload className="w-6 h-6 text-[#787E90] mx-auto mb-2" />
                  <p className="text-xs font-semibold text-[#EEF1F5] mb-0.5">
                    Drag & Drop profile photo or <span className="text-[#1A6DFF] hover:underline">Browse</span>
                  </p>
                  <p className="text-[10px] text-[#787E90]">PNG, JPG, WEBP. Max 2MB.</p>
                  <p className="text-[9px] text-[#F1C317] mt-2 font-black uppercase tracking-wider">Please upload a clear face portrait photo</p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFile(e.target.files[0]);
                      }
                    }}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              )}
            </div>

            {/* Proof of Payment Submission */}
            <div className="space-y-2">
              <label className="block text-[10px] font-sans font-black text-[#787E90] uppercase tracking-wider">
                Proof of payment (PDF, PNG, JPEG) *
              </label>
              {documentUrl ? (
                <div className="relative border border-[#1A2740] rounded-2xl p-3 bg-[#04142B] flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#1A6DFF]/10 border border-[#1A6DFF]/20 flex items-center justify-center text-[#1A6DFF] shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#EEF1F5] truncate">{documentName || 'Proof of payment uploaded'}</p>
                    <p className="text-[10px] text-[#787E90]">Document uploaded successfully</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDocumentUrl('');
                      setDocumentName('');
                    }}
                    className="p-1.5 text-[#787E90] hover:text-[#EF4444] hover:bg-[#121F32] rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDragEnter={handleDocDrag}
                  onDragOver={handleDocDrag}
                  onDragLeave={handleDocDrag}
                  onDrop={handleDocDrop}
                  onClick={() => docFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 ${
                    isDocDragActive
                      ? 'border-[#1A6DFF] bg-[#1A6DFF]/5'
                      : 'border-[#1A2740] hover:border-[#1A6DFF]/50 bg-[#04142B]'
                  }`}
                >
                  <Upload className="w-6 h-6 text-[#787E90] mx-auto mb-2" />
                  <p className="text-xs font-semibold text-[#EEF1F5] mb-0.5">
                    Drag & Drop proof of payment or <span className="text-[#1A6DFF] hover:underline">Browse</span>
                  </p>
                  <p className="text-[10px] text-[#787E90]">PDF, PNG, JPG/JPEG up to 5MB.</p>
                  <input
                    type="file"
                    ref={docFileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleDocFile(e.target.files[0]);
                      }
                    }}
                    accept=".pdf,image/png,image/jpeg,image/jpg"
                    className="hidden"
                  />
                </div>
              )}
            </div>

            {/* Tournament Type prefilled & uneditable field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-sans font-black text-[#787E90] uppercase tracking-wider block">
                Tournament Category
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={selectedType}
                  className="w-full bg-[#04142B] border border-[#1A2740] rounded-xl px-4 py-3 text-sm text-[#787E90] font-black cursor-not-allowed outline-none select-none uppercase tracking-wider"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] font-sans font-black bg-[#1A6DFF]/10 text-[#1A6DFF] border border-[#1A6DFF]/20 px-2 py-0.5 rounded uppercase tracking-wider">
                  Configured
                </span>
              </div>
            </div>

            {/* Names row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-sans font-black text-[#787E90] uppercase tracking-wider block">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ronnie O'Sullivan"
                  className="w-full bg-[#04142B] border border-[#1A2740] focus:border-[#1A6DFF] rounded-xl px-4 py-3 text-sm text-[#EEF1F5] placeholder-[#787E90] outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-sans font-black text-[#787E90] uppercase tracking-wider block">
                  Nickname <span className="text-[#787E90] font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="e.g. The Rocket"
                  className="w-full bg-[#04142B] border border-[#1A2740] focus:border-[#1A6DFF] rounded-xl px-4 py-3 text-sm text-[#EEF1F5] placeholder-[#787E90] outline-none transition-colors"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-sans font-black text-[#787E90] uppercase tracking-wider block">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. ronnie@example.com"
                className="w-full bg-[#04142B] border border-[#1A2740] focus:border-[#1A6DFF] rounded-xl px-4 py-3 text-sm text-[#EEF1F5] placeholder-[#787E90] outline-none transition-colors"
              />
            </div>

            {/* Club */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-sans font-black text-[#787E90] uppercase tracking-wider block">
                Representing Club / Region <span className="text-[#787E90] font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={club}
                onChange={(e) => setClub(e.target.value)}
                placeholder="e.g. London Snooker Club"
                className="w-full bg-[#04142B] border border-[#1A2740] focus:border-[#1A6DFF] rounded-xl px-4 py-3 text-sm text-[#EEF1F5] placeholder-[#787E90] outline-none transition-colors"
              />
            </div>

            {/* Contact details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-sans font-black text-[#787E90] uppercase tracking-wider block flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-[#1A6DFF]" /> Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 08033582299"
                  className="w-full bg-[#04142B] border border-[#1A2740] focus:border-[#1A6DFF] rounded-xl px-4 py-3 text-sm text-[#EEF1F5] placeholder-[#787E90] outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-sans font-black text-[#787E90] uppercase tracking-wider block flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp Number *
                </label>
                <input
                  type="tel"
                  required
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="e.g. 08033582299"
                  className="w-full bg-[#04142B] border border-[#1A2740] focus:border-[#1A6DFF] rounded-xl px-4 py-3 text-sm text-[#EEF1F5] placeholder-[#787E90] outline-none transition-colors"
                />
              </div>
            </div>

            {/* Social Media Link */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-sans font-black text-[#787E90] uppercase tracking-wider block flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-[#F1C317]" /> Social Media Profile <span className="text-[#787E90] font-normal">(Optional)</span>
              </label>
              <input
                type="url"
                value={socialMediaPage}
                onChange={(e) => setSocialMediaPage(e.target.value)}
                placeholder="e.g. instagram.com/ronnie"
                className="w-full bg-[#04142B] border border-[#1A2740] focus:border-[#1A6DFF] rounded-xl px-4 py-3 text-sm text-[#EEF1F5] placeholder-[#787E90] outline-none transition-colors"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-4">
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-[#1A6DFF] to-[#0C48B8] hover:from-[#4088FF] hover:to-[#1A6DFF] text-white font-sans font-black uppercase tracking-widest py-4 px-6 rounded-xl transition-all shadow-lg shadow-[#1A6DFF]/20 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
              >
                <Sparkles className="w-4 h-4 fill-current text-[#F1C317]" /> Submit Entry Application
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
