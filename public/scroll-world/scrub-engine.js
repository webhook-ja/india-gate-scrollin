/**
 * Portable scroll-scrub helper used by the Noor demo media pipeline.
 * It keeps seeking outside the scroll handler and can hydrate remote clips as
 * Blob URLs so static hosts without byte-range support still scrub correctly.
 */
export class ScrollScrubEngine {
  constructor({ clips, smoothing = 0.085, epsilon = 1 / 30 }) {
    this.clips = clips
    this.smoothing = smoothing
    this.epsilon = epsilon
    this.target = 0
    this.current = 0
    this.objectUrls = []
    this.frame = 0
    this.running = false
  }

  async hydrate() {
    await Promise.all(
      this.clips.map(async ({ element, src }) => {
        const response = await fetch(src)
        if (!response.ok) throw new Error(`Unable to load scrub clip: ${src}`)
        const url = URL.createObjectURL(await response.blob())
        this.objectUrls.push(url)
        element.src = url
        element.preload = 'auto'
        element.muted = true
        element.playsInline = true
        await new Promise((resolve) => {
          element.addEventListener('loadedmetadata', resolve, { once: true })
        })
      }),
    )
  }

  setProgress(progress) {
    this.target = Math.min(1, Math.max(0, progress))
  }

  start(onFrame) {
    if (this.running) return
    this.running = true

    const tick = () => {
      this.current += (this.target - this.current) * this.smoothing
      if (Math.abs(this.target - this.current) < 0.0001) this.current = this.target
      onFrame?.(this.current)
      this.frame = requestAnimationFrame(tick)
    }

    this.frame = requestAnimationFrame(tick)
  }

  seek(element, progress) {
    if (!Number.isFinite(element.duration) || element.duration <= 0) return
    const time = progress * Math.max(0, element.duration - 0.035)
    if (Math.abs(element.currentTime - time) > this.epsilon) {
      element.currentTime = time
    }
  }

  destroy() {
    this.running = false
    cancelAnimationFrame(this.frame)
    this.objectUrls.forEach((url) => URL.revokeObjectURL(url))
    this.objectUrls = []
  }
}
