const express = require('express')
const c = require('../controllers/productController')
const { protect } = require('../middleware/authMiddleware')
const { productImages } = require('../middleware/uploadMiddleware')
const v = require('../validators/productValidator')
const validate = require('../validators/validate')

const router = express.Router()

// Admin reads come before /:slug so "admin" isn't taken as a slug.
router.get('/admin/all', protect, validate(v.listProducts, 'query'), c.listAll)
router.get('/admin/:id', protect, c.getOne)

// Public
router.get('/', c.listPublic)
router.get('/:slug', c.getPublic)

// Admin writes
router.post('/', protect, validate(v.createProduct), c.create)
router.put('/:id', protect, validate(v.updateProduct), c.update)
router.patch('/:id/stock', protect, validate(v.updateStock), c.updateStock)
router.delete('/:id', protect, c.remove)
router.post('/:id/images', protect, productImages, c.uploadImages)
router.delete('/:id/images', protect, validate(v.removeImage), c.removeImage)

module.exports = router
