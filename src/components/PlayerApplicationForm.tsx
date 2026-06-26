import React, { useState, useRef } from 'react';
import { PlayerApplication } from '../types';
import { generateSnookerAvatar } from '../utils/avatar';
import { Upload, Trash2, Phone, MessageSquare, Globe, AlertCircle, CheckCircle, Trophy, Sparkles, FileText } from 'lucide-react';

interface PlayerApplicationFormProps {
  onSubmitApplication: (app: Omit<PlayerApplication, 'id' | 'status' | 'appliedAt'>) => void;
  tournamentName: string;
  systemLogo?: string;
}

export default function PlayerApplicationForm({ onSubmitApplication, tournamentName, systemLogo = '' }: PlayerApplicationFormProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [club, setClub] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [socialMediaPage, setSocialMediaPage] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState('');
  
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

    // Generate snooker avatar if no photo is uploaded
    const finalPhoto = photoDataUrl || generateSnookerAvatar(fullName.trim(), Math.floor(Math.random() * 16) + 1);

    onSubmitApplication({
      fullName: fullName.trim(),
      email: email.trim() || undefined,
      nickname: nickname.trim() || undefined,
      club: club.trim() || undefined,
      phoneNumber: phoneNumber.trim(),
      whatsappNumber: whatsappNumber.trim() || undefined,
      socialMediaPage: socialMediaPage.trim() || undefined,
      photoUrl: finalPhoto,
      documentUrl: documentUrl || undefined,
      documentName: documentName || undefined
    });

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0F1115] text-slate-100 flex items-center justify-center p-4">
        <div className="absolute top-0 left-0 w-full h-full bg-radial-gradient from-[#D4AF37]/10 via-transparent to-transparent pointer-events-none"></div>
        
        <div className="max-w-md w-full bg-[#1A1D23] border-2 border-[#D4AF37]/30 rounded-2xl p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#D4AF37]/20 to-amber-500/20 border-2 border-[#D4AF37] flex items-center justify-center mx-auto shadow-lg shadow-[#D4AF37]/10">
            <CheckCircle className="w-8 h-8 text-[#D4AF37]" />
          </div>
          
          <div className="space-y-2">
            <h2 className="font-serif font-bold text-2xl text-slate-100 uppercase tracking-wider">
              Application Received!
            </h2>
            <p className="text-[11px] text-[#D4AF37] font-bold uppercase tracking-widest font-mono">
              {tournamentName}
            </p>
          </div>
          
          <div className="bg-[#12151A] p-4.5 rounded-xl border border-slate-800 text-left space-y-3">
            <p className="text-xs text-slate-400 leading-relaxed">
              Thank you for applying, <span className="text-[#D4AF37] font-bold">{fullName}</span>! Your entry registration form has been transmitted successfully to the championship administration panel.
            </p>
            <div className="h-px bg-slate-800"></div>
            <p className="text-[10px] text-slate-500 italic">
              * The tournament organizers will review your submission. Only approved/selected players will be synced into the knockout tournament bracket. You will be reached via phone at <span className="font-semibold text-slate-300">{phoneNumber}</span> if selected.
            </p>
          </div>

          <button
            onClick={() => {
              // Reset the form to allow another submission or view
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
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs py-3 rounded-xl transition-all border border-slate-700 cursor-pointer"
          >
            Submit Another Application
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1115] text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-0 left-0 w-full h-full bg-radial-gradient from-[#D4AF37]/5 via-transparent to-transparent pointer-events-none"></div>
      
      <div className="max-w-xl w-full mx-auto space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center space-y-4">
          {systemLogo && (
            <div className="flex justify-center mb-2 animate-in fade-in zoom-in duration-300">
              <img
                src={systemLogo}
                alt="System Logo"
                className="max-h-24 max-w-[240px] object-contain rounded-xl shadow-2xl border border-slate-800 p-2 bg-[#1A1D23]/60"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-xs font-bold text-[#D4AF37] uppercase tracking-widest font-mono mx-auto">
            <Trophy className="w-3.5 h-3.5 animate-pulse" /> Championship Entry
          </div>
          <h2 className="font-serif font-black text-3xl sm:text-4xl text-white uppercase tracking-wider">
            Player Application Portal
          </h2>
          <p className="text-sm text-slate-400 font-medium">
            Fill out the form below to apply for <span className="text-[#D4AF37] font-bold">{tournamentName}</span>.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-[#1A1D23] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3.5 rounded-xl text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Profile Photo */}
            <div>
              <label className="block text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-2">
                Profile Photo / Avatar
              </label>
              {photoDataUrl ? (
                <div className="relative border border-slate-800 rounded-xl p-3 bg-[#12151A] flex items-center gap-4">
                  <img
                    src={photoDataUrl}
                    alt="Preview"
                    className="w-16 h-16 rounded-lg object-cover border border-slate-800"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">Photo attached</p>
                    <p className="text-[10px] text-slate-500">Will be shown in the registration register</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPhotoDataUrl('')}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
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
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    isDragActive
                      ? 'border-[#D4AF37] bg-[#D4AF37]/5'
                      : 'border-slate-800 hover:border-[#D4AF37]/50 bg-[#12151A]'
                  }`}
                >
                  <Upload className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-300 mb-0.5">
                    Drag & Drop profile image or <span className="text-[#D4AF37] font-semibold">Browse</span>
                  </p>
                  <p className="text-[10px] text-slate-500">PNG, JPG, WEBP. Max 2MB.</p>
                  <p className="text-[9px] text-[#D4AF37]/40 mt-1.5">Leave empty to auto-generate a premium avatar</p>
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

            {/* Document Submission */}
            <div>
              <label className="block text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-2">
                Document Submission (PDF, PNG, JPEG) <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              {documentUrl ? (
                <div className="relative border border-slate-800 rounded-xl p-3 bg-[#12151A] flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#D4AF37]/10 to-amber-500/10 border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">{documentName || 'Document uploaded'}</p>
                    <p className="text-[10px] text-slate-500">Document ready for verification</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDocumentUrl('');
                      setDocumentName('');
                    }}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
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
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    isDocDragActive
                      ? 'border-[#D4AF37] bg-[#D4AF37]/5'
                      : 'border-slate-800 hover:border-[#D4AF37]/50 bg-[#12151A]'
                  }`}
                >
                  <Upload className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-300 mb-0.5">
                    Drag & Drop verification document or <span className="text-[#D4AF37] font-semibold">Browse</span>
                  </p>
                  <p className="text-[10px] text-slate-500">PDF, PNG, JPG/JPEG formats are accepted. Max 5MB.</p>
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

            {/* Names row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ronnie O'Sullivan"
                  className="w-full bg-[#12151A] border border-slate-800 focus:border-[#D4AF37] rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Nickname <span className="text-slate-600 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="e.g. The Rocket"
                  className="w-full bg-[#12151A] border border-slate-800 focus:border-[#D4AF37] rounded-xl px-4 py-3 text-sm text-slate-220 placeholder-slate-600 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Email Address <span className="text-slate-500 font-normal">(Required for database entry)</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. ronnie@example.com"
                className="w-full bg-[#12151A] border border-slate-800 focus:border-[#D4AF37] rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors"
              />
            </div>

            {/* Club */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Representing Club / Region <span className="text-slate-600 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={club}
                onChange={(e) => setClub(e.target.value)}
                placeholder="e.g. London Snooker Club"
                className="w-full bg-[#12151A] border border-slate-800 focus:border-[#D4AF37] rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors"
              />
            </div>

            {/* Contact details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-500" /> Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. +234 80 1234 5678"
                  className="w-full bg-[#12151A] border border-slate-800 focus:border-[#D4AF37] rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-500" /> WhatsApp <span className="text-slate-600 font-normal">(Optional)</span>
                </label>
                <input
                  type="tel"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="e.g. +234 80 1234 5678"
                  className="w-full bg-[#12151A] border border-slate-800 focus:border-[#D4AF37] rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Social Media Link */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-slate-500" /> Social Media Profile <span className="text-slate-600 font-normal">(Optional)</span>
              </label>
              <input
                type="url"
                value={socialMediaPage}
                onChange={(e) => setSocialMediaPage(e.target.value)}
                placeholder="e.g. instagram.com/ronnie"
                className="w-full bg-[#12151A] border border-slate-800 focus:border-[#D4AF37] rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-[#D4AF37] to-amber-500 hover:from-[#D4AF37]/90 hover:to-amber-500/90 text-[#0F1115] font-black uppercase tracking-wider py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-[#D4AF37]/10 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 fill-current" /> Submit Application
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
