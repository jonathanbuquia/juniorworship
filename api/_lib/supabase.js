/* global process, Buffer */

import { createClient } from '@supabase/supabase-js'

export function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

export function allowMethods(req, res, methods) {
  if (methods.includes(req.method)) {
    return true
  }

  res.setHeader('Allow', methods.join(', '))
  sendJson(res, 405, { error: 'Method not allowed.' })
  return false
}

export function parseBody(body) {
  if (!body) {
    return {}
  }

  if (typeof body === 'string') {
    return JSON.parse(body)
  }

  return body
}

export function normalizeLoginName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export function buildInternalEmail(loginName) {
  const normalized = normalizeLoginName(loginName)
  const slug = normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'player'
  const hash = Buffer.from(normalized, 'utf8').toString('hex').slice(0, 16)

  return `${slug}.${hash}@players.local`
}

export function createServiceClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Server env is missing Supabase configuration.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export function createAnonServerClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    throw new Error('Server env is missing Supabase anon configuration.')
  }

  return createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function getRequestUser(req, adminClient) {
  const authHeader = req.headers.authorization || ''
  const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim()

  if (!accessToken) {
    return { error: 'Missing access token.', status: 401 }
  }

  const {
    data: { user },
    error,
  } = await adminClient.auth.getUser(accessToken)

  if (error || !user) {
    return { error: 'Your session is not valid anymore.', status: 401 }
  }

  return { user }
}

export async function requireAdmin(req, adminClient) {
  const authResult = await getRequestUser(req, adminClient)

  if (authResult.error) {
    return authResult
  }

  const { data: profile, error } = await adminClient
    .from('profiles')
    .select('id, role, display_name')
    .eq('id', authResult.user.id)
    .single()

  if (error || !profile) {
    return { error: 'Your profile could not be loaded.', status: 403 }
  }

  if (profile.role !== 'admin') {
    return { error: 'Only admin accounts can perform this action.', status: 403 }
  }

  return {
    profile,
    user: authResult.user,
  }
}
