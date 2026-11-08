-- =====================================================================
-- Uni Trad — schéma Supabase (à exécuter une seule fois dans SQL Editor)
-- Sécurisé : RLS activé partout, pièces modifiables uniquement côté serveur
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------- 1. Profils ----------
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    coins_balance INT NOT NULL DEFAULT 300 CHECK (coins_balance >= 0),
    is_subscribed BOOLEAN NOT NULL DEFAULT FALSE,
    stripe_customer_id TEXT,
    has_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
    referral_code TEXT UNIQUE NOT NULL DEFAULT substring(md5(random()::text) from 1 for 8),
    referred_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- 2. Séries ----------
CREATE TABLE IF NOT EXISTS series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'Manga',
    status TEXT DEFAULT 'En cours',
    cover_url TEXT,
    source_lang TEXT,
    target_lang TEXT DEFAULT 'fr',
    reading_mode TEXT CHECK (reading_mode IN ('list', 'manga', 'bd')) DEFAULT 'list',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_series_user ON series(user_id);

-- ---------- 3. Chapitres ----------
CREATE TABLE IF NOT EXISTS chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT,
    chapter_number TEXT NOT NULL,
    status TEXT CHECK (status IN ('draft', 'processing', 'completed', 'failed')) DEFAULT 'draft',
    pages_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chapters_series ON chapters(series_id);

-- ---------- 4. Pages traduites (bulles éditables en JSON) ----------
CREATE TABLE IF NOT EXISTS chapter_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    page_index INT NOT NULL,
    original_path TEXT,
    cleaned_path TEXT,
    bubbles JSONB NOT NULL DEFAULT '[]'::jsonb,
    UNIQUE (chapter_id, page_index)
);

-- ---------- 5. Personnages & raretés ----------
CREATE TABLE IF NOT EXISTS characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    original_name TEXT NOT NULL,
    translated_name TEXT NOT NULL,
    description TEXT,
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    rarity TEXT CHECK (rarity IN ('common', 'bronze', 'silver', 'gold')) DEFAULT 'common',
    appearance_count INT NOT NULL DEFAULT 0,
    avatar_url TEXT
);

-- ---------- 6. Glossaire ----------
CREATE TABLE IF NOT EXISTS glossary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    original_term TEXT NOT NULL,
    translated_term TEXT NOT NULL,
    category TEXT
);

-- ---------- 7. Historique des pièces ----------
CREATE TABLE IF NOT EXISTS coin_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount INT NOT NULL,                 -- positif = crédit, négatif = débit
    reason TEXT NOT NULL,
    stripe_event_id TEXT UNIQUE,         -- évite de créditer deux fois le même paiement
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tx_user ON coin_transactions(user_id, created_at DESC);

-- =====================================================================
-- Fonctions serveur (SECURITY DEFINER) : seules voies pour toucher aux pièces
-- =====================================================================

-- Création automatique du profil à l'inscription (+ bonus parrainage)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    ref_id UUID;
BEGIN
    SELECT id INTO ref_id FROM profiles
    WHERE referral_code = NEW.raw_user_meta_data->>'referral_code';

    INSERT INTO profiles (id, email, referred_by)
    VALUES (NEW.id, NEW.email, ref_id);

    IF ref_id IS NOT NULL THEN
        UPDATE profiles SET coins_balance = coins_balance + 200 WHERE id = ref_id;
        INSERT INTO coin_transactions (user_id, amount, reason)
        VALUES (ref_id, 200, 'Nouveau filleul inscrit');
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Débit atomique (abonnés = gratuit). Retourne le nouveau solde, ou -1 si insuffisant
CREATE OR REPLACE FUNCTION public.spend_coins(p_user UUID, p_amount INT, p_reason TEXT)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    bal INT; sub BOOLEAN;
BEGIN
    SELECT coins_balance, is_subscribed INTO bal, sub FROM profiles WHERE id = p_user FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'profil introuvable'; END IF;
    IF sub THEN RETURN bal; END IF;
    IF bal < p_amount THEN RETURN -1; END IF;
    UPDATE profiles SET coins_balance = coins_balance - p_amount WHERE id = p_user;
    INSERT INTO coin_transactions (user_id, amount, reason) VALUES (p_user, -p_amount, p_reason);
    RETURN bal - p_amount;
END $$;

-- Crédit (appelé uniquement par le backend après paiement Stripe vérifié)
CREATE OR REPLACE FUNCTION public.credit_coins(p_user UUID, p_amount INT, p_reason TEXT, p_event TEXT DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF p_event IS NOT NULL AND EXISTS (SELECT 1 FROM coin_transactions WHERE stripe_event_id = p_event) THEN
        RETURN FALSE;  -- événement déjà traité
    END IF;
    UPDATE profiles SET coins_balance = coins_balance + p_amount WHERE id = p_user;
    INSERT INTO coin_transactions (user_id, amount, reason, stripe_event_id)
    VALUES (p_user, p_amount, p_reason, p_event);
    RETURN TRUE;
END $$;

-- Récompense d'avis (une seule fois), appelable par l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.claim_review_reward()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    done BOOLEAN; bal INT;
BEGIN
    SELECT has_reviewed INTO done FROM profiles WHERE id = auth.uid() FOR UPDATE;
    IF done IS NULL THEN RAISE EXCEPTION 'non connecté'; END IF;
    IF done THEN RETURN -1; END IF;
    UPDATE profiles SET has_reviewed = TRUE, coins_balance = coins_balance + 300
    WHERE id = auth.uid() RETURNING coins_balance INTO bal;
    INSERT INTO coin_transactions (user_id, amount, reason)
    VALUES (auth.uid(), 300, 'Avis laissé dans l''application');
    RETURN bal;
END $$;

-- Récompense +100 pièces au passage d'un personnage au rang Or
CREATE OR REPLACE FUNCTION public.check_gold_reward()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.rarity = 'gold' AND OLD.rarity <> 'gold' THEN
        UPDATE profiles SET coins_balance = coins_balance + 100 WHERE id = NEW.user_id;
        INSERT INTO coin_transactions (user_id, amount, reason)
        VALUES (NEW.user_id, 100, 'Obtention personnage Or: ' || NEW.translated_name);
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trigger_gold_reward ON characters;
CREATE TRIGGER trigger_gold_reward
AFTER UPDATE ON characters
FOR EACH ROW EXECUTE FUNCTION public.check_gold_reward();

-- Empêche un client de modifier ses pièces / abonnement / parrainage directement
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF current_user IN ('authenticated', 'anon') THEN
        NEW.coins_balance      := OLD.coins_balance;
        NEW.is_subscribed      := OLD.is_subscribed;
        NEW.has_reviewed       := OLD.has_reviewed;
        NEW.stripe_customer_id := OLD.stripe_customer_id;
        NEW.referral_code      := OLD.referral_code;
        NEW.referred_by        := OLD.referred_by;
        NEW.email              := OLD.email;
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_profile ON profiles;
CREATE TRIGGER trg_protect_profile
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();

-- Les fonctions sensibles ne sont pas appelables depuis le navigateur
REVOKE ALL ON FUNCTION public.spend_coins(UUID, INT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.credit_coins(UUID, INT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_review_reward() TO authenticated;

-- =====================================================================
-- Row Level Security
-- =====================================================================
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE series            ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters          ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_pages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters        ENABLE ROW LEVEL SECURITY;
ALTER TABLE glossary          ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;

-- Profils : lecture/mise à jour de son propre profil (colonnes sensibles protégées par le trigger)
CREATE POLICY "profil_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profil_update_own" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Transactions : lecture seule de ses propres lignes (écriture = fonctions serveur)
CREATE POLICY "tx_select_own" ON coin_transactions FOR SELECT USING (auth.uid() = user_id);

-- Tables de contenu : accès complet à ses propres données
CREATE POLICY "series_own"     ON series        FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chapters_own"   ON chapters      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pages_own"      ON chapter_pages FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "characters_own" ON characters    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "glossary_own"   ON glossary      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- Storage : buckets publics en lecture, écriture limitée au dossier de l'utilisateur
-- (chemin attendu : <user_id>/...)
-- =====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('chapter-pages', 'chapter-pages', true), ('character-avatars', 'character-avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "storage_write_own_folder" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('chapter-pages', 'character-avatars')
            AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "storage_update_own_folder" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id IN ('chapter-pages', 'character-avatars')
       AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "storage_delete_own_folder" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id IN ('chapter-pages', 'character-avatars')
       AND (storage.foldername(name))[1] = auth.uid()::text);
