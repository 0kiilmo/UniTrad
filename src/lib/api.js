import { supabase, API_URL } from './supabase';

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Session expirée, reconnecte-toi');
  return { Authorization: `Bearer ${token}` };
}

async function request(path, { json, form } = {}) {
  const headers = await authHeader();
  if (json) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: json ? JSON.stringify(json) : form,
  });
  if (!res.ok) {
    let detail = `Erreur ${res.status}`;
    try { detail = (await res.json()).detail || detail; } catch (e) { /* ignore */ }
    const err = new Error(detail);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const startChapter = (seriesId, title) =>
  request('/api/chapters/start', { json: { series_id: seriesId, title } });

export const translatePage = (chapterId, { file, pageIndex, sourceLang, targetLang, glossary, characters, originalPath }) => {
  const form = new FormData();
  form.append('file', file);
  form.append('page_index', String(pageIndex));
  form.append('source_lang', sourceLang);
  form.append('target_lang', targetLang);
  form.append('glossary', JSON.stringify(glossary));
  form.append('characters', JSON.stringify(characters));
  form.append('original_path', originalPath || '');
  return request(`/api/chapters/${chapterId}/pages`, { form });
};

export const completeChapter = (chapterId, pagesCount) =>
  request(`/api/chapters/${chapterId}/complete`, { json: { pages_count: pagesCount } });

export const checkout = (product) => request('/api/checkout', { json: { product } });
export const billingPortal = () => request('/api/billing-portal', { json: {} });
