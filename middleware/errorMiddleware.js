const mongoose = require('mongoose')
const multer = require('multer')
const { HttpError } = require('../utils/response')

function notFound(req, res) {
  res.status(404).json({ success: false, error: `Not found: ${req.method} ${req.originalUrl}` })
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  let status = 500
  let error = 'Something went wrong'
  let details

  if (err instanceof HttpError) {
    status = err.status
    error = err.message
    details = err.details
  } else if (err instanceof multer.MulterError) {
    status = 400
    error = err.code === 'LIMIT_FILE_SIZE' ? 'Each image must be 3 MB or smaller' : err.message
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400
    error = Object.values(err.errors)[0]?.message || 'Invalid data'
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400
    error = `Invalid ${err.path}`
  } else if (err?.code === 11000) {
    status = 409
    error = `${Object.keys(err.keyValue || {})[0] || 'Value'} already exists`
  } else if (err?.type === 'entity.parse.failed') {
    status = 400
    error = 'Invalid JSON body'
  }

  if (status >= 500) console.error(err)
  res.status(status).json({ success: false, error, details })
}

module.exports = { notFound, errorHandler }
