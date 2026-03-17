#!/usr/bin/env bash
set -u

BASE="${BASE:-http://localhost:8000/api/v1}"
TS=$(date +%s)
PASSWD='Pass@123'
R_EMAIL="reseller.e2e.${TS}@example.com"
S_EMAIL="supplier.e2e.${TS}@example.com"

PASS_COUNT=0
FAIL_COUNT=0

check() {
  local name="$1" expected="$2" got="$3"
  if [[ "$expected" == "$got" ]]; then
    echo "✅ $name ($got)"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "❌ $name expected=$expected got=$got"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

IMG_FILE="/tmp/source_req_${TS}.jpg"
echo 'dummy-image-content' > "$IMG_FILE"

# 1) Reseller signup + login
R_SIGNUP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"Reseller ${TS}\",\"email\":\"$R_EMAIL\",\"password\":\"$PASSWD\",\"role\":\"RESELLER\"}")
check 'Reseller signup' '201' "$(echo "$R_SIGNUP" | tail -n1)"

R_LOGIN_BODY=$(curl -s -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$R_EMAIL\",\"password\":\"$PASSWD\"}")
R_TOKEN=$(echo "$R_LOGIN_BODY" | jq -r '.token // empty')
if [[ -n "$R_TOKEN" && "$R_TOKEN" != "null" ]]; then
  echo '✅ Reseller login token'
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo '❌ Reseller login token missing'
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# 2) Submit via image URL only
SUBMIT_URL=$(curl -s -w "\n%{http_code}" -X POST "$BASE/dropshipper/source-requests" \
  -H "Authorization: Bearer $R_TOKEN" \
  -F 'productName=Bluetooth Speaker' \
  -F 'productCategory=Electronics' \
  -F 'productImageUrl=https://example.com/img/speaker.jpg' \
  -F 'expectedPrice=1499.00')
SUBMIT_URL_BODY=$(echo "$SUBMIT_URL" | head -n -1)
SUBMIT_URL_CODE=$(echo "$SUBMIT_URL" | tail -n1)
check 'Submit via image URL' '201' "$SUBMIT_URL_CODE"
REQ_ID_URL=$(echo "$SUBMIT_URL_BODY" | jq -r '.data.requestId // empty')
STATUS_URL=$(echo "$SUBMIT_URL_BODY" | jq -r '.data.status // empty')
IMG_URL_VAL=$(echo "$SUBMIT_URL_BODY" | jq -r '.data.productImageUrl // empty')
[[ -n "$REQ_ID_URL" ]] && echo '✅ URL mode requestId exists' && PASS_COUNT=$((PASS_COUNT+1)) || { echo '❌ URL mode requestId missing'; FAIL_COUNT=$((FAIL_COUNT+1)); }
[[ "$STATUS_URL" == 'IN_REVIEW' ]] && echo '✅ URL mode status IN_REVIEW' && PASS_COUNT=$((PASS_COUNT+1)) || { echo "❌ URL mode status unexpected: $STATUS_URL"; FAIL_COUNT=$((FAIL_COUNT+1)); }
[[ "$IMG_URL_VAL" == 'https://example.com/img/speaker.jpg' ]] && echo '✅ URL mode image value stored' && PASS_COUNT=$((PASS_COUNT+1)) || { echo "❌ URL mode image mismatch: $IMG_URL_VAL"; FAIL_COUNT=$((FAIL_COUNT+1)); }

# 3) Submit via file upload only
SUBMIT_FILE=$(curl -s -w "\n%{http_code}" -X POST "$BASE/dropshipper/source-requests" \
  -H "Authorization: Bearer $R_TOKEN" \
  -F 'productName=Office Chair' \
  -F 'productCategory=Furniture' \
  -F "productImage=@$IMG_FILE" \
  -F 'expectedPrice=3999.00')
SUBMIT_FILE_BODY=$(echo "$SUBMIT_FILE" | head -n -1)
SUBMIT_FILE_CODE=$(echo "$SUBMIT_FILE" | tail -n1)
check 'Submit via file upload' '201' "$SUBMIT_FILE_CODE"
REQ_ID_FILE=$(echo "$SUBMIT_FILE_BODY" | jq -r '.data.requestId // empty')
IMG_FILE_VAL=$(echo "$SUBMIT_FILE_BODY" | jq -r '.data.productImageUrl // empty')
[[ -n "$REQ_ID_FILE" ]] && echo '✅ File mode requestId exists' && PASS_COUNT=$((PASS_COUNT+1)) || { echo '❌ File mode requestId missing'; FAIL_COUNT=$((FAIL_COUNT+1)); }
echo "$IMG_FILE_VAL" | grep -Eq '^http://localhost:8000/uploads/images/' && { echo '✅ File mode stored uploaded image URL'; PASS_COUNT=$((PASS_COUNT+1)); } || { echo "❌ File mode image URL invalid: $IMG_FILE_VAL"; FAIL_COUNT=$((FAIL_COUNT+1)); }

# 4) Validation checks
SUBMIT_BOTH=$(curl -s -w "\n%{http_code}" -X POST "$BASE/dropshipper/source-requests" \
  -H "Authorization: Bearer $R_TOKEN" \
  -F 'productName=Conflict Item' \
  -F 'productCategory=Electronics' \
  -F 'productImageUrl=https://example.com/img/conflict.jpg' \
  -F "productImage=@$IMG_FILE" \
  -F 'expectedPrice=999.00')
check 'Submit with both file+url blocked' '400' "$(echo "$SUBMIT_BOTH" | tail -n1)"

SUBMIT_NONE=$(curl -s -w "\n%{http_code}" -X POST "$BASE/dropshipper/source-requests" \
  -H "Authorization: Bearer $R_TOKEN" \
  -F 'productName=Invalid Item' \
  -F 'productCategory=Electronics' \
  -F 'expectedPrice=999.00')
check 'Submit without file/url blocked' '400' "$(echo "$SUBMIT_NONE" | tail -n1)"

# 5) Supplier signup/login
S_SIGNUP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"Supplier ${TS}\",\"email\":\"$S_EMAIL\",\"password\":\"$PASSWD\",\"role\":\"SUPPLIER\",\"otpVerified\":true}")
check 'Supplier signup' '201' "$(echo "$S_SIGNUP" | tail -n1)"

S_LOGIN_BODY=$(curl -s -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$S_EMAIL\",\"password\":\"$PASSWD\"}")
S_TOKEN=$(echo "$S_LOGIN_BODY" | jq -r '.token // empty')
if [[ -n "$S_TOKEN" && "$S_TOKEN" != "null" ]]; then
  echo '✅ Supplier login token'
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo '❌ Supplier login token missing'
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# 6) Supplier fetch
FETCH=$(curl -s -w "\n%{http_code}" -X GET "$BASE/suppliers/source-requests/submitted" \
  -H "Authorization: Bearer $S_TOKEN")
FETCH_BODY=$(echo "$FETCH" | head -n -1)
FETCH_CODE=$(echo "$FETCH" | tail -n1)
check 'Supplier fetch submitted requests' '200' "$FETCH_CODE"

echo "$FETCH_BODY" | jq -e '.data.requests[0] | has("dropshipper") | not' >/dev/null 2>&1 && {
  echo '✅ Supplier response excludes dropshipper user data'
  PASS_COUNT=$((PASS_COUNT + 1))
} || {
  echo '❌ Supplier response includes dropshipper user data'
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

echo "$FETCH_BODY" | jq -e --arg A "$REQ_ID_URL" --arg B "$REQ_ID_FILE" '[.data.requests[].requestId] | index($A) != null and index($B) != null' >/dev/null 2>&1 && {
  echo '✅ Supplier list contains both newly submitted requests'
  PASS_COUNT=$((PASS_COUNT + 1))
} || {
  echo '❌ Supplier list missing one/both newly submitted requests'
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

echo ""
echo "RESULT: PASS=$PASS_COUNT FAIL=$FAIL_COUNT"
if [[ $FAIL_COUNT -gt 0 ]]; then
  exit 1
fi
