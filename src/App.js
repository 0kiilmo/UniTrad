import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Users,
  ShoppingBag,
  User,
  Plus,
  Search,
  Sparkles,
  Download,
  Eye,
  Edit3,
  RotateCcw,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Star,
  CheckCircle2,
  X,
  CreditCard,
  Gift,
  Award,
  UploadCloud,
  Globe,
  Settings,
  Share2,
  Check,
  FileText,
  Bookmark,
  Layers,
  ArrowRight,
  AlertCircle,
  LogOut
} from 'lucide-react';
import { supabase } from './lib/supabase';
import * as api from './lib/api';
import * as db from './lib/data';
import { uploadChapterPage } from './lib/storage';

// --- CUSTOM "U" COIN SVG COMPONENT ---
function UniCoin({ className = "w-5 h-5 inline-block" }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Outer Ring & Coin Surface Gradients */}
        <linearGradient id="uniCoinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#818CF8" />
          <stop offset="85%" stopColor="#C084FC" />
          <stop offset="100%" stopColor="#F472B6" />
        </linearGradient>

        <linearGradient id="uniCoinInnerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0284C7" />
          <stop offset="60%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>

        <radialGradient id="uniCoinGlow" cx="50%" cy="50%" r="50%">
          <stop offset="70%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.4" />
        </radialGradient>
      </defs>

      {/* Outer Coin Base & Rim */}
      <circle cx="50" cy="50" r="47" fill="url(#uniCoinGrad)" stroke="#0284C7" strokeWidth="2" />
      <circle cx="50" cy="50" r="41" stroke="#0F172A" strokeOpacity="0.25" strokeWidth="3" fill="none" />
      <circle cx="50" cy="50" r="37" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="2" fill="url(#uniCoinInnerGrad)" />
      <circle cx="50" cy="50" r="37" fill="url(#uniCoinGlow)" />

      {/* Center 'U' Symbol */}
      <path 
        d="M 37 32 V 53 C 37 61 42 67 50 67 C 58 67 63 61 63 53 V 32" 
        stroke="#0F172A" 
        strokeWidth="9" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

// --- LOGO SVG COMPONENT ---
function UniTradLogo({ className = "h-8", showText = true, darkMode = true }) {
  return (
    <div className={`flex items-center space-x-2.5 ${className}`}>
      {/* SVG Icon matching new logo (Chat bubble with clean white U) */}
      <svg className="h-full w-auto aspect-square overflow-visible" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="uniTradBubbleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00A3FF" />
            <stop offset="50%" stopColor="#7C3AED" />
            <stop offset="85%" stopColor="#E11D48" />
            <stop offset="100%" stopColor="#F43F5E" />
          </linearGradient>
        </defs>

        {/* Speech Bubble Shape */}
        <path 
          d="M 50 5 A 42 42 0 1 0 15 72 L 8 92 C 6 97 11 101 16 99 L 34 90 A 42 42 0 0 0 50 5 Z" 
          fill="url(#uniTradBubbleGrad)" 
        />

        {/* Bold White 'U' Symbol Centered inside the speech bubble */}
        <path 
          d="M 37 28 V 52 C 37 61 42 67 50 67 C 58 67 63 61 63 52 V 28" 
          stroke="#FFFFFF" 
          strokeWidth="9" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          fill="none"
        />
      </svg>

      {showText && (
        <div className="flex items-center text-xl font-black tracking-tight leading-none">
          <span className={darkMode ? "text-slate-100" : "text-slate-950"}>Uni</span>
          <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent ml-1">Trad</span>
        </div>
      )}
    </div>
  );
}

// --- INITIAL MOCK DATA ---
const INITIAL_SERIES = [
  {
    id: 's1',
    title: 'Solo Leveling',
    type: 'Manhwa (Webtoon)',
    cover: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    sourceLang: 'Coréen',
    targetLang: 'Français',
    chaptersCount: 179,
    status: 'Terminé',
    readingMode: 'list'
  },
  {
    id: 's2',
    title: 'One Piece',
    type: 'Manga',
    cover: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
    sourceLang: 'Japonais',
    targetLang: 'Français',
    chaptersCount: 1110,
    status: 'En cours',
    readingMode: 'manga'
  },
  {
    id: 's3',
    title: 'Tower of God',
    type: 'Webtoon',
    cover: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    sourceLang: 'Coréen',
    targetLang: 'Français',
    chaptersCount: 550,
    status: 'En cours',
    readingMode: 'list'
  }
];

const INITIAL_CHAPTERS = [
  {
    id: 'c1',
    seriesId: 's1',
    title: 'Chapitre 179 - Épilogue Final',
    number: 179,
    status: 'completed',
    pagesCount: 14,
    isDownloaded: true,
    pages: [
      {
        id: 'p1',
        originalUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
        bubbles: [
          { id: 'b1', top: 18, left: 25, width: 45, height: 18, text: "Je suis le monarque de l'ombre !", originalText: "나는 그림자의 군주다!", fontSize: 16 },
          { id: 'b2', top: 65, left: 55, width: 38, height: 15, text: "L'éveil a commencé...", originalText: "각성이 시작되었다...", fontSize: 14 }
        ]
      },
      {
        id: 'p2',
        originalUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80',
        bubbles: [
          { id: 'b3', top: 22, left: 15, width: 50, height: 20, text: "Debout. Mes soldats de l'ombre !", originalText: "일어나라. 나의 그림자 군단!", fontSize: 18 }
        ]
      }
    ]
  },
  {
    id: 'c2',
    seriesId: 's1',
    title: 'Chapitre 178',
    number: 178,
    status: 'completed',
    pagesCount: 16,
    isDownloaded: false,
    pages: []
  },
  {
    id: 'c3',
    seriesId: 's2',
    title: 'Chapitre 1110 - Le Sommet du Monde',
    number: 1110,
    status: 'completed',
    pagesCount: 19,
    isDownloaded: false,
    pages: [
      {
        id: 'p10',
        originalUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80',
        bubbles: [
          { id: 'b10', top: 20, left: 30, width: 40, height: 20, text: "Je serai le Roi des Pirates !", originalText: "海賊王に俺はなる！", fontSize: 18 }
        ]
      }
    ]
  }
];

const INITIAL_CHARACTERS = [
  {
    id: 'ch1',
    seriesId: 's1',
    seriesTitle: 'Solo Leveling',
    originalName: 'Sung Jin-Woo',
    translatedName: 'Sung Jin-Woo',
    description: 'Le plus puissant chasseur de rang S et le Monarque de l\'Ombre.',
    avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&auto=format&fit=crop&q=80',
    isFavorite: true,
    rarity: 'gold', // common, bronze, silver, gold
    appearancesCount: 52
  },
  {
    id: 'ch2',
    seriesId: 's1',
    seriesTitle: 'Solo Leveling',
    originalName: 'Cha Hae-In',
    translatedName: 'Cha Hae-In',
    description: 'Vice-capitaine de la guilde des Chasseurs, rang S experte à l\'épée.',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    isFavorite: true,
    rarity: 'silver',
    appearancesCount: 14
  },
  {
    id: 'ch3',
    seriesId: 's2',
    seriesTitle: 'One Piece',
    originalName: 'Monkey D. Luffy',
    translatedName: 'Luffy au Chapeau de Paille',
    description: 'Capitaine de l\'équipage au Chapeau de Paille, possède le fruit du Hito Hito no Mi modèle Nika.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    isFavorite: true,
    rarity: 'gold',
    appearancesCount: 65
  },
  {
    id: 'ch4',
    seriesId: 's2',
    seriesTitle: 'One Piece',
    originalName: 'Roronoa Zoro',
    translatedName: 'Zoro',
    description: 'Escrimeur pratiquant le style à trois sabres.',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    isFavorite: false,
    rarity: 'bronze',
    appearancesCount: 4
  }
];

const INITIAL_GLOSSARY = [
  { id: 'g1', seriesId: 's1', originalTerm: 'Shadow Monarch', translatedTerm: 'Monarque de l\'Ombre', category: 'Titre' },
  { id: 'g2', seriesId: 's1', originalTerm: 'System', translatedTerm: 'Le Système', category: 'Concept' },
  { id: 'g3', seriesId: 's2', originalTerm: 'Haki', translatedTerm: 'Fluide', category: 'Technique' },
  { id: 'g4', seriesId: 's2', originalTerm: 'Gear Fifth', translatedTerm: 'Gear 5', category: 'Technique' }
];

export default function App({ session = null, onSignOut }) {
  const connected = Boolean(supabase && session);
  const userId = session?.user?.id;
  // --- STATE ---
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('library'); // library, characters, shop, account
  
  // User Economics State (300 coins at signup)
  const [coins, setCoins] = useState(connected ? 0 : 300);
  const [referralCode, setReferralCode] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [referralCount, setReferralCount] = useState(connected ? 0 : 1);
  const [transactions, setTransactions] = useState(connected ? [] : [
    { id: 't1', type: 'credit', amount: 300, label: 'Création du compte Uni Trad', date: 'Aujourd\'hui' },
    { id: 't2', type: 'credit', amount: 200, label: 'Parrainage ami (1 ami)', date: 'Hier' }
  ]);

  // Data State
  const [seriesList, setSeriesList] = useState(connected ? [] : INITIAL_SERIES);
  const [chapters, setChapters] = useState(connected ? [] : INITIAL_CHAPTERS);
  const [characters, setCharacters] = useState(connected ? [] : INITIAL_CHARACTERS);
  const [glossary, setGlossary] = useState(connected ? [] : INITIAL_GLOSSARY);

  // Active View States
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [activeReaderChapter, setActiveReaderChapter] = useState(null);
  const [libraryFilter, setLibraryFilter] = useState('all'); // all, offline

  // Toast / Modal States
  const [toast, setToast] = useState(null);
  const [goldCelebrationModal, setGoldCelebrationModal] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddCharModal, setShowAddCharModal] = useState(false);
  const [showAddSeriesModal, setShowAddSeriesModal] = useState(false);

  // --- Connexion Supabase : chargement du profil et de la bibliothèque ---
  const refreshProfile = async () => {
    if (!connected) return;
    const p = await db.loadProfile(userId);
    setCoins(p.coins);
    setIsSubscribed(p.isSubscribed);
    setHasReviewed(p.hasReviewed);
    setReferralCode(p.referralCode);
    setTransactions(p.transactions);
  };

  const refreshLibrary = async () => {
    if (!connected) return;
    const lib = await db.loadLibrary();
    setSeriesList(lib.series);
    setChapters(lib.chapters);
    setCharacters(lib.characters);
    setGlossary(lib.glossary);
  };

  useEffect(() => {
    if (!connected) return;
    Promise.all([refreshProfile(), refreshLibrary()])
      .catch(e => showToast(`Chargement impossible : ${e.message}`, 'error'));

    // Retour de Stripe : le webhook peut prendre quelques secondes
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      showToast('Paiement reçu, mise à jour de ton solde...', 'success');
      [2000, 5000, 10000].forEach(ms => setTimeout(() => refreshProfile().catch(() => {}), ms));
    }
    if (params.has('checkout')) window.history.replaceState({}, '', window.location.pathname);
  }, [userId]);

  const guard = (fn) => async (...args) => {
    try { return await fn(...args); } catch (e) { showToast(e.message || 'Une erreur est survenue', 'error'); return undefined; }
  };

  // Traduction réelle : débit serveur, OCR + LLM page par page
  const runRealTranslation = async ({ seriesId, title, files, onProgress }) => {
    const series = seriesList.find(x => x.id === seriesId);
    const started = await api.startChapter(seriesId, title);
    setCoins(started.balance);
    const glossaryPayload = glossary.filter(g => g.seriesId === seriesId).map(g => ({ original: g.originalTerm, translated: g.translatedTerm }));
    const charsPayload = characters.filter(c => c.seriesId === seriesId).map(c => ({ original: c.originalName, translated: c.translatedName }));
    let done = 0;
    for (let i = 0; i < files.length; i++) {
      const up = await uploadChapterPage(userId, seriesId, started.chapter_id, i, files[i], 'original');
      await api.translatePage(started.chapter_id, {
        file: files[i], pageIndex: i, sourceLang: db.sourceCode(series?.sourceLang), targetLang: 'fr',
        glossary: glossaryPayload, characters: charsPayload, originalPath: up.path,
      });
      done += 1;
      onProgress(Math.round((done / files.length) * 100));
    }
    await api.completeChapter(started.chapter_id, done);
    await Promise.all([refreshLibrary(), refreshProfile()]);
    setShowImportModal(false);
    showToast(`Traduction de "${title}" terminée !`, 'success');
  };

  // Toast Trigger Helper
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Add Coins Helper
  const addCoins = (amount, reason) => {
    setCoins(prev => prev + amount);
    setTransactions(prev => [
      { id: Date.now().toString(), type: 'credit', amount, label: reason, date: 'À l\'instant' },
      ...prev
    ]);
    showToast(`+${amount} pièces obtenues ! (${reason})`, 'success');
  };

  const spendCoins = (amount, reason) => {
    if (isSubscribed) return true; // Unlimited
    if (coins < amount) {
      showToast('Solde de pièces insuffisant !', 'error');
      return false;
    }
    setCoins(prev => prev - amount);
    setTransactions(prev => [
      { id: Date.now().toString(), type: 'debit', amount, label: reason, date: 'À l\'instant' },
      ...prev
    ]);
    return true;
  };

  // Check and Upgrade Character Rarity
  const incrementCharacterAppearances = (charId, countToAdd = 1) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== charId) return c;
      const newAppearances = c.appearancesCount + countToAdd;
      let newRarity = c.rarity;

      if (newAppearances >= 50 && c.rarity !== 'gold') {
        newRarity = 'gold';
        // Reward 100 coins for Gold rarity!
        addCoins(100, `Rareté OR débloquée : ${c.translatedName}`);
        setGoldCelebrationModal({ charName: c.translatedName, avatar: c.avatar });
      } else if (newAppearances >= 10 && c.rarity === 'bronze') {
        newRarity = 'silver';
        showToast(`${c.translatedName} a évolué au rang ARGENT ! 🥈`, 'info');
      } else if (newAppearances >= 1 && c.rarity === 'common') {
        newRarity = 'bronze';
        showToast(`${c.translatedName} a évolué au rang BRONZE ! 🥉`, 'info');
      }

      return { ...c, appearancesCount: newAppearances, rarity: newRarity };
    }));
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* --- TOP HEADER --- */}
      <header className={`sticky top-0 z-30 px-4 py-3 flex items-center justify-between border-b backdrop-blur-md ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => { setSelectedSeries(null); setActiveTab('library'); }}>
          <UniTradLogo className="h-9" darkMode={darkMode} />
        </div>

        <div className="flex items-center space-x-3">
          {/* COIN BALANCE BADGE */}
          <div 
            onClick={() => setActiveTab('shop')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border cursor-pointer transition-transform hover:scale-105 active:scale-95 ${
              isSubscribed
                ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-yellow-500/50 text-yellow-300'
                : 'bg-indigo-950/40 border-indigo-500/40 text-indigo-300'
            }`}
          >
            <UniCoin className="w-4 h-4" />
            <span className="text-xs font-bold">
              {isSubscribed ? 'Illimité Pass' : `${coins} Pièces`}
            </span>
          </div>

          {connected && (
            <button
              onClick={onSignOut}
              title="Se déconnecter"
              className={`p-2 rounded-full border transition-colors ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-200 border-slate-300 text-slate-600'}`}
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}

          {/* THEME TOGGLE */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-full border transition-colors ${darkMode ? 'bg-slate-800 border-slate-700 text-amber-400' : 'bg-slate-200 border-slate-300 text-indigo-600'}`}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 pb-24 max-w-6xl w-full mx-auto p-4">
        {selectedSeries ? (
          <SeriesDetailView 
            series={selectedSeries}
            onBack={() => setSelectedSeries(null)}
            chapters={chapters.filter(c => c.seriesId === selectedSeries.id)}
            characters={characters.filter(c => c.seriesId === selectedSeries.id)}
            glossary={glossary.filter(g => g.seriesId === selectedSeries.id)}
            onOpenReader={(chapter) => setActiveReaderChapter(chapter)}
            onOpenImport={() => setShowImportModal(true)}
            onOpenAddCharacter={() => setShowAddCharModal(true)}
            onAddGlossary={guard(async (seriesId, original, translated) => {
              if (!connected) return;
              const g = await db.createGlossaryTerm(userId, seriesId, original, translated);
              setGlossary(prev => [...prev, g]);
            })}
            darkMode={darkMode}
          />
        ) : (
          <>
            {activeTab === 'library' && (
              <LibraryView 
                seriesList={seriesList}
                chapters={chapters}
                onSelectSeries={(s) => setSelectedSeries(s)}
                onOpenImport={() => setShowImportModal(true)}
                onOpenAddSeries={() => setShowAddSeriesModal(true)}
                filter={libraryFilter}
                setFilter={setLibraryFilter}
                onOpenReader={(c) => setActiveReaderChapter(c)}
                darkMode={darkMode}
              />
            )}

            {activeTab === 'characters' && (
              <CharactersView 
                characters={characters}
                seriesList={seriesList}
                onToggleFavorite={guard(async (id) => {
                  const current = characters.find(c => c.id === id);
                  if (connected) await db.setFavorite(id, !current.isFavorite);
                  setCharacters(prev => prev.map(c => c.id === id ? { ...c, isFavorite: !c.isFavorite } : c));
                })}
                onOpenAdd={() => setShowAddCharModal(true)}
                onSimulateAppearance={guard(async (id) => {
                  if (connected) {
                    const c = characters.find(x => x.id === id);
                    const n = c.appearancesCount + 5;
                    const rarity = n >= 50 ? 'gold' : n >= 10 ? 'silver' : n >= 1 ? 'bronze' : 'common';
                    await db.setAppearances(id, n, rarity);
                    if (rarity === 'gold' && c.rarity !== 'gold') setGoldCelebrationModal({ charName: c.translatedName, avatar: c.avatar });
                    await Promise.all([refreshLibrary(), refreshProfile()]);
                  } else {
                    incrementCharacterAppearances(id, 5);
                  }
                })}
                darkMode={darkMode}
              />
            )}

            {activeTab === 'shop' && (
              <ShopView 
                coins={coins}
                isSubscribed={isSubscribed}
                onBuyPack={guard(async (amount, price) => {
                  if (!connected) { addCoins(amount, `Achat Pack ${amount} pièces (${price}€)`); return; }
                  const { url } = await api.checkout(`pack_${amount}`);
                  window.location.href = url;
                })}
                onSubscribe={guard(async () => {
                  if (!connected) { setIsSubscribed(true); showToast('Abonnement Illimité Uni Trad activé ! 🎉', 'success'); return; }
                  const { url } = await api.checkout('subscription');
                  window.location.href = url;
                })}
                onCancelSubscribe={guard(async () => {
                  if (!connected) { setIsSubscribed(false); showToast('Abonnement désactivé.', 'info'); return; }
                  const { url } = await api.billingPortal();
                  window.location.href = url;
                })}
                darkMode={darkMode}
              />
            )}

            {activeTab === 'account' && (
              <AccountView 
                coins={coins}
                isSubscribed={isSubscribed}
                transactions={transactions}
                hasReviewed={hasReviewed}
                referralCount={referralCount}
                referralCode={referralCode}
                onAddReview={guard(async () => {
                  if (hasReviewed) return;
                  if (connected) {
                    const bal = await db.claimReviewReward();
                    if (bal === -1) return;
                    await refreshProfile();
                    showToast('+300 pièces obtenues ! (Avis laissé)', 'success');
                    return;
                  }
                  setHasReviewed(true);
                  addCoins(300, 'Avis laissé dans l\'application');
                })}
                onAddReferral={connected ? undefined : () => {
                  setReferralCount(r => r + 1);
                  addCoins(200, 'Nouveau filleul inscrit');
                }}
                darkMode={darkMode}
              />
            )}
          </>
        )}
      </main>

      {/* --- READER MODAL --- */}
      {activeReaderChapter && (
        <ReaderView 
          chapter={activeReaderChapter}
          series={seriesList.find(s => s.id === activeReaderChapter.seriesId)}
          onClose={() => setActiveReaderChapter(null)}
          onSavePageBubbles={guard(async (pageId, updatedBubbles) => {
            if (connected) await db.saveBubbles(pageId, updatedBubbles);
            setChapters(prev => prev.map(ch => {
              if (ch.id !== activeReaderChapter.id) return ch;
              return {
                ...ch,
                pages: ch.pages.map(p => p.id === pageId ? { ...p, bubbles: updatedBubbles } : p)
              };
            }));
            showToast('Corrections sauvegardées avec succès !', 'success');
          })}
          onToggleOfflineDownload={() => {
            setChapters(prev => prev.map(ch => {
              if (ch.id !== activeReaderChapter.id) return ch;
              const newOffline = !ch.isDownloaded;
              showToast(newOffline ? 'Chapitre enregistré hors-ligne !' : 'Chapitre supprimé du stockage hors-ligne', 'info');
              return { ...ch, isDownloaded: newOffline };
            }));
          }}
          darkMode={darkMode}
        />
      )}

      {/* --- IMPORT / TRANSLATE CHAPTER MODAL --- */}
      {showImportModal && (
        <ImportChapterModal 
          seriesList={seriesList}
          defaultSeriesId={selectedSeries?.id}
          coins={coins}
          isSubscribed={isSubscribed}
          onClose={() => setShowImportModal(false)}
          connected={connected}
          onRealTranslate={runRealTranslation}
          onStartTranslation={(chapterData) => {
            const cost = 10;
            if (!isSubscribed && coins < cost) {
              showToast('Pièces insuffisantes (10 pièces requises)', 'error');
              return;
            }
            if (!isSubscribed) {
              spendCoins(cost, `Traduction : ${chapterData.title}`);
            }

            // Create chapter mock
            const newChapter = {
              id: `c_${Date.now()}`,
              seriesId: chapterData.seriesId,
              title: chapterData.title,
              number: parseInt(chapterData.title.replace(/\D/g, '')) || 1,
              status: 'completed',
              pagesCount: chapterData.pages.length || 10,
              isDownloaded: false,
              pages: chapterData.pages.length > 0 ? chapterData.pages : [
                {
                  id: `p_${Date.now()}_1`,
                  originalUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
                  bubbles: [
                    { id: 'b_new1', top: 30, left: 20, width: 60, height: 20, text: "Traduction IA générée automatiquement par Uni Trad !", originalText: "Translated text preview", fontSize: 16 }
                  ]
                }
              ]
            };

            setChapters(prev => [newChapter, ...prev]);
            setShowImportModal(false);
            showToast(`Traduction de "${chapterData.title}" terminée !`, 'success');
          }}
          darkMode={darkMode}
        />
      )}

      {/* --- ADD CHARACTER MODAL --- */}
      {showAddCharModal && (
        <AddCharacterModal 
          seriesList={seriesList}
          defaultSeriesId={selectedSeries?.id}
          onClose={() => setShowAddCharModal(false)}
          onAdd={guard(async (newChar) => {
            const saved = connected ? await db.createCharacter(userId, newChar, newChar.seriesTitle) : newChar;
            setCharacters(prev => [saved, ...prev]);
            setShowAddCharModal(false);
            showToast(`Personnage ${newChar.translatedName} ajouté à la collection !`, 'success');
          })}
          darkMode={darkMode}
        />
      )}

      {/* --- ADD SERIES MODAL --- */}
      {showAddSeriesModal && (
        <AddSeriesModal
          onClose={() => setShowAddSeriesModal(false)}
          onAdd={guard(async (data) => {
            const created = connected ? await db.createSeries(userId, data) : {
              id: `s_${Date.now()}`, title: data.title, type: data.type, cover: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
              sourceLang: db.sourceCode(data.sourceLang) === 'ko' ? 'Coréen' : 'Japonais', targetLang: 'Français', chaptersCount: 0, status: 'En cours', readingMode: 'list'
            };
            setSeriesList(prev => [created, ...prev]);
            setShowAddSeriesModal(false);
            showToast(`Série "${data.title}" créée !`, 'success');
          })}
          darkMode={darkMode}
        />
      )}

      {/* --- GOLD CELEBRATION MODAL (+100 COINS) --- */}
      {goldCelebrationModal && (
        <GoldCelebrationModal 
          data={goldCelebrationModal}
          onClose={() => setGoldCelebrationModal(null)}
        />
      )}

      {/* --- TOAST NOTIFICATION --- */}
      {toast && (
        <div className={`fixed top-16 right-4 z-50 flex items-center space-x-2 px-4 py-3 rounded-xl shadow-2xl border text-sm font-semibold animate-bounce ${
          toast.type === 'success' ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500' :
          toast.type === 'error' ? 'bg-rose-950/90 text-rose-200 border-rose-500' :
          'bg-slate-900/90 text-indigo-200 border-indigo-500'
        }`}>
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* --- BOTTOM NAVIGATION BAR (4 ONGLETS) --- */}
      {!activeReaderChapter && (
        <nav className={`fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-md px-6 py-2 transition-colors ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
          <div className="max-w-md mx-auto flex justify-around items-center">
            
            {/* 1. BIBLIOTHÈQUE */}
            <button
              onClick={() => { setSelectedSeries(null); setActiveTab('library'); }}
              className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === 'library' && !selectedSeries ? 'text-indigo-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <BookOpen className="w-5 h-5" />
              <span className="text-[11px]">Bibliothèque</span>
            </button>

            {/* 2. PERSONNAGES */}
            <button
              onClick={() => { setSelectedSeries(null); setActiveTab('characters'); }}
              className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === 'characters' ? 'text-indigo-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Users className="w-5 h-5" />
              <span className="text-[11px]">Personnages</span>
            </button>

            {/* 3. MAGASIN */}
            <button
              onClick={() => { setSelectedSeries(null); setActiveTab('shop'); }}
              className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === 'shop' ? 'text-indigo-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="text-[11px]">Magasin</span>
            </button>

            {/* 4. COMPTE */}
            <button
              onClick={() => { setSelectedSeries(null); setActiveTab('account'); }}
              className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === 'account' ? 'text-indigo-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <User className="w-5 h-5" />
              <span className="text-[11px]">Compte</span>
            </button>

          </div>
        </nav>
      )}

    </div>
  );
}

// ==========================================
// 1. LIBRARY VIEW & SERIES DETAIL COMPONENTS
// ==========================================

function LibraryView({ seriesList, chapters, onSelectSeries, onOpenImport, onOpenAddSeries, filter, setFilter, onOpenReader, darkMode }) {
  const offlineChapters = chapters.filter(c => c.isDownloaded);

  return (
    <div className="space-y-6">
      {/* HEADER ACTIONS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black">Ma Bibliothèque Uni Trad</h2>
          <p className="text-xs text-slate-400">Gérez vos séries traduites et vos lectures enregistrées.</p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {/* FILTER TAB */}
          <div className={`flex rounded-xl p-1 border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-200 border-slate-300'}`}>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
            >
              Toutes les séries
            </button>
            <button
              onClick={() => setFilter('offline')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors ${filter === 'offline' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Hors-ligne ({offlineChapters.length})</span>
            </button>
          </div>

          {/* ADD SERIES BUTTON */}
          <button
            onClick={onOpenAddSeries}
            className={`px-3 py-2 rounded-xl border font-bold text-xs flex items-center space-x-1 ${darkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}
          >
            <Plus className="w-4 h-4" />
            <span>Série</span>
          </button>

          {/* ADD CHAPTER BUTTON */}
          <button
            onClick={onOpenImport}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            <span>+ Traduire un chapitre</span>
          </button>
        </div>
      </div>

      {/* FILTER CONTENT */}
      {filter === 'offline' ? (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-400">Chapitres disponibles sans connexion :</h3>
          {offlineChapters.length === 0 ? (
            <div className={`p-8 text-center rounded-2xl border border-dashed ${darkMode ? 'border-slate-800 text-slate-500' : 'border-slate-300 text-slate-400'}`}>
              <Download className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">Aucun chapitre téléchargé pour le moment.</p>
              <p className="text-xs mt-1">Ouvrez un chapitre et cliquez sur "Télécharger hors-ligne" dans le lecteur.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {offlineChapters.map(chap => {
                const s = seriesList.find(ser => ser.id === chap.seriesId);
                return (
                  <div 
                    key={chap.id}
                    onClick={() => onOpenReader(chap)}
                    className={`p-4 rounded-xl border flex items-center space-x-4 cursor-pointer transition-all hover:scale-[1.01] ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-indigo-500/50' : 'bg-white border-slate-200 hover:border-indigo-500'}`}
                  >
                    <img src={s?.cover} alt={s?.title} className="w-12 h-16 object-cover rounded-lg" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-indigo-400 font-bold">{s?.title}</p>
                      <h4 className="text-sm font-bold truncate">{chap.title}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Disponible Hors-ligne
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* SERIES GRID */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {seriesList.map(series => (
            <div
              key={series.id}
              onClick={() => onSelectSeries(series)}
              className={`group relative rounded-2xl border overflow-hidden cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-indigo-500/50' : 'bg-white border-slate-200 hover:border-indigo-400'}`}
            >
              {/* COVER IMAGE */}
              <div className="aspect-[3/4] w-full overflow-hidden relative">
                <img 
                  src={series.cover} 
                  alt={series.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80" />
                
                {/* TYPE BADGE */}
                <span className="absolute top-2 left-2 px-2 py-1 rounded-md text-[10px] font-extrabold bg-indigo-600/90 text-white backdrop-blur-md">
                  {series.type}
                </span>

                {/* LANGUAGES */}
                <span className="absolute top-2 right-2 px-2 py-1 rounded-md text-[10px] font-bold bg-slate-900/80 text-slate-300 backdrop-blur-md flex items-center space-x-1">
                  <Globe className="w-3 h-3" />
                  <span>{series.sourceLang} ➔ {series.targetLang}</span>
                </span>
              </div>

              {/* CARD INFO */}
              <div className="p-3">
                <h3 className="font-bold text-sm truncate">{series.title}</h3>
                <div className="flex justify-between items-center text-xs text-slate-400 mt-1">
                  <span>{series.chaptersCount} Chapitres</span>
                  <span className="text-emerald-400 font-medium">{series.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SeriesDetailView({ series, onBack, chapters, characters, glossary, onOpenReader, onOpenImport, onOpenAddCharacter, onAddGlossary, darkMode }) {
  const [subTab, setSubTab] = useState('chapters'); // chapters, characters, glossary
  const [newGlossaryTerm, setNewGlossaryTerm] = useState({ original: '', translated: '' });
  const [glossaryList, setGlossaryList] = useState(glossary);

  const handleAddGlossary = (e) => {
    e.preventDefault();
    if (!newGlossaryTerm.original || !newGlossaryTerm.translated) return;
    setGlossaryList(prev => [
      ...prev,
      { id: Date.now().toString(), seriesId: series.id, originalTerm: newGlossaryTerm.original, translatedTerm: newGlossaryTerm.translated, category: 'Personnalisé' }
    ]);
    if (onAddGlossary) onAddGlossary(series.id, newGlossaryTerm.original, newGlossaryTerm.translated);
    setNewGlossaryTerm({ original: '', translated: '' });
  };

  return (
    <div className="space-y-6">
      {/* BACK BUTTON & HEADER */}
      <button 
        onClick={onBack}
        className="flex items-center space-x-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Retour à la Bibliothèque</span>
      </button>

      {/* SERIES BANNER */}
      <div className={`p-6 rounded-3xl border flex flex-col md:flex-row gap-6 relative overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <img src={series.cover} alt={series.title} className="w-32 h-44 object-cover rounded-2xl shadow-lg mx-auto md:mx-0" />
        
        <div className="flex-1 space-y-3 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600/30 text-indigo-300 border border-indigo-500/30">
              {series.type}
            </span>
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300">
              {series.status}
            </span>
          </div>

          <h2 className="text-3xl font-black">{series.title}</h2>
          <p className="text-xs text-slate-400">
            Traduction : <strong className="text-slate-200">{series.sourceLang}</strong> vers <strong className="text-slate-200">{series.targetLang}</strong> • Mode de lecture : <strong className="text-slate-200">{series.readingMode.toUpperCase()}</strong>
          </p>

          <div className="pt-2 flex justify-center md:justify-start space-x-3">
            <button
              onClick={onOpenImport}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center space-x-2 shadow-lg hover:opacity-90"
            >
              <Plus className="w-4 h-4" />
              <span>Traduire un nouveau chapitre</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUB TABS NAVIGATION */}
      <div className={`flex border-b ${darkMode ? 'border-slate-800' : 'border-slate-300'}`}>
        <button
          onClick={() => setSubTab('chapters')}
          className={`px-6 py-3 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 ${subTab === 'chapters' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <FileText className="w-4 h-4" />
          <span>Chapitres ({chapters.length})</span>
        </button>

        <button
          onClick={() => setSubTab('characters')}
          className={`px-6 py-3 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 ${subTab === 'characters' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <Users className="w-4 h-4" />
          <span>Personnages ({characters.length})</span>
        </button>

        <button
          onClick={() => setSubTab('glossary')}
          className={`px-6 py-3 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 ${subTab === 'glossary' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Glossaire ({glossaryList.length})</span>
        </button>
      </div>

      {/* SUB TAB CONTENT */}
      {subTab === 'chapters' && (
        <div className="space-y-3">
          {chapters.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-6 text-center">Aucun chapitre pour le moment dans cette série.</p>
          ) : (
            chapters.map(chap => (
              <div
                key={chap.id}
                className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'}`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 font-bold flex items-center justify-center text-xs">
                    #{chap.number}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">{chap.title}</h4>
                    <p className="text-[11px] text-slate-400">{chap.pagesCount} pages • Statut : <span className="text-emerald-400 font-semibold">Traduit</span></p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {chap.isDownloaded && (
                    <span className="text-xs text-emerald-400 p-1" title="Disponible hors-ligne">
                      <Download className="w-4 h-4" />
                    </span>
                  )}
                  <button
                    onClick={() => onOpenReader(chap)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center space-x-1"
                  >
                    <span>Lire</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {subTab === 'characters' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-400">Personnages associés à cette série :</h3>
            <button 
              onClick={onOpenAddCharacter}
              className="text-xs font-bold text-indigo-400 hover:underline flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Ajouter un personnage</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {characters.map(char => (
              <CharacterCard key={char.id} char={char} darkMode={darkMode} />
            ))}
          </div>
        </div>
      )}

      {subTab === 'glossary' && (
        <div className="space-y-6">
          {/* ADD GLOSSARY FORM */}
          <form onSubmit={handleAddGlossary} className={`p-4 rounded-2xl border space-y-3 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-400">Ajouter un terme au glossaire Uni Trad</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input 
                type="text" 
                placeholder="Terme original (ex: Bankai)" 
                value={newGlossaryTerm.original}
                onChange={e => setNewGlossaryTerm({ ...newGlossaryTerm, original: e.target.value })}
                className={`p-2.5 rounded-xl border text-xs ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
              />
              <input 
                type="text" 
                placeholder="Traduction fixe imposée" 
                value={newGlossaryTerm.translated}
                onChange={e => setNewGlossaryTerm({ ...newGlossaryTerm, translated: e.target.value })}
                className={`p-2.5 rounded-xl border text-xs ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
              />
            </div>
            <button type="submit" className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500">
              Enregistrer le terme
            </button>
          </form>

          {/* LIST */}
          <div className="space-y-2">
            {glossaryList.map(item => (
              <div key={item.id} className={`p-3 rounded-xl border flex justify-between items-center text-xs ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div>
                  <span className="font-bold text-slate-300">{item.originalTerm}</span>
                  <span className="mx-2 text-slate-500">➔</span>
                  <span className="font-bold text-indigo-400">{item.translatedTerm}</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono">{item.category}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 2. CHARACTERS VIEW & RARITY CARD COMPONENTS
// ==========================================

function CharactersView({ characters, seriesList, onToggleFavorite, onOpenAdd, onSimulateAppearance, darkMode }) {
  const [search, setSearch] = useState('');
  const [selectedSeriesFilter, setSelectedSeriesFilter] = useState('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const filtered = characters.filter(c => {
    const matchSearch = c.translatedName.toLowerCase().includes(search.toLowerCase()) || c.originalName.toLowerCase().includes(search.toLowerCase());
    const matchSeries = selectedSeriesFilter === 'all' || c.seriesId === selectedSeriesFilter;
    const matchFav = !favoritesOnly || c.isFavorite;
    return matchSearch && matchSeries && matchFav;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black">Collection de Personnages</h2>
          <p className="text-xs text-slate-400">Garantit une traduction cohérente des noms et des styles de langage par l'IA.</p>
        </div>

        <button
          onClick={onOpenAdd}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs shadow-lg hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          <span>+ Ajouter un Personnage</span>
        </button>
      </div>

      {/* FILTERS & SEARCH BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* SEARCH INPUT */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un personnage..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 rounded-xl border text-xs ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-300'}`}
          />
        </div>

        {/* SERIES FILTER */}
        <select
          value={selectedSeriesFilter}
          onChange={e => setSelectedSeriesFilter(e.target.value)}
          className={`px-3 py-2 rounded-xl border text-xs ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-300'}`}
        >
          <option value="all">Toutes les séries</option>
          {seriesList.map(s => (
            <option key={s.id} value={s.id}>{s.title}</option>
          ))}
        </select>

        {/* FAVORITES ONLY TOGGLE */}
        <button
          onClick={() => setFavoritesOnly(!favoritesOnly)}
          className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-colors ${
            favoritesOnly ? 'bg-amber-500/20 border-amber-500 text-amber-300' : darkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-300 text-slate-600'
          }`}
        >
          <Star className={`w-4 h-4 ${favoritesOnly ? 'fill-amber-400 text-amber-400' : ''}`} />
          <span>Favoris uniquement</span>
        </button>
      </div>

      {/* CHARACTER CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(char => (
          <CharacterCard 
            key={char.id} 
            char={char} 
            onToggleFavorite={onToggleFavorite}
            onSimulateAppearance={onSimulateAppearance}
            darkMode={darkMode} 
          />
        ))}
      </div>
    </div>
  );
}

function CharacterCard({ char, onToggleFavorite, onSimulateAppearance, darkMode }) {
  // Rarity styling badge config
  const rarityConfig = {
    common: { label: 'Commune', color: 'bg-slate-700 text-slate-300 border-slate-600' },
    bronze: { label: '🥉 Bronze (1+ chap)', color: 'bg-amber-900/40 text-amber-300 border-amber-700' },
    silver: { label: '🥈 Argent (10+ chap)', color: 'bg-slate-300/20 text-slate-200 border-slate-400' },
    gold: { label: '🥇 Or (50+ chap)', color: 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black border-yellow-300 shadow-lg shadow-yellow-500/20' }
  };

  const currentRarity = rarityConfig[char.rarity] || rarityConfig.common;

  return (
    <div className={`rounded-2xl border p-4 flex gap-4 relative overflow-hidden transition-all hover:scale-[1.01] ${
      char.rarity === 'gold' ? 'border-yellow-500/50 bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-900' : darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
    }`}>
      {/* AVATAR PORTRAIT */}
      <img src={char.avatar} alt={char.translatedName} className="w-20 h-24 object-cover rounded-xl shadow-md border border-slate-700" />

      {/* INFO */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[10px] text-indigo-400 font-bold block truncate">{char.seriesTitle}</span>
            <h4 className="font-extrabold text-sm truncate">{char.translatedName}</h4>
            <p className="text-[10px] text-slate-400 italic">{char.originalName}</p>
          </div>

          {onToggleFavorite && (
            <button 
              onClick={() => onToggleFavorite(char.id)}
              className="p-1 hover:scale-110 transition-transform"
            >
              <Star className={`w-4 h-4 ${char.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
            </button>
          )}
        </div>

        <p className="text-[11px] text-slate-400 line-clamp-2 pt-1">{char.description}</p>

        {/* RARITY BADGE & APPARITIONS */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-1">
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${currentRarity.color}`}>
            {currentRarity.label}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {char.appearancesCount} apparitions
          </span>
        </div>

        {/* SIMULATE APPARITION DETECTED BUTTON */}
        {onSimulateAppearance && char.rarity !== 'gold' && (
          <button
            onClick={() => onSimulateAppearance(char.id)}
            className="w-full mt-2 py-1 text-[10px] rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 font-semibold border border-indigo-500/30 transition-colors"
          >
            + Simuler +5 apparitions IA
          </button>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 3. SHOP VIEW & COMPTE VIEW COMPONENTS
// ==========================================

function ShopView({ coins, isSubscribed, onBuyPack, onSubscribe, onCancelSubscribe, darkMode }) {
  return (
    <div className="space-y-8">
      {/* HEADER BANNER */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white border border-indigo-500/30 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="space-y-2 text-center md:text-left">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Économie & Recharge
          </span>
          <h2 className="text-3xl font-black">Magasin Uni Trad</h2>
          <p className="text-xs text-indigo-200 max-w-lg">
            Rechargez votre solde de pièces pour traduire à la carte (10 pièces / chapitre) ou profitez de l'accès illimité.
          </p>
        </div>

        <div className="bg-slate-950/60 p-4 rounded-2xl border border-indigo-500/40 text-center min-w-[180px]">
          <span className="text-xs text-slate-400 block font-semibold">Votre Solde Actuel</span>
          <div className="text-3xl font-black text-indigo-300 flex items-center justify-center space-x-2 mt-1">
            <UniCoin className="w-7 h-7" />
            <span>{isSubscribed ? 'Illimité' : coins}</span>
          </div>
          <span className="text-[10px] text-slate-400">{isSubscribed ? 'Pass Actif' : 'Pièces disponibles'}</span>
        </div>
      </div>

      {/* UNLIMITED SUBSCRIPTION CARD */}
      <div className={`p-6 rounded-3xl border relative overflow-hidden transition-all ${
        isSubscribed ? 'border-yellow-500 bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900' : darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <h3 className="text-xl font-black">Pass Abonnement Illimité Uni Trad</h3>
            </div>
            <p className="text-xs text-slate-400 max-w-md">
              Traductions illimitées de mangas et webtoons. Aucune pièce débitée lors de l'importation de vos chapitres. Résiliable à tout moment.
            </p>
            <ul className="text-xs text-slate-300 space-y-1 pt-1">
              <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-emerald-400" /> <span>Traductions illimitées sans limite de pages</span></li>
              <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-emerald-400" /> <span>Priorité de calcul IA ultra-rapide</span></li>
            </ul>
          </div>

          <div className="text-center md:text-right space-y-3">
            <div className="text-2xl font-black">
              11,99 € <span className="text-xs text-slate-400 font-normal">/ mois</span>
            </div>
            
            {isSubscribed ? (
              <button
                onClick={onCancelSubscribe}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold text-xs border border-rose-500/30"
              >
                Résilier l'abonnement
              </button>
            ) : (
              <button
                onClick={onSubscribe}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-slate-950 font-black text-xs shadow-xl shadow-amber-500/20 hover:scale-105 transition-transform"
              >
                Activer le Pass Illimité
              </button>
            )}
          </div>
        </div>
      </div>

      {/* COIN PACKS */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold">Packs de pièces (Paiement unique)</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* PACK 1 */}
          <div className={`p-5 rounded-2xl border text-center space-y-4 transition-all hover:scale-105 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 mx-auto flex items-center justify-center font-bold">
              150
            </div>
            <div>
              <h4 className="font-extrabold text-lg">150 Pièces</h4>
              <p className="text-xs text-slate-400 mt-0.5">Équivalent à 15 chapitres</p>
            </div>
            <div className="text-xl font-black text-indigo-400">5,00 €</div>
            <button
              onClick={() => onBuyPack(150, 5)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md"
            >
              Acheter le Pack
            </button>
          </div>

          {/* PACK 2 (POPULAR) */}
          <div className={`p-5 rounded-2xl border text-center space-y-4 relative transition-all hover:scale-105 border-indigo-500 ${darkMode ? 'bg-slate-900/90' : 'bg-white'}`}>
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-black bg-indigo-600 text-white uppercase">
              Le plus populaire
            </span>
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 mx-auto flex items-center justify-center font-bold">
              300
            </div>
            <div>
              <h4 className="font-extrabold text-lg">300 Pièces</h4>
              <p className="text-xs text-slate-400 mt-0.5">Équivalent à 30 chapitres</p>
            </div>
            <div className="text-xl font-black text-purple-400">8,00 €</div>
            <button
              onClick={() => onBuyPack(300, 8)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs shadow-lg"
            >
              Acheter le Pack
            </button>
          </div>

          {/* PACK 3 */}
          <div className={`p-5 rounded-2xl border text-center space-y-4 transition-all hover:scale-105 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center font-bold">
              1000
            </div>
            <div>
              <h4 className="font-extrabold text-lg">1000 Pièces</h4>
              <p className="text-xs text-slate-400 mt-0.5">Équivalent à 100 chapitres</p>
            </div>
            <div className="text-xl font-black text-amber-400">20,00 €</div>
            <button
              onClick={() => onBuyPack(1000, 20)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md"
            >
              Acheter le Pack
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

function AccountView({ coins, isSubscribed, transactions, hasReviewed, referralCount, referralCode, onAddReview, onAddReferral, darkMode }) {
  const [copiedReferral, setCopiedReferral] = useState(false);

  const referralLink = referralCode ? `${window.location.origin}/?ref=${referralCode}` : 'https://unitrad.app/ref/user123';

  const handleCopy = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(referralLink).catch(() => {});
    setCopiedReferral(true);
    setTimeout(() => setCopiedReferral(false), 2000);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black">Mon Compte Uni Trad</h2>

      {/* USER PROFILE INFO CARD */}
      <div className={`p-6 rounded-3xl border flex flex-col sm:flex-row justify-between items-center gap-4 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg">
            UT
          </div>
          <div>
            <h3 className="font-extrabold text-lg">Lecteur Uni Trad</h3>
            <p className="text-xs text-slate-400">user@unitrad-app.com</p>
            <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold">
              Compte Actif
            </span>
          </div>
        </div>

        <div className="text-center sm:text-right">
          <div className="text-xs text-slate-400 font-medium">Solde disponible</div>
          <div className="text-2xl font-black text-indigo-300 flex items-center justify-center sm:justify-end space-x-1.5">
            <UniCoin className="w-5 h-5" />
            <span>{isSubscribed ? 'Abonné Illimité' : `${coins} Pièces`}</span>
          </div>
        </div>
      </div>

      {/* EARN FREE COINS MODULES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* LEAVE A REVIEW MODULE (+300 COINS) */}
        <div className={`p-5 rounded-2xl border space-y-3 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center space-x-2 text-amber-400">
            <Star className="w-5 h-5 fill-amber-400" />
            <h4 className="font-bold text-sm text-slate-200">Laisser un avis (+300 pièces)</h4>
          </div>
          <p className="text-xs text-slate-400">Notez l'application Uni Trad et donnez votre avis pour recevoir 300 pièces gratuites (une seule fois).</p>
          {hasReviewed ? (
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-bold text-center border border-emerald-500/30">
              ✓ Avis soumis (+300 pièces reçues)
            </div>
          ) : (
            <button
              onClick={onAddReview}
              className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition-colors"
            >
              Donner mon avis (+300 pièces)
            </button>
          )}
        </div>

        {/* REFERRAL LINK MODULE (+200 COINS) */}
        <div className={`p-5 rounded-2xl border space-y-3 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center space-x-2 text-indigo-400">
            <Share2 className="w-5 h-5" />
            <h4 className="font-bold text-sm text-slate-200">Parrainage (+200 pièces / ami)</h4>
          </div>
          <p className="text-xs text-slate-400">Partagez votre lien. Gagnez 200 pièces par ami inscrit ({referralCount} ami(s) parrainé(s)).</p>
          
          <div className="flex items-center space-x-2">
            <input 
              type="text" 
              readOnly 
              value={referralLink} 
              className={`flex-1 p-2 rounded-lg text-xs font-mono border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'}`}
            />
            <button
              onClick={handleCopy}
              className="px-3 py-2 rounded-lg bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500"
            >
              {copiedReferral ? 'Copié !' : 'Copier'}
            </button>
          </div>

          {onAddReferral && (
            <button
              onClick={onAddReferral}
              className="w-full text-[11px] text-indigo-400 hover:underline font-semibold"
            >
              + Simuler l'inscription d'un ami filleul (+200 pièces)
            </button>
          )}
        </div>

      </div>

      {/* TRANSACTIONS HISTORY */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-400">Historique des Pièces</h3>
        <div className={`rounded-2xl border divide-y overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-800 divide-slate-800' : 'bg-white border-slate-200 divide-slate-200'}`}>
          {transactions.map(t => (
            <div key={t.id} className="p-3.5 flex justify-between items-center text-xs">
              <div className="space-y-0.5">
                <p className="font-bold text-slate-200">{t.label}</p>
                <p className="text-[10px] text-slate-500">{t.date}</p>
              </div>
              <span className={`font-mono font-extrabold ${t.type === 'credit' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {t.type === 'credit' ? '+' : '-'}{t.amount} pièces
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. READER & EDITOR MODULE (TOUCHE E)
// ==========================================

function ReaderView({ chapter, series, onClose, onSavePageBubbles, onToggleOfflineDownload, darkMode }) {
  const [readingMode, setReadingMode] = useState(series?.readingMode || 'list'); // list, manga, bd
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [showOriginal, setShowOriginal] = useState(false);
  const [isEditorActive, setIsEditorActive] = useState(false);

  // Active page state for dynamic editing
  const pages = chapter.pages.length > 0 ? chapter.pages : [
    {
      id: 'mock_p1',
      originalUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      bubbles: [
        { id: 'b_demo1', top: 20, left: 25, width: 50, height: 18, text: "Exemple de traduction IA.", originalText: "Original text sample", fontSize: 16 }
      ]
    }
  ];

  const currentPage = pages[currentPageIndex] || pages[0];
  const [bubblesState, setBubblesState] = useState(currentPage.bubbles);
  const [selectedBubbleId, setSelectedBubbleId] = useState(null);

  // Key press listener for "E" shortcut to toggle Editor mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'e' || e.key === 'E') {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          setIsEditorActive(prev => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update bubble state when changing page
  useEffect(() => {
    setBubblesState(currentPage.bubbles);
    setSelectedBubbleId(null);
  }, [currentPageIndex]);

  const handleBubbleTextChange = (id, newText) => {
    setBubblesState(prev => prev.map(b => b.id === id ? { ...b, text: newText } : b));
  };

  const handleFontSizeChange = (id, delta) => {
    setBubblesState(prev => prev.map(b => b.id === id ? { ...b, fontSize: Math.max(10, (b.fontSize || 14) + delta) } : b));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col select-none overflow-hidden">
      
      {/* READER HEADER TOOLBAR */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-white z-20">
        <div className="flex items-center space-x-3">
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
          <div>
            <h3 className="font-bold text-sm truncate max-w-[200px] sm:max-w-xs">{chapter.title}</h3>
            <p className="text-[10px] text-indigo-400">{series?.title}</p>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex items-center space-x-2 sm:space-x-3 text-xs">
          {/* READING MODE SWITCH */}
          <div className="hidden sm:flex rounded-lg bg-slate-800 p-1 border border-slate-700">
            <button
              onClick={() => setReadingMode('list')}
              className={`px-2 py-1 rounded text-[11px] font-bold ${readingMode === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
            >
              Webtoon (Liste)
            </button>
            <button
              onClick={() => setReadingMode('manga')}
              className={`px-2 py-1 rounded text-[11px] font-bold ${readingMode === 'manga' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
            >
              Manga (RTL)
            </button>
            <button
              onClick={() => setReadingMode('bd')}
              className={`px-2 py-1 rounded text-[11px] font-bold ${readingMode === 'bd' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
            >
              BD (LTR)
            </button>
          </div>

          {/* TOGGLE ORIGINAL */}
          <button
            onClick={() => setShowOriginal(!showOriginal)}
            className={`px-3 py-1.5 rounded-xl border flex items-center space-x-1 font-bold ${
              showOriginal ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">{showOriginal ? 'Traduction' : 'Original'}</span>
          </button>

          {/* TOGGLE EDITOR (KEY E) */}
          <button
            onClick={() => setIsEditorActive(!isEditorActive)}
            className={`px-3 py-1.5 rounded-xl border flex items-center space-x-1 font-bold transition-all ${
              isEditorActive ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-500/40 animate-pulse' : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
            title="Activer le mode éditeur (Touche E)"
          >
            <Edit3 className="w-4 h-4" />
            <span className="hidden sm:inline">Éditeur [E]</span>
          </button>

          {/* SAVE BUTTON IF EDITED */}
          {isEditorActive && (
            <button
              onClick={() => onSavePageBubbles(currentPage.id, bubblesState)}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            >
              Enregistrer
            </button>
          )}

          {/* OFFLINE DOWNLOAD TOGGLE */}
          <button
            onClick={onToggleOfflineDownload}
            className={`p-2 rounded-xl border ${chapter.isDownloaded ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
            title="Télécharger hors-ligne"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* EDITOR BANNER NOTIFICATION */}
      {isEditorActive && (
        <div className="bg-purple-900/90 text-purple-200 text-xs px-4 py-1.5 text-center border-b border-purple-700 font-medium">
          ✏️ Mode Éditeur actif : Cliquez sur n'importe quelle bulle de texte sur l'image pour modifier sa traduction ou la taille de la police.
        </div>
      )}

      {/* MAIN CANVAS / DISPLAY CANVAS */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-2 relative bg-slate-950">
        
        {readingMode === 'list' ? (
          /* LIST MODE (VERTICAL SCROLL FOR WEBTOONS) */
          <div className="space-y-4 max-w-2xl w-full mx-auto my-auto">
            {pages.map((p, idx) => (
              <div key={p.id} className="relative rounded-lg overflow-hidden border border-slate-800 shadow-2xl">
                <img src={showOriginal ? p.originalUrl : (p.cleanedUrl || p.originalUrl)} alt={`Page ${idx + 1}`} className="w-full h-auto block" />
                
                {/* BUBBLE OVERLAYS */}
                {!showOriginal && p.bubbles.map(b => (
                  <div
                    key={b.id}
                    style={{
                      top: `${b.top}%`,
                      left: `${b.left}%`,
                      width: `${b.width}%`,
                      height: `${b.height}%`,
                      fontSize: `${b.fontSize || 14}px`
                    }}
                    className={`absolute rounded-full bg-white text-slate-950 p-2 flex items-center justify-center text-center font-semibold shadow-xl border-2 border-slate-300 leading-tight ${
                      isEditorActive ? 'ring-2 ring-purple-500 cursor-pointer hover:scale-105' : ''
                    }`}
                  >
                    {b.text}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          /* MANGA (RTL) / BD (LTR) PAGE BY PAGE MODE */
          <div className="relative max-w-2xl w-full h-full flex items-center justify-center">
            
            {/* PAGE DISPLAY */}
            <div className="relative border border-slate-800 rounded-xl overflow-hidden shadow-2xl max-h-[85vh]">
              <img src={showOriginal ? currentPage.originalUrl : (currentPage.cleanedUrl || currentPage.originalUrl)} alt="Page scan" className="max-h-[85vh] w-auto object-contain block" />

              {/* OVERLAY BUBBLES */}
              {!showOriginal && bubblesState.map(b => (
                <div
                  key={b.id}
                  onClick={() => isEditorActive && setSelectedBubbleId(b.id)}
                  style={{
                    top: `${b.top}%`,
                    left: `${b.left}%`,
                    width: `${b.width}%`,
                    height: `${b.height}%`,
                    fontSize: `${b.fontSize || 14}px`
                  }}
                  className={`absolute rounded-2xl bg-white text-slate-950 p-3 flex items-center justify-center text-center font-bold shadow-2xl border-2 leading-tight transition-transform ${
                    selectedBubbleId === b.id ? 'border-purple-600 ring-4 ring-purple-500/50 scale-105 z-30' : 'border-slate-300'
                  } ${isEditorActive ? 'cursor-pointer hover:border-purple-500' : ''}`}
                >
                  {b.text}
                </div>
              ))}
            </div>

            {/* TOUCH / NAV BUTTONS LEFT & RIGHT */}
            <button
              onClick={() => {
                if (readingMode === 'manga') {
                  setCurrentPageIndex(p => Math.min(pages.length - 1, p + 1));
                } else {
                  setCurrentPageIndex(p => Math.max(0, p - 1));
                }
              }}
              className="absolute left-2 p-3 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 backdrop-blur-md border border-slate-700"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={() => {
                if (readingMode === 'manga') {
                  setCurrentPageIndex(p => Math.max(0, p - 1));
                } else {
                  setCurrentPageIndex(p => Math.min(pages.length - 1, p + 1));
                }
              }}
              className="absolute right-2 p-3 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 backdrop-blur-md border border-slate-700"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        )}

      </div>

      {/* SELECTED BUBBLE EDITOR BOTTOM DRAWER */}
      {isEditorActive && selectedBubbleId && (
        <div className="p-4 bg-slate-900 border-t border-purple-500/50 flex flex-col sm:flex-row items-center justify-between gap-4 z-30">
          <div className="flex-1 w-full space-y-1">
            <label className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">Texte de la bulle sélectionnée</label>
            <input
              type="text"
              value={bubblesState.find(b => b.id === selectedBubbleId)?.text || ''}
              onChange={e => handleBubbleTextChange(selectedBubbleId, e.target.value)}
              className="w-full p-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-sm"
            />
          </div>

          <div className="flex items-center space-x-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 block mb-1">Taille texte</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleFontSizeChange(selectedBubbleId, -2)}
                  className="px-3 py-1 rounded-lg bg-slate-800 text-white font-bold border border-slate-700"
                >
                  A-
                </button>
                <button
                  onClick={() => handleFontSizeChange(selectedBubbleId, 2)}
                  className="px-3 py-1 rounded-lg bg-slate-800 text-white font-bold border border-slate-700"
                >
                  A+
                </button>
              </div>
            </div>

            <button
              onClick={() => setSelectedBubbleId(null)}
              className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs"
            >
              Valider bulle
            </button>
          </div>
        </div>
      )}

      {/* BOTTOM PAGE COUNTER */}
      {readingMode !== 'list' && (
        <div className="py-2 bg-slate-900 border-t border-slate-800 text-center text-xs text-slate-400 font-mono">
          Page {currentPageIndex + 1} / {pages.length}
        </div>
      )}

    </div>
  );
}

// ==========================================
// 5. MODALS (IMPORT, ADD CHAR, CELEBRATION)
// ==========================================

function ImportChapterModal({ seriesList, defaultSeriesId, coins, isSubscribed, onClose, onStartTranslation, connected, onRealTranslate, darkMode }) {
  const [importType, setImportType] = useState('files'); // files, url
  const [selectedSeriesId, setSelectedSeriesId] = useState(defaultSeriesId || seriesList[0]?.id || '');
  const [chapterTitle, setChapterTitle] = useState('Chapitre 1');
  const [sourceLang, setSourceLang] = useState('Détection auto');
  const [targetLang, setTargetLang] = useState('Français');
  const [isTranslating, setIsTranslating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (connected) {
      if (files.length === 0) { setError('Ajoute au moins une image.'); return; }
      if (!selectedSeriesId) { setError("Crée d'abord une série (bouton « + Série »)."); return; }
      setIsTranslating(true);
      try {
        await onRealTranslate({ seriesId: selectedSeriesId, title: chapterTitle, files, onProgress: setProgress });
      } catch (err) {
        setError(err.message || 'La traduction a échoué');
        setIsTranslating(false);
        setProgress(0);
      }
      return;
    }

    setIsTranslating(true);
    
    // Simulate translation progress bar
    let p = 0;
    const interval = setInterval(() => {
      p += 20;
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          onStartTranslation({
            seriesId: selectedSeriesId,
            title: chapterTitle,
            pages: []
          });
        }, 500);
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`max-w-md w-full rounded-3xl border p-6 space-y-5 relative shadow-2xl ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <h3 className="text-xl font-black">Traduire un Chapitre</h3>
          <p className="text-xs text-slate-400">Coût : <strong className="text-amber-400 font-bold">{isSubscribed ? '0 pièce (Pass Illimité)' : '10 pièces'}</strong> par chapitre</p>
        </div>

        {isTranslating ? (
          <div className="py-8 text-center space-y-4">
            <UniTradLogo className="h-12 mx-auto justify-center animate-bounce" showText={false} darkMode={darkMode} />
            <div className="space-y-1">
              <h4 className="font-bold text-sm">Traduction par l'IA Uni Trad en cours...</h4>
              <p className="text-xs text-slate-400">Détection des bulles, inpainting et incrustation du texte</p>
            </div>

            {/* PROGRESS BAR */}
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs font-mono text-indigo-400 font-bold">{progress}% effectué</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            
            {/* IMPORT TYPE TOGGLE */}
            <div className="flex rounded-xl p-1 bg-slate-800 border border-slate-700">
              <button
                type="button"
                onClick={() => setImportType('files')}
                className={`flex-1 py-1.5 rounded-lg font-bold ${importType === 'files' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
              >
                Glisser-déposer images
              </button>
              <button
                type="button"
                onClick={() => setImportType('url')}
                className={`flex-1 py-1.5 rounded-lg font-bold ${importType === 'url' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
              >
                Coller URL Chapitre
              </button>
            </div>

            {importType === 'files' ? (
              <label className="block border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center space-y-2 hover:border-indigo-500 cursor-pointer">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={e => setFiles(Array.from(e.target.files).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })))}
                />
                <UploadCloud className="w-8 h-8 text-indigo-400 mx-auto" />
                <p className="font-semibold text-slate-300">
                  {files.length > 0 ? `${files.length} image(s) sélectionnée(s)` : 'Touchez pour choisir vos images (JPEG, PNG, WEBP)'}
                </p>
                <p className="text-[10px] text-slate-500">Une image par page, 15 Mo max, 80 pages max</p>
              </label>
            ) : (
              <input
                type="url"
                placeholder="https://site-manga.com/chapitre-12"
                className={`w-full p-3 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'}`}
              />
            )}

            {/* SERIES SELECT */}
            <div>
              <label className="font-bold text-slate-400 block mb-1">Série associée</label>
              <select
                value={selectedSeriesId}
                onChange={e => setSelectedSeriesId(e.target.value)}
                className={`w-full p-2.5 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'}`}
              >
                {seriesList.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>

            {/* TITLE */}
            <div>
              <label className="font-bold text-slate-400 block mb-1">Titre du Chapitre</label>
              <input
                type="text"
                value={chapterTitle}
                onChange={e => setChapterTitle(e.target.value)}
                className={`w-full p-2.5 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'}`}
              />
            </div>

            {error && <p className="text-rose-400 text-xs font-semibold">{error}</p>}

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-extrabold text-sm shadow-xl hover:opacity-90 transition-opacity"
            >
              Lancer la Traduction ({isSubscribed ? 'Gratuit' : '10 Pièces'})
            </button>

          </form>
        )}
      </div>
    </div>
  );
}

function AddCharacterModal({ seriesList, defaultSeriesId, onClose, onAdd, darkMode }) {
  const [seriesId, setSeriesId] = useState(defaultSeriesId || seriesList[0]?.id || '');
  const [originalName, setOriginalName] = useState('');
  const [translatedName, setTranslatedName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!originalName || !translatedName) return;

    const s = seriesList.find(ser => ser.id === seriesId);
    onAdd({
      id: `ch_${Date.now()}`,
      seriesId,
      seriesTitle: s?.title || 'Série',
      originalName,
      translatedName,
      description: description || 'Nouveau personnage de la collection.',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
      isFavorite: false,
      rarity: 'common',
      appearancesCount: 0
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`max-w-md w-full rounded-3xl border p-6 space-y-4 relative shadow-2xl ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-black">Ajouter un Personnage</h3>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-400 block mb-1">Série</label>
            <select
              value={seriesId}
              onChange={e => setSeriesId(e.target.value)}
              className={`w-full p-2.5 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'}`}
            >
              {seriesList.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-400 block mb-1">Nom d'origine (VO)</label>
            <input
              type="text"
              placeholder="ex: 成起草"
              value={originalName}
              onChange={e => setOriginalName(e.target.value)}
              className={`w-full p-2.5 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'}`}
            />
          </div>

          <div>
            <label className="font-bold text-slate-400 block mb-1">Nom traduit (VF imposée)</label>
            <input
              type="text"
              placeholder="ex: Jin-Woo"
              value={translatedName}
              onChange={e => setTranslatedName(e.target.value)}
              className={`w-full p-2.5 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'}`}
            />
          </div>

          <div>
            <label className="font-bold text-slate-400 block mb-1">Description / Ton de voix</label>
            <textarea
              rows={3}
              placeholder="Aide l'IA à adopter la bonne façon de parler..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className={`w-full p-2.5 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'}`}
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-lg"
          >
            Créer la Fiche Personnage
          </button>
        </form>
      </div>
    </div>
  );
}

function GoldCelebrationModal({ data, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-sm w-full rounded-3xl border border-yellow-500/50 bg-gradient-to-b from-amber-950/80 via-slate-900 to-slate-900 p-6 text-center space-y-4 shadow-2xl relative overflow-hidden animate-bounce">
        
        <Sparkles className="w-12 h-12 text-yellow-400 mx-auto animate-pulse" />

        <div className="space-y-1">
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-yellow-500/20 text-yellow-300 border border-yellow-400/40">
            Nouveau Niveau de Rareté Uni Trad !
          </span>
          <div className="pt-2 flex justify-center">
            <UniTradLogo className="h-8" showText={false} darkMode={true} />
          </div>
          <h3 className="text-2xl font-black text-amber-300 pt-2">CARTE RARETÉ OR 🥇</h3>
        </div>

        <img src={data.avatar} alt={data.charName} className="w-24 h-32 object-cover rounded-2xl mx-auto border-2 border-yellow-400 shadow-xl" />

        <div>
          <p className="font-extrabold text-lg text-white">{data.charName}</p>
          <p className="text-xs text-slate-400">Apparaît dans plus de 50 chapitres !</p>
        </div>

        <div className="p-3 rounded-2xl bg-amber-500/20 border border-yellow-400/30 text-amber-300 text-xs font-bold flex items-center justify-center space-x-2">
          <UniCoin className="w-5 h-5" />
          <span>Récompense : +100 pièces créditées !</span>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs shadow-lg"
        >
          Super ! Collecter Récompense
        </button>
      </div>
    </div>
  );
}

function AddSeriesModal({ onClose, onAdd, darkMode }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Manga');
  const [sourceLang, setSourceLang] = useState('Japonais');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ title: title.trim(), type, sourceLang: { Japonais: 'ja', Coréen: 'ko', Anglais: 'en' }[sourceLang] });
  };

  const field = `w-full p-2.5 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`max-w-md w-full rounded-3xl border p-6 space-y-4 relative shadow-2xl ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-xl font-black">Nouvelle série</h3>
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <input className={field} placeholder="Titre de la série" value={title} onChange={e => setTitle(e.target.value)} />
          <select className={field} value={type} onChange={e => setType(e.target.value)}>
            <option>Manga</option>
            <option>Manhwa (Webtoon)</option>
            <option>Webtoon</option>
            <option>BD</option>
          </select>
          <select className={field} value={sourceLang} onChange={e => setSourceLang(e.target.value)}>
            <option>Japonais</option>
            <option>Coréen</option>
            <option>Anglais</option>
          </select>
          <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-extrabold text-sm">
            Créer la série
          </button>
        </form>
      </div>
    </div>
  );
}
