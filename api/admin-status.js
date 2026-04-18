import { allowMethods, createServiceClient, sendJson } from './_lib/supabase.js'

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) {
    return
  }

  try {
    const admin = createServiceClient()
    const { data, error } = await admin
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1)

    if (error) {
      return sendJson(res, 500, { error: error.message })
    }

    return sendJson(res, 200, { hasAdmin: Boolean(data?.length) })
  } catch (error) {
    return sendJson(res, 500, { error: error.message })
  }
}
