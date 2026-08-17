/** Prefix a public/ asset so it works on GitHub Pages (`/india-gate-scrollin/`). */
export function publicUrl(path: string) {
  const base = import.meta.env.BASE_URL
  const clean = path.replace(/^\//, '')
  return `${base}${clean}`
}
