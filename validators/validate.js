const { httpError } = require('../utils/response')

// Parses req.body (or req.query) with a zod schema. Express 5's req.query is read-only,
// so parsed query params go on req.validQuery.
const validate =
  (schema, source = 'body') =>
  (req, _res, next) => {
    const result = schema.safeParse(source === 'query' ? req.query : (req.body ?? {}))
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
      const first = details[0]
      throw httpError(400, first.field ? `${first.field}: ${first.message}` : first.message, details)
    }
    if (source === 'query') req.validQuery = result.data
    else req.body = result.data
    next()
  }

module.exports = validate
