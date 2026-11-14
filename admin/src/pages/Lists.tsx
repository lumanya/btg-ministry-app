import { useCallback, useEffect, useState } from 'react';

import { friendlyError, WEEKDAYS } from '../lib';
import { db } from '../supabase';
import { Button, ConfirmButton, Loading, PageHead, useToast } from '../ui';

/**
 * A small spreadsheet-style editor for the simple lists: services, giving details,
 * series and quotes. Each row saves on its own.
 */

type Kind = 'text' | 'longtext' | 'time' | 'weekday' | 'bool' | 'tone' | 'number';
type Column = { key: string; label: string; kind: Kind; required?: boolean; width?: number; placeholder?: string };
type Row = Record<string, string | number | boolean | null> & { id: string };

type Config = {
  table: string;
  eyebrow: string;
  title: string;
  intro: string;
  columns: Column[];
  order: string;
  addLabel: string;
  newRow: () => Omit<Row, 'id'>;
};

function TableEditor({ config }: { config: Config }) {
  const toast = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Row>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    db()
      .from(config.table)
      .select(['id', ...config.columns.map((c) => c.key)].join(','))
      .order(config.order)
      .then(({ data, error }) => {
        if (error) toast(friendlyError(error), 'error');
        setRows(((data ?? []) as unknown as Row[]).map((r) => ({ ...r, start_time: typeof r.start_time === 'string' ? r.start_time.slice(0, 5) : r.start_time })));
        setDrafts({});
      });
  }, [config, toast]);

  useEffect(load, [load]);

  const value = (r: Row) => drafts[r.id] ?? r;
  const edit = (r: Row, key: string, v: Row[string]) => setDrafts((d) => ({ ...d, [r.id]: { ...value(r), [key]: v } }));

  const save = async (r: Row) => {
    const draft = drafts[r.id];
    if (!draft) return;
    const missing = config.columns.find((c) => c.required && (draft[c.key] === '' || draft[c.key] === null));
    if (missing) return toast(`${missing.label} can’t be empty.`, 'error');
    setBusy(r.id);
    const patch = Object.fromEntries(config.columns.map((c) => [c.key, draft[c.key] === '' ? null : draft[c.key]]));
    const { error } = await db().from(config.table).update(patch).eq('id', r.id);
    setBusy(null);
    if (error) return toast(friendlyError(error), 'error');
    setRows((rs) => rs?.map((x) => (x.id === r.id ? draft : x)) ?? null);
    setDrafts((d) => {
      const { [r.id]: _, ...rest } = d;
      void _;
      return rest;
    });
    toast('Saved.');
  };

  const add = async () => {
    setBusy('new');
    const { error } = await db().from(config.table).insert(config.newRow());
    setBusy(null);
    if (error) return toast(friendlyError(error), 'error');
    load();
  };

  const remove = async (r: Row) => {
    const { error } = await db().from(config.table).delete().eq('id', r.id);
    if (error) return toast(friendlyError(error), 'error');
    setRows((rs) => rs?.filter((x) => x.id !== r.id) ?? null);
    toast('Deleted.');
  };

  const cell = (r: Row, c: Column) => {
    const v = value(r)[c.key];
    const label = `${c.label}`;
    switch (c.kind) {
      case 'bool':
        return <input type="checkbox" aria-label={label} checked={!!v} onChange={(e) => edit(r, c.key, e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--brown)' }} />;
      case 'weekday':
        return (
          <select className="select" aria-label={label} value={Number(v)} onChange={(e) => edit(r, c.key, Number(e.target.value))}>
            {WEEKDAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        );
      case 'tone':
        return (
          <select className="select" aria-label={label} value={String(v)} onChange={(e) => edit(r, c.key, e.target.value)}>
            <option value="brown">Latte</option>
            <option value="deep">Warm sand</option>
            <option value="sand">Ivory</option>
          </select>
        );
      case 'time':
        return <input className="input" type="time" aria-label={label} value={String(v ?? '')} onChange={(e) => edit(r, c.key, e.target.value)} />;
      case 'number':
        return <input className="input" type="number" aria-label={label} style={{ width: 80 }} value={Number(v ?? 0)} onChange={(e) => edit(r, c.key, Number(e.target.value))} />;
      case 'longtext':
        return <textarea className="input" aria-label={label} value={String(v ?? '')} onChange={(e) => edit(r, c.key, e.target.value)} />;
      default:
        return (
          <input
            className="input"
            aria-label={label}
            placeholder={c.placeholder}
            style={{ minWidth: c.width ?? 160 }}
            value={String(v ?? '')}
            onChange={(e) => edit(r, c.key, e.target.value)}
          />
        );
    }
  };

  return (
    <>
      <PageHead
        eyebrow={config.eyebrow}
        title={config.title}
        intro={config.intro}
        actions={
          <Button variant="primary" onClick={add} busy={busy === 'new'}>
            {config.addLabel}
          </Button>
        }
      />
      {!rows ? (
        <Loading />
      ) : (
        <div className="table-wrap">
          <table className="edit">
            <thead>
              <tr>
                {config.columns.map((c) => (
                  <th key={c.key} scope="col">
                    {c.label}
                  </th>
                ))}
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  {config.columns.map((c) => (
                    <td key={c.key}>{cell(r, c)}</td>
                  ))}
                  <td>
                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                      {drafts[r.id] ? (
                        <Button small variant="primary" onClick={() => save(r)} busy={busy === r.id}>
                          Save
                        </Button>
                      ) : null}
                      <ConfirmButton label="Delete" confirmLabel="Sure?" onConfirm={() => remove(r)} />
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={config.columns.length + 1} className="muted" style={{ padding: 20 }}>
                    Nothing here yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

const services: Config = {
  table: 'services',
  eyebrow: 'Live tab',
  title: 'Weekly services',
  intro: 'Shown under “Coming up” in the app when no livestream is scheduled on YouTube. Times are Tanzania time.',
  columns: [
    { key: 'name', label: 'Name', kind: 'text', required: true, width: 180 },
    { key: 'weekday', label: 'Day', kind: 'weekday' },
    { key: 'start_time', label: 'Starts', kind: 'time', required: true },
    { key: 'venue', label: 'Venue', kind: 'text', width: 180 },
    { key: 'livestreamed', label: 'Livestreamed', kind: 'bool' },
    { key: 'active', label: 'Show', kind: 'bool' },
    { key: 'sort', label: 'Order', kind: 'number' },
  ],
  order: 'sort',
  addLabel: 'Add a service',
  newRow: () => ({ name: 'New service', weekday: 0, start_time: '09:00', venue: null, livestreamed: true, active: false, sort: 99 }),
};

const giving: Config = {
  table: 'giving_methods',
  eyebrow: 'Give screen',
  title: 'Giving details',
  intro: 'The numbers members copy on the Give screen. Double-check every digit before saving.',
  columns: [
    { key: 'label', label: 'Method', kind: 'text', required: true, width: 220, placeholder: 'M-Pesa · Vodacom Lipa number' },
    { key: 'number', label: 'Number', kind: 'text', required: true, width: 160 },
    { key: 'account_name', label: 'Account name', kind: 'text', width: 220 },
    { key: 'active', label: 'Show', kind: 'bool' },
    { key: 'sort', label: 'Order', kind: 'number' },
  ],
  order: 'sort',
  addLabel: 'Add a method',
  newRow: () => ({ label: 'New method', number: '0', account_name: null, active: false, sort: 99 }),
};

const seriesConfig: Config = {
  table: 'series',
  eyebrow: 'Content',
  title: 'Series',
  intro: 'Groups of devotionals, shown as tiles on the Devotional tab.',
  columns: [
    { key: 'name', label: 'Name', kind: 'text', required: true, width: 220 },
    { key: 'tone', label: 'Tile colour', kind: 'tone' },
    { key: 'sort', label: 'Order', kind: 'number' },
  ],
  order: 'sort',
  addLabel: 'Add a series',
  newRow: () => ({ name: `New series ${Math.floor(Math.random() * 900 + 100)}`, tone: 'brown', sort: 99 }),
};

const quotes: Config = {
  table: 'quotes',
  eyebrow: 'Home screen',
  title: 'Word for today',
  intro: 'Short quotes from the teaching. The app shows a different one each day.',
  columns: [
    { key: 'text', label: 'Quote', kind: 'longtext', required: true },
    { key: 'attribution', label: 'By', kind: 'text', required: true, width: 160 },
    { key: 'active', label: 'Show', kind: 'bool' },
  ],
  order: 'created_at',
  addLabel: 'Add a quote',
  newRow: () => ({ text: 'New quote', attribution: 'Iman Mwakanyamale', active: false }),
};

export const ServicesPage = () => <TableEditor config={services} />;
export const GivingPage = () => <TableEditor config={giving} />;
export const SeriesPage = () => <TableEditor config={seriesConfig} />;
export const QuotesPage = () => <TableEditor config={quotes} />;
