export function getAttendanceDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function getTodaysRewardPlayers(players, attendance, date = new Date()) {
  const dateId = getAttendanceDateKey(date)
  return players.filter((player) => !player.attendance_hidden && attendance[`${player.id}:${dateId}`] === true)
}
