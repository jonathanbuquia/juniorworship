// Shared by the shop and owned fish so their gradient colors always match.
export function getFishGradientStyle(item) {
  if (!item.gradientColors?.length) return {}
  const colors = item.gradientColors.join(', ')
  return {
    '--rare-body-gradient': `linear-gradient(110deg, ${colors})`,
    '--rare-fin-gradient': `linear-gradient(145deg, ${colors})`,
  }
}
