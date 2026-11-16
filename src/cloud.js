import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_KEY;
const supabase = url && key ? createClient(url, key) : null;

export async function loadCloud() {
  if (!supabase) return null;
  const { data, error } = await supabase.from('estado').select('data').eq('id', 1).maybeSingle();
  if (error) throw error;
  return data?.data?.players ? data.data : null;
}

export async function saveCloud(state) {
  if (!supabase) return;
  const { error } = await supabase
    .from('estado')
    .upsert({ id: 1, data: state, updated_at: new Date().toISOString() });
  if (error) throw error;
}