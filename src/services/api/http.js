export async function readJson(response) {
  return response.json().catch(() => ({}))
}

export async function requestJson(url, options = {}) {
  const response = await fetch(url, options)
  const data = await readJson(response)

  if (!response.ok) {
    throw new Error(data.error || 'Request failed.')
  }

  return data
}
