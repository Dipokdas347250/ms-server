const Video = require('../models/Video')
const { ok, httpError } = require('../utils/response')

const ORDER = { sortOrder: 1, createdAt: 1 }

const toPublic = (v) => ({ _id: v._id, title: v.title, url: v.url, youtubeId: v.youtubeId, isShort: v.isShort })

// GET /api/videos (public) — visible videos in display order.
async function listPublic(_req, res) {
  const videos = await Video.find({ isActive: true }).sort(ORDER)
  res.set('Cache-Control', 'public, max-age=30')
  ok(res, videos.map(toPublic))
}

// GET /api/videos/admin/all
async function listAll(_req, res) {
  ok(res, await Video.find().sort(ORDER))
}

// POST /api/videos — new videos go to the end unless sortOrder is given.
async function create(req, res) {
  if (req.body.sortOrder === undefined) {
    const last = await Video.findOne().sort({ sortOrder: -1 })
    req.body.sortOrder = last ? last.sortOrder + 1 : 0
  }
  const video = await Video.create(req.body)
  ok(res, video, 'Video added', 201)
}

// PATCH /api/videos/:id — title, url, isActive, sortOrder
async function update(req, res) {
  const video = await Video.findById(req.params.id)
  if (!video) throw httpError(404, 'Video not found')
  video.set(req.body)
  await video.save()
  ok(res, video, req.body.isActive === false ? 'Video hidden from the shop' : req.body.isActive ? 'Video is live in the shop' : 'Video saved')
}

// PUT /api/videos/reorder { ids: [...] } — the first id plays at the top of the shop.
async function reorder(req, res) {
  await Video.bulkWrite(req.body.ids.map((id, i) => ({ updateOne: { filter: { _id: id }, update: { $set: { sortOrder: i } } } })))
  ok(res, await Video.find().sort(ORDER), 'Order saved')
}

// DELETE /api/videos/:id
async function remove(req, res) {
  const video = await Video.findByIdAndDelete(req.params.id)
  if (!video) throw httpError(404, 'Video not found')
  ok(res, null, 'Video deleted')
}

module.exports = { listPublic, listAll, create, update, reorder, remove }
