const Setting = require('../models/Setting')
const { getIntegrationKeys } = require('../services/settingsService')
const steadfast = require('../services/steadfastService')
const { ok } = require('../utils/response')

// "abcd1234efgh" → "••••efgh". Secrets never leave the server in full.
const mask = (v) => (v ? `••••${v.slice(-4)}` : '')

async function view() {
  const keys = await getIntegrationKeys()
  return {
    steadfast: {
      apiKey: mask(keys.steadfast.apiKey),
      secretKey: mask(keys.steadfast.secretKey),
      connected: Boolean(keys.steadfast.apiKey && keys.steadfast.secretKey),
    },
    meta: {
      pixelId: keys.meta.pixelId,
      accessToken: mask(keys.meta.accessToken),
      testEventCode: keys.meta.testEventCode,
      conversionsApi: Boolean(keys.meta.pixelId && keys.meta.accessToken),
    },
  }
}

// GET /api/settings
async function getSettings(_req, res) {
  ok(res, await view())
}

// PUT /api/settings (superadmin) — only the fields sent are changed.
async function updateSettings(req, res) {
  const set = {}
  for (const group of ['steadfast', 'meta']) {
    for (const [key, value] of Object.entries(req.body[group] || {})) set[`${group}.${key}`] = value
  }
  await Setting.load()
  await Setting.updateOne({ _id: 'shop' }, { $set: set })
  ok(res, await view(), 'Settings saved')
}

// POST /api/settings/steadfast/test — checks the keys by reading the account balance.
async function testSteadfast(_req, res) {
  const balance = await steadfast.getBalance()
  ok(res, { balance }, `Steadfast connected · balance ৳${balance}`)
}

// GET /api/settings/public — what the storefront needs (the pixel ID is public anyway).
async function getPublicSettings(_req, res) {
  const { meta } = await getIntegrationKeys()
  res.set('Cache-Control', 'public, max-age=60')
  ok(res, { metaPixelId: meta.pixelId || null })
}

module.exports = { getSettings, updateSettings, testSteadfast, getPublicSettings }
