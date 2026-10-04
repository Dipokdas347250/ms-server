const { z } = require('zod')
const { parseYouTube } = require('../utils/youtube')

// Accepts any YouTube link and adds the parsed youtubeId / isShort.
const url = z
  .string('YouTube link is required')
  .trim()
  .max(500)
  .transform((v, ctx) => {
    const parsed = parseYouTube(v)
    if (!parsed) ctx.addIssue({ code: 'custom', message: 'Paste a YouTube link, e.g. https://youtu.be/… or https://youtube.com/shorts/…' })
    return { url: v, ...parsed }
  })

const fields = {
  title: z.string().trim().max(150),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().int(),
}

// `url` turns into { url, youtubeId, isShort } on the body.
const flattenUrl = ({ url, ...rest }) => (url ? { ...rest, ...url } : rest)

const createVideo = z.object({ url, ...fields }).partial({ title: true, isActive: true, sortOrder: true }).transform(flattenUrl)

const updateVideo = z
  .object({ url, ...fields })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update')
  .transform(flattenUrl)

const reorderVideos = z.object({ ids: z.array(z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id')).min(1) })

module.exports = { createVideo, updateVideo, reorderVideos }
