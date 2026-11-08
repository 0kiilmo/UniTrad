import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AuthScreen from './AuthScreen';
import { supabase } from './lib/supabase';

function Root() {
  // undefined = chargement, null = déconnecté
  const [session, setSession] = useState(supabase ? undefined : null);

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!supabase) return <App session={null} />; // mode démo
  if (session === undefined) return <div className="min-h-screen bg-slate-950" />;
  if (!session) return <AuthScreen />;
  return <App session={session} onSignOut={() => supabase.auth.signOut()} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
