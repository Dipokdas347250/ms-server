// Bangladesh time is UTC+6 all year.
const BD_OFFSET = 6 * 3600 * 1000

// YYYY-MM-DD in Bangladesh for a Date.
const bdDateKey = (date = new Date()) => new Date(date.getTime() + BD_OFFSET).toISOString().slice(0, 10)

// UTC instant when a Bangladesh day ("YYYY-MM-DD") starts.
const bdDayStart = (key) => new Date(new Date(`${key}T00:00:00Z`).getTime() - BD_OFFSET)

module.exports = { bdDateKey, bdDayStart }
