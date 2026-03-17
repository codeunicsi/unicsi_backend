#!/usr/bin/env bash
# =============================================================================
# UNICSI Backend – Full End-to-End Test
# Covers: Supplier signup → product creation → Dropshipper signup →
#         Bulk order → Invoice → Admin payment verification
#
# Usage:
#   ADMIN_EMAIL=admin@example.com ADMIN_PASS=secret bash tests/e2e_full_test.sh
# =============================================================================
set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────────
# CONFIG (override via env-vars)
# ──────────────────────────────────────────────────────────────────────────────
BASE="${BASE_URL:-http://localhost:8000/api/v1}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@unicsi.com}"
ADMIN_PASS="${ADMIN_PASS:-Admin@1234}"
MOQ="${MOQ:-5}"
DEFAULT_GST="${DEFAULT_GST:-0.18}"
DEFAULT_SHIPPING="${DEFAULT_SHIPPING:-0}"
DEFAULT_MARGIN="${DEFAULT_MARGIN:-500}"
TS=$(date +%s)
SUPPLIER_EMAIL="e2e_supplier_${TS}@test.com"
SUPPLIER_PASS="Supplier@9999"
RESELLER_EMAIL="e2e_reseller_${TS}@test.com"
RESELLER_PASS="Reseller@9999"

PASS=0; FAIL=0
SEPARATOR="────────────────────────────────────────────────────────"

# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────
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

# ──────────────────────────────────────────────────────────────────────────────
# 0. Pre-flight
# ──────────────────────────────────────────────────────────────────────────────
echo ""
echo "$SEPARATOR"
echo "  🚀  UNICSI Full E2E  –  $(date)"
echo "  Base: $BASE"
echo "$SEPARATOR"

# Confirm server is reachable
if ! curl -sf "${BASE}/auth/login" -X POST -H "Content-Type: application/json" \
     -d '{"email":"_probe_","password":"_probe_"}' \
     -o /dev/null --max-time 5 2>/dev/null; then
  echo "  ⚠️  Server not reachable at $BASE — starting check..."
fi

# ──────────────────────────────────────────────────────────────────────────────
# 1. ADMIN LOGIN
# ──────────────────────────────────────────────────────────────────────────────
echo ""
echo "[ Step 1 ] Admin Login"
RESP=$(curl -s -w "\n%{http_code}" -X POST "${BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASS}\"}")
BODY=$(echo "$RESP" | head -n -1); HTTP=$(echo "$RESP" | tail -1)
if [[ "$HTTP" != "200" ]]; then
  echo "  ⚠️   Default admin login failed. Creating a fresh admin test user..."
  ADMIN_EMAIL="e2e_admin_${TS}@test.com"
  ADMIN_PASS="Admin@9999"
  SIGNUP_RESP=$(curl -s -w "\n%{http_code}" -X POST "${BASE}/auth/signup" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"E2E Admin ${TS}\",\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASS}\",\"role\":\"ADMIN\"}")
  SIGNUP_BODY=$(echo "$SIGNUP_RESP" | head -n -1)
  SIGNUP_HTTP=$(echo "$SIGNUP_RESP" | tail -1)
  check "Admin signup fallback" "201" "$SIGNUP_HTTP"

  RESP=$(curl -s -w "\n%{http_code}" -X POST "${BASE}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASS}\"}")
  BODY=$(echo "$RESP" | head -n -1)
  HTTP=$(echo "$RESP" | tail -1)
fi
check "Admin login" "200" "$HTTP"
ADMIN_TOKEN=$(jq_field "$BODY" '.data.accessToken // .accessToken // ""')
if [[ -z "$ADMIN_TOKEN" ]]; then
  # Try extracting from set-cookie if server only sets cookie
  ADMIN_TOKEN=$(curl -s -c /tmp/e2e_admin_cookies.txt -X POST "${BASE}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASS}\"}" | jq -r '.accessToken // ""')
  # Also try cookie jar approach
  curl -s -c /tmp/e2e_admin_cookies.txt -b /tmp/e2e_admin_cookies.txt \
    -X POST "${BASE}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASS}\"}" > /dev/null
  ADMIN_TOKEN_SOURCE="cookie"
else
  ADMIN_TOKEN_SOURCE="body"
fi

# Retry login with cookie jar to capture cookie-based token
curl -sc /tmp/e2e_admin_cookies.txt -X POST "${BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASS}\"}" > /dev/null 2>&1 || true
echo "  ℹ️   Admin token source: $ADMIN_TOKEN_SOURCE"

# ──────────────────────────────────────────────────────────────────────────────
# 1.5. ADMIN – UPSERT BULK ORDER CONFIG
# ──────────────────────────────────────────────────────────────────────────────
echo ""
echo "[ Step 1.5 ] Admin – Upsert Bulk Order Config"
RESP=$(curl -sb /tmp/e2e_admin_cookies.txt -w "\n%{http_code}" \
  -X PUT "${BASE}/admin/config/bulk-order" \
  -H "Content-Type: application/json" \
  -d "{
    \"minOrderQty\": ${MOQ},
    \"supplierBulkPriceRefreshDays\": 20,
    \"defaultGstRate\": ${DEFAULT_GST},
    \"defaultShippingCharge\": ${DEFAULT_SHIPPING},
    \"defaultMarginPerPiece\": ${DEFAULT_MARGIN},
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
    \"settlement\": {
      \"cycle\": \"weekly\",
      \"dayOfWeek\": 1
    }
  }")
BODY=$(echo "$RESP" | head -n -1); HTTP=$(echo "$RESP" | tail -1)
check "Admin upsert bulk config" "200" "$HTTP"

# ──────────────────────────────────────────────────────────────────────────────
# 2. SUPPLIER SIGNUP
# ──────────────────────────────────────────────────────────────────────────────
echo ""
echo "[ Step 2 ] Supplier – Signup"
RESP=$(curl -s -w "\n%{http_code}" -X POST "${BASE}/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"E2E Supplier ${TS}\",
    \"email\": \"${SUPPLIER_EMAIL}\",
    \"password\": \"${SUPPLIER_PASS}\",
    \"role\": \"SUPPLIER\",
    \"otpVerified\": true
  }")
BODY=$(echo "$RESP" | head -n -1); HTTP=$(echo "$RESP" | tail -1)
check "Supplier signup" "201" "$HTTP"
echo "  ℹ️   email: $SUPPLIER_EMAIL"
# If 400 (already exists), continue – but fail count already recorded

# ──────────────────────────────────────────────────────────────────────────────
# 3. SUPPLIER LOGIN
# ──────────────────────────────────────────────────────────────────────────────
echo ""
echo "[ Step 3 ] Supplier – Login"
RESP=$(curl -sc /tmp/e2e_supplier_cookies.txt -w "\n%{http_code}" \
  -X POST "${BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${SUPPLIER_EMAIL}\",\"password\":\"${SUPPLIER_PASS}\"}")
BODY=$(echo "$RESP" | head -n -1); HTTP=$(echo "$RESP" | tail -1)
check "Supplier login" "200" "$HTTP"
SUPPLIER_TOKEN=$(jq_field "$BODY" '.accessToken // .data.accessToken // ""')
echo "  ℹ️   Cookie jar: /tmp/e2e_supplier_cookies.txt"

# ──────────────────────────────────────────────────────────────────────────────
# 4. SUPPLIER – CREATE PRODUCT WITH bulk_price
# ──────────────────────────────────────────────────────────────────────────────
echo ""
echo "[ Step 4 ] Supplier – Create Product (with bulk_price)"
VARIANTS="[{\"size\":\"M\",\"color\":\"Black\",\"sku\":\"E2E-SKU-${TS}\",\"variant_stock\":100,\"price\":499}]"
RESP=$(curl -sb /tmp/e2e_supplier_cookies.txt -w "\n%{http_code}" \
  -X POST "${BASE}/suppliers/stores/products" \
  -F "title=E2E Test Product ${TS}" \
  -F "description=End-to-end test product for bulk ordering. This is a test product created by the automated E2E test suite." \
  -F "brand=E2E Brand" \
  -F "approval_status=submitted" \
  -F "bulk_price=2500.00" \
  -F "mrp=3500.00" \
  -F "transfer_price=2000.00" \
  -F "variants=${VARIANTS}")
BODY=$(echo "$RESP" | head -n -1); HTTP=$(echo "$RESP" | tail -1)
check "Supplier create product" "200" "$HTTP"
PRODUCT_ID=$(jq_field "$BODY" '.data.product_id')
echo "  ℹ️   product_id: $PRODUCT_ID"

if [[ -z "$PRODUCT_ID" || "$PRODUCT_ID" == "null" ]]; then
  echo "  ⛔  Could not extract product_id. Raw response:"
  echo "  $BODY"
  echo ""
  echo "  Aborting further steps that depend on productId."
  echo "$SEPARATOR"
  echo "  Results: ${PASS} passed, ${FAIL} failed"
  echo "$SEPARATOR"
  exit 1
fi

# ──────────────────────────────────────────────────────────────────────────────
# 5. DROPSHIPPER SIGNUP
# ──────────────────────────────────────────────────────────────────────────────
echo ""
echo "[ Step 5 ] Dropshipper – Signup"
RESP=$(curl -s -w "\n%{http_code}" -X POST "${BASE}/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"E2E Dropshipper ${TS}\",
    \"email\": \"${RESELLER_EMAIL}\",
    \"password\": \"${RESELLER_PASS}\",
    \"role\": \"RESELLER\"
  }")
BODY=$(echo "$RESP" | head -n -1); HTTP=$(echo "$RESP" | tail -1)
check "Dropshipper signup" "201" "$HTTP"
echo "  ℹ️   email: $RESELLER_EMAIL"

# ──────────────────────────────────────────────────────────────────────────────
# 6. DROPSHIPPER LOGIN
# ──────────────────────────────────────────────────────────────────────────────
echo ""
echo "[ Step 6 ] Dropshipper – Login"
RESP=$(curl -sc /tmp/e2e_reseller_cookies.txt -w "\n%{http_code}" \
  -X POST "${BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${RESELLER_EMAIL}\",\"password\":\"${RESELLER_PASS}\"}")
BODY=$(echo "$RESP" | head -n -1); HTTP=$(echo "$RESP" | tail -1)
check "Dropshipper login" "200" "$HTTP"
echo "  ℹ️   Cookie jar: /tmp/e2e_reseller_cookies.txt"

# ──────────────────────────────────────────────────────────────────────────────
# 7. DROPSHIPPER – GET BANK DETAILS FOR PRODUCT (pre-order)
# ──────────────────────────────────────────────────────────────────────────────
echo ""
echo "[ Step 7 ] Dropshipper – Get Supplier Bank Details (product ${PRODUCT_ID})"
RESP=$(curl -sb /tmp/e2e_reseller_cookies.txt -w "\n%{http_code}" \
  -X GET "${BASE}/dropshipper/bulk/orders/bank-details/${PRODUCT_ID}")
BODY=$(echo "$RESP" | head -n -1); HTTP=$(echo "$RESP" | tail -1)
check "Get supplier bank details" "200" "$HTTP"
echo "  ℹ️   Bank details response:"
echo "  $(echo "$BODY" | jq -r '.data // .bankDetails // . | @json' 2>/dev/null | head -c 200)"

# ──────────────────────────────────────────────────────────────────────────────
# 8. DROPSHIPPER – CREATE BULK ORDER
# ──────────────────────────────────────────────────────────────────────────────
echo ""
echo "[ Step 8 ] Dropshipper – Create Bulk Order"
RESP=$(curl -sb /tmp/e2e_reseller_cookies.txt -w "\n%{http_code}" \
  -X POST "${BASE}/dropshipper/bulk/orders" \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"${PRODUCT_ID}\",
    \"quantity\": ${MOQ},
    \"gstRate\": 0.18,
    \"ssnCode\": \"E2E-SSN-001\",
    \"serviceAccountingCode\": \"SAC-998314\",
    \"userBusinessDetails\": {
      \"businessName\": \"E2E Test Traders Pvt Ltd\",
      \"gstNumber\": \"29ABCDE1234F1Z5\",
      \"contactName\": \"Test User\",
      \"contactPhone\": \"9876543210\",
      \"billingAddress\": \"123, Test Street, Bengaluru, Karnataka 560001\",
      \"notes\": \"E2E test order – please ignore\"
    }
  }")
BODY=$(echo "$RESP" | head -n -1); HTTP=$(echo "$RESP" | tail -1)
check "Create bulk order" "201" "$HTTP"

ORDER_ID=$(jq_field "$BODY" '.data.orderId')
INVOICE_NO=$(jq_field "$BODY" '.data.invoiceNumber')
TOTAL_PAYABLE=$(jq_field "$BODY" '.data.totalPayable')
ORDER_STATUS=$(jq_field "$BODY" '.data.orderStatus')
SUBTOTAL=$(jq_field "$BODY" '.data.subtotal')
GST_AMOUNT=$(jq_field "$BODY" '.data.gstAmount')

echo "  ℹ️   orderId:        $ORDER_ID"
echo "  ℹ️   invoiceNumber:  $INVOICE_NO"
echo "  ℹ️   subtotal:       ₹$SUBTOTAL  (2500 × ${MOQ})"
echo "  ℹ️   gstAmount:      ₹$GST_AMOUNT  (18%)"
echo "  ℹ️   totalPayable:   ₹$TOTAL_PAYABLE"
echo "  ℹ️   orderStatus:    $ORDER_STATUS"

# Validate calculated amounts (2500 × MOQ)
EXPECTED_SUBTOTAL=$(awk -v qty="${MOQ}" 'BEGIN { printf "%.2f", 2500 * qty }')
EXPECTED_GST=$(awk -v subtotal="${EXPECTED_SUBTOTAL}" 'BEGIN { printf "%.2f", subtotal * 0.18 }')
EXPECTED_TOTAL=$(awk -v subtotal="${EXPECTED_SUBTOTAL}" -v gst="${EXPECTED_GST}" 'BEGIN { printf "%.2f", subtotal + gst }')
if [[ "$SUBTOTAL" == "$EXPECTED_SUBTOTAL" ]]; then
  echo "  ✅  Subtotal math correct (₹$SUBTOTAL)"
  PASS=$((PASS + 1))
else
  echo "  ❌  Subtotal mismatch: expected ₹$EXPECTED_SUBTOTAL got ₹$SUBTOTAL"
  FAIL=$((FAIL + 1))
fi
if [[ "$GST_AMOUNT" == "$EXPECTED_GST" ]]; then
  echo "  ✅  GST math correct (₹$GST_AMOUNT)"
  PASS=$((PASS + 1))
else
  echo "  ❌  GST mismatch: expected ₹$EXPECTED_GST got ₹$GST_AMOUNT"
  FAIL=$((FAIL + 1))
fi
if [[ "$TOTAL_PAYABLE" == "$EXPECTED_TOTAL" ]]; then
  echo "  ✅  Total payable correct (₹$TOTAL_PAYABLE)"
  PASS=$((PASS + 1))
else
  echo "  ❌  Total mismatch: expected ₹$EXPECTED_TOTAL got ₹$TOTAL_PAYABLE"
  FAIL=$((FAIL + 1))
fi

if [[ "$ORDER_STATUS" == "Pending Payment" ]]; then
  echo "  ✅  Order status is Pending Payment"
  PASS=$((PASS + 1))
else
  echo "  ❌  Order status: expected Pending Payment got $ORDER_STATUS"
  FAIL=$((FAIL + 1))
fi

if [[ -z "$ORDER_ID" || "$ORDER_ID" == "null" ]]; then
  echo "  ⛔  No orderId – cannot continue to admin verification."
  FINAL_PASS=$PASS; FINAL_FAIL=$FAIL
  echo ""
  echo "$SEPARATOR"
  echo "  Results: ${FINAL_PASS} passed, ${FINAL_FAIL} failed"
  echo "$SEPARATOR"
  exit 1
fi

# ──────────────────────────────────────────────────────────────────────────────
# 9. SUBMIT PAYMENT PROOF
# ──────────────────────────────────────────────────────────────────────────────
echo ""
echo "[ Step 9 ] Dropshipper – Submit Payment Proof"
PAYMENT_PROOF_FILE="/tmp/e2e_payment_proof_${TS}.jpg"
echo "e2e payment proof" > "$PAYMENT_PROOF_FILE"

RESP=$(curl -sb /tmp/e2e_reseller_cookies.txt -w "\n%{http_code}" \
  -X POST "${BASE}/dropshipper/bulk/orders/${ORDER_ID}/payment-proof" \
  -F "transactionReference=UTR-E2E-$(date +%s)" \
  -F "paymentMode=upi" \
  -F "amount=${TOTAL_PAYABLE}" \
  -F "paymentScreenshot=@${PAYMENT_PROOF_FILE}")
BODY=$(echo "$RESP" | head -n -1); HTTP=$(echo "$RESP" | tail -1)
check "Submit payment proof" "200" "$HTTP"

PAYMENT_STATUS=$(jq_field "$BODY" '.data.paymentStatus')
echo "  ℹ️   paymentStatus:  $PAYMENT_STATUS"

# ──────────────────────────────────────────────────────────────────────────────
# 10. INVOICE VALIDATION (inspect invoice number format)
# ──────────────────────────────────────────────────────────────────────────────
echo ""
echo "[ Step 10 ] Invoice Validation"
if [[ "$INVOICE_NO" =~ ^INV-BULK-[0-9]+-[A-F0-9]{6}$ ]]; then
  echo "  ✅  Invoice number format valid: $INVOICE_NO"
  PASS=$((PASS + 1))
else
  echo "  ❌  Invoice number format invalid: $INVOICE_NO"
  FAIL=$((FAIL + 1))
fi

# ──────────────────────────────────────────────────────────────────────────────
# 11. REJECT – try to place order without auth
# ──────────────────────────────────────────────────────────────────────────────
echo ""
echo "[ Step 11 ] Security – Unauthenticated bulk order (should 401)"
RESP=$(curl -s -w "\n%{http_code}" -X POST "${BASE}/dropshipper/bulk/orders" \
  -H "Content-Type: application/json" \
  -d "{\"productId\":\"${PRODUCT_ID}\",\"quantity\":1,\"ssnCode\":\"X\",
       \"serviceAccountingCode\":\"Y\",
       \"userBusinessDetails\":{\"businessName\":\"Test\"}}")
HTTP=$(echo "$RESP" | tail -1)
check "Unauthenticated bulk order blocked (401)" "401" "$HTTP"

# ──────────────────────────────────────────────────────────────────────────────
# 12. REJECT – admin verify with wrong role (use reseller cookie)
# ──────────────────────────────────────────────────────────────────────────────
echo ""
echo "[ Step 12 ] Security – Non-admin verify-payment (should 403)"
RESP=$(curl -sb /tmp/e2e_reseller_cookies.txt -w "\n%{http_code}" \
  -X PATCH "${BASE}/admin/bulk-orders/${ORDER_ID}/verify-payment" \
  -H "Content-Type: application/json" \
  -d "{\"transactionReference\":\"UTR-FAKE\"}")
HTTP=$(echo "$RESP" | tail -1)
check "Non-admin verify-payment blocked (403)" "403" "$HTTP"

# ──────────────────────────────────────────────────────────────────────────────
# 13. ADMIN – VERIFY PAYMENT
# ──────────────────────────────────────────────────────────────────────────────
echo ""
echo "[ Step 13 ] Admin – Verify Bulk Order Payment"
RESP=$(curl -sb /tmp/e2e_admin_cookies.txt -w "\n%{http_code}" \
  -X PATCH "${BASE}/admin/bulk-orders/${ORDER_ID}/verify-payment" \
  -H "Content-Type: application/json" \
  -d "{\"transactionReference\": \"UTR-ADMIN-E2E-$(date +%s)\"}")
BODY=$(echo "$RESP" | head -n -1); HTTP=$(echo "$RESP" | tail -1)
check "Admin verify-payment" "200" "$HTTP"

VERIFIED_STATUS=$(jq_field "$BODY" '.data.orderStatus')
VERIFIED_AT=$(jq_field "$BODY" '.data.paymentVerifiedAt')
VERIFIED_REF=$(jq_field "$BODY" '.data.transactionReference')

echo "  ℹ️   orderStatus:         $VERIFIED_STATUS"
echo "  ℹ️   paymentVerifiedAt:   $VERIFIED_AT"
echo "  ℹ️   transactionReference: $VERIFIED_REF"

if [[ "$VERIFIED_STATUS" == "Confirmed" ]]; then
  echo "  ✅  Order moved to Confirmed"
  PASS=$((PASS + 1))
else
  echo "  ❌  Order status after verification: $VERIFIED_STATUS"
  FAIL=$((FAIL + 1))
fi

# ──────────────────────────────────────────────────────────────────────────────
# 14. REJECT – double-verify (idempotency / already-paid protection)
# ──────────────────────────────────────────────────────────────────────────────
echo ""
echo "[ Step 14 ] Admin – Double-verify already-paid order (should 409)"
RESP=$(curl -sb /tmp/e2e_admin_cookies.txt -w "\n%{http_code}" \
  -X PATCH "${BASE}/admin/bulk-orders/${ORDER_ID}/verify-payment" \
  -H "Content-Type: application/json" \
  -d "{\"transactionReference\": \"UTR-DUP\"}")
HTTP=$(echo "$RESP" | tail -1)
check "Double-verify rejected (409)" "409" "$HTTP"

# ──────────────────────────────────────────────────────────────────────────────
# SUMMARY
# ──────────────────────────────────────────────────────────────────────────────
echo ""
echo "$SEPARATOR"
echo "  📋  E2E Summary"
echo ""
echo "  Supplier:    $SUPPLIER_EMAIL"
echo "  Dropshipper: $RESELLER_EMAIL"
echo "  Product ID:  $PRODUCT_ID"
echo "  Order ID:    $ORDER_ID"
echo "  Invoice #:   $INVOICE_NO"
echo "  Total:       ₹$TOTAL_PAYABLE"
echo "  Final Status: $VERIFIED_STATUS"
echo ""
TOTAL=$((PASS + FAIL))
echo "  Tests passed : $PASS / $TOTAL"
echo "  Tests failed : $FAIL / $TOTAL"
if [[ $FAIL -eq 0 ]]; then
  echo ""
  echo "  🎉  ALL TESTS PASSED"
else
  echo ""
  echo "  💥  $FAIL TEST(S) FAILED"
fi
echo "$SEPARATOR"
echo ""

[[ $FAIL -eq 0 ]]
