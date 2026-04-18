import {
  allowMethods,
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
    const loginName = normalizeLoginName(body.loginName)
    const password = String(body.password || '')

    if (!loginName || !password) {
      return sendJson(res, 400, { error: 'Login name and password are required.' })
    }

    const admin = createServiceClient()
    const { data: profile, error: lookupError } = await admin
      .from('profiles')
      .select('login_email')
      .eq('login_name', loginName)
      .single()

    if (lookupError || !profile?.login_email) {
      return sendJson(res, 401, { error: 'Invalid login name or password.' })
    }

    const anon = createAnonServerClient()
    const { data, error } = await anon.auth.signInWithPassword({
      email: profile.login_email,
      password,
    })

    if (error || !data.session) {
      return sendJson(res, 401, { error: 'Invalid login name or password.' })
    }

    return sendJson(res, 200, { session: data.session })
  } catch (error) {
    return sendJson(res, 500, { error: error.message || 'Unable to sign in.' })
  }
}
