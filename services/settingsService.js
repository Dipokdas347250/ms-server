const Setting = require('../models/Setting')

// Keys saved from the dashboard win; server/.env is the fallback.
async function getIntegrationKeys() {
  const s = await Setting.load()
  return {
    steadfast: {
      apiKey: s.steadfast.apiKey || process.env.STEADFAST_API_KEY || '',
      secretKey: s.steadfast.secretKey || process.env.STEADFAST_SECRET_KEY || '',
    },
    meta: {
      pixelId: s.meta.pixelId || process.env.META_PIXEL_ID || '',
      accessToken: s.meta.accessToken || process.env.META_ACCESS_TOKEN || '',
      testEventCode: s.meta.testEventCode || '',
    },
  }
}

module.exports = { getIntegrationKeys }
