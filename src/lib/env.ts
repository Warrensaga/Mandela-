function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`);
  }
  return value;
}

export const env = {
  supabaseUrl: required('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL),
  supabaseAnonKey: required('VITE_SUPABASE_ANON_KEY', import.meta.env.VITE_SUPABASE_ANON_KEY),
  /** Fallback only. The number saved in Settings (admin) takes priority. */
  whatsappNumber: (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) ?? '',
  /** Optional. Enables the Google Maps Embed API; without it a keyless Google map is used. */
  googleMapsApiKey: (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ?? '',
};
