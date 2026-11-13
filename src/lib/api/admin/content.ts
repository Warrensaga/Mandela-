import type { DeliveryZoneRow, GuideRow, Json, ProjectRow, ReviewRow, SettingRow } from '../../database.types';
import { supabase } from '../../supabase';
import { toApiError } from '../errors';

function check<T>(res: { data: T; error: unknown }): NonNullable<T> {
  if (res.error) throw toApiError(res.error);
  return res.data as NonNullable<T>;
}

// ---------------------------------------------------------------- delivery zones

export async function listZones(): Promise<DeliveryZoneRow[]> {
  return check(await supabase.from('delivery_zones').select('*').order('sort_order'));
}

export async function saveZone(row: Partial<DeliveryZoneRow> & { name: string }): Promise<void> {
  if (row.id) {
    const { id, ...patch } = row;
    check(await supabase.from('delivery_zones').update(patch).eq('id', id));
  } else {
    check(await supabase.from('delivery_zones').insert(row));
  }
}

export async function deleteZone(id: string): Promise<void> {
  check(await supabase.from('delivery_zones').delete().eq('id', id));
}

// ---------------------------------------------------------------- reviews

export async function listAllReviews(): Promise<ReviewRow[]> {
  return check(await supabase.from('reviews').select('*').order('sort_order').order('created_at', { ascending: false }));
}

export async function saveReview(row: Partial<ReviewRow> & { author_name: string; rating: number; body: string }): Promise<void> {
  if (row.id) {
    const { id, ...patch } = row;
    check(await supabase.from('reviews').update(patch).eq('id', id));
  } else {
    check(await supabase.from('reviews').insert(row));
  }
}

export async function deleteReview(id: string): Promise<void> {
  check(await supabase.from('reviews').delete().eq('id', id));
}

// ---------------------------------------------------------------- projects

export async function listAllProjects(): Promise<ProjectRow[]> {
  return check(await supabase.from('projects').select('*').order('sort_order').order('created_at', { ascending: false }));
}

export async function saveProject(row: Partial<ProjectRow> & { title: string; slug: string }): Promise<string> {
  if (row.id) {
    const { id, ...patch } = row;
    check(await supabase.from('projects').update(patch).eq('id', id));
    return id;
  }
  return check(await supabase.from('projects').insert(row).select('id').single()).id;
}

export async function deleteProject(id: string): Promise<void> {
  check(await supabase.from('projects').delete().eq('id', id));
}

// ---------------------------------------------------------------- guides

export async function listGuides(): Promise<GuideRow[]> {
  return check(await supabase.from('guides').select('*').order('created_at', { ascending: false }));
}

export async function saveGuide(row: Partial<GuideRow> & { title: string; slug: string }): Promise<string> {
  if (row.id) {
    const { id, ...patch } = row;
    check(await supabase.from('guides').update(patch).eq('id', id));
    return id;
  }
  return check(await supabase.from('guides').insert(row).select('id').single()).id;
}

export async function deleteGuide(id: string): Promise<void> {
  check(await supabase.from('guides').delete().eq('id', id));
}

// ---------------------------------------------------------------- settings

/** All settings rows (admins can read private keys too). */
export async function listSettings(): Promise<SettingRow[]> {
  return check(await supabase.from('settings').select('*').order('key'));
}

/** Upserts settings. RLS allows this for owners only. */
export async function saveSettings(values: Record<string, Json>, isPublic = true): Promise<void> {
  const rows = Object.entries(values).map(([key, value]) => ({ key, value, is_public: isPublic }));
  check(await supabase.from('settings').upsert(rows, { onConflict: 'key' }));
}
