const express = require('express')
const c = require('../controllers/videoController')
const { protect } = require('../middleware/authMiddleware')
const v = require('../validators/videoValidator')
const validate = require('../validators/validate')

const router = express.Router()

// Public
router.get('/', c.listPublic)

// Admin
router.get('/admin/all', protect, c.listAll)
router.post('/', protect, validate(v.createVideo), c.create)
router.put('/reorder', protect, validate(v.reorderVideos), c.reorder)
router.patch('/:id', protect, validate(v.updateVideo), c.update)
router.delete('/:id', protect, c.remove)

module.exports = router
