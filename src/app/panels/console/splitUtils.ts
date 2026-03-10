const MIN_SPLIT_PERCENT = 20
const MAX_SPLIT_PERCENT = 80

export function getClampedSplitPercent(value: number) {
  return Math.max(MIN_SPLIT_PERCENT, Math.min(MAX_SPLIT_PERCENT, value))
}

export function getSplitPercentFromClientX(clientX: number, rect: DOMRect) {
  if (rect.width <= 0) {
    return null
  }

  const rawPercent = ((clientX - rect.left) / rect.width) * 100
  return getClampedSplitPercent(rawPercent)
}
