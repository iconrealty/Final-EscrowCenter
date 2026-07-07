import React, { useState } from 'react';
import { X, Mail, Lock, User, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AuthModalProps {
  onClose: () => void;
}

export function AuthModal({ onClose }: AuthModalProps) {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (isSignUp && !name)) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        await signUp(email, password, name);
      } else {
        await signIn(email, password);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      let errMsg = 'An error occurred. Please try again.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errMsg = 'Incorrect email or password.';
      } else if (err.code === 'auth/email-already-in-use') {
        errMsg = 'An account with this email already exists.';
      } else if (err.code === 'auth/weak-password') {
        errMsg = 'Password is too weak.';
      } else if (err.code === 'auth/operation-not-allowed') {
        errMsg = 'Email/Password sign-in is not enabled in your Firebase console. Please enable it in Firebase Console -> Authentication -> Sign-in method.';
      } else if (err.message) {
        errMsg = err.message;
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setError(null);
    setLoading(true);
    signInWithGoogle()
      .then(() => {
        onClose();
      })
      .catch((err: any) => {
        console.error(err);
        let errMsg = 'An error occurred. Please try again.';
        if (err.code === 'auth/operation-not-allowed') {
          errMsg = 'Google Sign-In is not enabled in your Firebase console. Please enable it in Firebase Console -> Authentication -> Sign-in method.';
        } else if (err.code === 'auth/popup-closed-by-user') {
          errMsg = 'The sign-in popup was closed before completion.';
        } else if (err.message) {
          errMsg = err.message;
        }
        setError(errMsg);
        setLoading(false);
      });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 pt-12 pb-6 z-50 animate-fade-in overflow-hidden">
      <div className="bg-white w-full max-w-md rounded-2xl border border-[#e5e5ea] shadow-xl overflow-hidden animate-scale-up max-h-[82dvh] sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-[#e5e5ea] bg-slate-50 shrink-0">
          <div>
            <h2 className="font-bold text-[#1d1d1f] text-base sm:text-lg tracking-tight">
              {isSignUp ? 'Create Cloud Account' : 'Sign In to Sync'}
            </h2>
            <p className="text-xs text-[#86868b] mt-0.5">
              {isSignUp ? 'Access your escrows from any phone, tablet, or Mac' : 'Access your cloud-saved escrows anywhere'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 transition-colors text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex gap-2.5 items-start text-red-700 text-xs sm:text-sm">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {isSignUp && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Full Name</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <User size={16} />
                  </span>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-[#e5e5ea] rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1B3A5C] focus:bg-white transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Email Address</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-[#e5e5ea] rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1B3A5C] focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Password</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-[#e5e5ea] rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1B3A5C] focus:bg-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1B3A5C] hover:bg-[#11253C] disabled:bg-slate-400 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isSignUp ? (
                <>
                  <UserPlus size={16} />
                  <span>Create Cloud Account</span>
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  <span>Sign In & Sync</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-[#e5e5ea]" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase">
              <span className="bg-white px-2.5 text-[#86868b] font-bold">Or continue with</span>
            </div>
          </div>

          {/* Google Sign-In Button */}
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleSignIn}
            className="w-full bg-white hover:bg-slate-50 border border-[#e5e5ea] hover:border-slate-300 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-sm transition-all shadow-xs active:scale-98 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69a5.74 5.74 0 0 1-2.49 3.77v3.12h4.01c2.34-2.16 3.68-5.32 3.68-8.74Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-4.01-3.12c-1.12.75-2.55 1.19-3.95 1.19-3.04 0-5.61-2.05-6.53-4.82H1.31v3.2A12 12 0 0 0 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.47 14.34a7.16 7.16 0 0 1 0-2.68V8.46H1.31a12 12 0 0 0 0 7.08l4.16-3.2Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.31 8.46l4.16 3.2c.92-2.77 3.49-4.82 6.53-4.82Z"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>

          {/* Switch Mode */}
          <div className="mt-5 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="text-xs font-bold text-[#1B3A5C] hover:underline"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
