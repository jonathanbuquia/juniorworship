import { GOLD_PER_QUIZ_POINT } from '../app/constants.js'

export function buildQuizAwards(players, scores, maximumScore) {
  const awards = players.flatMap((player) => {
    const rawScore = String(scores[player.id] ?? '').trim()
    if (!rawScore) return []
    const score = Number(rawScore)
    if (!Number.isInteger(score) || score < 0 || score > maximumScore) {
      throw new Error(`Enter a whole score from 0 to ${maximumScore} for ${player.display_name}.`)
    }
    return [{ player, score, amount: score * GOLD_PER_QUIZ_POINT }]
  })
  if (!awards.length) throw new Error('Type at least one player score first.')
  return awards
}

export async function settleQuizAwards(awards, awardPlayer) {
  const settled = await Promise.allSettled(awards.map(async (award) => {
    if (!award.amount) return { player: award.player, bonusAwarded: false }
    return awardPlayer(award)
  }))
  const completed = []
  const failed = []
  settled.forEach((result, index) => {
    const award = awards[index]
    if (result.status === 'fulfilled') completed.push({ ...result.value, playerId: award.player.id, amount: award.amount })
    else failed.push({ playerId: award.player.id, message: `${award.player.display_name}: ${result.reason?.message || 'Reward could not be saved.'}` })
  })
  return { completed, failed }
}
