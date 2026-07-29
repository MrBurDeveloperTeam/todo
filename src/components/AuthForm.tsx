import React, { useState } from 'react';
import { Building2, ChevronDown, Globe2, Mail, Phone, RefreshCw, ShieldCheck, User, BriefcaseBusiness } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { loginOdoo } from '../lib/loginOdoo';
import applink from '../lib/app_link';
import { DOBPicker } from './DOBPicker';
import { COUNTRIES, DENTAL_POSITIONS } from '../constants/signupOptions';

type AccountType = 'individual' | 'company';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-800 placeholder:text-slate-400 transition focus:border-[#0ababa] focus:outline-none focus:ring-2 focus:ring-[#0ababa]/20';
const labelClass = 'mb-1.5 ml-1 block text-[10px] font-black uppercase tracking-[0.15em] text-slate-400';
const iconClass = 'pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300';

export function AuthForm({ mode, onBack: _onBack, onSwitchMode }: { mode: 'login' | 'signup'; onBack: () => void; onSwitchMode: (mode: 'login' | 'signup') => void; }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<AccountType>('individual');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [position, setPosition] = useState('');
  const [otherPosition, setOtherPosition] = useState('');
  const [country, setCountry] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const isSignup = mode === 'signup';
  const theme = localStorage.getItem('tf_theme') === 'dark' ? 'dark' : 'light';
  const brandLogo = theme === 'dark' ? '/Logo/snabbb-white.png' : '/Logo/snabbb-teal.png';
  const effectivePosition = position === 'Other' ? otherPosition.trim() : position;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === 'login' && !supabase) { setError('Authentication is not configured.'); return; }
    setLoading(true); setError(null); setSuccess(null);

    try {
      if (isSignup) {
        if (!name.trim()) throw new Error('Please enter your name.');
        if (accountType === 'company' && !companyName.trim()) throw new Error('Please enter your company name.');
        if (!email.trim()) throw new Error('Please enter your email address.');
        if (!phone.trim()) throw new Error('Please enter your phone number.');
        if (!dob) throw new Error('Please select your date of birth.');
        if (!effectivePosition) throw new Error('Please select your job position.');
        if (!country) throw new Error('Please select your country.');
        if (password.length < 8) throw new Error('Password must be at least 8 characters.');
        if (password !== confirmPassword) throw new Error('Passwords do not match.');
        if (!agreedToTerms) throw new Error('Please agree to the Terms of Service, Privacy Policy and Disclaimer.');
        if (!supabase) throw new Error('Authentication is not configured.');

        const payload = {
          email: email.trim(), password,
          options: { data: { name: name.trim(), account_type: accountType, phone: phone.trim(), position: effectivePosition, dob, country, agreed_to_terms: agreedToTerms, company_name: accountType === 'company' ? companyName.trim() : null } },
        };

        // Todo's own Worker route. This replaces the copied appointment endpoint.
        const response = await fetch('/api/auth/sign-up', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const result = await response.json().catch(() => null);
        if (!response.ok || result?.ok === false) throw new Error(result?.error || 'Could not create your account.');

        const { data, error: signUpError } = await supabase.auth.signUp(payload);
        if (signUpError) throw signUpError;
        setSuccess(data.session ? 'Account created successfully.' : 'Account created. Please check your email to confirm your account.');
      } else if (supabase) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) {
          const { data } = await loginOdoo(email.trim(), password);
          if (data?.result?.uid) await applink(data.result);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during authentication.');
    } finally { setLoading(false); }
  };

  return <div className="min-h-screen bg-slate-100 px-4 py-6 sm:flex sm:items-center sm:justify-center sm:px-6 sm:py-10">
    <div className="relative mx-auto w-full max-w-xl rounded-[1.5rem] bg-white p-6 shadow-2xl sm:p-8 lg:p-10">
      <div className="mb-8 text-left">
      <a
        href="https://app.snabbb.com/"
        className="mb-5 inline-flex items-center transition-opacity hover:opacity-80"
        title="Go to Snabbb Home"
      >
        <img src={brandLogo} className="h-8 w-auto" alt="Snabbb" />
      </a>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">{isSignup ? 'Create Account' : 'Welcome Back'}</h1>
        {isSignup && <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">Organize your tasks, priorities, and schedule with ease.</p>}
      </div>
      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600">{error}</div>}
      {success && <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-xs font-bold text-green-700">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignup ? SignupFields() : LoginFields()}
        <button type="submit" disabled={loading} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-base font-black text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">{loading ? <RefreshCw size={18} className="animate-spin" /> : isSignup ? 'Sign up' : 'Sign In'}</button>
      </form>
      <p className="mt-5 text-center text-xs text-slate-500">{isSignup ? 'Already have an account?' : "Don't have an account?"}<button onClick={() => onSwitchMode(isSignup ? 'login' : 'signup')} className="ml-1 font-bold text-[#0ababa] hover:underline">{isSignup ? 'Log In' : 'Sign up'}</button></p>
    </div>
  </div>;

  function SignupFields() {
    const company = accountType === 'company';
    return <>
      <div><p className={labelClass}>Account type</p><div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200"><button type="button" onClick={() => setAccountType('individual')} className={`flex items-center justify-center gap-2 py-3 text-sm font-bold ${!company ? 'bg-[#0ababa] text-white' : 'bg-white text-slate-500'}`}><User size={16} /> Individual</button><button type="button" onClick={() => setAccountType('company')} className={`flex items-center justify-center gap-2 border-l border-slate-200 py-3 text-sm font-bold ${company ? 'bg-[#0ababa] text-white' : 'bg-white text-slate-500'}`}><Building2 size={16} /> Company</button></div></div>
      {company && <Field label="Company name" icon={<Building2 className={iconClass} />}><input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputClass} placeholder="e.g. SNABBB DENTAL" autoComplete="organization" /></Field>}
      <Field label={company ? 'Name' : 'Your name'} icon={<User className={iconClass} />}><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder={company ? 'Contact name' : 'e.g. Nur AYA CHE'} autoComplete="name" /></Field>
      <Field label={company ? 'Company email' : 'Your email'} icon={<Mail className={iconClass} />} helper={<p className="mt-1 text-xs italic text-slate-400">This will be your login email.</p>}><input value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} type="email" placeholder={company ? 'e.g. hello@company.com' : 'e.g. nur@email.com'} autoComplete="email" /></Field>
      <Field label={company ? 'Phone' : 'Phone (WhatsApp)'} icon={<Phone className={iconClass} />}><input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} type="tel" placeholder="e.g. +60123456789" autoComplete="tel" /></Field>
      <div><p className={labelClass}>Date of birth</p><DOBPicker value={dob} onChange={setDob} /></div>
      <Field label="Job position" icon={<BriefcaseBusiness className={iconClass} />}><span className="relative block"><select value={position} onChange={(e) => setPosition(e.target.value)} className={`${inputClass} appearance-none`}><option value="">-- Select Position --</option>{DENTAL_POSITIONS.map((item) => <option key={item} value={item}>{item}</option>)}<option value="Other">Other</option></select><ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" /></span></Field>
      {position === 'Other' && <Field label="Other position" icon={<BriefcaseBusiness className={iconClass} />}><input value={otherPosition} onChange={(e) => setOtherPosition(e.target.value)} className={inputClass} placeholder="Enter your position" /></Field>}
      <Field label="Country" icon={<Globe2 className={iconClass} />}><span className="relative block"><select value={country} onChange={(e) => setCountry(e.target.value)} className={`${inputClass} appearance-none`}><option value="">-- Select Country --</option>{COUNTRIES.map(([id, countryName]) => <option key={id} value={id}>{countryName}</option>)}</select><ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" /></span></Field>
      <Field label="Password" icon={<ShieldCheck className={iconClass} />}><input value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} type="password" placeholder="••••••••" autoComplete="new-password" /></Field>
      <Field label="Confirm password" icon={<ShieldCheck className={iconClass} />}><input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} type="password" placeholder="••••••••" autoComplete="new-password" /></Field>
      <label className="flex items-start gap-2 text-xs text-slate-600"><input checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#0ababa]" /><span>I agree to the <a href="#terms" className="font-semibold text-[#0ababa]">Terms of Service</a>, <a href="#privacy" className="font-semibold text-[#0ababa]">Privacy Policy</a> and <a href="#disclaimer" className="font-semibold text-[#0ababa]">Disclaimer</a>.</span></label>
    </>;
  }

  function LoginFields() {
    return <>
      <Field label="Email" icon={<Mail className={iconClass} />}><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className={inputClass} placeholder="Email" autoComplete="email" /></Field>
      <div><div className="mb-1.5 flex items-center justify-between"><label className={labelClass.replace('mb-1.5 ', '')}>Password</label><button type="button" className="text-[10px] font-bold text-[#0ababa] hover:underline">Forgot Password?</button></div><div className="relative"><ShieldCheck className={iconClass} /><input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className={inputClass} placeholder="Password" autoComplete="current-password" /></div></div>
      <label className="flex items-center gap-2 text-xs text-slate-600"><input checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-[#0ababa]" />Remember me</label>
    </>;
  }
}

function Field({ label, icon, children, helper }: { label: string; icon: React.ReactNode; children: React.ReactNode; helper?: React.ReactNode }) {
  return <div><label className={labelClass}>{label}</label><div className="relative">{icon}{children}</div>{helper}</div>;
}
