import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSignIn, useClerk, useAuth, useUser } from '@clerk/clerk-react';
import { Shield, Eye, EyeOff, Lock, Mail, CheckCircle2, AlertCircle, ArrowRight, UserCheck, KeyRound, RefreshCw, ArrowLeft } from 'lucide-react';
import { apiRequest } from '../../services/api';
import { ApplicationUser } from '../../types';

export const LoginPage: React.FC = () => {
  const { isLoaded, signIn, setActive } = useSignIn();
  const clerk = useClerk();
  const { signOut } = clerk;
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Two-Factor / Second Factor challenge state
  const [needsSecondFactor, setNeedsSecondFactor] = useState(false);
  const [secondFactorCode, setSecondFactorCode] = useState('');
  const [secondFactorStrategy, setSecondFactorStrategy] = useState<string>('email_code');
  const [codeSent, setCodeSent] = useState(false);

  const resetSuccess = searchParams.get('reset') === 'success';

  const navigateByRole = async () => {
    try {
      const profileRes = await apiRequest<{ success: boolean; data: ApplicationUser }>('/auth/me');
      const userRole = profileRes?.data?.role;

      if (userRole === 'ADMIN' || userRole === 'DOCUMENT_OWNER') {
        navigate('/owner/documents', { replace: true });
      } else {
        navigate('/viewer/documents', { replace: true });
      }
    } catch {
      navigate('/', { replace: true });
    }
  };

  const prepareSecondFactorVerification = async (currentSignIn: any) => {
    try {
      const factors = currentSignIn?.supportedSecondFactors || [];
      const emailFactor = factors.find((f: any) => f.strategy === 'email_code');
      const totpFactor = factors.find((f: any) => f.strategy === 'totp');
      const phoneFactor = factors.find((f: any) => f.strategy === 'phone_code');
      const strategy = emailFactor ? 'email_code' : (totpFactor ? 'totp' : (phoneFactor ? 'phone_code' : factors[0]?.strategy || 'email_code'));

      setSecondFactorStrategy(strategy);
      setNeedsSecondFactor(true);

      if (strategy === 'email_code' || strategy === 'phone_code') {
        await currentSignIn.prepareSecondFactor({ strategy });
        setCodeSent(true);
      }
    } catch (prepErr: any) {
      console.error('[PREPARE_2FA_ERROR]', prepErr);
      setError('A second verification factor is required. Please check your email or authenticator.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isLoaded || !signIn) {
      return;
    }

    if (!email.trim() || !password) {
      setError('Please provide both your enterprise email and password.');
      return;
    }

    try {
      setIsLoading(true);

      // If user is currently signed in under ANY session in the client, cleanly sign out first
      if (isSignedIn || clerk.session) {
        try {
          await signOut();
          await new Promise((r) => setTimeout(r, 150));
        } catch {
          // ignore signout errors
        }
      }

      const result = await signIn.create({
        identifier: email.trim(),
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        await navigateByRole();
      } else if (result.status === 'needs_second_factor' || (result.status as string) === 'needs_client_trust') {
        await prepareSecondFactorVerification(result);
      } else {
        setError(`Additional authentication verification required: ${result.status}`);
      }
    } catch (err: any) {
      console.error('[SIGN_IN_ERROR]', err);
      const clerkError = err?.errors?.[0];
      const isSessionConflict =
        clerkError?.code === 'session_exists' ||
        clerkError?.message?.toLowerCase().includes('already signed in') ||
        err?.message?.toLowerCase().includes('already signed in');

      if (isSessionConflict) {
        try {
          // Force sign out existing session and retry transparently
          await signOut();
          await new Promise((r) => setTimeout(r, 200));

          const retryResult = await signIn.create({
            identifier: email.trim(),
            password,
          });

          if (retryResult.status === 'complete') {
            await setActive({ session: retryResult.createdSessionId });
            await navigateByRole();
            return;
          } else if (retryResult.status === 'needs_second_factor' || (retryResult.status as string) === 'needs_client_trust') {
            await prepareSecondFactorVerification(retryResult);
            return;
          }
        } catch (retryErr: any) {
          console.error('[SIGN_IN_RETRY_ERROR]', retryErr);
          await signOut();
          window.location.reload();
          return;
        }
      } else if (clerkError?.code === 'form_identifier_not_found') {
        setError('No TrustVault account found with this email. Please check your credentials or register.');
      } else if (clerkError?.code === 'form_password_incorrect') {
        setError('Incorrect password provided. Please verify your credentials or use password recovery.');
      } else {
        setError(clerkError?.longMessage || clerkError?.message || err.message || 'Authentication failed. Please verify your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSecondFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!signIn || !secondFactorCode.trim()) {
      setError('Please provide the 6-digit verification code.');
      return;
    }

    try {
      setIsLoading(true);

      const res = await signIn.attemptSecondFactor({
        strategy: secondFactorStrategy as any,
        code: secondFactorCode.trim(),
      });

      if (res.status === 'complete') {
        await setActive({ session: res.createdSessionId });
        await navigateByRole();
      } else {
        setError(`Verification challenge status: ${res.status}`);
      }
    } catch (err: any) {
      console.error('[SECOND_FACTOR_VERIFY_ERROR]', err);
      const clerkError = err?.errors?.[0];
      setError(clerkError?.longMessage || clerkError?.message || err.message || 'Invalid verification code provided.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!signIn) return;
    try {
      setIsLoading(true);
      await signIn.prepareSecondFactor({ strategy: secondFactorStrategy as any });
      setCodeSent(true);
      setError(null);
    } catch (err: any) {
      setError('Failed to resend verification code. Please wait a moment and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-sky-600 text-white shadow-card mb-3 hover:bg-sky-500 transition-colors">
          <Shield className="w-7 h-7" />
        </Link>
        <h1 className="text-2xl font-bold text-white tracking-tight">TrustVault</h1>
        <p className="mt-1 text-xs text-slate-400 font-mono">
          Enterprise Document Security & Verifiable Audit Trail
        </p>
      </div>

      {/* Main Sign In Container */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-elevated rounded-lg border border-slate-200">
          <div className="mb-6">
            <h2 className="text-base font-bold text-slate-900">
              {needsSecondFactor ? 'Security Verification Challenge' : 'Sign in to your Vault'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {needsSecondFactor
                ? `Enter the 6-digit verification code sent to ${email} or from your authenticator.`
                : 'Enter your credentials to access encrypted document storage.'}
            </p>
          </div>

          {/* Already Signed In Banner */}
          {!needsSecondFactor && isSignedIn && (
            <div className="mb-5 bg-sky-50 border border-sky-200 rounded-md p-3.5 text-xs text-sky-950">
              <div className="flex items-start gap-2.5">
                <UserCheck className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-sky-900">Active session detected</p>
                  <p className="text-sky-700 mt-0.5 text-[11px]">
                    You are already authenticated{user?.primaryEmailAddress?.emailAddress ? ` as ${user.primaryEmailAddress.emailAddress}` : ''}.
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigate('/', { replace: true })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 text-white rounded text-xs font-semibold hover:bg-sky-500 transition-colors shadow-sm"
                    >
                      <span>Open Vault</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await signOut();
                        setError(null);
                      }}
                      className="px-2.5 py-1.5 bg-white text-slate-700 border border-slate-300 rounded text-xs font-medium hover:bg-slate-50 transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Password Reset Success Banner */}
          {!needsSecondFactor && resetSuccess && (
            <div className="mb-5 bg-emerald-50 border border-emerald-200 rounded-md p-3 text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Your password has been successfully reset. You may now sign in with your new credentials.</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-5 bg-rose-50 border border-rose-200 rounded-md p-3 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {needsSecondFactor ? (
            <form onSubmit={handleSecondFactorSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  6-Digit Verification Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    required
                    maxLength={10}
                    value={secondFactorCode}
                    onChange={(e) => setSecondFactorCode(e.target.value)}
                    placeholder="123456"
                    className="block w-full text-center tracking-[0.3em] font-mono font-bold text-base rounded-md border border-slate-300 pl-9 pr-3 py-2.5 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                  />
                </div>
                {codeSent && (
                  <p className="text-[11px] text-emerald-600 mt-1.5 flex items-center gap-1 font-mono">
                    ✓ A security verification code has been dispatched to {email}.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isLoading}
                  className="text-xs text-sky-600 hover:text-sky-700 font-medium inline-flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Resend code</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNeedsSecondFactor(false);
                    setSecondFactorCode('');
                    setError(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700 font-medium inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Use different credentials</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading || !secondFactorCode.trim()}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-3"
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Validating security code...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Enter Vault</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="block w-full text-xs rounded-md border border-slate-300 pl-9 pr-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-sky-600 hover:text-sky-700 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="block w-full text-xs rounded-md border border-slate-300 pl-9 pr-10 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-3.5 h-3.5"
                  />
                  <span className="text-xs text-slate-600">Remember this device</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading || !isLoaded}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Vault</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Registration Link */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-600">
              Need access to an enterprise vault?{' '}
              <Link to="/signup" className="font-semibold text-sky-600 hover:text-sky-700 transition-colors">
                Create an account
              </Link>
            </p>
          </div>

          {/* Security Features Checklist */}
          <div className="mt-6 pt-6 border-t border-slate-100 space-y-2 text-[11px] text-slate-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Zero-Trust document-level access control</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Instant permission revocation across all links</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Cryptographically sealed SHA-256 audit trail</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
