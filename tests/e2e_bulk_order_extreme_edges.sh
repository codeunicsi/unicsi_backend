#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE_URL:-http://localhost:8000/api/v1}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@unicsi.com}"
ADMIN_PASS="${ADMIN_PASS:-Admin@1234}"
MOQ="${MOQ:-10}"
TS=$(date +%s)

SUPPLIER_EMAIL="xedge_supplier_${TS}@test.com"
SUPPLIER_PASS="Supplier@9999"
RESELLER_EMAIL="xedge_reseller_${TS}@test.com"
RESELLER_PASS="Reseller@9999"
CUSTOMER_EMAIL="xedge_customer_${TS}@test.com"
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
echo "  🔬  UNICSI Bulk Order Extreme Edge Cases  –  $(date)"
echo "  Base: $BASE"
echo "$SEPARATOR"

# 1) Admin auth bootstrap
echo ""
echo "[ X-Edge 1 ] Admin bootstrap"
RESP=$(curl -s -w "\n%{http_code}" -X POST "${BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASS}\"}")
HTTP=$(echo "$RESP" | tail -1)
if [[ "$HTTP" != "200" ]]; then
  ADMIN_EMAIL="xedge_admin_${TS}@test.com"
  ADMIN_PASS="Admin@9999"
  SIGNUP_RESP=$(curl -s -w "\n%{http_code}" -X POST "${BASE}/auth/signup" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"XEdge Admin ${TS}\",\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASS}\",\"role\":\"ADMIN\"}")
  check "Admin signup fallback" "201" "$(echo "$SIGNUP_RESP" | tail -1)"
fi
RESP=$(curl -s -w "\n%{http_code}" -X POST "${BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASS}\"}")
check "Admin login" "200" "$(echo "$RESP" | tail -1)"

curl -sc /tmp/xedge_admin_cookies.txt -X POST "${BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASS}\"}" > /dev/null 2>&1 || true

# 2) Config with CUSTOMER+RESELLER allowed
echo ""
echo "[ X-Edge 2 ] Upsert base bulk config"
RESP=$(curl -sb /tmp/xedge_admin_cookies.txt -w "\n%{http_code}" \
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
check "Admin upsert base config" "200" "$(echo "$RESP" | tail -1)"

# 3) Supplier/product and reseller/customer setup
echo ""
echo "[ X-Edge 3 ] Setup users and product"
check "Supplier signup" "201" "$(curl -s -w "\n%{http_code}" -X POST "${BASE}/auth/signup" -H "Content-Type: application/json" -d "{\"name\":\"XEdge Supplier ${TS}\",\"email\":\"${SUPPLIER_EMAIL}\",\"password\":\"${SUPPLIER_PASS}\",\"role\":\"SUPPLIER\",\"otpVerified\":true}" | tail -1)"

curl -sc /tmp/xedge_supplier_cookies.txt -X POST "${BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${SUPPLIER_EMAIL}\",\"password\":\"${SUPPLIER_PASS}\"}" > /dev/null

VARIANTS='[{"size":"M","color":"Black","sku":"XEDGE-SKU-'"${TS}"'","variant_stock":100,"price":499}]'
RESP=$(curl -sb /tmp/xedge_supplier_cookies.txt -w "\n%{http_code}" \
  -X POST "${BASE}/suppliers/stores/products" \
  -F "title=XEdge Product ${TS}" \
  -F "description=Extreme edge test product" \
  -F "brand=XEdge" \
  -F "approval_status=submitted" \
  -F "bulk_price=2500.00" \
  -F "mrp=3500.00" \
  -F "transfer_price=2000.00" \
  -F "variants=${VARIANTS}")
BODY=$(echo "$RESP" | head -n -1)
check "Supplier create product" "200" "$(echo "$RESP" | tail -1)"
PRODUCT_ID=$(jq_field "$BODY" '.data.product_id')

check "Reseller signup" "201" "$(curl -s -w "\n%{http_code}" -X POST "${BASE}/auth/signup" -H "Content-Type: application/json" -d "{\"name\":\"XEdge Reseller ${TS}\",\"email\":\"${RESELLER_EMAIL}\",\"password\":\"${RESELLER_PASS}\",\"role\":\"RESELLER\"}" | tail -1)"
check "Customer signup" "201" "$(curl -s -w "\n%{http_code}" -X POST "${BASE}/auth/signup" -H "Content-Type: application/json" -d "{\"name\":\"XEdge Customer ${TS}\",\"email\":\"${CUSTOMER_EMAIL}\",\"password\":\"${CUSTOMER_PASS}\",\"role\":\"CUSTOMER\"}" | tail -1)"

curl -sc /tmp/xedge_reseller_cookies.txt -X POST "${BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${RESELLER_EMAIL}\",\"password\":\"${RESELLER_PASS}\"}" > /dev/null
curl -sc /tmp/xedge_customer_cookies.txt -X POST "${BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${CUSTOMER_EMAIL}\",\"password\":\"${CUSTOMER_PASS}\"}" > /dev/null

# 4) Validation failures on create order
echo ""
echo "[ X-Edge 4 ] Validation guards on bulk order create"
RESP=$(curl -sb /tmp/xedge_reseller_cookies.txt -w "\n%{http_code}" -X POST "${BASE}/dropshipper/bulk/orders" -H "Content-Type: application/json" -d '{"productId":"not-a-uuid","quantity":10,"userBusinessDetails":{"businessName":"X"}}')
check "Invalid productId format blocked" "400" "$(echo "$RESP" | tail -1)"

RESP=$(curl -sb /tmp/xedge_reseller_cookies.txt -w "\n%{http_code}" -X POST "${BASE}/dropshipper/bulk/orders" -H "Content-Type: application/json" -d "{\"productId\":\"${PRODUCT_ID}\",\"quantity\":1.5,\"userBusinessDetails\":{\"businessName\":\"X Biz\"}}")
check "Non-integer quantity blocked" "400" "$(echo "$RESP" | tail -1)"

RESP=$(curl -sb /tmp/xedge_reseller_cookies.txt -w "\n%{http_code}" -X POST "${BASE}/dropshipper/bulk/orders" -H "Content-Type: application/json" -d "{\"productId\":\"${PRODUCT_ID}\",\"quantity\":-1,\"userBusinessDetails\":{\"businessName\":\"X Biz\"}}")
check "Negative quantity blocked" "400" "$(echo "$RESP" | tail -1)"

RESP=$(curl -sb /tmp/xedge_reseller_cookies.txt -w "\n%{http_code}" -X POST "${BASE}/dropshipper/bulk/orders" -H "Content-Type: application/json" -d "{\"productId\":\"${PRODUCT_ID}\",\"quantity\":${MOQ}}")
check "Missing buyer details blocked" "400" "$(echo "$RESP" | tail -1)"

RESP=$(curl -sb /tmp/xedge_reseller_cookies.txt -w "\n%{http_code}" -X POST "${BASE}/dropshipper/bulk/orders" -H "Content-Type: application/json" -d '{"productId":"11111111-1111-1111-1111-111111111111","quantity":10,"userBusinessDetails":{"businessName":"X Biz"}}')
check "Non-existent product blocked" "404" "$(echo "$RESP" | tail -1)"

# 5) Bank details edge cases
echo ""
echo "[ X-Edge 5 ] Bank details endpoint guards"
RESP=$(curl -s -w "\n%{http_code}" -X GET "${BASE}/dropshipper/bulk/orders/bank-details/${PRODUCT_ID}")
check "Unauthenticated bank-details blocked" "401" "$(echo "$RESP" | tail -1)"

RESP=$(curl -sb /tmp/xedge_reseller_cookies.txt -w "\n%{http_code}" -X GET "${BASE}/dropshipper/bulk/orders/bank-details/11111111-1111-1111-1111-111111111111")
check "Bank-details non-existent product blocked" "404" "$(echo "$RESP" | tail -1)"

# 6) Create valid order for payment/admin edge checks
echo ""
echo "[ X-Edge 6 ] Create valid order for downstream checks"
RESP=$(curl -sb /tmp/xedge_reseller_cookies.txt -w "\n%{http_code}" -X POST "${BASE}/dropshipper/bulk/orders" -H "Content-Type: application/json" -d "{\"productId\":\"${PRODUCT_ID}\",\"quantity\":${MOQ},\"ssnCode\":\"XEDGE\",\"serviceAccountingCode\":\"XEDGE-SAC\",\"userBusinessDetails\":{\"businessName\":\"XEdge Biz Pvt Ltd\"}}")
BODY=$(echo "$RESP" | head -n -1)
check "Valid order created" "201" "$(echo "$RESP" | tail -1)"
ORDER_ID=$(jq_field "$BODY" '.data.orderId')

# 7) Payment proof endpoint edge cases
echo ""
echo "[ X-Edge 7 ] Payment proof endpoint guards"
RESP=$(curl -s -w "\n%{http_code}" -X POST "${BASE}/dropshipper/bulk/orders/${ORDER_ID}/payment-proof" -F "transactionReference=NOAUTH" -F "paymentMode=upi")
check "Unauthenticated proof blocked" "401" "$(echo "$RESP" | tail -1)"

RESP=$(curl -sb /tmp/xedge_reseller_cookies.txt -w "\n%{http_code}" -X POST "${BASE}/dropshipper/bulk/orders/11111111-1111-1111-1111-111111111111/payment-proof" -F "transactionReference=NOTFOUND" -F "paymentMode=upi")
check "Proof on non-existent order blocked" "404" "$(echo "$RESP" | tail -1)"

RESP=$(curl -sb /tmp/xedge_reseller_cookies.txt -w "\n%{http_code}" -X POST "${BASE}/dropshipper/bulk/orders/${ORDER_ID}/payment-proof" -F "transactionReference=NOSHOT" -F "paymentMode=upi")
check "Missing screenshot blocked" "400" "$(echo "$RESP" | tail -1)"

RESP=$(curl -sb /tmp/xedge_reseller_cookies.txt -w "\n%{http_code}" -X POST "${BASE}/dropshipper/bulk/orders/${ORDER_ID}/payment-proof" -F "transactionReference=NOMODE")
check "Missing paymentMode blocked" "400" "$(echo "$RESP" | tail -1)"

PROOF_FILE="/tmp/xedge_payment_${TS}.jpg"
echo "xedge payment proof" > "$PROOF_FILE"
RESP=$(curl -sb /tmp/xedge_reseller_cookies.txt -w "\n%{http_code}" -X POST "${BASE}/dropshipper/bulk/orders/${ORDER_ID}/payment-proof" -F "transactionReference=GOOD-${TS}" -F "paymentMode=upi" -F "paymentScreenshot=@${PROOF_FILE}")
check "Valid proof accepted" "200" "$(echo "$RESP" | tail -1)"

RESP=$(curl -sb /tmp/xedge_reseller_cookies.txt -w "\n%{http_code}" -X POST "${BASE}/dropshipper/bulk/orders/${ORDER_ID}/payment-proof" -F "transactionReference=DUP-${TS}" -F "paymentMode=upi" -F "paymentScreenshot=@${PROOF_FILE}")
check "Duplicate proof currently accepted" "200" "$(echo "$RESP" | tail -1)"

# 8) Admin verify/reject endpoint edge cases
echo ""
echo "[ X-Edge 8 ] Admin verify/reject guards"
RESP=$(curl -sb /tmp/xedge_reseller_cookies.txt -w "\n%{http_code}" -X PATCH "${BASE}/admin/bulk-orders/${ORDER_ID}/reject-payment" -H "Content-Type: application/json" -d '{"reason":"x"}')
check "Non-admin reject blocked" "403" "$(echo "$RESP" | tail -1)"

RESP=$(curl -sb /tmp/xedge_admin_cookies.txt -w "\n%{http_code}" -X PATCH "${BASE}/admin/bulk-orders/${ORDER_ID}/reject-payment" -H "Content-Type: application/json" -d '{}')
check "Reject requires reason" "400" "$(echo "$RESP" | tail -1)"

RESP=$(curl -sb /tmp/xedge_admin_cookies.txt -w "\n%{http_code}" -X PATCH "${BASE}/admin/bulk-orders/11111111-1111-1111-1111-111111111111/verify-payment" -H "Content-Type: application/json" -d '{}')
check "Verify non-existent order blocked" "404" "$(echo "$RESP" | tail -1)"

RESP=$(curl -sb /tmp/xedge_admin_cookies.txt -w "\n%{http_code}" -X PATCH "${BASE}/admin/bulk-orders/11111111-1111-1111-1111-111111111111/reject-payment" -H "Content-Type: application/json" -d '{"reason":"Not found"}')
check "Reject non-existent order blocked" "404" "$(echo "$RESP" | tail -1)"

RESP=$(curl -sb /tmp/xedge_admin_cookies.txt -w "\n%{http_code}" -X PATCH "${BASE}/admin/bulk-orders/${ORDER_ID}/verify-payment" -H "Content-Type: application/json" -d '{}')
check "Admin verify succeeds with optional reference" "200" "$(echo "$RESP" | tail -1)"

RESP=$(curl -sb /tmp/xedge_admin_cookies.txt -w "\n%{http_code}" -X PATCH "${BASE}/admin/bulk-orders/${ORDER_ID}/reject-payment" -H "Content-Type: application/json" -d '{"reason":"Too late"}')
check "Reject blocked after verify" "400" "$(echo "$RESP" | tail -1)"

# 9) Config-driven role restriction (CUSTOMER blocked when removed)
echo ""
echo "[ X-Edge 9 ] Config-driven allowRoles behavior"
RESP=$(curl -sb /tmp/xedge_admin_cookies.txt -w "\n%{http_code}" \
  -X PUT "${BASE}/admin/config/bulk-order" \
  -H "Content-Type: application/json" \
  -d "{
    \"minOrderQty\": ${MOQ},
    \"supplierBulkPriceRefreshDays\": 20,
    \"defaultGstRate\": 0.18,
    \"defaultShippingCharge\": 0,
    \"defaultMarginPerPiece\": 500,
    \"allowRoles\": [\"RESELLER\"],
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
check "Admin upsert reseller-only config" "200" "$(echo "$RESP" | tail -1)"

RESP=$(curl -sb /tmp/xedge_customer_cookies.txt -w "\n%{http_code}" -X POST "${BASE}/dropshipper/bulk/orders" -H "Content-Type: application/json" -d "{\"productId\":\"${PRODUCT_ID}\",\"quantity\":${MOQ},\"checkoutDetails\":{\"customerName\":\"XEdge Customer\",\"customerPhone\":\"9876543210\",\"deliveryAddress\":\"Bangalore\"}}")
check "Customer blocked when removed from allowRoles" "401" "$(echo "$RESP" | tail -1)"

RESP=$(curl -sb /tmp/xedge_reseller_cookies.txt -w "\n%{http_code}" -X POST "${BASE}/dropshipper/bulk/orders" -H "Content-Type: application/json" -d "{\"productId\":\"${PRODUCT_ID}\",\"quantity\":${MOQ},\"userBusinessDetails\":{\"businessName\":\"XEdge Biz Pvt Ltd\"}}")
check "Reseller still allowed with reseller-only config" "201" "$(echo "$RESP" | tail -1)"

echo ""
echo "$SEPARATOR"
TOTAL=$((PASS + FAIL))
echo "  Extreme edge tests passed : $PASS / $TOTAL"
echo "  Extreme edge tests failed : $FAIL / $TOTAL"
if [[ $FAIL -eq 0 ]]; then
  echo "  🎉  ALL EXTREME EDGE TESTS PASSED"
else
  echo "  💥  $FAIL EXTREME EDGE TEST(S) FAILED"
fi
echo "$SEPARATOR"

[[ $FAIL -eq 0 ]]
