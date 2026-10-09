import { requestJson } from './http.js'

export const fetchProgram = () => requestJson('/api/program')
export const fetchSongLibrary = () => requestJson('/api/program/songs')
export const saveProgram = (program) => requestJson('/api/program', {
  method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(program),
})
