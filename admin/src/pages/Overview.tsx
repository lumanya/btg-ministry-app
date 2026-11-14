import { useEffect, useState } from 'react';

import { addDays, formatDay, formatMoment, friendlyError, plural, todayInTanzania } from '../lib';
import { db, FEED_URL } from '../supabase';
import { Loading, PageHead } from '../ui';

type Stats = {
  members: number;
  members_this_week: number;
  devotionals_published: number;
  devotionals_scheduled: number;
  devotionals_drafts: number;
  prayer_new: number;
  reads_this_week: number;
  next_scheduled_on: string | null;
  last_published_on: string | null;
};

type Top = { item_id: string; likes: number; views: number };
type Loved = { id: string; title: string; href: string; likes: number; views: number; kind: 'Devotional' | 'Sermon' | 'Event' };

/** The most liked devotionals and sermons in the app over the last 30 days, with their titles. */
async function mostLoved(): Promise<Loved[]> {
  const titles = new Map<string, { title: string; id?: string }>();
  const [d, v, e] = await Promise.all([
    db().rpc('top_items', { stat_kind: 'devotional' }),
    db().rpc('top_items', { stat_kind: 'video' }),
    db().rpc('top_items', { stat_kind: 'event' }),
  ]);
  const devs = (d.data as Top[] | null) ?? [];
  const vids = (v.data as Top[] | null) ?? [];
  const evs = (e.data as Top[] | null) ?? [];
  if (evs.length) {
    const { data } = await db().from('events').select('id,title').in('id', evs.map((x) => x.item_id));
    for (const r of (data as { id: string; title: string }[] | null) ?? []) titles.set(`e:${r.id}`, { title: r.title, id: r.id });
  }
  if (devs.length) {
    const { data } = await db().from('devotionals').select('id,slug,title').in('slug', devs.map((x) => x.item_id));
    for (const r of (data as { id: string; slug: string; title: string }[] | null) ?? []) titles.set(`d:${r.slug}`, { title: r.title, id: r.id });
  }
  if (vids.length) {
    try {
      const feed = (await (await fetch(FEED_URL)).json()) as { videos?: { id: string; title: string }[] };
      for (const x of feed.videos ?? []) titles.set(`v:${x.id}`, { title: x.title });
    } catch {
      // Titles are a nicety; fall back to the YouTube id.
    }
  }
  return [
    ...devs.map((x): Loved => {
      const m = titles.get(`d:${x.item_id}`);
      return { id: `d:${x.item_id}`, title: m?.title ?? x.item_id, href: m?.id ? `#/devotionals/${m.id}` : '#/devotionals', likes: Number(x.likes), views: Number(x.views), kind: 'Devotional' };
    }),
    ...evs.map((x): Loved => ({
      id: `e:${x.item_id}`,
      title: titles.get(`e:${x.item_id}`)?.title ?? 'Event',
      href: `#/events/${x.item_id}`,
      likes: Number(x.likes),
      views: Number(x.views),
      kind: 'Event',
    })),
    ...vids.map((x): Loved => ({
      id: `v:${x.item_id}`,
      title: titles.get(`v:${x.item_id}`)?.title ?? `YouTube video ${x.item_id}`,
      href: `https://www.youtube.com/watch?v=${encodeURIComponent(x.item_id)}`,
      likes: Number(x.likes),
      views: Number(x.views),
      kind: 'Sermon',
    })),
  ]
    .sort((a, b) => b.likes - a.likes || b.views - a.views)
    .slice(0, 6);
}

type Prayer = { id: string; message: string; name: string | null; created_at: string; user_id: string | null };

export default function Overview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loved, setLoved] = useState<Loved[] | null>(null);
  const today = todayInTanzania();
  const tomorrow = addDays(today, 1);

  useEffect(() => {
    Promise.all([
      db().rpc('admin_overview'),
      db().from('prayer_requests').select('id,message,name,created_at,user_id').eq('status', 'new').order('created_at', { ascending: false }).limit(4),
    ]).then(([s, p]) => {
      if (s.error) setError(friendlyError(s.error));
      else setStats(s.data as Stats);
      setPrayers((p.data as Prayer[]) ?? []);
    });
    mostLoved()
      .then(setLoved)
      .catch(() => setLoved([]));
  }, []);

  if (error) return <div className="notice error">{error}</div>;
  if (!stats) return <Loading />;

  const nothingTomorrow = !stats.next_scheduled_on && (!stats.last_published_on || stats.last_published_on <= today);
  const hour = Number(new Date(Date.now() + 3 * 3600e3).toISOString().slice(11, 13));
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <PageHead
        eyebrow={formatDay(today)}
        title={`${greeting}.`}
        intro="Here’s what’s happening in the BTG Ministry app."
        actions={
          <a className="btn primary" href={`#/devotionals/new?date=${stats.next_scheduled_on ? addDays(stats.next_scheduled_on, 1) : tomorrow}`}>
            Write a devotional
          </a>
        }
      />

      <div className="stack" style={{ gap: 24 }}>
        {nothingTomorrow ? (
          <div className="notice warn" role="note">
            <div className="stack tight grow">
              <strong>Nothing is scheduled for tomorrow.</strong>
              <span>
                {!stats.last_published_on
                  ? 'No devotionals have been published yet.'
                  : stats.last_published_on === today
                    ? 'Tomorrow, members will still see today’s devotional unless a new one is published.'
                    : `Members are still seeing the devotional from ${formatDay(stats.last_published_on)}.`}
              </span>
            </div>
            <a className="btn small" href={`#/devotionals/new?date=${tomorrow}`}>
              Write tomorrow’s
            </a>
          </div>
        ) : stats.next_scheduled_on ? (
          <div className="notice ok" role="note">
            <span>
              Devotionals are scheduled up to <strong>{formatDay(stats.next_scheduled_on)}</strong>
              {stats.devotionals_scheduled > 1 ? ` (${stats.devotionals_scheduled} waiting)` : ''}.
            </span>
          </div>
        ) : null}

        <div className="stats">
          <a className="stat" href="#/prayer">
            <span className="num">{stats.prayer_new}</span>
            <span className="label">New prayer requests</span>
          </a>
          <div className="stat">
            <span className="num">{stats.members}</span>
            <span className="label">{stats.members === 1 ? 'Member' : 'Members'} · {stats.members_this_week} joined this week</span>
          </div>
          <div className="stat">
            <span className="num">{stats.reads_this_week}</span>
            <span className="label">Devotionals read by members this week</span>
          </div>
          <a className="stat" href="#/devotionals">
            <span className="num">{stats.devotionals_published}</span>
            <span className="label">
              Published · {stats.devotionals_scheduled} scheduled · {plural(stats.devotionals_drafts, 'draft')}
            </span>
          </a>
        </div>

        <section className="stack tight">
          <div className="row spread">
            <h2>Most loved this month</h2>
            <span className="small muted">Likes and views in the app, last 30 days</span>
          </div>
          {loved === null ? (
            <p className="muted">Loading…</p>
          ) : loved.length ? (
            <div className="list">
              {loved.map((x) => (
                <a key={x.id} className="list-row" href={x.href} {...(x.kind === 'Sermon' ? { target: '_blank', rel: 'noreferrer' } : {})}>
                  <span className="date">{x.kind}</span>
                  <span className="grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {x.title}
                  </span>
                  <span className="small muted">
                    ♥ {x.likes} · {plural(x.views, x.kind === 'Devotional' ? 'read' : 'view')}
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <p className="muted">No likes yet. When members tap the heart on a sermon, devotional or event, the favourites show here.</p>
          )}
        </section>

        <section className="stack tight">
          <div className="row spread">
            <h2>Waiting for prayer</h2>
            <a href="#/prayer">See all</a>
          </div>
          {prayers.length ? (
            <div className="list">
              {prayers.map((p) => (
                <a key={p.id} className="list-row" href="#/prayer">
                  <span className="date">{formatMoment(p.created_at)}</span>
                  <span className="grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.message}
                  </span>
                  <span className="small muted">{p.name || (p.user_id ? 'Member' : 'Guest')}</span>
                </a>
              ))}
            </div>
          ) : (
            <p className="muted">No new prayer requests. You’re all caught up.</p>
          )}
        </section>
      </div>
    </>
  );
}
