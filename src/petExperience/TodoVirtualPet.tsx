// PHASE 5D (Virtual Pet migration): thin host wrapper around
// `@mrburdeveloperteam/molar-experience/pet`'s <SharedVirtualPet>.
//
// Everything generic (room UI, runtime, persistence sequencing, landscape/
// fullscreen handling, mini-game embedding shell) now lives in the shared
// package. What stays here, unchanged from the old
// `VirtualPet/VirtualPetContainer.tsx`, is exactly what's genuinely
// To-Do-specific and Supabase-coupled:
//   - IP geolocation + currency detection (`detectAndLogVisit`,
//     `virtual_pet_visits` writes) — confirmed byte-identical to Content
//     Studio's/Profit Calculator's original `detectAndLogVisit`, ported
//     mechanically.
//   - Resolving the authenticated user id via `supabase.auth.getSession()`
//     internally, exactly as the original `GameStateContext`/
//     `VirtualPetContainer` did — deliberately NOT threaded down from
//     `App.tsx`'s own `user` state here, because that state's declared
//     type (`AppUser`) defaults to a non-null placeholder object
//     (`DEFAULT_USER`, a hardcoded UUID) before the real session/profile
//     resolves, unlike Profit Calculator's `useAuth().user` (which is
//     `null` until authenticated). Threading `user.user_id` down as-is
//     would risk briefly reading/writing pet data against that
//     placeholder id during the loading window — a real behavior
//     regression the original component never had, since it always
//     resolved its own session directly.
import { useEffect, useRef, useState } from 'react';
import { SharedVirtualPet } from '@mrburdeveloperteam/molar-experience/pet';
import { supabase as supabaseClient } from '../lib/supabase';
import { todoPetRepository } from './todoPetRepository';

const supabase = supabaseClient as NonNullable<typeof supabaseClient>;

interface GeoInfo {
  ip: string;
  country_name: string;
  country_code: string;
  city: string;
  region: string;
  timezone: string;
  currency: string; // e.g. "MYR", "USD", "EUR"
}

const DEFAULT_CURRENCY_CODE = 'USD';

const normalizeCurrencyCode = (currency?: string | null) => {
  const normalized = (currency || '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : DEFAULT_CURRENCY_CODE;
};

const getSupportedPricingCurrency = async (currency?: string | null): Promise<string> => {
  const requestedCurrency = normalizeCurrencyCode(currency);
  if (requestedCurrency === DEFAULT_CURRENCY_CODE) return DEFAULT_CURRENCY_CODE;

  try {
    const { data, error } = await supabase
      .from('aiboard_pricing_currencies')
      .select('currency_code')
      .ilike('currency_code', requestedCurrency)
      .maybeSingle();

    if (!error && data?.currency_code) {
      return normalizeCurrencyCode(data.currency_code);
    }
  } catch (err) {
    console.warn('[Currency] Failed to verify pricing currency:', err);
  }

  console.warn(`[Currency] ${requestedCurrency} is not configured in aiboard_pricing_currencies. Using USD.`);
  return DEFAULT_CURRENCY_CODE;
};

// Detect IP/country and log the visit to Supabase
// Fallback chain: ipapi.co → last stored visit currency → 'USD'
async function detectAndLogVisit(): Promise<string> {
  // --- Attempt 1: Live geolocation ---
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (res.ok) {
      const geo: GeoInfo = await res.json();

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id ?? null;

      if (userId) {
        const { error: visitError } = await supabase.from('virtual_pet_visits').upsert(
          {
            user_id: userId,
            ip: geo.ip,
            country: geo.country_name,
            country_code: geo.country_code,
            city: geo.city,
            region: geo.region,
            timezone: geo.timezone,
            currency: normalizeCurrencyCode(geo.currency),
            visited_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

        if (visitError) {
          console.warn('[VirtualPet] Could not save visit location:', visitError.message);
        }
      }

      console.log(`[VirtualPet] Visit logged — ${geo.city}, ${geo.country_name} (${geo.currency})`);
      return getSupportedPricingCurrency(geo.currency);
    }
  } catch {
    console.warn('[VirtualPet] Geolocation failed, trying stored record...');
  }

  // --- Attempt 2: Use last known currency from Supabase ---
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id ?? null;

    if (userId) {
      const { data: lastVisit } = await supabase
        .from('virtual_pet_visits')
        .select('currency')
        .eq('user_id', userId)
        .not('currency', 'is', null)
        .order('visited_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastVisit?.currency) {
        console.log(`[VirtualPet] Using stored currency: ${lastVisit.currency}`);
        return getSupportedPricingCurrency(lastVisit.currency);
      }
    }
  } catch {
    console.warn('[VirtualPet] Could not fetch stored visit currency.');
  }

  // --- Fallback: USD ---
  return DEFAULT_CURRENCY_CODE;
}

interface TodoVirtualPetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TodoVirtualPet({ isOpen, onClose }: TodoVirtualPetProps) {
  const hasLoggedRef = useRef(false);
  const [detectedCurrency, setDetectedCurrency] = useState(DEFAULT_CURRENCY_CODE);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!cancelled) setUserId(session?.user?.id || null);
      } catch (err) {
        console.error('Error fetching session in TodoVirtualPet:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Detect geo only once per open session
      if (!hasLoggedRef.current) {
        hasLoggedRef.current = true;
        detectAndLogVisit().then((currency) => {
          setDetectedCurrency(currency);
        });
      }
    } else {
      hasLoggedRef.current = false; // Reset so next open logs again
    }
  }, [isOpen]);

  return (
    <SharedVirtualPet
      isOpen={isOpen}
      onClose={onClose}
      repository={todoPetRepository}
      userId={userId}
      currencyCode={detectedCurrency}
    />
  );
}
