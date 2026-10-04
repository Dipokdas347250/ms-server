const { z } = require('zod')

const key = z.string().trim().max(300)

// Omitted fields are left alone; an empty string clears the value.
const updateSettings = z.object({
  steadfast: z.object({ apiKey: key, secretKey: key }).partial().optional(),
  meta: z
    .object({
      pixelId: z.string().trim().regex(/^\d{0,20}$/, 'Pixel ID is the number from Meta Events Manager'),
      accessToken: z.string().trim().max(500),
      testEventCode: z.string().trim().max(40),
    })
    .partial()
    .optional(),
})

module.exports = { updateSettings }
