const express = require('express')
const { createAdmin, listAdmins, updateAdmin } = require('../controllers/adminController')
const { superadminOnly } = require('../middleware/adminMiddleware')
const { protect } = require('../middleware/authMiddleware')
const v = require('../validators/authValidator')
const validate = require('../validators/validate')

const router = express.Router()

router.use(protect, superadminOnly)
router.get('/', listAdmins)
router.post('/', validate(v.createAdmin), createAdmin)
router.patch('/:id', validate(v.updateAdmin), updateAdmin)

module.exports = router
