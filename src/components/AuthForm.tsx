import React, { useState } from 'react';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { apiBaseUrl } from '../utils';
import { loginOdoo } from '../lib/loginOdoo';
import applink from '../lib/app_link';

export function AuthForm({
  mode,
  onBack,
  onSwitchMode,
}: {
  mode: 'login' | 'signup',
  onBack: () => void,
  onSwitchMode: (mode: 'login' | 'signup') => void,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const isSignup = mode === 'signup';
  const theme = localStorage.getItem('tf_theme') === 'dark' ? 'dark' : 'light';
  const brandLogo = theme === 'dark' ? '/Logo/snabbb-white.png' : '/Logo/snabbb-teal.png';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (mode === 'login' && !supabase) {
      setError('Authentication is not configured.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const fullName = (formData.get('fullName') as string | null)?.trim() || '';
    const email = (formData.get('email') as string | null)?.trim() || '';
    const password = (formData.get('password') as string | null) || '';
    const confirmPassword = (formData.get('confirmPassword') as string | null) || '';
    const phone = (formData.get('phone') as string | null)?.trim() || '';

    try {
      if (mode === 'signup') {
        if (!fullName) throw new Error('Please enter your full name.');
        if (!email) throw new Error('Please enter your email address.');
        if (!phone) throw new Error('Please enter your phone number.');
        if (password.length < 8) throw new Error('Password must be at least 8 characters.');
        if (password !== confirmPassword) throw new Error('Passwords do not match.');

        // If apiBaseUrl exists, we send a notification/record to the backend
        if (apiBaseUrl) {
          const response = await fetch(`${apiBaseUrl}/appointment/sign-up`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              password,
              name: fullName,
              phone,
              data: {
                email,
                password,
                name: fullName,
                phone,
              },
            }),
          });

          const result = await response.json().catch(() => null);
          if (!response.ok || result?.ok === false) {
            throw new Error(result?.error || 'Failed to submit request.');
          }
        }

        setSuccess('Request submitted! Our team will review your details and email you to complete your account setup.');
        onSwitchMode('login');
      } else if (supabase) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          const { data } =  await loginOdoo(email, password); 
          data && data?.result && data.result?.uid
          if (data && data.result && data.result.uid) {
            const applinkData = await applink(data.result);
            console.log('Applink response:', applinkData);
          }
          return data;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred during authentication.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)]">
      <div className="max-w-md w-full bg-[var(--surface)] p-6 rounded-3xl border border-[var(--border)] shadow-2xl relative">
        <button onClick={onBack} className="absolute left-6 top-6 text-[var(--text3)] hover:text-accent flex items-center gap-1 text-sm font-bold transition">
          <ChevronLeft size={16} /> Back
        </button>
        <div className="text-center mb-6 pt-3">
          <img src={brandLogo} className="h-14 w-auto mx-auto mb-3" alt="To-do manager" />
          <h2 className="text-xl font-black">{mode === 'login' ? 'Welcome Back' : 'Join Us'}</h2>
          <p className="text-[var(--text3)] text-sm mt-1">
            {mode === 'login'
              ? 'Enter your details to access your workspace'
              : 'Fill in your details. Our team will contact you by email to finish creating your account.'}
          </p>
        </div>

        {error && <div className="bg-red-50 text-red-600 text-xs font-bold p-2.5 rounded-xl mb-4 border border-red-200">{error}</div>}
        {success && <div className="bg-green-50 text-green-700 text-xs font-bold p-2.5 rounded-xl mb-4 border border-green-200">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          {isSignup && (
            <>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[var(--text4)] uppercase">Full Name</label>
                <input name="fullName" type="text" required className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] bg-[var(--bg3)] outline-none focus:border-accent transition" placeholder="John Doe" autoComplete="name" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[var(--text4)] uppercase">Phone Number</label>
                <input name="phone" type="tel" required className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] bg-[var(--bg3)] outline-none focus:border-accent transition" placeholder="+60 12-345 6789" autoComplete="tel" />
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[var(--text4)] uppercase">Email Address</label>
            <input name="email" type="email" required className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] bg-[var(--bg3)] outline-none focus:border-accent transition" placeholder="alex@company.so" autoComplete="email" />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[var(--text4)] uppercase">Password</label>
            <input name="password" type="password" required className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] bg-[var(--bg3)] outline-none focus:border-accent transition" placeholder="********" autoComplete="new-password" />
          </div>

          {isSignup && (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[var(--text4)] uppercase">Confirm Password</label>
              <input name="confirmPassword" type="password" required className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] bg-[var(--bg3)] outline-none focus:border-accent transition" placeholder="********" autoComplete="new-password" />
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full bg-accent text-white py-3 rounded-2xl text-base font-black shadow-lg shadow-accent/30 hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-2 mt-4">
            {loading ? <RefreshCw size={18} className="animate-spin" /> : (mode === 'login' ? 'Sign In' : 'Join Us')}
          </button>
        </form>

        <p className="text-center mt-5 text-xs text-[var(--text3)]">
          {mode === 'login' ? "Need an account?" : "Already have an account?"}
          <button onClick={() => onSwitchMode(mode === 'login' ? 'signup' : 'login')} className="text-accent font-bold ml-1 hover:underline">
            {mode === 'login' ? 'Join Us' : 'Log In'}
          </button>
        </p>
      </div>
    </div>
  );
}
