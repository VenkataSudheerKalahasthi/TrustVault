import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSignUp } from '@clerk/clerk-react';
import {
  Shield,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  FileText,
  UploadCloud,
  KeyRound,
  ArrowLeft,
} from 'lucide-react';
import { apiRequest } from '../../services/api';
import { ApplicationUser } from '../../types';

export const SignUpPage: React.FC = () => {
  const { isLoaded, signUp, setActive } = useSignUp();
  const navigate = useNavigate();

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'VIEWER' | 'DOCUMENT_OWNER'>('VIEWER');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Verification state (if Clerk requires email verification code)
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isLoaded || !signUp) {
      return;
    }

    // Client-side validations
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please provide your full first and last name.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid enterprise email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify both password fields.');
      return;
    }

    if (!agreedToTerms) {
      setError('You must review and agree to the Terms of Service and Privacy Policy.');
      return;
    }

    try {
      setIsLoading(true);

      // Create user in Clerk with requested role in metadata
      await signUp.create({
        emailAddress: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        unsafeMetadata: {
          requestedRole: selectedRole,
        },
      });

      // Send email verification code
      await signUp.prepareEmailAddressVerification({
        strategy: 'email_code',
      });

      setPendingVerification(true);
    } catch (err: any) {
      console.error('[SIGN_UP_ERROR]', err);
      const clerkError = err?.errors?.[0];
      if (clerkError?.code === 'form_identifier_exists') {
        setError('An account with this email already exists. Please sign in instead.');
      } else if (clerkError?.code === 'form_password_pwned') {
        setError('This password has been flagged in breach databases. Please choose a more secure password.');
      } else {
        setError(clerkError?.longMessage || clerkError?.message || err.message || 'Registration failed. Please check your details.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isLoaded || !signUp) {
      return;
    }

    if (!verificationCode.trim()) {
      setError('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    try {
      setIsLoading(true);

      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });

      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId });

        // Synchronize requested role with backend database
        try {
          await apiRequest<{ success: boolean; data: ApplicationUser }>('/auth/sync', {
            method: 'POST',
            body: JSON.stringify({ requestedRole: selectedRole }),
          });
        } catch (syncErr) {
          console.warn('[AUTH_SYNC_WARN]', syncErr);
        }

        // Role-based redirection
        if (selectedRole === 'DOCUMENT_OWNER') {
          navigate('/owner/documents', { replace: true });
        } else {
          navigate('/viewer/documents', { replace: true });
        }
      } else {
        setError(`Email verification incomplete: ${completeSignUp.status}`);
      }
    } catch (err: any) {
      console.error('[VERIFY_ERROR]', err);
      const clerkError = err?.errors?.[0];
      setError(clerkError?.longMessage || clerkError?.message || err.message || 'Invalid or expired verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center">
        <Link to="/" className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-sky-600 text-white shadow-card mb-3 hover:bg-sky-500 transition-colors">
          <Shield className="w-7 h-7" />
        </Link>
        <h1 className="text-2xl font-bold text-white tracking-tight">TrustVault</h1>
        <p className="mt-1 text-xs text-slate-400 font-mono">
          Create an Enterprise Vault Account
        </p>
      </div>

      {/* Main Container */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-elevated rounded-lg border border-slate-200">
          {!pendingVerification ? (
            <>
              <div className="mb-6">
                <h2 className="text-base font-bold text-slate-900">Enterprise Registration</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set up your identity and role-based permissions in the zero-trust vault.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-5 bg-rose-50 border border-rose-200 rounded-md p-3 text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              <form onSubmit={handleSignUpSubmit} className="space-y-4">
                {/* Full Name Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      First Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="John"
                        className="block w-full text-xs rounded-md border border-slate-300 pl-9 pr-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      className="block w-full text-xs rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Enterprise Email Address
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
                      className="block w-full text-xs rounded-md border border-slate-300 pl-9 pr-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Password Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="block w-full text-xs rounded-md border border-slate-300 pl-9 pr-8 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="block w-full text-xs rounded-md border border-slate-300 pl-9 pr-8 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Role Selection (Mandatory VIEWER default, DOCUMENT_OWNER selectable, ADMIN never shown) */}
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-800 mb-2">
                    Account Role Selection
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Viewer Role Card (Default) */}
                    <div
                      onClick={() => setSelectedRole('VIEWER')}
                      className={`cursor-pointer rounded-lg border p-3.5 transition-all text-left ${
                        selectedRole === 'VIEWER'
                          ? 'border-sky-500 bg-sky-50/60 ring-1 ring-sky-500'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <FileText className={`w-4 h-4 ${selectedRole === 'VIEWER' ? 'text-sky-600' : 'text-slate-400'}`} />
                          <span className="text-xs font-bold text-slate-900">Viewer</span>
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700 font-semibold">
                          Default
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-snug">
                        Read, preview, and securely inspect confidential documents shared with your account.
                      </p>
                    </div>

                    {/* Document Owner Role Card */}
                    <div
                      onClick={() => setSelectedRole('DOCUMENT_OWNER')}
                      className={`cursor-pointer rounded-lg border p-3.5 transition-all text-left ${
                        selectedRole === 'DOCUMENT_OWNER'
                          ? 'border-sky-500 bg-sky-50/60 ring-1 ring-sky-500'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <UploadCloud className={`w-4 h-4 ${selectedRole === 'DOCUMENT_OWNER' ? 'text-sky-600' : 'text-slate-400'}`} />
                          <span className="text-xs font-bold text-slate-900">Document Owner</span>
                        </div>
                        {selectedRole === 'DOCUMENT_OWNER' && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 leading-snug">
                        Upload, categorize, version, and share documents with fine-grained access policies and AI suggestions.
                      </p>
                    </div>
                  </div>
                  <p className="mt-1.5 text-[10px] text-slate-400 font-mono">
                    * Note: Administrative privileges require explicit security officer authorization and cannot be self-assigned.
                  </p>
                </div>

                {/* Terms and Conditions */}
                <div className="pt-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-3.5 h-3.5 mt-0.5 shrink-0"
                    />
                    <span className="text-xs text-slate-600 leading-relaxed">
                      I have read and agree to TrustVault's{' '}
                      <Link to="/terms" target="_blank" className="text-sky-600 hover:text-sky-700 underline font-medium">
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link to="/privacy" target="_blank" className="text-sky-600 hover:text-sky-700 underline font-medium">
                        Privacy Policy
                      </Link>
                      .
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || !isLoaded}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating secure account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Vault Account</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              {/* Login Link */}
              <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-600">
                  Already have an account?{' '}
                  <Link to="/login" className="font-semibold text-sky-600 hover:text-sky-700 transition-colors">
                    Sign in here
                  </Link>
                </p>
              </div>
            </>
          ) : (
            /* Email Verification Step */
            <div className="space-y-4">
              <div>
                <button
                  type="button"
                  onClick={() => setPendingVerification(false)}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-4 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to details</span>
                </button>
                <h2 className="text-base font-bold text-slate-900">Verify Your Email Address</h2>
                <p className="text-xs text-slate-500 mt-1">
                  We sent a 6-digit verification code to{' '}
                  <span className="font-semibold text-slate-800 font-mono">{email}</span>.
                </p>
              </div>

              {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-md p-3 text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              <form onSubmit={handleVerifySubmit} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="block w-full text-center tracking-widest font-mono text-base rounded-md border border-slate-300 py-2.5 px-3 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !isLoaded}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying code...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Account Setup</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
