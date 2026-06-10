// src\lib\ai\search.ts
// Time range → PostgreSQL interval
export function getTimeRangeFilter(
  timeRange: string
): string | null {
  const map: Record<string, string> = {
    today: 'now() - interval \'1 day\'',
    this_week: 'now() - interval \'7 days\'',
    this_month: 'now() - interval \'30 days\'',
    last_3_months: 'now() - interval \'90 days\'',
    all_time: '',
  }
  return map[timeRange] ?? null
}

// Build readable time label
export function getTimeLabel(timeRange: string): string {
  const map: Record<string, string> = {
    today: 'Today',
    this_week: 'This week',
    this_month: 'This month',
    last_3_months: 'Last 3 months',
    all_time: 'All time',
  }
  return map[timeRange] ?? 'All time'
}