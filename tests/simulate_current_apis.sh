#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://localhost:8000/api/v1}"
TS=$(date +%s)
PASS='Pass@123'
R_EMAIL="reseller.sim.${TS}@example.com"
S_EMAIL="supplier.sim.${TS}@example.com"
IMG_FILE="/tmp/source_sim_${TS}.jpg"
echo 'dummy-image-content' > "$IMG_FILE"

print_result() {
  local title="$1"
  local response="$2"
  local body code
  body=$(echo "$response" | head -n -1)
  code=$(echo "$response" | tail -n 1)

  echo "---- ${title} ----"
  echo "HTTP ${code}"
  echo "$body" | jq -c . 2>/dev/null || echo "$body"
  echo
}

# 1) Reseller signup
R_SIGNUP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"Reseller $TS\",\"email\":\"$R_EMAIL\",\"password\":\"$PASS\",\"role\":\"RESELLER\"}")
print_result "POST /auth/signup (RESELLER)" "$R_SIGNUP"

# 2) Reseller login
R_LOGIN=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$R_EMAIL\",\"password\":\"$PASS\"}")
print_result "POST /auth/login (RESELLER)" "$R_LOGIN"
R_TOKEN=$(echo "$R_LOGIN" | head -n -1 | jq -r '.token // empty')

# 3) Source request via image URL
SUBMIT_URL=$(curl -s -w "\n%{http_code}" -X POST "$BASE/dropshipper/source-requests" \
  -H "Authorization: Bearer $R_TOKEN" \
  -F 'productName=Bluetooth Speaker' \
  -F 'productCategory=Electronics' \
  -F 'productImageUrl=https://example.com/images/speaker.jpg' \
  -F 'expectedPrice=1499.00')
print_result "POST /dropshipper/source-requests (image URL)" "$SUBMIT_URL"

# 4) Source request via image upload
SUBMIT_FILE=$(curl -s -w "\n%{http_code}" -X POST "$BASE/dropshipper/source-requests" \
  -H "Authorization: Bearer $R_TOKEN" \
  -F 'productName=Office Chair' \
  -F 'productCategory=Furniture' \
  -F "productImage=@$IMG_FILE" \
  -F 'expectedPrice=3999.00')
print_result "POST /dropshipper/source-requests (image upload)" "$SUBMIT_FILE"

# 5) Validation: both provided
SUBMIT_BOTH=$(curl -s -w "\n%{http_code}" -X POST "$BASE/dropshipper/source-requests" \
  -H "Authorization: Bearer $R_TOKEN" \
  -F 'productName=Conflict Item' \
  -F 'productCategory=Electronics' \
  -F 'productImageUrl=https://example.com/images/conflict.jpg' \
  -F "productImage=@$IMG_FILE" \
  -F 'expectedPrice=999.00')
print_result "POST /dropshipper/source-requests (both file+url)" "$SUBMIT_BOTH"

# 6) Validation: none provided
SUBMIT_NONE=$(curl -s -w "\n%{http_code}" -X POST "$BASE/dropshipper/source-requests" \
  -H "Authorization: Bearer $R_TOKEN" \
  -F 'productName=Invalid Item' \
  -F 'productCategory=Electronics' \
  -F 'expectedPrice=999.00')
print_result "POST /dropshipper/source-requests (none file/url)" "$SUBMIT_NONE"

# 7) Supplier signup
S_SIGNUP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"Supplier $TS\",\"email\":\"$S_EMAIL\",\"password\":\"$PASS\",\"role\":\"SUPPLIER\",\"otpVerified\":true}")
print_result "POST /auth/signup (SUPPLIER)" "$S_SIGNUP"

# 8) Supplier login
S_LOGIN=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$S_EMAIL\",\"password\":\"$PASS\"}")
print_result "POST /auth/login (SUPPLIER)" "$S_LOGIN"
S_TOKEN=$(echo "$S_LOGIN" | head -n -1 | jq -r '.token // empty')

# 9) Supplier fetch submitted requests
FETCH=$(curl -s -w "\n%{http_code}" -X GET "$BASE/suppliers/source-requests/submitted" \
  -H "Authorization: Bearer $S_TOKEN")
print_result "GET /suppliers/source-requests/submitted" "$FETCH"
