import { allowMethods, createServiceClient, requireAdmin, sendJson } from './_lib/supabase.js'

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) {
    return
  }

  try {
    const admin = createServiceClient()
    const adminResult = await requireAdmin(req, admin)

    if (adminResult.error) {
      return sendJson(res, adminResult.status, { error: adminResult.error })
    }

    const { data, error } = await admin
      .from('profiles')
      .select('id, display_name, login_name, gold, role, created_at')
      .eq('role', 'player')
      .order('display_name', { ascending: true })

    if (error) {
      return sendJson(res, 400, { error: error.message })
    }

    return sendJson(res, 200, {
      players: data ?? [],
    })
  } catch (error) {
    return sendJson(res, 500, { error: error.message || 'Unable to load players.' })
  }
}
