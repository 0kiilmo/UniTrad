import { createClient } from '@supabase/supabase-js';

const url = process.env.REACT_APP_SUPABASE_URL;
const key = process.env.REACT_APP_SUPABASE_ANON_KEY;

// null => mode démo (aucune variable définie) : l'app fonctionne avec des données locales
export const supabase = url && key ? createClient(url, key) : null;
export const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8000').replace(/\/$/, '');
