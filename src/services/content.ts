import { isSupabaseConfigured } from '@/lib/supabase';
import { localProvider } from './localProvider';
import { supabaseProvider } from './supabaseProvider';
import type { ContentProvider } from './types';

/**
 * Single source of truth for both the public site and the admin dashboard.
 * Supabase when credentials exist, the local demo store otherwise.
 */
export const content: ContentProvider = isSupabaseConfigured ? supabaseProvider : localProvider;

export const usingLocalProvider = content.name === 'local';

export type { ContentProvider } from './types';
