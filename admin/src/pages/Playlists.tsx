import { useCallback, useEffect, useState } from 'react';

import { friendlyError } from '../lib';
import { db, FEED_URL } from '../supabase';
import { Button, Loading, PageHead, useToast } from '../ui';

type YtPlaylist = { id: string; title: string; thumbnail: string | null; count: number };
type Setting = { youtube_id: string; title: string | null; visible: boolean; sort: number };
type Row = YtPlaylist & { name: string; visible: boolean; sort: number; dirty: boolean };

/** Which YouTube playlists show as series in the app, under what name, in what order. */
export default function Playlists() {
  const toast = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [feedRes, settingsRes] = await Promise.all([fetch(FEED_URL).then((r) => r.json()), db().from('playlists').select('youtube_id,title,visible,sort')]);
      const lists = (feedRes.playlists ?? []) as YtPlaylist[];
      const settings = new Map(((settingsRes.data ?? []) as Setting[]).map((s) => [s.youtube_id, s]));
      setRows(
        lists
          .map((p, i) => {
            const s = settings.get(p.id);
            return { ...p, name: s?.title ?? '', visible: s ? s.visible : true, sort: s?.sort ?? i + 1, dirty: false };
          })
          .sort((a, b) => a.sort - b.sort),
      );
    } catch {
      setError('Couldn’t load the YouTube playlists. Check that the YouTube feed is connected, then refresh.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const edit = (id: string, patch: Partial<Row>) => setRows((rs) => rs?.map((r) => (r.id === id ? { ...r, ...patch, dirty: true } : r)) ?? null);

  const save = async (r: Row) => {
    setBusy(r.id);
    const { error } = await db()
      .from('playlists')
      .upsert({ youtube_id: r.id, title: r.name.trim() || null, visible: r.visible, sort: r.sort, updated_at: new Date().toISOString() });
    setBusy(null);
    if (error) return toast(friendlyError(error), 'error');
    setRows((rs) => rs?.map((x) => (x.id === r.id ? { ...x, dirty: false } : x)) ?? null);
    toast('Saved. The app shows it on its next refresh.');
  };

  return (
    <>
      <PageHead
        eyebrow="Sermons tab"
        title="Series"
        intro="Playlists from the YouTube channel appear in the app as series, in the order arranged on YouTube. Hide any you don’t want members to see, rename them, or change their order."
        actions={
          <Button small onClick={load}>
            Refresh from YouTube
          </Button>
        }
      />
      {error ? <div className="notice error">{error}</div> : null}
      {!rows && !error ? <Loading /> : null}
      {rows && rows.length === 0 ? (
        <div className="notice">The channel has no public playlists yet. Create playlists on YouTube and they’ll appear here automatically.</div>
      ) : null}
      {rows && rows.length ? (
        <div className="table-wrap">
          <table className="edit">
            <thead>
              <tr>
                <th scope="col">Playlist on YouTube</th>
                <th scope="col">Name in the app</th>
                <th scope="col">Show</th>
                <th scope="col">Order</th>
                <th scope="col">
                  <span className="sr-only">Save</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ opacity: r.visible ? 1 : 0.6 }}>
                  <td>
                    <div className="row">
                      {r.thumbnail ? <img src={r.thumbnail} alt="" style={{ width: 88, height: 50, objectFit: 'cover', borderRadius: 8 }} /> : null}
                      <span className="stack" style={{ gap: 2 }}>
                        <strong>{r.title}</strong>
                        <span className="small muted">{r.count} videos</span>
                      </span>
                    </div>
                  </td>
                  <td>
                    <input className="input" aria-label={`Name in the app for ${r.title}`} placeholder={r.title} value={r.name} maxLength={100} onChange={(e) => edit(r.id, { name: e.target.value })} />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Show ${r.title} in the app`}
                      checked={r.visible}
                      onChange={(e) => edit(r.id, { visible: e.target.checked })}
                      style={{ width: 18, height: 18, accentColor: 'var(--brown)' }}
                    />
                  </td>
                  <td>
                    <input className="input" type="number" aria-label={`Order of ${r.title}`} style={{ width: 80 }} value={r.sort} onChange={(e) => edit(r.id, { sort: Number(e.target.value) })} />
                  </td>
                  <td>
                    {r.dirty ? (
                      <Button small variant="primary" onClick={() => save(r)} busy={busy === r.id}>
                        Save
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
