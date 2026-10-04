const { z } = require('zod')
const { SIZES } = require('../config/shop')

const variants = z
  .array(z.object({ size: z.enum(SIZES), stock: z.coerce.number().int().min(0).max(100000) }))
  .refine((v) => new Set(v.map((x) => x.size)).size === v.length, 'Each size can appear only once')

const fields = {
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug may only use a-z, 0-9 and dashes'),
  name: z.string().trim().min(1, 'Name is required').max(120),
  color: z.string().trim().max(60),
  price: z.coerce.number().min(0).max(100000),
  description: z.string().trim().max(2000),
  imagePosition: z.string().trim().max(40),
  sortOrder: z.coerce.number().int(),
  isActive: z.boolean(),
  variants,
}

const createProduct = z.object(fields).partial().required({ slug: true, name: true, price: true })

const updateProduct = z
  .object(fields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update')

const updateStock = z.object({ variants })

const removeImage = z.object({ url: z.string().min(1) })

const listProducts = z.object({
  q: z.string().trim().max(100).optional(),
  active: z.enum(['true', 'false', '']).optional(),
})

module.exports = { createProduct, updateProduct, updateStock, removeImage, listProducts }
