const express = require('express')
const { changePassword, login, me, register } = require('../controllers/authController')
const { protect } = require('../middleware/authMiddleware')
const { loginLimiter, registerLimiter } = require('../middleware/rateLimitMiddleware')
const v = require('../validators/authValidator')
const validate = require('../validators/validate')

const router = express.Router()

router.post('/login', loginLimiter, validate(v.login), login)
router.post('/register', registerLimiter, validate(v.register), register)
router.get('/me', protect, me)
router.put('/password', protect, validate(v.changePassword), changePassword)

module.exports = router
