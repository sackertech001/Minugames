import { AlertCircle } from 'lucide-react';

interface InvalidRegistrationPageProps {
  isPortalLink?: boolean;
}

export default function InvalidRegistrationPage({ isPortalLink = false }: InvalidRegistrationPageProps) {
  return (
    <div className="min-h-screen bg-[#0F1115] text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#1A1D23] border border-red-500/20 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          {isPortalLink ? (
            <h2 className="font-serif font-bold text-xl uppercase tracking-wider">Tournament has ended</h2>
          ) : (
            <>
              <h2 className="font-serif font-bold text-xl uppercase tracking-wider">Invalid Registration Link</h2>
              <p className="text-xs text-slate-400">
                The registration link you are using is invalid or has expired. Please contact the administrator for a valid link.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
