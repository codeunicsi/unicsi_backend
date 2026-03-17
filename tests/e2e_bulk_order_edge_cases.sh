#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE_URL:-http://localhost:8000/api/v1}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@unicsi.com}"
ADMIN_PASS="${ADMIN_PASS:-Admin@1234}"
MOQ="${MOQ:-10}"
TS=$(date +%s)

SUPPLIER_EMAIL="edge_supplier_${TS}@test.com"
SUPPLIER_PASS="Supplier@9999"
RESELLER_EMAIL="edge_reseller_${TS}@test.com"
RESELLER_PASS="Reseller@9999"
RESELLER2_EMAIL="edge_reseller2_${TS}@test.com"
RESELLER2_PASS="Reseller@9999"
CUSTOMER_EMAIL="edge_customer_${TS}@test.com"
CUSTOMER_PASS="Customer@9999"

PASS=0; FAIL=0
SEPARATOR="────────────────────────────────────────────────────────"

check() {
  local label="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    echo "  ✅  $label  (HTTP $actual)"
    PASS=$((PASS + 1))
  else
    echo "  ❌  $label  (expected HTTP $expected, got HTTP $actual)"
    FAIL=$((FAIL + 1))
  fi
}

jq_field() { echo "$1" | jq -r "$2" 2>/dev/null || echo ""; }

echo ""
echo "$SEPARATOR"
echo "  🧪  UNICSI Bulk Order Edge Cases  –  $(date)"
echo "  Base: $BASE"
echo "$SEPARATOR"

# 1) Admin login (fallback signup)
echo ""
echo "[ Edge 1 ] Admin Login"
RESP=$(curl -s -w "\n%{http_code}" -X POST "${BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASS}\"}")
BODY=$(echo "$RESP" | head -n -1); HTTP=$(echo "$RESP" | tail -1)
if [[ "$HTTP" != "200" ]]; then
  ADMIN_EMAIL="edge_admin_${TS}@test.com"
  ADMIN_PASS="Admin@9999"
  SIGNUP_RESP=$(curl -s -w "\n%{http_code}" -X POST "${BASE}/auth/signup" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"Edge Admin ${TS}\",\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASS}\",\"role\":\"ADMIN\"}")
  check "Admin signup fallback" "201" "$(echo "$SIGNUP_RESP" | tail -1)"

  RESP=$(curl -s -w "\n%{http_code}" -X POST "${BASE}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASS}\"}")
  BODY=$(echo "$RESP" | head -n -1); HTTP=$(echo "$RESP" | tail -1)
fi
check "Admin login" "200" "$HTTP"

curl -sc /tmp/e2e_edge_admin_cookies.txt -X POST "${BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASS}\"}" > /dev/null 2>&1 || true

# 2) Upsert config
echo ""
echo "[ Edge 2 ] Upsert Bulk Config"
RESP=$(curl -sb /tmp/e2e_edge_admin_cookies.txt -w "\n%{http_code}" \
  -X PUT "${BASE}/admin/config/bulk-order" \
  -H "Content-Type: application/json" \
  -d "{
    \"minOrderQty\": ${MOQ},
    \"supplierBulkPriceRefreshDays\": 20,
    \"defaultGstRate\": 0.18,
    \"defaultShippingCharge\": 0,
    \"defaultMarginPerPiece\": 500,
    \"allowRoles\": [\"CUSTOMER\", \"RESELLER\"],
    \"statusFlow\": {
      \"pendingPayment\": \"Pending Payment\",
      \"confirmed\": \"Confirmed\",
      \"shipped\": \"Shipped\",
      \"delivered\": \"Delivered\"
    },
    \"paymentAccount\": {
      \"accountHolderName\": \"UNICSI Technologies Pvt Ltd\",
      \"accountNumber\": \"123456789012\",
      \"ifscCode\": \"HDFC0001234\",
      \"bankName\": \"HDFC Bank\",
      \"branchName\": \"Bengaluru Main\",
      \"upiId\": \"unicsi@testupi\"
    },
    \"settlement\": { \"cycle\": \"weekly\", \"dayOfWeek\": 1 }
  }")
check "Admin upsert config" "200" "$(echo "$RESP" | tail -1)"

# 3) Supplier + product
echo ""
echo "[ Edge 3 ] Supplier setup"
RESP=$(curl -s -w "\n%{http_code}" -X POST "${BASE}/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Edge Supplier ${TS}\",\"email\":\"${SUPPLIER_EMAIL}\",\"password\":\"${SUPPLIER_PASS}\",\"role\":\"SUPPLIER\",\"otpVerified\":true}")
check "Supplier signup" "201" "$(echo "$RESP" | tail -1)"

curl -sc /tmp/e2e_edge_supplier_cookies.txt -X POST "${BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${SUPPLIER_EMAIL}\",\"password\":\"${SUPPLIER_PASS}\"}" > /dev/null

VARIANTS='[{"size":"M","color":"Black","sku":"EDGE-SKU-'"${TS}"'","variant_stock":100,"price":499}]'
RESP=$(curl -sb /tmp/e2e_edge_supplier_cookies.txt -w "\n%{http_code}" \
  -X POST "${BASE}/suppliers/stores/products" \
  -F "title=Edge Product ${TS}" \
  -F "description=Edge test product" \
  -F "brand=Edge Brand" \
  -F "approval_status=submitted" \
  -F "bulk_price=2500.00" \
  -F "mrp=3500.00" \
  -F "transfer_price=2000.00" \
  -F "variants=${VARIANTS}")
BODY=$(echo "$RESP" | head -n -1); HTTP=$(echo "$RESP" | tail -1)
check "Supplier create product" "200" "$HTTP"
PRODUCT_ID=$(jq_field "$BODY" '.data.product_id')

# 4) Reseller 1 + order creation
echo ""
echo "[ Edge 4 ] Reseller setup + base order"
curl -s -X POST "${BASE}/auth/signup" -H "Content-Type: application/json" \
  -d "{\"name\":\"Edge Reseller ${TS}\",\"email\":\"${RESELLER_EMAIL}\",\"password\":\"${RESELLER_PASS}\",\"role\":\"RESELLER\"}" > /dev/null
curl -sc /tmp/e2e_edge_reseller_cookies.txt -X POST "${BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${RESELLER_EMAIL}\",\"password\":\"${RESELLER_PASS}\"}" > /dev/null

RESP=$(curl -sb /tmp/e2e_edge_reseller_cookies.txt -w "\n%{http_code}" \
  -X POST "${BASE}/dropshipper/bulk/orders" \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"${PRODUCT_ID}\",
    \"quantity\": ${MOQ},
    \"ssnCode\": \"EDGE-SSN\",
    \"serviceAccountingCode\": \"EDGE-SAC\",
    \"userBusinessDetails\": { \"businessName\": \"Edge Biz Pvt Ltd\" }
  }")
BODY=$(echo "$RESP" | head -n -1); HTTP=$(echo "$RESP" | tail -1)
check "Create base bulk order" "201" "$HTTP"
ORDER_ID=$(jq_field "$BODY" '.data.orderId')

# 5) MOQ edge case
echo ""
echo "[ Edge 5 ] MOQ enforcement"
LOW_QTY=$((MOQ - 1))
if [[ "$LOW_QTY" -lt 1 ]]; then LOW_QTY=1; fi
RESP=$(curl -sb /tmp/e2e_edge_reseller_cookies.txt -w "\n%{http_code}" \
  -X POST "${BASE}/dropshipper/bulk/orders" \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"${PRODUCT_ID}\",
    \"quantity\": ${LOW_QTY},
    \"ssnCode\": \"LOW-SSN\",
    \"serviceAccountingCode\": \"LOW-SAC\",
    \"userBusinessDetails\": { \"businessName\": \"Edge Biz Pvt Ltd\" }
  }")
check "Reject order below MOQ" "400" "$(echo "$RESP" | tail -1)"

# 6) Missing screenshot edge case
echo ""
echo "[ Edge 6 ] Payment proof requires screenshot"
RESP=$(curl -sb /tmp/e2e_edge_reseller_cookies.txt -w "\n%{http_code}" \
  -X POST "${BASE}/dropshipper/bulk/orders/${ORDER_ID}/payment-proof" \
  -F "transactionReference=EDGE-NO-SHOT-${TS}" \
  -F "paymentMode=upi")
check "Reject payment proof without screenshot" "400" "$(echo "$RESP" | tail -1)"

# 7) Invalid payment mode edge case
echo ""
echo "[ Edge 7 ] Invalid payment mode blocked"
PROOF_FILE="/tmp/e2e_edge_payment_${TS}.jpg"
echo "edge payment proof" > "$PROOF_FILE"
RESP=$(curl -sb /tmp/e2e_edge_reseller_cookies.txt -w "\n%{http_code}" \
  -X POST "${BASE}/dropshipper/bulk/orders/${ORDER_ID}/payment-proof" \
  -F "transactionReference=EDGE-BAD-MODE-${TS}" \
  -F "paymentMode=cash" \
  -F "paymentScreenshot=@${PROOF_FILE}")
check "Reject invalid payment mode" "400" "$(echo "$RESP" | tail -1)"

# 8) Valid payment proof
echo ""
echo "[ Edge 8 ] Valid payment proof accepted"
RESP=$(curl -sb /tmp/e2e_edge_reseller_cookies.txt -w "\n%{http_code}" \
  -X POST "${BASE}/dropshipper/bulk/orders/${ORDER_ID}/payment-proof" \
  -F "transactionReference=EDGE-OK-${TS}" \
  -F "paymentMode=upi" \
  -F "paymentScreenshot=@${PROOF_FILE}")
check "Accept valid payment proof" "200" "$(echo "$RESP" | tail -1)"

# 9) Non-owner cannot submit proof
echo ""
echo "[ Edge 9 ] Non-owner payment proof blocked"
curl -s -X POST "${BASE}/auth/signup" -H "Content-Type: application/json" \
  -d "{\"name\":\"Edge Reseller2 ${TS}\",\"email\":\"${RESELLER2_EMAIL}\",\"password\":\"${RESELLER2_PASS}\",\"role\":\"RESELLER\"}" > /dev/null
curl -sc /tmp/e2e_edge_reseller2_cookies.txt -X POST "${BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${RESELLER2_EMAIL}\",\"password\":\"${RESELLER2_PASS}\"}" > /dev/null
RESP=$(curl -sb /tmp/e2e_edge_reseller2_cookies.txt -w "\n%{http_code}" \
  -X POST "${BASE}/dropshipper/bulk/orders/${ORDER_ID}/payment-proof" \
  -F "transactionReference=EDGE-OTHER-${TS}" \
  -F "paymentMode=upi" \
  -F "paymentScreenshot=@${PROOF_FILE}")
check "Block non-owner payment proof" "404" "$(echo "$RESP" | tail -1)"

# 10) Customer role restrictions and allow-list
echo ""
echo "[ Edge 10 ] Customer route access checks"
curl -s -X POST "${BASE}/auth/signup" -H "Content-Type: application/json" \
  -d "{\"name\":\"Edge Customer ${TS}\",\"email\":\"${CUSTOMER_EMAIL}\",\"password\":\"${CUSTOMER_PASS}\",\"role\":\"CUSTOMER\"}" > /dev/null
curl -sc /tmp/e2e_edge_customer_cookies.txt -X POST "${BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${CUSTOMER_EMAIL}\",\"password\":\"${CUSTOMER_PASS}\"}" > /dev/null

RESP=$(curl -sb /tmp/e2e_edge_customer_cookies.txt -w "\n%{http_code}" \
  -X GET "${BASE}/dropshipper/profile/personalDetails")
check "Customer blocked from reseller profile" "403" "$(echo "$RESP" | tail -1)"

RESP=$(curl -sb /tmp/e2e_edge_customer_cookies.txt -w "\n%{http_code}" \
  -X POST "${BASE}/dropshipper/bulk/orders" \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"${PRODUCT_ID}\",
    \"quantity\": ${MOQ},
    \"ssnCode\": \"CUS-SSN\",
    \"serviceAccountingCode\": \"CUS-SAC\",
    \"checkoutDetails\": {
      \"customerName\": \"Edge Customer\",
      \"customerPhone\": \"9876543210\",
      \"deliveryAddress\": \"Bengaluru, Karnataka\"
    }
  }")
check "Customer allowed to create bulk order" "201" "$(echo "$RESP" | tail -1)"

# 11) Admin reject and double-verify protections
echo ""
echo "[ Edge 11 ] Admin reject/verify guards"
RESP=$(curl -sb /tmp/e2e_edge_admin_cookies.txt -w "\n%{http_code}" \
  -X PATCH "${BASE}/admin/bulk-orders/${ORDER_ID}/reject-payment" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Proof unreadable"}')
check "Admin rejects pending proof" "200" "$(echo "$RESP" | tail -1)"

RESP=$(curl -sb /tmp/e2e_edge_admin_cookies.txt -w "\n%{http_code}" \
  -X PATCH "${BASE}/admin/bulk-orders/${ORDER_ID}/verify-payment" \
  -H "Content-Type: application/json" \
  -d '{"transactionReference":"EDGE-VERIFY-AFTER-REJECT"}')
check "Verify blocked after rejection" "400" "$(echo "$RESP" | tail -1)"

echo ""
echo "$SEPARATOR"
TOTAL=$((PASS + FAIL))
echo "  Edge tests passed : $PASS / $TOTAL"
echo "  Edge tests failed : $FAIL / $TOTAL"
if [[ $FAIL -eq 0 ]]; then
  echo "  🎉  ALL EDGE TESTS PASSED"
else
  echo "  💥  $FAIL EDGE TEST(S) FAILED"
fi
echo "$SEPARATOR"

[[ $FAIL -eq 0 ]]
