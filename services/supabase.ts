
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://phjhbabcqjuarxknlabf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_BSAAOZZDIQXBhgDbFJXzFg_OmnfmUB3';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Normalizes table names to lowercase for robust PostgreSQL compatibility.
 * This bridges the gap between frontend camelCase (Dexie) and Backend lowercase (Supabase).
 */
const normalizeTable = (name: string) => name.toLowerCase();

export async function pushToCloud(tableName: string, data: any) {
  try {
    if (!data) return true;
    const payload = Array.isArray(data) ? data : [data];
    if (payload.length === 0) return true;

    const normalizedName = normalizeTable(tableName);

    const { error } = await supabase
      .from(normalizedName)
      .upsert(payload, { onConflict: 'id' });
    
    if (error) {
      console.error(`[Supabase Sync Error] ${normalizedName}:`, error.message, error.hint || '');
      // Handle the specific 'Requested entity was not found' by logging it clearly
      if (error.message.includes("not found")) {
         console.warn(`Table ${normalizedName} might not exist in Supabase yet. Please run the setup SQL.`);
      }
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[Cloud Connection Failed] ${tableName}:`, err);
    return false;
  }
}

export async function pullFromCloud(tableName: string) {
  try {
    const normalizedName = normalizeTable(tableName);
    const { data, error } = await supabase.from(normalizedName).select('*');
    
    if (error) {
      console.error(`[Supabase Pull Error] ${normalizedName}:`, error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error(`[Cloud Pull Failed] ${tableName}:`, err);
    return [];
  }
}
