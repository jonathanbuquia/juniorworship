import {
  allowMethods,
  buildInternalEmail,
  createAnonServerClient,
  createServiceClient,
  normalizeLoginName,
  parseBody,
  sendJson,
} from './_lib/supabase.js'

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) {
    return
  }

  try {
    const body = parseBody(req.body)
    const displayName = String(body.displayName || '').trim()
    const loginName = normalizeLoginName(body.loginName)
    const password = String(body.password || '')

    if (!displayName || !loginName || !password) {
      return sendJson(res, 400, { error: 'Display name, login name, and password are required.' })
    }

    if (password.length < 6) {
      return sendJson(res, 400, { error: 'Password must be at least 6 characters long.' })
    }

    const admin = createServiceClient()
    const { data: existingAdmins, error: adminLookupError } = await admin
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1)

    if (adminLookupError) {
      return sendJson(res, 500, { error: adminLookupError.message })
    }

    if (existingAdmins?.length) {
      return sendJson(res, 409, { error: 'An admin account already exists. Please sign in instead.' })
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
      return sendJson(res, 400, { error: createError?.message || 'Unable to create the admin user.' })
    }

    const { error: profileError } = await admin.from('profiles').upsert({
      id: createdUser.user.id,
      display_name: displayName,
      login_name: loginName,
      login_email: loginEmail,
      role: 'admin',
    })

    if (profileError) {
      return sendJson(res, 400, { error: profileError.message })
    }

    const anon = createAnonServerClient()
    const { data: sessionData, error: signInError } = await anon.auth.signInWithPassword({
      email: loginEmail,
      password,
    })

    if (signInError || !sessionData.session) {
      return sendJson(res, 500, { error: signInError?.message || 'Admin created, but sign-in failed.' })
    }

    return sendJson(res, 200, {
      session: sessionData.session,
      user: {
        displayName,
        loginName,
      },
    })
  } catch (error) {
    return sendJson(res, 500, { error: error.message || 'Unable to create the admin account.' })
  }
}
