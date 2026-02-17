import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase URL and Anon Key
// You can find these in your Supabase Project Settings > API
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

const isValidUrl = (url: string) => {
    try {
        return url.startsWith('https://');
    } catch (e) {
        return false;
    }
};

export const supabase = isValidUrl(SUPABASE_URL)
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null as any;

if (!supabase) {
    console.warn("Supabase credentials are missing. Please update src/database/supabaseClient.ts with your URL and Key.");
}

