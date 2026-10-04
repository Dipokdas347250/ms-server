const { z } = require('zod')
const { AREAS } = require('../config/shop')
const { normalizePhone } = require('../utils/phone')

const listCustomers = z.object({
  q: z.string().trim().max(100).optional(),
  sort: z.enum(['recent', 'orders', 'spent', 'newest']).default('recent'),
  blocked: z.enum(['true', 'false', '']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const updateCustomer = z
  .object({
    name: z.string().trim().min(2).max(100),
    phone: z.string().transform((v, ctx) => {
      const p = normalizePhone(v)
      if (!p) ctx.addIssue({ code: 'custom', message: 'Enter a valid 11-digit mobile number' })
      return p
    }),
    address: z.string().trim().max(500),
    area: z.enum(Object.keys(AREAS)),
    notes: z.string().trim().max(1000),
    isBlocked: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update')

module.exports = { listCustomers, updateCustomer }
