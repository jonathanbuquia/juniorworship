import {
  allowMethods,
  buildInternalEmail,
  createServiceClient,
  normalizeLoginName,
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
    const loginName = normalizeLoginName(body.loginName)
    const password = String(body.password || '')
    const startingGold = Number(body.startingGold)

    if (!displayName || !loginName || !password) {
      return sendJson(res, 400, { error: 'Display name, login name, and password are required.' })
    }

    if (password.length < 6) {
      return sendJson(res, 400, { error: 'Password must be at least 6 characters long.' })
    }

    if (!Number.isInteger(startingGold) || startingGold < 0) {
      return sendJson(res, 400, { error: 'Starting gold must be a whole number that is zero or higher.' })
    }

    const loginEmail = buildInternalEmail(loginName)
    const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
      email: loginEmail,
      password,
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
      login_name: loginName,
      login_email: loginEmail,
      role: 'player',
    })

    if (profileError) {
      return sendJson(res, 400, { error: profileError.message })
    }

    return sendJson(res, 200, {
      player: {
        displayName,
        loginName,
        startingGold,
      },
    })
  } catch (error) {
    return sendJson(res, 500, { error: error.message || 'Unable to create the player account.' })
  }
}
