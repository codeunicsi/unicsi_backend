export const isEmailOrPhoneNumber = (emailOrPhoneNumber) => {
  const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
  const phonePattern = /^[0-9]{10}$/;

  if (emailPattern.test(emailOrPhoneNumber)) {
    return { status: true, type: "email" };
  } else if (phonePattern.test(emailOrPhoneNumber)) {
    return { status: true, type: "number" };
  } else {
    return { status: false, type: null };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// INDIAN STANDARD VALIDATORS
// Each function returns { valid: boolean, message: string }
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Email — standard RFC-like pattern
 * e.g. moaaz@unicsi.com
 */
export const validateEmail = (value) => {
  const pattern = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return pattern.test(String(value).trim())
    ? { valid: true, message: "" }
    : { valid: false, message: "Invalid email address" };
};

/**
 * Indian mobile number — 10 digits, must start with 6, 7, 8 or 9
 * e.g. 9876543210
 */
export const validateIndianPhone = (value) => {
  const pattern = /^[6-9]\d{9}$/;
  return pattern.test(String(value).trim())
    ? { valid: true, message: "" }
    : {
        valid: false,
        message: "Phone number must be 10 digits and start with 6-9",
      };
};

/**
 * PAN card — format: AAAAA9999A  (5 uppercase letters, 4 digits, 1 uppercase letter)
 * e.g. ABCDE1234F
 */
export const validatePAN = (value) => {
  const pattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return pattern.test(String(value).trim().toUpperCase())
    ? { valid: true, message: "" }
    : {
        valid: false,
        message: "Invalid PAN number. Expected format: ABCDE1234F",
      };
};

/**
 * GST number — 15-character GSTIN as per CBDT standard
 * Format: 2-digit state code + PAN (10 chars) + entity number (1) + Z + checksum
 * e.g. 22ABCDE1234F1Z5
 */
export const validateGSTNumber = (value) => {
  const pattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return pattern.test(String(value).trim().toUpperCase())
    ? { valid: true, message: "" }
    : {
        valid: false,
        message: "Invalid GST number. Expected format: 22ABCDE1234F1Z5",
      };
};

/**
 * IFSC code — 11 characters: 4 alpha (bank code) + 0 + 6 alphanumeric (branch)
 * e.g. SBIN0000001
 */
export const validateIFSC = (value) => {
  const pattern = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  return pattern.test(String(value).trim().toUpperCase())
    ? { valid: true, message: "" }
    : {
        valid: false,
        message: "Invalid IFSC code. Expected format: SBIN0000001",
      };
};

/**
 * Bank account number — 9 to 18 digits (covers all major Indian banks)
 * e.g. 1234567890
 */
export const validateBankAccountNumber = (value) => {
  const pattern = /^\d{9,18}$/;
  return pattern.test(String(value).trim())
    ? { valid: true, message: "" }
    : {
        valid: false,
        message: "Account number must be between 9 and 18 digits",
      };
};

/**
 * Person / account holder name — letters, spaces, dots, hyphens only, 2-100 chars
 * e.g. Moaaz Ahmed
 */
export const validateName = (value) => {
  const pattern = /^[a-zA-Z\s.\-]{2,100}$/;
  return pattern.test(String(value).trim())
    ? { valid: true, message: "" }
    : {
        valid: false,
        message:
          "Name must be 2-100 characters and contain only letters, spaces, dots or hyphens",
      };
};

/**
 * Business / GST trade name — letters, digits, spaces and common punctuation, 2-100 chars
 * e.g. Shop425788 Pvt Ltd
 */
export const validateBusinessName = (value) => {
  const pattern = /^[a-zA-Z0-9\s.\-&,/()]{2,100}$/;
  return pattern.test(String(value).trim())
    ? { valid: true, message: "" }
    : { valid: false, message: "Business name must be 2-100 characters" };
};

/**
 * Bank / branch name — letters, spaces, dots, digits, 2-100 chars
 */
export const validateBankName = (value) => {
  const pattern = /^[a-zA-Z0-9\s.\-]{2,100}$/;
  return pattern.test(String(value).trim())
    ? { valid: true, message: "" }
    : {
        valid: false,
        message: "Bank/branch name must be 2-100 alphanumeric characters",
      };
};

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE FACTORY
// Usage: validate(rules)  →  Express middleware (req, res, next)
//
// Each rule:  { field, validator, required?, message? }
//   field      — req.body key to check
//   validator  — one of the validate* functions above
//   required   — if true, field must be present and non-empty (default false)
//   message    — override the validator's own message (optional)
//
// Example:
//   validate([
//     { field: "panCardNumber", validator: validatePAN, required: true },
//     { field: "ifsc",          validator: validateIFSC, required: true },
//   ])
// ─────────────────────────────────────────────────────────────────────────────

export const validate = (rules) => (req, res, next) => {
  const errors = [];

  for (const rule of rules) {
    const { field, validator, required = false, message } = rule;
    const raw = req.body?.[field];
    const value = typeof raw === "string" ? raw.trim() : raw;

    if (!value || value === "") {
      if (required) {
        errors.push({ field, message: `${field} is required` });
      }
      // optional field absent — skip format check
      continue;
    }

    const result = validator(value);
    if (!result.valid) {
      errors.push({ field, message: message || result.message });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};

// ─────────────────────────────────────────────────────────────────────────────
// PRE-BUILT RULE SETS  (import and pass directly to validate())
// ─────────────────────────────────────────────────────────────────────────────

/** PUT /dropshipper/profile/personalDetails */
export const profileUpdateRules = [
  { field: "name", validator: validateName, required: false },
  { field: "email", validator: validateEmail, required: false },
  { field: "phoneNumber", validator: validateIndianPhone, required: false },
];

/** POST|PUT /dropshipper/stores/bankAccountDetails */
export const bankDetailsRules = [
  { field: "holderName", validator: validateName, required: true },
  {
    field: "accountNumber",
    validator: validateBankAccountNumber,
    required: true,
  },
  {
    field: "reAccountNumber",
    validator: validateBankAccountNumber,
    required: false,
  },
  { field: "ifsc", validator: validateIFSC, required: true },
  { field: "bankName", validator: validateBankName, required: false },
  { field: "branchName", validator: validateBankName, required: false },
];

/** POST|PUT /dropshipper/stores/gstDetails */
export const gstDetailsRules = [
  { field: "gstName", validator: validateBusinessName, required: true },
  { field: "gstNumber", validator: validateGSTNumber, required: true },
  { field: "panCardNumber", validator: validatePAN, required: true },
];
