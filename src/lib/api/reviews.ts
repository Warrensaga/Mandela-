import { supabase } from '../supabase';
import { toApiError } from './errors';

/** A real customer review, entered by the owner exactly as it appears on Google. */
export interface Review {
  id: string;
  authorName: string;
  rating: number;
  body: string;
  date: string | null;
}

/** Published reviews in the owner's chosen order. */
export async function fetchReviews(limit = 6): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, author_name, rating, body, review_date')
    .eq('is_published', true)
    .order('sort_order')
    .order('review_date', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw toApiError(error);
  return data.map((r) => ({ id: r.id, authorName: r.author_name, rating: r.rating, body: r.body, date: r.review_date }));
}
