const express = require('express')
const c = require('../controllers/orderController')
const { protect } = require('../middleware/authMiddleware')
const { orderLimiter, trackLimiter } = require('../middleware/rateLimitMiddleware')
const v = require('../validators/orderValidator')
const validate = require('../validators/validate')

const router = express.Router()

// Public
router.post('/', orderLimiter, validate(v.placeOrder), c.placeOrder)
router.get('/track/:orderId', trackLimiter, validate(v.track, 'query'), c.trackOrder)

// Admin
router.use(protect)
router.get('/', validate(v.listOrders, 'query'), c.listOrders)
router.get('/:id', c.getOrder)
router.patch('/:id/status', validate(v.updateStatus), c.updateStatus)
router.patch('/:id', validate(v.updateOrder), c.updateOrder)
router.post('/:id/courier', c.sendToCourier)
router.post('/:id/courier/sync', c.syncCourier)

module.exports = router
