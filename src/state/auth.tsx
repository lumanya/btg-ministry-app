import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { cleanEmail, friendlyAuthError } from '@/lib/auth-messages';
import { supabase } from '@/lib/supabase';

/**
 * Accounts: email and password through Supabase, plus guest mode.
 *
 * Nobody has to sign in: "Continue as guest" opens the whole app. An account
 * is for things that follow a member between phones (streaks, saved items,
 * prayer requests with their name).
 *
 * Email confirmation and password reset use the 6-digit code from the email,
 * so they work inside the app without opening links (see README for the
 * email templates).
 */

const GUEST_KEY = 'btg.guest.v1';

/** Result of an action: either it worked, or a message to show the member. */
export type AuthResult = { ok: true; needsCode?: boolean } | { ok: false; error: string };

type AuthState = {
  /** False when Supabase isn't set up in `.env`: the app is guest-only. */
  configured: boolean;
  /** True once the saved session (if any) has been read. */
  ready: boolean;
  session: Session | null;
  email: string | null;
  name: string | null;
  guest: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (name: string, email: string, password: string) => Promise<AuthResult>;
  confirmSignUp: (email: string, code: string) => Promise<AuthResult>;
  resendSignUpCode: (email: string) => Promise<AuthResult>;
  sendResetCode: (email: string) => Promise<AuthResult>;
  resetPassword: (email: string, code: string, password: string) => Promise<AuthResult>;
  updateName: (name: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<AuthResult>;
  continueAsGuest: () => void;
};

const notConfigured: AuthResult = { ok: false, error: 'Accounts aren’t switched on in this version of the app yet. Continue as a guest for now.' };

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(!supabase);
  const [guest, setGuest] = useState(false);
  const [guestReady, setGuestReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(GUEST_KEY)
      .then((v) => setGuest(v === '1'))
      .catch(() => {})
      .finally(() => setGuestReady(true));

    if (!supabase) return;
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => {})
      .finally(() => setSessionReady(true));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const run = useCallback(async (fn: () => Promise<AuthResult>): Promise<AuthResult> => {
    if (!supabase) return notConfigured;
    try {
      return await fn();
    } catch (err) {
      return { ok: false, error: friendlyAuthError(err) };
    }
  }, []);

  const value = useMemo<AuthState>(() => {
    const meta = (session?.user.user_metadata ?? {}) as { full_name?: string };
    return {
      configured: !!supabase,
      ready: sessionReady && guestReady,
      session,
      email: session?.user.email ?? null,
      name: meta.full_name?.trim() || null,
      guest,

      signIn: (email, password) =>
        run(async () => {
          const { error } = await supabase!.auth.signInWithPassword({ email: cleanEmail(email), password });
          if (error) return { ok: false, error: friendlyAuthError(error) };
          return { ok: true };
        }),

      signUp: (name, email, password) =>
        run(async () => {
          const { data, error } = await supabase!.auth.signUp({
            email: cleanEmail(email),
            password,
            options: { data: { full_name: name.trim() } },
          });
          if (error) return { ok: false, error: friendlyAuthError(error) };
          // With email confirmation on (the default) there is no session until the code is entered.
          // Supabase returns a user with no identities when the email is already registered.
          if (!data.session && data.user && data.user.identities?.length === 0) {
            return { ok: false, error: friendlyAuthError({ code: 'user_already_exists' }) };
          }
          return { ok: true, needsCode: !data.session };
        }),

      confirmSignUp: (email, code) =>
        run(async () => {
          const { error } = await supabase!.auth.verifyOtp({ email: cleanEmail(email), token: code.replace(/\s/g, ''), type: 'email' });
          if (error) return { ok: false, error: friendlyAuthError(error) };
          return { ok: true };
        }),

      resendSignUpCode: (email) =>
        run(async () => {
          const { error } = await supabase!.auth.resend({ type: 'signup', email: cleanEmail(email) });
          if (error) return { ok: false, error: friendlyAuthError(error) };
          return { ok: true };
        }),

      sendResetCode: (email) =>
        run(async () => {
          const { error } = await supabase!.auth.resetPasswordForEmail(cleanEmail(email));
          if (error) return { ok: false, error: friendlyAuthError(error) };
          return { ok: true };
        }),

      resetPassword: (email, code, password) =>
        run(async () => {
          const verified = await supabase!.auth.verifyOtp({ email: cleanEmail(email), token: code.replace(/\s/g, ''), type: 'recovery' });
          if (verified.error) return { ok: false, error: friendlyAuthError(verified.error) };
          const { error } = await supabase!.auth.updateUser({ password });
          if (error) return { ok: false, error: friendlyAuthError(error) };
          return { ok: true };
        }),

      updateName: (name) =>
        run(async () => {
          const { data, error } = await supabase!.auth.updateUser({ data: { full_name: name.trim() } });
          if (error) return { ok: false, error: friendlyAuthError(error) };
          if (data.user) {
            // Keep the profiles table in step; ignore failure, the account name is already saved.
            await supabase!.from('profiles').update({ full_name: name.trim() }).eq('id', data.user.id);
          }
          return { ok: true };
        }),

      signOut: async () => {
        if (supabase) await supabase.auth.signOut().catch(() => {});
      },

      deleteAccount: () =>
        run(async () => {
          const { error } = await supabase!.functions.invoke('delete-account', { method: 'POST' });
          if (error) return { ok: false, error: 'We couldn’t delete your account. Please try again, or contact the ministry office.' };
          await supabase!.auth.signOut({ scope: 'local' }).catch(() => {});
          return { ok: true };
        }),

      continueAsGuest: () => {
        setGuest(true);
        AsyncStorage.setItem(GUEST_KEY, '1').catch(() => {});
      },
    };
  }, [session, sessionReady, guestReady, guest, run]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
