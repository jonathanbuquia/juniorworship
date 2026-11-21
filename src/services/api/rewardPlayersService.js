import { fetchAttendanceRecords } from './attendanceService.js'
import { fetchPublicPlayers } from './playerService.js'
import { getTodaysRewardPlayers } from '../../features/attendance/rewardAttendance.js'

export async function fetchPresentRewardPlayers() {
  const [directory, records] = await Promise.all([fetchPublicPlayers(), fetchAttendanceRecords()])
  return getTodaysRewardPlayers(directory.players ?? [], records.attendance ?? {})
}
