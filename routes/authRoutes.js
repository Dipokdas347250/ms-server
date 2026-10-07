const express = require('express')
const { changePassword, login, logout, me, register, registerStatus, updateProfile } = require('../controllers/authController')
const { protect } = require('../middleware/authMiddleware')
const { loginLimiter, registerLimiter } = require('../middleware/rateLimitMiddleware')
const v = require('../validators/authValidator')
const validate = require('../validators/validate')

const router = express.Router()

router.get('/register', registerStatus)
router.post('/register', registerLimiter, validate(v.register), register)
router.post('/login', loginLimiter, validate(v.login), login)
router.post('/logout', protect, logout)
router.get('/me', protect, me)
router.patch('/profile', protect, validate(v.updateProfile), updateProfile)
router.put('/password', protect, validate(v.changePassword), changePassword)

module.exports = router
