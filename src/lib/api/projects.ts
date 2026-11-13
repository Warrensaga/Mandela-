import type { ProjectRow } from '../database.types';
import { supabase } from '../supabase';
import { toApiError } from './errors';

/** A furnishing project (home, office, rental and so on), entered by the owner with their own photos. */
export interface Project {
  id: string;
  title: string;
  slug: string;
  spaceType: string | null;
  location: string | null;
  completedOn: string | null;
  summary: string | null;
  /** Plain text; blank lines separate paragraphs. */
  body: string | null;
  /** What was supplied, e.g. "Sofas", "Curtains", "Beds". */
  scope: string[];
  coverImageUrl: string | null;
  gallery: string[];
}

const COLUMNS = 'id, title, slug, space_type, location, completed_on, summary, body, scope, cover_image_url, gallery';

type PublicRow = Pick<ProjectRow, 'id' | 'title' | 'slug' | 'space_type' | 'location' | 'completed_on' | 'summary' | 'body' | 'scope' | 'cover_image_url' | 'gallery'>;

function mapProject(r: PublicRow): Project {
  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    spaceType: r.space_type,
    location: r.location,
    completedOn: r.completed_on,
    summary: r.summary,
    body: r.body,
    scope: r.scope ?? [],
    coverImageUrl: r.cover_image_url,
    gallery: r.gallery ?? [],
  };
}

/** Published projects in the owner's chosen order. */
export async function fetchProjects(limit = 60): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(COLUMNS)
    .eq('is_published', true)
    .order('sort_order')
    .order('completed_on', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw toApiError(error);
  return (data as PublicRow[]).map(mapProject);
}

/** One published project, or null when it does not exist or is not published. */
export async function fetchProject(slug: string): Promise<Project | null> {
  const { data, error } = await supabase.from('projects').select(COLUMNS).eq('slug', slug).eq('is_published', true).maybeSingle();
  if (error) throw toApiError(error);
  return data ? mapProject(data as PublicRow) : null;
}
