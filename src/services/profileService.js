export async function fetchProfileById(client, userId) {
  const { data, error } = await client
    .from('profiles')
    .select('id, display_name, gold, login_name, role')
    .eq('id', userId)
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function applySupabaseSession(client, session) {
  if (!client || !session) {
    return
  }

  await client.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  })
}

export async function signOutSupabaseSession(client) {
  if (!client) {
    return
  }

  await client.auth.signOut()
}
