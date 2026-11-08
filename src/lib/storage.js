import { supabase } from './supabase';

/** Upload une page de scan (originale ou traduite). Retourne { path, publicUrl }. */
export async function uploadChapterPage(userId, seriesId, chapterId, pageIndex, file, type = 'original') {
  if (!supabase) throw new Error('Supabase non configuré');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${userId}/${seriesId}/${chapterId}/page_${pageIndex}_${type}.${ext}`;

  const { error } = await supabase.storage
    .from('chapter-pages')
    .upload(path, file, { cacheControl: '3600', upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from('chapter-pages').getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

/** Upload l'avatar d'un personnage. Retourne l'URL publique. */
export async function uploadCharacterAvatar(userId, characterId, file) {
  if (!supabase) throw new Error('Supabase non configuré');
  const path = `${userId}/characters/${characterId}.png`;

  const { error } = await supabase.storage
    .from('character-avatars')
    .upload(path, file, { upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from('character-avatars').getPublicUrl(path);
  return data.publicUrl;
}
