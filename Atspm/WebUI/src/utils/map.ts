export function isLatLng(x: unknown) {
  return (
    Array.isArray(x) &&
    x.length >= 2 &&
    typeof x[0] === 'number' &&
    typeof x[1] === 'number'
  )
}
