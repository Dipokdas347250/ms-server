const { z } = require('zod')
const { AREAS, MAX_ITEMS_PER_ORDER, ORDER_STATUSES, PAYMENT_STATUSES, SIZES } = require('../config/shop')
const { normalizePhone } = require('../utils/phone')

const AREA_KEYS = Object.keys(AREAS)
const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')

const phone = z
  .string()
  .transform((v, ctx) => {
    const p = normalizePhone(v)
    if (!p) ctx.addIssue({ code: 'custom', message: 'Enter a valid 11-digit mobile number (01XXXXXXXXX)' })
    return p
  })

const shipping = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(100),
  phone,
  address: z.string().trim().min(5, 'Address is too short').max(500),
  area: z.enum(AREA_KEYS, 'Choose a delivery area'),
})

const placeOrder = shipping.extend({
  items: z
    .array(
      z.object({
        productId: z.string().trim().toLowerCase().min(1),
        size: z.enum(SIZES, 'Choose a size'),
        quantity: z.coerce.number().int().min(1).max(MAX_ITEMS_PER_ORDER).default(1),
      }),
    )
    .min(1, 'Add at least one item'),
  note: z.string().trim().max(500).optional(),
  // Browser details for the Meta Conversions API (sent by the storefront).
  tracking: z
    .object({
      fbp: z.string().max(200).optional(),
      fbc: z.string().max(300).optional(),
      userAgent: z.string().max(500).optional(),
      sourceUrl: z.string().max(500).optional(),
    })
    .optional(),
})

const listOrders = z.object({
  status: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').filter((s) => ORDER_STATUSES.includes(s)) : [])),
  q: z.string().trim().max(100).optional(),
  area: z.enum(AREA_KEYS).optional().or(z.literal('').transform(() => undefined)),
  from: dateKey.optional(),
  to: dateKey.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const updateStatus = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(500).optional(),
})

const updateOrder = z
  .object({
    shipping,
    paymentStatus: z.enum(PAYMENT_STATUSES),
    adminNote: z.string().trim().max(1000),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update')

const track = z.object({ phone })

module.exports = { placeOrder, listOrders, updateStatus, updateOrder, track }
