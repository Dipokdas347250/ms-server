const { z } = require('zod')
const { ROLES } = require('../config/shop')

const email = z.string('Email is required').trim().toLowerCase().pipe(z.email('Enter a valid email'))
const password = z.string('Password is required').min(8, 'Password must be at least 8 characters').max(128)
const name = z.string('Name is required').trim().min(2, 'Name is too short').max(80)

const login = z.object({ email, password: z.string().min(1, 'Password is required') })

const changePassword = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: password,
})

const createAdmin = z.object({ name, email, password, role: z.enum(ROLES).default('admin') })

const register = z.object({ name, email, password })

const updateAdmin = z
  .object({ name, password, role: z.enum(ROLES), isActive: z.boolean() })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update')

module.exports = { login, register, changePassword, createAdmin, updateAdmin }
