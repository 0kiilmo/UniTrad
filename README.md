# Uni Trad

Traduction de scans : React (Vercel) + FastAPI/EasyOCR (Docker) + Supabase + Stripe.

```
Uni-trad/
├── src/            Front React (App.js, AuthScreen.js, lib/)
├── public/
├── backend/        API FastAPI (OCR, traduction, Stripe) + Dockerfile
├── database/       schema.sql (tables, RLS, buckets)
├── vercel.json
└── .env.example
```

Sans variables Supabase, le front tourne en **mode démo** (données locales, rien n'est sauvegardé).

## Déploiement (dans cet ordre)

### 1. Supabase
1. SQL Editor → coller et exécuter `database/schema.sql` (une seule fois).
2. Authentication → URL Configuration : mettre l'URL Vercel dans *Site URL*.
3. Settings → API : noter `URL`, `anon key` (front) et `service_role key` (backend uniquement).

### 2. Backend (Render, Railway ou Fly.io — pas Vercel)
- Nouveau service Docker, dossier racine `backend/`. Prévoir **2 Go de RAM minimum** (PyTorch + EasyOCR).
- Variables : voir `.env.example` (section BACKEND). Vérifier `https://TON-API/health`.

### 3. Stripe
- Developers → Webhooks → ajouter `https://TON-API/api/stripe/webhook`, événements :
  `checkout.session.completed` et `customer.subscription.deleted`.
- Copier le *Signing secret* (`whsec_...`) dans `STRIPE_WEBHOOK_SECRET`.
- Activer le Customer Portal (Settings → Billing → Customer portal) pour la résiliation.

### 4. Frontend (Vercel)
- Importer le dépôt GitHub, framework détecté automatiquement.
- Variables : `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`, `REACT_APP_API_URL`.
- Puis mettre l'URL Vercel dans `FRONTEND_URL` et `ALLOWED_ORIGINS` du backend.

## Développement local
```
npm install && npm start
cd backend && pip install -r requirements.txt && uvicorn main:app --reload
```
