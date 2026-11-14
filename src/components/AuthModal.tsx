import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Mail, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';

function formatAuthError(err: unknown, fallback: string): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code: unknown }).code)
      : '';
  const msg = err instanceof Error ? err.message : '';
  const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';

  if (code === 'auth/unauthorized-domain' || msg.includes('auth/unauthorized-domain')) {
    return `Google & OAuth sign-in is not authorized for "${host}". Add "${host}" under Firebase Console → Authentication → Settings → Authorized domains.`;
  }
  if (code === 'auth/popup-blocked' || msg.includes('auth/popup-blocked')) {
    return 'Sign-in popup was blocked by your browser. Please allow popups for this site and try again.';
  }
  if (code === 'auth/popup-closed-by-user' || msg.includes('auth/popup-closed-by-user')) {
    return 'Sign-in popup was closed before completing authentication.';
  }
  if (code === 'auth/operation-not-allowed' || msg.includes('auth/operation-not-allowed')) {
    return 'This sign-in method is not enabled in Firebase Console → Authentication → Sign-in method.';
  }
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found'
  ) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many sign-in attempts. Please wait a few minutes and try again.';
  }
  return msg || fallback;
}

export default function AuthModal() {
  const {
    authModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    signInEmail,
    signUpEmail,
    signInGoogle,
    sendResetEmail,
  } = useStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setInfoMessage(null);
  }, [authModalMode, authModalOpen]);

  if (!authModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setSubmitting(true);
    try {
      if (authModalMode === 'login') {
        await signInEmail(email, password);
      } else if (authModalMode === 'signup') {
        await signUpEmail(email, password, displayName);
      } else {
        await sendResetEmail(email);
        setInfoMessage('Password reset instructions have been sent to your email address.');
      }
    } catch (err) {
      setError(formatAuthError(err, 'Authentication failed. Please check your details.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signInGoogle();
    } catch (err) {
      setError(formatAuthError(err, 'Google sign-in failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#231710]/70 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="w-full max-w-md max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-[#DCE4DB] overflow-hidden">
        <div className="bg-gradient-to-r from-[#2B1D14] to-[#354E41] text-white px-6 py-5 flex items-center justify-between shrink-0">
          <div>
            <h2 id="auth-modal-title" className="font-editorial text-xl font-bold">
              {authModalMode === 'login'
                ? 'Welcome Back'
                : authModalMode === 'signup'
                  ? 'Create Print Account'
                  : 'Reset Password'}
            </h2>
            <p className="text-xs text-[#D7DFD6] mt-1">
              {authModalMode === 'login'
                ? 'Access your saved artwork, print orders, and quotes.'
                : authModalMode === 'signup'
                  ? 'Sign up with email verification to place and track orders.'
                  : 'Enter your registered email to receive a reset link.'}
            </p>
          </div>
          <button
            type="button"
            onClick={closeAuthModal}
            aria-label="Close authentication modal"
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm break-words">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="min-w-0 break-words">{error}</span>
            </div>
          )}

          {infoMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          {authModalMode !== 'reset' && (
            <>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleGoogle()}
                className="w-full py-2.5 px-4 rounded-lg border border-[#CFDACE] bg-white hover:bg-[#F2F5F1] text-[#2B1D14] text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                  />
                </svg>
                Continue with Google
              </button>

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-[#DCE4DB]" />
                <span className="px-3 text-xs text-[#64746B]">or with email</span>
                <div className="flex-grow border-t border-[#DCE4DB]" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {authModalMode === 'signup' && (
              <div>
                <label htmlFor="auth-name" className="block text-xs font-semibold text-[#3D5A4C] mb-1">
                  Full Name
                </label>
                <input
                  id="auth-name"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ananya Sharma"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#CFDACE] text-sm text-[#2B1D14] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/60 focus:border-[#F59E0B]"
                />
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-xs font-semibold text-[#3D5A4C] mb-1">
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#CFDACE] text-sm text-[#2B1D14] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/60 focus:border-[#F59E0B]"
              />
            </div>

            {authModalMode !== 'reset' && (
              <div>
                <label htmlFor="auth-password" className="block text-xs font-semibold text-[#3D5A4C] mb-1">
                  Password
                </label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#CFDACE] text-sm text-[#2B1D14] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/60 focus:border-[#F59E0B]"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-lg bg-[#3A261B] hover:bg-[#4E3426] text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4 text-[#F59E0B]" aria-hidden="true" />
              <span>
                {submitting
                  ? 'Please wait...'
                  : authModalMode === 'login'
                    ? 'Sign In'
                    : authModalMode === 'signup'
                      ? 'Create Account'
                      : 'Send Reset Email'}
              </span>
            </button>
          </form>

          <div className="pt-2 border-t border-[#E6ECE5] flex flex-wrap items-center justify-between gap-2 text-xs text-[#52635A]">
            {authModalMode === 'login' ? (
              <>
                <button
                  type="button"
                  onClick={() => openAuthModal('reset')}
                  className="hover:text-[#2B1D14] underline"
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal('signup')}
                  className="font-semibold text-[#2B1D14] hover:text-[#B45309]"
                >
                  New here? Create account
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="font-semibold text-[#2B1D14] hover:text-[#B45309]"
              >
                Already have an account? Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
