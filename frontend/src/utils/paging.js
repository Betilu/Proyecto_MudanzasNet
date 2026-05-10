/** Coincide con PAGE_SIZE del backend DRF */
export const PAGE_SIZE = 20

export function parsePagedResponse(data) {
  if (Array.isArray(data)) {
    return { results: data, count: data.length }
  }
  const results = data?.results ?? []
  const count =
    typeof data?.count === 'number' ? data.count : results.length
  return { results, count }
}

export function totalPages(count, pageSize = PAGE_SIZE) {
  return Math.max(1, Math.ceil(count / pageSize))
}
