#!/bin/bash
COUNTER_FILE=".claude/.build-retry-count"
MAX_RETRIES=6

# Se não há mudança pendente em src/, não precisa verificar nada
if git diff --quiet HEAD -- src/ 2>/dev/null && \
   git diff --cached --quiet HEAD -- src/ 2>/dev/null; then
  rm -f "$COUNTER_FILE"
  exit 0
fi

OUTPUT=$(npm run build 2>&1)

if [ $? -eq 0 ]; then
  rm -f "$COUNTER_FILE"
  exit 0
fi

COUNT=$(cat "$COUNTER_FILE" 2>/dev/null || echo 0)
COUNT=$((COUNT + 1))
echo "$COUNT" > "$COUNTER_FILE"

if [ "$COUNT" -ge "$MAX_RETRIES" ]; then
  echo "Build falhou após $MAX_RETRIES tentativas. Parando o loop — revise manualmente:" >&2
  echo "$OUTPUT" | tail -60 >&2
  rm -f "$COUNTER_FILE"
  exit 0
fi

echo "Tentativa $COUNT/$MAX_RETRIES — build falhou. Pense na causa raiz, corrija e tente de novo:" >&2
echo "$OUTPUT" | tail -60 >&2
exit 2
