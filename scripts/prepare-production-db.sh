#!/usr/bin/env bash
# =============================================================================
# Prod-in-Time — Préparation d'une base de données VIERGE pour l'auto-hébergement
# =============================================================================
#
# Pourquoi ce script ?
#   Sur la plateforme Lovable, l'historique des fichiers de migration déjà
#   appliqués est immuable (lecture seule). Deux migrations historiques
#   contiennent des données de test mélangées au schéma :
#     - 20260320031539_*.sql  -> 100% données de test (rôles figés, PDR, plans)
#     - 20260316183840_*.sql  -> bloc "Équipes A/B/C/D" (données métier)
#
#   Ce script produit une COPIE PROPRE des migrations (schéma uniquement),
#   prête à être déployée sur votre instance Supabase auto-hébergée pour
#   obtenir une usine 100% vide. Le `seed.sql` n'est volontairement pas copié.
#
# Usage :
#   ./scripts/prepare-production-db.sh [dossier_sortie]
#   (défaut : ./dist/supabase)
#
# Déploiement ensuite (sur votre serveur Ubuntu, projet Supabase lié) :
#   cp -r dist/supabase/migrations supabase/migrations
#   supabase db push          # applique UNIQUEMENT le schéma -> base vierge
# =============================================================================
set -euo pipefail

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/supabase/migrations"
OUT_DIR="${1:-$(pwd)/dist/supabase}"
OUT_MIG="$OUT_DIR/migrations"

# Fichiers à neutraliser (données de test)
FULL_MOCK_GLOB="20260320031539_*.sql"
TEAMS_GLOB="20260316183840_*.sql"

echo "→ Source     : $SRC_DIR"
echo "→ Destination: $OUT_MIG"

rm -rf "$OUT_MIG"
mkdir -p "$OUT_MIG"
cp "$SRC_DIR"/*.sql "$OUT_MIG"/

# 1) Migration 100% mock -> no-op
for f in "$OUT_MIG"/$FULL_MOCK_GLOB; do
  [ -e "$f" ] || continue
  cat > "$f" <<'SQL'
-- Données de test retirées pour la production (déplacées dans supabase/seed.sql).
-- Migration laissée vide (no-op) pour préserver l'historique.
SELECT 1;
SQL
  echo "✓ Neutralisé (mock complet): $(basename "$f")"
done

# 2) Suppression du bloc d'insertion des équipes (shift_teams)
for f in "$OUT_MIG"/$TEAMS_GLOB; do
  [ -e "$f" ] || continue
  python3 - "$f" <<'PY'
import re, sys
p = sys.argv[1]
s = open(p, encoding="utf-8").read()
# Retire le bloc INSERT INTO public.shift_teams (...) VALUES ... ; (équipes de test)
s = re.sub(
    r"INSERT INTO public\.shift_teams[^;]*;",
    "-- (Équipes de démonstration retirées pour la production — voir supabase/seed.sql)",
    s,
    flags=re.IGNORECASE | re.DOTALL,
)
open(p, "w", encoding="utf-8").write(s)
PY
  echo "✓ Nettoyé (équipes de test): $(basename "$f")"
done

# 3) Vérification : aucune donnée de test résiduelle évidente
echo ""
echo "→ Vérification des UUID de test résiduels..."
if grep -RInE "61d5a0dd-40d9-41f5-aa30-3346ab8eec67|a0000001-0000-0000|d1000000-0000-0000" "$OUT_MIG" >/dev/null; then
  echo "⚠️  Des UUID de test subsistent — vérifiez manuellement :"
  grep -RInE "61d5a0dd-40d9-41f5-aa30-3346ab8eec67|a0000001-0000-0000|d1000000-0000-0000" "$OUT_MIG" || true
  exit 1
fi

echo "✓ Aucune donnée de test résiduelle."
echo ""
echo "Migrations propres générées dans : $OUT_MIG"
echo "Le fichier seed.sql n'a PAS été copié (base vierge garantie)."
