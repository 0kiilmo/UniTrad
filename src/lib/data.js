import { supabase } from './supabase';

const LANG_LABEL = { ko: 'Coréen', ja: 'Japonais', en: 'Anglais', fr: 'Français' };
const LANG_CODE = { Coréen: 'ko', Japonais: 'ja', Anglais: 'en', Français: 'fr' };
export const sourceCode = (label) => LANG_CODE[label] || 'auto';

const mapSeries = (s, chapterCount) => ({
  id: s.id, title: s.title, type: s.type || 'Manga', cover: s.cover_url ||
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
  sourceLang: LANG_LABEL[s.source_lang] || 'Détection auto',
  targetLang: LANG_LABEL[s.target_lang] || 'Français',
  chaptersCount: chapterCount, status: s.status || 'En cours', readingMode: s.reading_mode || 'list',
});

const publicUrl = (path) =>
  path ? supabase.storage.from('chapter-pages').getPublicUrl(path).data.publicUrl : null;

const mapChapter = (c, pages) => ({
  id: c.id, seriesId: c.series_id, title: c.title || `Chapitre ${c.chapter_number}`,
  number: parseInt(c.chapter_number, 10) || 0, status: c.status, pagesCount: c.pages_count,
  isDownloaded: false,
  pages: pages.filter((p) => p.chapter_id === c.id).sort((a, b) => a.page_index - b.page_index)
    .map((p) => ({
      id: p.id, originalUrl: publicUrl(p.original_path) || publicUrl(p.cleaned_path),
      cleanedUrl: publicUrl(p.cleaned_path), bubbles: p.bubbles || [],
    })),
});

export const mapCharacter = (c, seriesTitle) => ({
  id: c.id, seriesId: c.series_id, seriesTitle, originalName: c.original_name,
  translatedName: c.translated_name, description: c.description || '',
  avatar: c.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
  isFavorite: c.is_favorite, rarity: c.rarity, appearancesCount: c.appearance_count,
});

const must = ({ data, error }) => { if (error) throw error; return data; };

export async function loadProfile(userId) {
  const p = must(await supabase.from('profiles').select('*').eq('id', userId).single());
  const tx = must(await supabase.from('coin_transactions').select('*')
    .eq('user_id', userId).order('created_at', { ascending: false }).limit(50));
  return {
    coins: p.coins_balance, isSubscribed: p.is_subscribed, hasReviewed: p.has_reviewed,
    referralCode: p.referral_code,
    transactions: tx.map((t) => ({
      id: t.id, type: t.amount >= 0 ? 'credit' : 'debit', amount: Math.abs(t.amount), label: t.reason,
      date: new Date(t.created_at).toLocaleDateString('fr-FR'),
    })),
  };
}

export async function loadLibrary() {
  const [series, chapters, pages, chars, gloss] = await Promise.all([
    supabase.from('series').select('*').order('created_at', { ascending: false }).then(must),
    supabase.from('chapters').select('*').neq('status', 'failed').order('created_at', { ascending: false }).then(must),
    supabase.from('chapter_pages').select('*').then(must),
    supabase.from('characters').select('*').then(must),
    supabase.from('glossary').select('*').then(must),
  ]);
  const titleOf = (id) => series.find((s) => s.id === id)?.title || 'Série';
  return {
    series: series.map((s) => mapSeries(s, chapters.filter((c) => c.series_id === s.id).length)),
    chapters: chapters.map((c) => mapChapter(c, pages)),
    characters: chars.map((c) => mapCharacter(c, titleOf(c.series_id))),
    glossary: gloss.map((g) => ({ id: g.id, seriesId: g.series_id, originalTerm: g.original_term,
      translatedTerm: g.translated_term, category: g.category || 'Personnalisé' })),
  };
}

export async function createSeries(userId, { title, type, sourceLang }) {
  const row = must(await supabase.from('series').insert({
    user_id: userId, title, type, source_lang: sourceLang, target_lang: 'fr',
  }).select().single());
  return mapSeries(row, 0);
}

export async function createCharacter(userId, c, seriesTitle) {
  const row = must(await supabase.from('characters').insert({
    user_id: userId, series_id: c.seriesId, original_name: c.originalName,
    translated_name: c.translatedName, description: c.description,
  }).select().single());
  return mapCharacter(row, seriesTitle);
}

export const setFavorite = async (id, value) =>
  must(await supabase.from('characters').update({ is_favorite: value }).eq('id', id));

export const setAppearances = async (id, count, rarity) =>
  must(await supabase.from('characters').update({ appearance_count: count, rarity }).eq('id', id));

export async function createGlossaryTerm(userId, seriesId, original, translated) {
  const g = must(await supabase.from('glossary').insert({
    user_id: userId, series_id: seriesId, original_term: original, translated_term: translated, category: 'Personnalisé',
  }).select().single());
  return { id: g.id, seriesId, originalTerm: original, translatedTerm: translated, category: 'Personnalisé' };
}

export const saveBubbles = async (pageId, bubbles) =>
  must(await supabase.from('chapter_pages').update({ bubbles }).eq('id', pageId));

export async function claimReviewReward() {
  return must(await supabase.rpc('claim_review_reward'));
}
