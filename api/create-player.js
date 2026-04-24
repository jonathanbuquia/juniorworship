import { randomUUID } from 'node:crypto'

import {
  allowMethods,
  buildInternalEmail,
  createServiceClient,
  parseBody,
  requireAdmin,
  sendJson,
} from './_lib/supabase.js'

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) {
    return
  }

  try {
    const admin = createServiceClient()
    const adminResult = await requireAdmin(req, admin)

    if (adminResult.error) {
      return sendJson(res, adminResult.status, { error: adminResult.error })
    }

    const body = parseBody(req.body)
    const displayName = String(body.displayName || '').trim()
    const startingGold = Number(body.startingGold)

    if (!displayName) {
      return sendJson(res, 400, { error: 'Display name is required.' })
    }

    if (!Number.isInteger(startingGold) || startingGold < 0) {
      return sendJson(res, 400, { error: 'Starting gold must be a whole number that is zero or higher.' })
    }

    const hiddenPlayerKey = `player ${randomUUID()}`
    const hiddenPassword = randomUUID()
    const loginEmail = buildInternalEmail(hiddenPlayerKey)
    const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
      email: loginEmail,
      password: hiddenPassword,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
      },
    })

    if (createError || !createdUser.user) {
      return sendJson(res, 400, {
        error: createError?.message || 'Unable to create the player account.',
      })
    }

    const { error: profileError } = await admin.from('profiles').upsert({
      id: createdUser.user.id,
      display_name: displayName,
      gold: startingGold,
      login_name: null,
      login_email: loginEmail,
      role: 'player',
    })

    if (profileError) {
      return sendJson(res, 400, { error: profileError.message })
    }

    return sendJson(res, 200, {
      player: {
        id: createdUser.user.id,
        displayName,
        startingGold,
      },
    })
  } catch (error) {
    return sendJson(res, 500, { error: error.message || 'Unable to create the player account.' })
  }
}
