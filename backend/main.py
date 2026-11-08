"""
Uni Trad — moteur IA + paiements (FastAPI)

Rôles :
  - OCR (EasyOCR) -> effacement du texte (inpainting) -> traduction (LLM) -> bulles éditables
  - Débit des pièces (atomique, côté serveur uniquement)
  - Stripe : Checkout, portail client, webhook (crédit des pièces / abonnement)

Déploiement : Docker (Render, Railway, Fly.io...). PAS sur Vercel (EasyOCR/PyTorch trop lourd).
"""
import asyncio
import io
import json
import logging
import os
import uuid
from typing import Optional

import cv2
import httpx
import numpy as np
import stripe
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("unitrad")

# ----------------------------- Configuration -----------------------------
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", FRONTEND_URL).split(",") if o.strip()]

CHAPTER_COST = 10          # pièces par chapitre
MAX_PAGES_PER_CHAPTER = 80
MAX_UPLOAD_BYTES = 15 * 1024 * 1024
MAX_IMAGE_WIDTH = 2500     # largeur max (on garde la hauteur : bandes webtoon)
MAX_IMAGE_HEIGHT = 40000

stripe.api_key = STRIPE_SECRET_KEY
openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

PRODUCTS = {
    "pack_150":  {"coins": 150,  "cents": 500,  "name": "Pack 150 pièces Uni Trad"},
    "pack_300":  {"coins": 300,  "cents": 800,  "name": "Pack 300 pièces Uni Trad"},
    "pack_1000": {"coins": 1000, "cents": 2000, "name": "Pack 1000 pièces Uni Trad"},
}
SUBSCRIPTION_CENTS = 1199  # 11,99 € / mois

app = FastAPI(title="Uni Trad IA Engine")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)

http: Optional[httpx.AsyncClient] = None
ocr_lock = asyncio.Semaphore(1)  # un seul OCR à la fois (mémoire)
_readers: dict = {}


@app.on_event("startup")
async def _startup():
    global http
    http = httpx.AsyncClient(timeout=30)
    missing = [k for k, v in {
        "SUPABASE_URL": SUPABASE_URL, "SUPABASE_SERVICE_ROLE_KEY": SUPABASE_SERVICE_KEY,
        "STRIPE_SECRET_KEY": STRIPE_SECRET_KEY, "OPENAI_API_KEY": OPENAI_API_KEY,
    }.items() if not v]
    if missing:
        log.warning("Variables d'environnement manquantes : %s", ", ".join(missing))


@app.on_event("shutdown")
async def _shutdown():
    if http:
        await http.aclose()


@app.get("/health")
async def health():
    return {"status": "ok"}


# ----------------------------- Supabase (REST) -----------------------------
def _sb_headers(extra: Optional[dict] = None) -> dict:
    h = {"apikey": SUPABASE_SERVICE_KEY, "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"}
    if extra:
        h.update(extra)
    return h


async def sb_select(table: str, params: dict) -> list:
    r = await http.get(f"{SUPABASE_URL}/rest/v1/{table}", params=params, headers=_sb_headers())
    r.raise_for_status()
    return r.json()


async def sb_insert(table: str, row: dict, upsert_on: Optional[str] = None) -> list:
    prefer = "return=representation" + (",resolution=merge-duplicates" if upsert_on else "")
    params = {"on_conflict": upsert_on} if upsert_on else None
    r = await http.post(f"{SUPABASE_URL}/rest/v1/{table}", json=row, params=params,
                        headers=_sb_headers({"Prefer": prefer}))
    r.raise_for_status()
    return r.json()


async def sb_patch(table: str, match: dict, values: dict) -> None:
    params = {k: f"eq.{v}" for k, v in match.items()}
    r = await http.patch(f"{SUPABASE_URL}/rest/v1/{table}", params=params, json=values, headers=_sb_headers())
    r.raise_for_status()


async def sb_rpc(fn: str, args: dict):
    r = await http.post(f"{SUPABASE_URL}/rest/v1/rpc/{fn}", json=args, headers=_sb_headers())
    r.raise_for_status()
    return r.json()


async def sb_upload(bucket: str, path: str, data: bytes, content_type: str) -> str:
    r = await http.post(
        f"{SUPABASE_URL}/storage/v1/object/{bucket}/{path}",
        content=data,
        headers=_sb_headers({"Content-Type": content_type, "x-upsert": "true"}),
    )
    r.raise_for_status()
    return f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}"


# ----------------------------- Authentification -----------------------------
async def current_user(authorization: str = Header(default="")) -> dict:
    """Vérifie le JWT Supabase envoyé par le front (Authorization: Bearer ...)."""
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Connexion requise")
    token = authorization.split(" ", 1)[1]
    r = await http.get(f"{SUPABASE_URL}/auth/v1/user",
                       headers={"apikey": SUPABASE_SERVICE_KEY, "Authorization": f"Bearer {token}"})
    if r.status_code != 200:
        raise HTTPException(401, "Session invalide ou expirée")
    return r.json()  # contient "id" et "email"


# ----------------------------- OCR -----------------------------
def get_reader(lang: str):
    """EasyOCR : coréen et japonais ne se combinent pas entre eux, seulement avec l'anglais."""
    import easyocr
    if lang not in _readers:
        langs = {"ko": ["ko", "en"], "ja": ["ja", "en"], "en": ["en"]}[lang]
        log.info("Chargement du modèle OCR %s", langs)
        _readers[lang] = easyocr.Reader(langs, gpu=False)
    return _readers[lang]


def _rect(bbox):
    xs = [p[0] for p in bbox]
    ys = [p[1] for p in bbox]
    return [min(xs), min(ys), max(xs), max(ys)]


def _iou(a, b):
    ix = max(0, min(a[2], b[2]) - max(a[0], b[0]))
    iy = max(0, min(a[3], b[3]) - max(a[1], b[1]))
    inter = ix * iy
    union = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / union if union > 0 else 0


def run_ocr(img, source_lang: str):
    langs = ["ko", "ja"] if source_lang == "auto" else [source_lang if source_lang in ("ko", "ja", "en") else "en"]
    found = []
    for lg in langs:
        for bbox, text, prob in get_reader(lg).readtext(img):
            text = text.strip()
            if prob >= 0.35 and text:
                found.append({"rect": _rect(bbox), "text": text, "prob": prob})
    # dédoublonnage (mode auto : deux lecteurs)
    found.sort(key=lambda d: -d["prob"])
    kept = []
    for d in found:
        if all(_iou(d["rect"], k["rect"]) < 0.3 for k in kept):
            kept.append(d)
    return kept


def run_ocr_tiled(img, source_lang: str):
    """Longues bandes webtoon : OCR par tranches qui se chevauchent, puis fusion."""
    h, w = img.shape[:2]
    tile_h = max(1800, w * 2)
    if h <= tile_h * 1.2:
        return run_ocr(img, source_lang)
    overlap = 250
    found = []
    y = 0
    while y < h:
        y1 = min(h, y + tile_h)
        for d in run_ocr(img[y:y1], source_lang):
            r = d["rect"]
            d["rect"] = [r[0], r[1] + y, r[2], r[3] + y]
            found.append(d)
        if y1 >= h:
            break
        y = y1 - overlap
    found.sort(key=lambda d: -d["prob"])
    kept = []
    for d in found:
        if all(_iou(d["rect"], k["rect"]) < 0.3 for k in kept):
            kept.append(d)
    return kept


def group_into_bubbles(lines):
    """Fusionne les lignes de texte proches en bulles (un texte = une bulle)."""
    n = len(lines)
    parent = list(range(n))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for i in range(n):
        for j in range(i + 1, n):
            a, b = lines[i]["rect"], lines[j]["rect"]
            ha, hb = a[3] - a[1], b[3] - b[1]
            pad = 0.7 * max(ha, hb)
            if (a[0] - pad < b[2] and b[0] - pad < a[2] and a[1] - pad < b[3] and b[1] - pad < a[3]):
                parent[find(i)] = find(j)

    groups = {}
    for i in range(n):
        groups.setdefault(find(i), []).append(lines[i])

    bubbles = []
    for g in groups.values():
        g.sort(key=lambda d: (round(d["rect"][1] / 20), d["rect"][0]))
        bubbles.append({
            "rect": [min(d["rect"][0] for d in g), min(d["rect"][1] for d in g),
                     max(d["rect"][2] for d in g), max(d["rect"][3] for d in g)],
            "text": " ".join(d["text"] for d in g),
            "lines": [d["rect"] for d in g],
        })
    bubbles.sort(key=lambda b: (b["rect"][1], b["rect"][0]))
    return bubbles


def process_image(contents: bytes, source_lang: str):
    arr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("image illisible")
    h, w = img.shape[:2]
    scale = min(1.0, MAX_IMAGE_WIDTH / w, MAX_IMAGE_HEIGHT / h)
    if scale < 1.0:
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
        h, w = img.shape[:2]

    bubbles = group_into_bubbles(run_ocr_tiled(img, source_lang))

    mask = np.zeros((h, w), dtype=np.uint8)
    for b in bubbles:
        for x0, y0, x1, y1 in b["lines"]:
            cv2.rectangle(mask, (int(x0) - 3, int(y0) - 3), (int(x1) + 3, int(y1) + 3), 255, -1)
    cleaned = cv2.inpaint(img, mask, 3, cv2.INPAINT_TELEA) if bubbles else img

    ok, buf = cv2.imencode(".jpg", cleaned, [cv2.IMWRITE_JPEG_QUALITY, 88])
    if not ok:
        raise ValueError("encodage impossible")
    return buf.tobytes(), bubbles, w, h


# ----------------------------- Traduction (LLM) -----------------------------
LANG_NAMES = {"fr": "français", "en": "anglais", "es": "espagnol", "de": "allemand", "it": "italien", "pt": "portugais"}


async def translate_texts(texts, glossary, characters, target_lang):
    if not texts:
        return []
    if not openai_client:
        raise HTTPException(503, "Service de traduction non configuré")
    target = LANG_NAMES.get(target_lang, target_lang)
    system = (
        f"Tu es traducteur professionnel de manga/webtoon. Traduis chaque réplique en {target}, "
        "naturel, concis (ça doit tenir dans une bulle), en respectant le ton. "
        "Respecte STRICTEMENT le glossaire et les noms de personnages fournis. "
        'Réponds uniquement en JSON : {"translations": ["...", ...]} avec exactement autant d\'éléments que d\'entrées, dans le même ordre.'
    )
    user = json.dumps({"glossaire": glossary, "personnages": characters, "repliques": texts}, ensure_ascii=False)
    try:
        resp = await openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            response_format={"type": "json_object"},
            temperature=0.3,
        )
        out = json.loads(resp.choices[0].message.content)["translations"]
        if len(out) != len(texts):
            raise ValueError("nombre de traductions incorrect")
        return [str(t) for t in out]
    except HTTPException:
        raise
    except Exception as e:
        log.exception("Échec traduction LLM")
        raise HTTPException(502, "La traduction a échoué, réessaie") from e


def _safe_json(s: str):
    try:
        return json.loads(s)
    except Exception:
        return {}


# ----------------------------- Chapitres -----------------------------
class StartChapter(BaseModel):
    series_id: str
    title: str
    chapter_number: Optional[str] = None


@app.post("/api/chapters/start")
async def start_chapter(body: StartChapter, user=Depends(current_user)):
    """Vérifie la série, débite 10 pièces (sauf abonné) et crée le chapitre."""
    uid = user["id"]
    series = await sb_select("series", {"id": f"eq.{body.series_id}", "user_id": f"eq.{uid}", "select": "id"})
    if not series:
        raise HTTPException(404, "Série introuvable")

    balance = await sb_rpc("spend_coins", {"p_user": uid, "p_amount": CHAPTER_COST,
                                           "p_reason": f"Traduction : {body.title}"[:120]})
    if balance == -1:
        raise HTTPException(402, f"Pièces insuffisantes ({CHAPTER_COST} requises)")

    num = body.chapter_number or "".join(c for c in body.title if c.isdigit()) or "1"
    chapter = (await sb_insert("chapters", {
        "series_id": body.series_id, "user_id": uid, "title": body.title[:200],
        "chapter_number": num, "status": "processing",
    }))[0]
    return {"chapter_id": chapter["id"], "balance": balance}


@app.post("/api/chapters/{chapter_id}/pages")
async def translate_page(
    chapter_id: str,
    file: UploadFile = File(...),
    page_index: int = Form(...),
    source_lang: str = Form("auto"),
    target_lang: str = Form("fr"),
    glossary: str = Form("[]"),
    characters: str = Form("[]"),
    original_path: str = Form(""),
    user=Depends(current_user),
):
    uid = user["id"]
    if original_path and not original_path.startswith(f"{uid}/"):
        raise HTTPException(400, "Chemin invalide")
    if not 0 <= page_index < MAX_PAGES_PER_CHAPTER:
        raise HTTPException(400, f"Maximum {MAX_PAGES_PER_CHAPTER} pages par chapitre")

    rows = await sb_select("chapters", {"id": f"eq.{chapter_id}", "user_id": f"eq.{uid}", "select": "id,status"})
    if not rows or rows[0]["status"] != "processing":
        raise HTTPException(404, "Chapitre introuvable ou déjà terminé")

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Image trop lourde (15 Mo max)")

    try:
        async with ocr_lock:
            cleaned_bytes, bubbles, w, h = await run_in_threadpool(process_image, contents, source_lang)
    except ValueError as e:
        raise HTTPException(400, f"Image invalide : {e}") from e

    translations = await translate_texts([b["text"] for b in bubbles],
                                         _safe_json(glossary), _safe_json(characters), target_lang)

    out_bubbles = []
    for b, tr in zip(bubbles, translations):
        x0, y0, x1, y1 = b["rect"]
        bh = y1 - y0
        out_bubbles.append({
            "id": f"b_{uuid.uuid4().hex[:8]}",
            "top": round(y0 / h * 100, 2), "left": round(x0 / w * 100, 2),
            "width": round((x1 - x0) / w * 100, 2), "height": round(bh / h * 100, 2),
            "text": tr, "originalText": b["text"],
            "fontSize": int(max(10, min(28, bh * 0.32 * (800 / w)))),
        })

    path = f"{uid}/{chapter_id}/page_{page_index}_cleaned.jpg"
    cleaned_url = await sb_upload("chapter-pages", path, cleaned_bytes, "image/jpeg")
    await sb_insert("chapter_pages", {
        "chapter_id": chapter_id, "user_id": uid, "page_index": page_index,
        "original_path": original_path or None, "cleaned_path": path, "bubbles": out_bubbles,
    }, upsert_on="chapter_id,page_index")

    return {"page_index": page_index, "cleaned_url": cleaned_url, "bubbles": out_bubbles}


class FinishChapter(BaseModel):
    pages_count: int


@app.post("/api/chapters/{chapter_id}/complete")
async def complete_chapter(chapter_id: str, body: FinishChapter, user=Depends(current_user)):
    uid = user["id"]
    rows = await sb_select("chapters", {"id": f"eq.{chapter_id}", "user_id": f"eq.{uid}", "select": "id,status"})
    if not rows or rows[0]["status"] != "processing":
        raise HTTPException(404, "Chapitre introuvable")
    done = await sb_select("chapter_pages", {"chapter_id": f"eq.{chapter_id}", "select": "id"})
    if not done:
        # aucune page traduite : on rembourse
        await sb_patch("chapters", {"id": chapter_id}, {"status": "failed"})
        await sb_rpc("credit_coins", {"p_user": uid, "p_amount": CHAPTER_COST,
                                      "p_reason": "Remboursement : traduction échouée", "p_event": None})
        return {"status": "failed", "refunded": True}
    await sb_patch("chapters", {"id": chapter_id}, {"status": "completed", "pages_count": len(done)})
    return {"status": "completed", "pages_count": len(done)}


# ----------------------------- Stripe -----------------------------
class CheckoutBody(BaseModel):
    product: str  # pack_150 | pack_300 | pack_1000 | subscription


@app.post("/api/checkout")
async def create_checkout(body: CheckoutBody, user=Depends(current_user)):
    uid = user["id"]
    meta = {"user_id": uid, "product": body.product}
    common = dict(
        client_reference_id=uid,
        customer_email=user.get("email"),
        success_url=f"{FRONTEND_URL}/?checkout=success",
        cancel_url=f"{FRONTEND_URL}/?checkout=cancel",
        metadata=meta,
    )
    if body.product == "subscription":
        session = await run_in_threadpool(lambda: stripe.checkout.Session.create(
            mode="subscription",
            line_items=[{"quantity": 1, "price_data": {
                "currency": "eur", "unit_amount": SUBSCRIPTION_CENTS,
                "recurring": {"interval": "month"},
                "product_data": {"name": "Uni Trad — Pass Illimité"}}}],
            subscription_data={"metadata": meta},
            **common))
    elif body.product in PRODUCTS:
        p = PRODUCTS[body.product]
        session = await run_in_threadpool(lambda: stripe.checkout.Session.create(
            mode="payment",
            line_items=[{"quantity": 1, "price_data": {
                "currency": "eur", "unit_amount": p["cents"], "product_data": {"name": p["name"]}}}],
            **common))
    else:
        raise HTTPException(400, "Produit inconnu")
    return {"url": session.url}


@app.post("/api/billing-portal")
async def billing_portal(user=Depends(current_user)):
    rows = await sb_select("profiles", {"id": f"eq.{user['id']}", "select": "stripe_customer_id"})
    cust = rows[0].get("stripe_customer_id") if rows else None
    if not cust:
        raise HTTPException(404, "Aucun abonnement actif")
    session = await run_in_threadpool(lambda: stripe.billing_portal.Session.create(
        customer=cust, return_url=f"{FRONTEND_URL}/"))
    return {"url": session.url}


@app.post("/api/stripe/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(default="")):
    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(payload, stripe_signature, STRIPE_WEBHOOK_SECRET)
    except Exception:
        raise HTTPException(400, "Signature invalide")

    obj = event["data"]["object"]
    etype = event["type"]

    if etype == "checkout.session.completed":
        meta = obj.get("metadata") or {}
        uid, product = meta.get("user_id"), meta.get("product")
        if uid and obj.get("payment_status") == "paid":
            if product in PRODUCTS:
                p = PRODUCTS[product]
                await sb_rpc("credit_coins", {"p_user": uid, "p_amount": p["coins"],
                                              "p_reason": f"Achat {p['name']}", "p_event": event["id"]})
            elif product == "subscription":
                await sb_patch("profiles", {"id": uid},
                               {"is_subscribed": True, "stripe_customer_id": obj.get("customer")})

    elif etype == "customer.subscription.deleted":
        cust = obj.get("customer")
        if cust:
            await sb_patch("profiles", {"stripe_customer_id": cust}, {"is_subscribed": False})

    return {"received": True}
