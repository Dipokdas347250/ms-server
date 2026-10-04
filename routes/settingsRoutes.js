const express = require('express')
const c = require('../controllers/settingsController')
const { superadminOnly } = require('../middleware/adminMiddleware')
const { protect } = require('../middleware/authMiddleware')
const v = require('../validators/settingsValidator')
const validate = require('../validators/validate')

const router = express.Router()

router.get('/public', c.getPublicSettings)

router.use(protect)
router.get('/', c.getSettings)
router.put('/', superadminOnly, validate(v.updateSettings), c.updateSettings)
router.post('/steadfast/test', c.testSteadfast)

module.exports = router
