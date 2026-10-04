// Every response is { success, message?, data } or { success: false, error, details? }.

const ok = (res, data, message, status = 200) => res.status(status).json({ success: true, message, data })

class HttpError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

const httpError = (status, message, details) => new HttpError(status, message, details)

module.exports = { ok, httpError, HttpError }
