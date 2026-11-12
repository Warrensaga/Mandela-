import { supabase } from '../supabase';
import { ApiError, toApiError } from './errors';
import type { CustomRequestInput } from './types';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

export function validateReferenceImage(file: File): string | null {
  if (!ALLOWED.includes(file.type)) return 'Please choose a JPG, PNG, WebP or HEIC image.';
  if (file.size > MAX_BYTES) return 'Please choose an image smaller than 5 MB.';
  return null;
}

async function uploadReferenceImage(file: File): Promise<string> {
  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `uploads/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from('custom-requests')
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new ApiError('UPLOAD_FAILED', 'We could not upload your image. Please try a smaller JPG or PNG.');
  return path;
}

/** Uploads the optional reference image (private bucket), then saves the request. */
export async function submitCustomRequest(input: CustomRequestInput): Promise<{ reference: string }> {
  let imagePath: string | undefined;
  if (input.referenceImage) {
    const problem = validateReferenceImage(input.referenceImage);
    if (problem) throw new ApiError('UPLOAD_FAILED', problem);
    imagePath = await uploadReferenceImage(input.referenceImage);
  }

  const { data, error } = await supabase.rpc('submit_custom_request', {
    p_customer_name: input.customerName,
    p_phone: input.phone,
    p_description: input.description,
    p_email: input.email || undefined,
    p_dimensions: input.dimensions || undefined,
    p_preferred_material: input.preferredMaterial || undefined,
    p_budget: input.budget,
    p_reference_image_path: imagePath,
  });
  if (error) throw toApiError(error);
  const r = (data ?? {}) as Record<string, unknown>;
  return { reference: String(r.reference ?? '') };
}
