import React, { useState } from 'react';
import { supabase } from './lib/supabase';

export default function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referral, setReferral] = useState(new URLSearchParams(window.location.search).get('ref') || '');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email, password, options: { data: referral ? { referral_code: referral.trim() } : {} },
        });
        if (error) throw error;
        if (!data.session) setMsg({ ok: true, text: 'Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse.' });
      }
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const field = 'w-full p-3 rounded-xl border bg-slate-800 border-slate-700 text-sm text-white outline-none focus:border-indigo-500';

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-4 text-white">
        <h1 className="text-2xl font-black text-center">Uni Trad</h1>
        <p className="text-xs text-slate-400 text-center">
          {mode === 'login' ? 'Connecte-toi pour retrouver ta bibliothèque' : 'Crée ton compte : 300 pièces offertes !'}
        </p>
        <input className={field} type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={field} type="password" required minLength={6} placeholder="Mot de passe (6 caractères min.)"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        {mode === 'signup' && (
          <input className={field} placeholder="Code parrain (optionnel)" value={referral} onChange={(e) => setReferral(e.target.value)} />
        )}
        {msg && <p className={`text-xs ${msg.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{msg.text}</p>}
        <button disabled={busy} className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 font-extrabold text-sm disabled:opacity-60">
          {busy ? '...' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
        </button>
        <button type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMsg(null); }}
          className="w-full text-xs text-indigo-400">
          {mode === 'login' ? "Pas de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
        </button>
      </form>
    </div>
  );
}
