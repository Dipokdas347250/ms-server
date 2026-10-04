const express = require('express')
const c = require('../controllers/customerController')
const { protect } = require('../middleware/authMiddleware')
const v = require('../validators/customerValidator')
const validate = require('../validators/validate')

const router = express.Router()

router.use(protect)
router.get('/', validate(v.listCustomers, 'query'), c.listCustomers)
router.get('/:id', c.getCustomer)
router.patch('/:id', validate(v.updateCustomer), c.updateCustomer)

module.exports = router
