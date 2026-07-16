#!/bin/bash
# ============================================================
#   WORKOUT COMPANION AI — Avvio in locale (Mac / Linux)
#   Uso: doppio click, oppure da Terminale:  bash avvia-mac.sh
# ============================================================
set -e
DIR="$HOME/workout-companion-ai-app"

echo "============================================================"
echo "  WORKOUT COMPANION AI — Avvio in locale"
echo "============================================================"

# --- 1. Controlli ---
command -v git >/dev/null || { echo "[X] Git non trovato: installa Xcode Command Line Tools (esegui: xcode-select --install)"; exit 1; }
command -v node >/dev/null || { echo "[X] Node.js non trovato: scarica la versione LTS da https://nodejs.org"; exit 1; }
echo "[OK] Git e Node.js trovati."

# --- 2. Scarica o aggiorna il progetto ---
if [ ! -d "$DIR" ]; then
  echo "[..] Scarico il progetto da GitHub (potrebbe chiederti il login GitHub)..."
  git clone -b claude/workout-companion-ai-4j9xa8 https://github.com/stucchiluca4/claude-test.git "$DIR"
else
  echo "[..] Aggiorno il progetto all'ultima versione..."
  git -C "$DIR" pull
fi
cd "$DIR/workout-companion-ai"

# --- 3. Chiavi Supabase (solo la prima volta) ---
if [ ! -f "apps/web/.env.local" ]; then
  echo ""
  echo "  Servono le 2 chiavi di Supabase (Project Settings → API):"
  read -r -p "  Incolla il Project URL (https://....supabase.co): " SURL
  read -r -p "  Incolla la chiave anon public: " SKEY
  cat > apps/web/.env.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=$SURL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SKEY
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
  echo "[OK] Chiavi salvate in apps/web/.env.local"
fi

# --- 4. Dipendenze ---
echo "[..] Installo le dipendenze (la prima volta serve qualche minuto)..."
npm install --no-audit --no-fund

# --- 5. Avvio ---
echo ""
echo "[OK] Avvio il sito su http://localhost:3000 — lascia aperta questa finestra (CTRL+C per fermare)."
( sleep 6 && (open http://localhost:3000 2>/dev/null || xdg-open http://localhost:3000 2>/dev/null) ) &
npm run dev:web
