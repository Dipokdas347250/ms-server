// "+880 1712-345678" → "01712345678". Returns null when it isn't a Bangladeshi mobile number.
function normalizePhone(input) {
  let digits = String(input ?? '').replace(/\D/g, '')
  if (digits.startsWith('880')) digits = digits.slice(2)
  return /^01[3-9]\d{8}$/.test(digits) ? digits : null
}

module.exports = { normalizePhone }
