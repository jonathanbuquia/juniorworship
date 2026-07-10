import {
  allowMethods,
  createServiceClient,
  parseBody,
  requireAdmin,
  sendJson,
} from './_lib/supabase.js'

const FALLBACK_ATTENDANCE_SLUG = 'system-attendance-records-v1'
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function createAttendanceKey(playerId, dateId) {
  return `${playerId}:${dateId}`
}

function isMissingAttendanceTable(error) {
  return error?.code === '42P01' || String(error?.message || '').includes('attendance_records')
}

function mapRowsToAttendance(rows = []) {
  return rows.reduce((attendance, row) => {
    if (row.player_id && row.date_id) {
      attendance[createAttendanceKey(row.player_id, row.date_id)] = Boolean(row.present)
    }

    return attendance
  }, {})
}

function mergeAttendance(...attendanceMaps) {
  return attendanceMaps.reduce(
    (merged, attendance) => ({
      ...merged,
      ...attendance,
    }),
    {},
  )
}

function parseFallbackAttendance(value) {
  try {
    const parsed = JSON.parse(value || '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function normalizeRecord(record) {
  const playerId = String(record.playerId || '').trim()
  const dateId = String(record.dateId || '').trim()

  if (!UUID_PATTERN.test(playerId)) {
    throw new Error('Attendance player id is not valid.')
  }

  if (!ISO_DATE_PATTERN.test(dateId)) {
    throw new Error('Attendance date is not valid.')
  }

  return {
    dateId,
    playerId,
    present: Boolean(record.present),
  }
}

async function readAttendanceFromTable(admin) {
  const { data, error } = await admin
    .from('attendance_records')
    .select('player_id, date_id, present')
    .order('date_id', { ascending: true })

  if (error) {
    throw error
  }

  return mapRowsToAttendance(data ?? [])
}

async function readAttendanceFromFallback(admin) {
  const { data, error } = await admin
    .from('shop_items')
    .select('description')
    .eq('slug', FALLBACK_ATTENDANCE_SLUG)
    .maybeSingle()

  if (error) {
    throw error
  }

  return parseFallbackAttendance(data?.description)
}

async function readAttendance(admin) {
  try {
    const [tableAttendance, fallbackAttendance] = await Promise.all([
      readAttendanceFromTable(admin),
      readAttendanceFromFallback(admin).catch(() => ({})),
    ])

    return mergeAttendance(fallbackAttendance, tableAttendance)
  } catch (error) {
    if (!isMissingAttendanceTable(error)) {
      throw error
    }

    return readAttendanceFromFallback(admin)
  }
}

async function writeAttendanceToTable(admin, records) {
  const rows = records.map((record) => ({
    date_id: record.dateId,
    player_id: record.playerId,
    present: record.present,
  }))

  const { error } = await admin
    .from('attendance_records')
    .upsert(rows, { onConflict: 'player_id,date_id' })

  if (error) {
    throw error
  }
}

async function writeAttendanceToFallback(admin, records) {
  const currentAttendance = await readAttendanceFromFallback(admin)
  const nextAttendance = { ...currentAttendance }

  records.forEach((record) => {
    nextAttendance[createAttendanceKey(record.playerId, record.dateId)] = record.present
  })

  const { error } = await admin.from('shop_items').upsert(
    {
      accent_color: '#68d8ff',
      description: JSON.stringify(nextAttendance),
      name: 'System Attendance Records',
      price: 0,
      slug: FALLBACK_ATTENDANCE_SLUG,
    },
    { onConflict: 'slug' },
  )

  if (error) {
    throw error
  }
}

async function writeAttendance(admin, records) {
  let wroteToTable = false

  try {
    await writeAttendanceToTable(admin, records)
    wroteToTable = true
  } catch (error) {
    if (!isMissingAttendanceTable(error)) {
      throw error
    }
  }

  await writeAttendanceToFallback(admin, records)

  if (!wroteToTable) {
    return readAttendanceFromFallback(admin)
  }

  return readAttendance(admin)
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET', 'POST'])) {
    return
  }

  try {
    const admin = createServiceClient()

    if (req.method === 'GET') {
      return sendJson(res, 200, {
        attendance: await readAttendance(admin),
      })
    }

    const adminResult = await requireAdmin(req, admin)

    if (adminResult.error) {
      return sendJson(res, adminResult.status, { error: adminResult.error })
    }

    const body = parseBody(req.body)
    const inputRecords = Array.isArray(body.records) ? body.records : [body]
    const records = inputRecords.map(normalizeRecord)

    if (!records.length) {
      return sendJson(res, 400, { error: 'No attendance records were provided.' })
    }

    return sendJson(res, 200, {
      attendance: await writeAttendance(admin, records),
    })
  } catch (error) {
    return sendJson(res, 500, { error: error.message || 'Unable to load attendance.' })
  }
}
