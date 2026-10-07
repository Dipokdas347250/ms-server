const { z } = require('zod')
const { ROLES } = require('../config/shop')

const email = z.string('Email is required').trim().toLowerCase().pipe(z.email('Enter a valid email'))
const password = z.string('Password is required').min(8, 'Password must be at least 8 characters').max(128)

const name = z.string('Name is required').trim().min(2, 'Name is too short').max(80)

const register = z.object({ name, email, password })

const login = z.object({ email, password: z.string().min(1, 'Password is required') })

const changePassword = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: password,
})

const updateProfile = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    name: name.optional(),
    email: email.optional(),
    role: z.enum(ROLES).optional(),
  })
  .refine((v) => v.name !== undefined || v.email !== undefined || v.role !== undefined, 'Nothing to update')

module.exports = { register, login, updateProfile, changePassword }
