import { useCallback, useEffect, useState } from 'react';

import { formatClock, formatDay, friendlyError, parseClock, plural, youtubeIdFrom } from '../lib';
import { CLIPS_URL, db, FEED_URL } from '../supabase';
import { Button, ConfirmButton, Empty, Field, Loading, PageHead, useToast } from '../ui';

type Status = { connected: boolean; account_id?: string | null; expires_at?: string | null; refreshed_at?: string | null };
type Clip = {
  id: string;
  videoUrl: string | null;
  thumbnail: string | null;
  permalink: string | null;
  title: string;
  caption: string;
  postedAt: string | null;
  sermon: { youtubeId: string; start: number } | null;
  hidden: boolean;
};
type Setting = { instagram_id: string; title: string | null; hidden: boolean; sermon_youtube_id: string | null; sermon_start_seconds: number | null };
type Sermon = { id: string; title: string; date: string };
type Row = Clip & { name: string; sermonId: string; sermonLink: string; start: string; hide: boolean; dirty: boolean; error: string | null };

const OTHER = '__other';

/** Short videos from the ministry's Instagram, shown full screen in the app. */
export default function Clips() {
  const toast = useToast();
  const [status, setStatus] = useState<Status | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [stats, setStats] = useState<Map<string, { likes: number; views: number }>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [accountId, setAccountId] = useState('');
  const [replacing, setReplacing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const st = await db().rpc('instagram_status');
    if (st.error) return setError(friendlyError(st.error));
    setStatus(st.data as Status);
    fetch(FEED_URL)
      .then((r) => r.json())
      .then((f: { videos?: Sermon[] }) => setSermons((f.videos ?? []).map((v) => ({ id: v.id, title: v.title, date: v.date }))))
      .catch(() => {});
    if (!(st.data as Status).connected) return setRows([]);
    try {
      const [feed, settings] = await Promise.all([
        fetch(`${CLIPS_URL}?all=1`).then((r) => r.json() as Promise<{ clips?: Clip[]; error?: string }>),
        db().from('clips').select('instagram_id,title,hidden,sermon_youtube_id,sermon_start_seconds'),
      ]);
      if (feed.error && !feed.clips?.length) setError(feed.error);
      const byId = new Map(((settings.data ?? []) as Setting[]).map((s) => [s.instagram_id, s]));
      const list = (feed.clips ?? []).map(
        (c): Row => ({
          ...c,
          name: byId.get(c.id)?.title ?? '',
          sermonId: c.sermon?.youtubeId ?? '',
          sermonLink: '',
          start: c.sermon?.start ? formatClock(c.sermon.start) : '',
          hide: c.hidden,
          dirty: false,
          error: null,
        }),
      );
      setRows(list);
      if (list.length) {
        db()
          .rpc('item_stats', { stat_kind: 'clip', items: list.slice(0, 200).map((c) => c.id) })
          .then(({ data }) =>
            setStats(new Map(((data as { item_id: string; likes: number; views: number }[] | null) ?? []).map((x) => [x.item_id, { likes: Number(x.likes), views: Number(x.views) }]))),
          );
      }
    } catch {
      setError('Couldn’t load the seeds from Instagram. Refresh to try again.');
      setRows([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const connect = async () => {
    setBusy('connect');
    const { error } = await db().rpc('set_instagram_token', { token: token.trim(), account_id: accountId.trim() || null });
    setBusy(null);
    if (error) return toast(friendlyError(error), 'error');
    setToken('');
    setAccountId('');
    setReplacing(false);
    toast('Instagram connected. Loading the seeds…');
    load();
  };

  const disconnect = async () => {
    const { error } = await db().rpc('disconnect_instagram');
    if (error) return toast(friendlyError(error), 'error');
    toast('Instagram disconnected. Seeds no longer show in the app.');
    load();
  };

  const edit = (id: string, patch: Partial<Row>) => setRows((rs) => rs?.map((r) => (r.id === id ? { ...r, ...patch, dirty: true, error: null } : r)) ?? null);

  const save = async (r: Row) => {
    const youtubeId = r.sermonId === OTHER ? youtubeIdFrom(r.sermonLink) : r.sermonId || null;
    if (r.sermonId === OTHER && !youtubeId) return edit(r.id, { error: 'Paste a YouTube link to the sermon, or choose one from the list.' });
    const start = r.start.trim() ? parseClock(r.start) : 0;
    if (start === null) return edit(r.id, { error: 'Write the start time as minutes:seconds, for example 12:40.' });
    setBusy(r.id);
    const { error } = await db()
      .from('clips')
      .upsert({
        instagram_id: r.id,
        title: r.name.trim() || null,
        hidden: r.hide,
        sermon_youtube_id: youtubeId,
        sermon_start_seconds: youtubeId ? start : null,
        updated_at: new Date().toISOString(),
      });
    setBusy(null);
    if (error) return toast(friendlyError(error), 'error');
    setRows((rs) => rs?.map((x) => (x.id === r.id ? { ...x, dirty: false, sermonId: youtubeId ?? '', sermonLink: '' } : x)) ?? null);
    toast('Saved. The app shows it within a few minutes.');
  };

  const knownSermon = (id: string) => sermons.some((s) => s.id === id);

  return (
    <>
      <PageHead
        eyebrow="Seeds tab"
        title="Seeds"
        intro="Seeds (Mbegu) are the short videos from Iman’s Instagram. They play full screen in the app’s Seeds tab. Link each one to the sermon it comes from, so members can grow the seed into the whole message."
        actions={
          status?.connected ? (
            <Button small onClick={load}>
              Refresh from Instagram
            </Button>
          ) : undefined
        }
      />
      {error ? <div className="notice error">{error}</div> : null}
      {!status && !error ? <Loading /> : null}

      {status ? (
        <section className="card stack" style={{ gap: 14, marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Instagram connection</h2>
          {status.connected && !replacing ? (
            <>
              <p style={{ margin: 0 }}>
                {status.account_id ? (
                  <>Connected to Instagram account {status.account_id}. This key doesn’t expire.</>
                ) : (
                  <>
                    Connected. The access key renews itself while the app is in use
                    {status.expires_at ? <> and is currently good until <strong>{formatDay(status.expires_at.slice(0, 10))}</strong></> : null}.
                  </>
                )}
              </p>
              <div className="row wrap">
                <Button small onClick={() => setReplacing(true)}>
                  Replace the key
                </Button>
                <ConfirmButton label="Disconnect" confirmLabel="Disconnect Instagram?" onConfirm={disconnect} />
              </div>
            </>
          ) : (
            <>
              <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
                <li>The ministry’s Instagram must be a Business or Creator account (Instagram settings → Account type).</li>
                <li>
                  In the Meta app on <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer">developers.facebook.com</a>, open Instagram → API setup with Instagram login, add the account and choose Generate token.
                </li>
                <li>Paste the token here. It’s stored privately and never shown again.</li>
              </ol>
              <Field label="Instagram access token">
                {(p) => <textarea {...p} className="textarea" style={{ minHeight: 70, fontFamily: 'monospace', fontSize: 13 }} value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" spellCheck={false} />}
              </Field>
              <Field label="Instagram account ID" hint="Needed for keys from Meta’s business setup (they don’t start with “IG”). It’s the long number shown under the account’s name on the app’s Instagram page.">
                {(p) => <input {...p} className="input" style={{ maxWidth: 260 }} inputMode="numeric" placeholder="17841402024265975" value={accountId} onChange={(e) => setAccountId(e.target.value)} />}
              </Field>
              <div className="row">
                <Button variant="primary" onClick={connect} busy={busy === 'connect'} disabled={token.trim().length < 20}>
                  {busy === 'connect' ? 'Saving…' : status.connected ? 'Save new key' : 'Connect Instagram'}
                </Button>
                {replacing ? (
                  <Button variant="ghost" onClick={() => setReplacing(false)}>
                    Cancel
                  </Button>
                ) : null}
              </div>
            </>
          )}
        </section>
      ) : null}

      {status?.connected && !rows ? <Loading label="Loading seeds" /> : null}
      {status?.connected && rows && rows.length === 0 && !error ? (
        <Empty title="No videos yet" text="Videos and Reels posted on the ministry’s Instagram appear here automatically." />
      ) : null}

      {rows && rows.length ? (
        <div className="stack" style={{ gap: 14 }}>
          <p className="small muted" style={{ margin: 0 }}>
            {plural(rows.filter((r) => !r.hidden && r.videoUrl).length, 'seed')} showing in the app.
          </p>
          {rows.map((r) => {
            const st = stats.get(r.id);
            const unplayable = !r.videoUrl;
            const selectValue = r.sermonId && r.sermonId !== OTHER && !knownSermon(r.sermonId) ? OTHER : r.sermonId;
            return (
              <article key={r.id} className="card" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', opacity: r.hide || unplayable ? 0.7 : 1 }}>
                <a href={r.permalink ?? undefined} target="_blank" rel="noreferrer" aria-label={`Open “${r.title}” on Instagram`} style={{ flex: 'none' }}>
                  {r.thumbnail ? (
                    <img src={r.thumbnail} alt="" style={{ width: 90, height: 160, objectFit: 'cover', borderRadius: 10, background: '#3A2413' }} />
                  ) : (
                    <div style={{ width: 90, height: 160, borderRadius: 10, background: '#3A2413' }} />
                  )}
                </a>
                <div className="stack" style={{ flex: '1 1 320px', minWidth: 0, gap: 12 }}>
                  <div className="stack" style={{ gap: 4 }}>
                    <div className="row wrap" style={{ gap: 8 }}>
                      <strong style={{ fontSize: 16 }}>{r.name.trim() || r.title}</strong>
                      {r.hide ? <span className="pill draft">Hidden</span> : null}
                      {unplayable ? <span className="pill new">Can’t play in the app</span> : null}
                    </div>
                    <span className="small muted">
                      {r.postedAt ? formatDay(r.postedAt.slice(0, 10)) : ''}
                      {st && (st.likes || st.views) ? ` · ♥ ${st.likes} · ${plural(st.views, 'view')}` : ''}
                    </span>
                    {unplayable ? (
                      <span className="small muted">Instagram doesn’t share videos that use music from its audio library, so this one only plays on Instagram.</span>
                    ) : null}
                  </div>
                  <div className="grid-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    <Field label="Title in the app" hint="Leave empty to use the first line of the caption.">
                      {(p) => <input {...p} className="input" placeholder={r.title} value={r.name} maxLength={100} onChange={(e) => edit(r.id, { name: e.target.value })} />}
                    </Field>
                    <Field label="Comes from the sermon">
                      {(p) => (
                        <select {...p} className="select" value={selectValue} onChange={(e) => edit(r.id, { sermonId: e.target.value })}>
                          <option value="">Not linked</option>
                          {sermons.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.title}
                              {s.date ? ` · ${formatDay(s.date.slice(0, 10))}` : ''}
                            </option>
                          ))}
                          <option value={OTHER}>An older sermon (paste its YouTube link)…</option>
                        </select>
                      )}
                    </Field>
                  </div>
                  {selectValue === OTHER ? (
                    <Field label="YouTube link to the sermon">
                      {(p) => (
                        <input
                          {...p}
                          className="input"
                          placeholder={r.sermonId && r.sermonId !== OTHER ? `https://youtu.be/${r.sermonId}` : 'https://www.youtube.com/watch?v=…'}
                          value={r.sermonLink}
                          onChange={(e) => edit(r.id, { sermonId: OTHER, sermonLink: e.target.value })}
                        />
                      )}
                    </Field>
                  ) : null}
                  <div className="row wrap" style={{ gap: 16, alignItems: 'flex-end' }}>
                    {r.sermonId ? (
                      <Field label="Open the sermon at (optional)" hint="Leave empty to start from the beginning. Seeds are usually edited from several parts, so only add a time when one moment clearly fits.">
                        {(p) => <input {...p} className="input" style={{ width: 120 }} placeholder="0:00" value={r.start} onChange={(e) => edit(r.id, { start: e.target.value })} />}
                      </Field>
                    ) : null}
                    <label className="check" style={{ minHeight: 44 }}>
                      <input type="checkbox" checked={r.hide} onChange={(e) => edit(r.id, { hide: e.target.checked })} />
                      Hide from the app
                    </label>
                    <span className="grow" />
                    {r.dirty ? (
                      <Button small variant="primary" onClick={() => save(r)} busy={busy === r.id}>
                        Save
                      </Button>
                    ) : null}
                  </div>
                  {r.error ? <span className="small" style={{ color: 'var(--danger)' }}>{r.error}</span> : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </>
  );
}
