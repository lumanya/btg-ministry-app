import type { Session } from '@supabase/supabase-js';
import { FormEvent, useCallback, useEffect, useState } from 'react';

import { friendlyError } from './lib';
import DevotionalEditor from './pages/DevotionalEditor';
import Devotionals from './pages/Devotionals';
import { EventEditor, EventsList } from './pages/Events';
import Notifications from './pages/Notifications';
import Overview from './pages/Overview';
import Playlists from './pages/Playlists';
import Clips from './pages/Clips';
import Prayer from './pages/Prayer';
import Staff from './pages/Staff';
import { GivingPage, QuotesPage, SeriesPage, ServicesPage } from './pages/Lists';
import { db, StaffRole, supabase } from './supabase';
import { Button, Field, Loading, LOGO } from './ui';

/* ---------- Routing: #/devotionals/123?date=2026-11-15 ---------- */

export type Route = { path: string[]; query: URLSearchParams };

function readRoute(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [p, q = ''] = raw.split('?');
  return { path: p.split('/').filter(Boolean), query: new URLSearchParams(q) };
}

export function go(to: string) {
  window.location.hash = to.startsWith('#') ? to : `#${to}`;
}

function useRoute() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const on = () => {
      setRoute(readRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

/* ---------- App ---------- */

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [role, setRole] = useState<StaffRole | null | undefined>(undefined);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    db()
      .rpc('my_staff_role')
      .then(({ data, error }) => {
        if (!cancelled) setRole(error ? null : ((data as StaffRole | null) ?? null));
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!supabase) return <NotConfigured />;
  if (session === undefined) return <Loading />;
  if (!session) return <SignIn />;
  if (role === undefined) return <Loading label="Checking your access" />;
  if (role === null) return <NotStaff email={session.user.email ?? ''} />;
  return <Shell role={role} email={session.user.email ?? ''} />;
}

const NAV: { to: string; label: string; adminOnly?: boolean }[] = [
  { to: '', label: 'Overview' },
  { to: 'devotionals', label: 'Devotionals' },
  { to: 'events', label: 'Events' },
  { to: 'notifications', label: 'Notifications' },
  { to: 'prayer', label: 'Prayer requests' },
  { to: 'playlists', label: 'Sermon series' },
  { to: 'clips', label: 'Clips' },
  { to: 'services', label: 'Services' },
  { to: 'giving', label: 'Giving' },
  { to: 'series', label: 'Series' },
  { to: 'quotes', label: 'Word for today' },
  { to: 'staff', label: 'Staff' },
];

function Shell({ role, email }: { role: StaffRole; email: string }) {
  const route = useRoute();
  const [section = '', id] = route.path;
  const [newPrayers, setNewPrayers] = useState(0);

  const countPrayers = useCallback(() => {
    db()
      .from('prayer_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new')
      .then(({ count }) => setNewPrayers(count ?? 0));
  }, []);

  useEffect(() => {
    countPrayers();
    const t = window.setInterval(countPrayers, 60_000);
    return () => window.clearInterval(t);
  }, [countPrayers]);

  let page;
  if (section === 'devotionals' && id) page = <DevotionalEditor key={`${id}?${route.query}`} id={id === 'new' ? null : id} query={route.query} />;
  else if (section === 'devotionals') page = <Devotionals />;
  else if (section === 'events' && id) page = <EventEditor key={id} id={id === 'new' ? null : id} />;
  else if (section === 'events') page = <EventsList />;
  else if (section === 'notifications') page = <Notifications />;
  else if (section === 'playlists') page = <Playlists />;
  else if (section === 'clips') page = <Clips />;
  else if (section === 'prayer') page = <Prayer onChange={countPrayers} />;
  else if (section === 'services') page = <ServicesPage />;
  else if (section === 'giving') page = <GivingPage />;
  else if (section === 'series') page = <SeriesPage />;
  else if (section === 'quotes') page = <QuotesPage />;
  else if (section === 'staff') page = <Staff role={role} />;
  else page = <Overview />;

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <img src={LOGO} alt="" />
          <div>
            <strong>BTG Ministry</strong>
            <span>Admin</span>
          </div>
        </div>
        <nav className="nav" aria-label="Sections">
          {NAV.map((n) => (
            <a key={n.to} href={`#/${n.to}`} aria-current={section === n.to ? 'page' : undefined}>
              {n.label}
              {n.to === 'prayer' && newPrayers > 0 ? (
                <span className="count" aria-label={`${newPrayers} new`}>
                  {newPrayers}
                </span>
              ) : null}
            </a>
          ))}
        </nav>
        <div className="side-foot">
          <span className="who">
            {email} · {role === 'admin' ? 'Admin' : 'Editor'}
          </span>
          <Button variant="ghost" small onClick={() => db().auth.signOut()}>
            Sign out
          </Button>
        </div>
      </aside>
      <main className="main">{page}</main>
    </div>
  );
}

/* ---------- Signed-out screens ---------- */

function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await db().auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(friendlyError(error));
  };

  return (
    <div className="auth">
      <form className="card" onSubmit={submit} noValidate>
        <img className="logo" src={LOGO} alt="" />
        <div className="stack tight">
          <span className="eyebrow">BTG Ministry</span>
          <h1>Admin</h1>
          <p className="muted">Post devotionals, answer prayer requests and keep the app up to date.</p>
        </div>
        <Field label="Email">
          {(p) => <input {...p} className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <Field label="Password" error={error}>
          {(p) => (
            <input {...p} className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          )}
        </Field>
        <button className="btn primary" type="submit" aria-busy={busy || undefined}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="small muted">Use your BTG Ministry app account. Forgot your password? Reset it from the app’s sign-in screen.</p>
      </form>
    </div>
  );
}

function NotStaff({ email }: { email: string }) {
  return (
    <div className="auth">
      <div className="card">
        <img className="logo" src={LOGO} alt="" />
        <h2>This account isn’t on the staff list</h2>
        <p className="muted">
          You’re signed in as <strong>{email}</strong>. Ask a ministry admin to add this email under Staff, then sign in again.
        </p>
        <Button onClick={() => db().auth.signOut()}>Sign out</Button>
      </div>
    </div>
  );
}

function NotConfigured() {
  return (
    <div className="auth">
      <div className="card">
        <img className="logo" src={LOGO} alt="" />
        <h2>Connect Supabase</h2>
        <p className="muted">
          Copy <code>.env.example</code> to <code>.env</code> in the <code>admin</code> folder and fill in your project’s URL and publishable key, then restart.
        </p>
      </div>
    </div>
  );
}
