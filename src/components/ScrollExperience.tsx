import { useEffect, useMemo, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ChevronDown, VolumeX } from 'lucide-react'
import { scrollWorldConfig } from '../lib/scroll-world-config'
import { publicUrl } from '../lib/public-url'
import { FeastPath } from './FeastPath'
import { ShimmerButton } from './ui/ShimmerButton'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value))

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const x = clamp((value - edge0) / (edge1 - edge0))
  return x * x * (3 - 2 * x)
}

export function ScrollExperience() {
  const rootRef = useRef<HTMLElement>(null)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const sceneRefs = useRef<(HTMLElement | null)[]>([])
  const brandLogoRef = useRef<HTMLDivElement | null>(null)
  const brandNamasteRef = useRef<HTMLDivElement | null>(null)
  const brandBannerRef = useRef<HTMLImageElement | null>(null)
  const brandBackdropRef = useRef<HTMLDivElement | null>(null)
  const mediaRef = useRef<HTMLDivElement | null>(null)
  const chromeRef = useRef<HTMLDivElement | null>(null)
  const targetProgress = useRef(0)
  const renderedProgress = useRef(0)
  const frameRef = useRef<number>(0)
  const blobUrls = useRef<string[]>([])
  const [mediaSources, setMediaSources] = useState<string[]>([])
  const [ready, setReady] = useState(false)
  const [activeScene, setActiveScene] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)

  const clipRanges = useMemo(() => {
    const total = scrollWorldConfig.clips.reduce((sum, clip) => sum + clip.weight, 0)
    let cursor = 0
    return scrollWorldConfig.clips.map((clip) => {
      const start = cursor / total
      cursor += clip.weight
      return { start, end: cursor / total }
    })
  }, [])

  useEffect(() => {
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotionPreference = () => setReducedMotion(reduceQuery.matches)
    updateMotionPreference()
    reduceQuery.addEventListener('change', updateMotionPreference)
    return () => reduceQuery.removeEventListener('change', updateMotionPreference)
  }, [])

  useEffect(() => {
    let cancelled = false
    const mobile = window.matchMedia('(max-width: 720px)').matches

    const hydrateSources = async () => {
      if (reducedMotion) {
        setReady(true)
        return
      }

      const sources = await Promise.all(
        scrollWorldConfig.clips.map(async (clip) => {
          const source = mobile ? clip.mobileSrc : clip.src
          try {
            const response = await fetch(source)
            if (!response.ok) throw new Error(`Media unavailable: ${source}`)
            const blobUrl = URL.createObjectURL(await response.blob())
            blobUrls.current.push(blobUrl)
            return blobUrl
          } catch {
            return ''
          }
        }),
      )

      if (!cancelled) {
        setMediaSources(sources)
        setReady(true)
      }
    }

    void hydrateSources()

    return () => {
      cancelled = true
      blobUrls.current.forEach((url) => URL.revokeObjectURL(url))
      blobUrls.current = []
    }
  }, [reducedMotion])

  useGSAP(
    () => {
      if (!rootRef.current) return

      const trigger = ScrollTrigger.create({
        trigger: rootRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: scrollWorldConfig.scrub,
        onUpdate: (self) => {
          targetProgress.current = self.progress
        },
      })

      return () => trigger.kill()
    },
    { scope: rootRef },
  )

  useEffect(() => {
    const render = () => {
      const delta = targetProgress.current - renderedProgress.current
      renderedProgress.current += delta * scrollWorldConfig.smoothing
      if (Math.abs(delta) < 0.0001) renderedProgress.current = targetProgress.current

      const progress = renderedProgress.current
      rootRef.current?.style.setProperty('--scroll-progress', progress.toString())

      // Brand opener: silver namaste rises/shimmers, stack zooms, fades into food
      const brandEnd = scrollWorldConfig.brandIntroEnd
      const brandLocal = clamp(progress / brandEnd)
      const logoOpacity = 1 - smoothstep(0.52, 1, brandLocal)
      const backdropOpacity = 1 - smoothstep(0.3, 0.94, brandLocal)
      const logoScale = 1 + brandLocal * 0.72
      const mediaReveal = 0.28 + smoothstep(0.18, 0.95, brandLocal) * 0.72
      const mediaZoom = 1.05 - (mediaReveal - 0.28) * 0.05
      const chromeOpacity = smoothstep(0.7, 1, brandLocal)
      const namasteLift = (1 - brandLocal) * 10 - brandLocal * 18
      const namasteScale = 1 + brandLocal * 0.38
      const namasteTilt = Math.sin(brandLocal * Math.PI) * 6
      const bannerScale = 1 + brandLocal * 0.22

      if (brandBackdropRef.current) {
        gsap.set(brandBackdropRef.current, {
          autoAlpha: backdropOpacity,
          force3D: true,
        })
      }
      if (brandLogoRef.current) {
        gsap.set(brandLogoRef.current, {
          autoAlpha: logoOpacity,
          scale: logoScale,
          force3D: false,
          transformOrigin: '50% 42%',
        })
      }
      if (brandNamasteRef.current) {
        gsap.set(brandNamasteRef.current, {
          y: namasteLift,
          scale: namasteScale,
          rotation: namasteTilt,
          force3D: false,
          transformOrigin: '50% 70%',
        })
      }
      if (brandBannerRef.current) {
        gsap.set(brandBannerRef.current, {
          scale: bannerScale,
          y: brandLocal * 12,
          force3D: false,
          transformOrigin: '50% 50%',
        })
      }
      if (mediaRef.current) {
        const feastMix = smoothstep(
          scrollWorldConfig.feastPathStart,
          scrollWorldConfig.feastPathStart + 0.12,
          progress,
        )
        gsap.set(mediaRef.current, {
          autoAlpha: mediaReveal * (1 - feastMix * 0.42),
          scale: mediaZoom,
          force3D: true,
        })
      }
      if (chromeRef.current) {
        gsap.set(chromeRef.current, {
          autoAlpha: chromeOpacity,
          force3D: true,
        })
      }

      let clipIndex = clipRanges.findIndex(
        (range) => progress >= range.start && progress <= range.end,
      )
      if (clipIndex < 0) clipIndex = clipRanges.length - 1
      const range = clipRanges[clipIndex]
      const localProgress = clamp((progress - range.start) / (range.end - range.start))

      videoRefs.current.forEach((video, index) => {
        if (!video) return
        const isCurrent = index === clipIndex
        const isNext = index === clipIndex + 1
        const fadeStart = 1 - scrollWorldConfig.crossfade
        const fade =
          clipIndex < clipRanges.length - 1
            ? smoothstep(fadeStart, 1, localProgress)
            : 0

        // Soft mid-crossfade dip so scene changes feel less abrupt
        const blendDip = fade > 0 && fade < 1 ? Math.sin(Math.PI * fade) * 0.1 : 0
        rootRef.current?.style.setProperty('--blend-dip', blendDip.toFixed(3))

        video.style.opacity = isCurrent
          ? `${Math.max(0, 1 - fade)}`
          : isNext
            ? `${fade}`
            : '0'
        video.style.visibility = isCurrent || isNext ? 'visible' : 'hidden'

        const canSeek =
          video.readyState >= HTMLMediaElement.HAVE_METADATA &&
          Number.isFinite(video.duration) &&
          video.duration > 0

        if (canSeek && isCurrent) {
          const desiredTime = localProgress * Math.max(0, video.duration - 0.05)
          if (Math.abs(video.currentTime - desiredTime) > scrollWorldConfig.seekEpsilon) {
            video.currentTime = desiredTime
          }
        }

        // Keep the incoming clip parked at the first frames during the blend
        if (canSeek && isNext && fade > 0.01) {
          const incomingTime = Math.min(0.08, video.duration * 0.03)
          if (Math.abs(video.currentTime - incomingTime) > scrollWorldConfig.seekEpsilon) {
            video.currentTime = incomingTime
          }
        }
      })

      let nextActiveScene = 0
      scrollWorldConfig.scenes.forEach((scene, index) => {
        const element = sceneRefs.current[index]
        if (!element) return

        // First story card is silent — logo owns the opener
        if (index === 0) {
          gsap.set(element, { autoAlpha: 0, pointerEvents: 'none' })
          if (progress >= scene.start && progress <= scene.end) {
            nextActiveScene = index
          }
          return
        }

        const fadeIn =
          scene.start === 0 ? 1 : smoothstep(scene.start, scene.start + 0.08, progress)
        const fadeOut =
          scene.end === 1 ? 1 : 1 - smoothstep(scene.end - 0.08, scene.end, progress)
        const visibility = fadeIn * fadeOut
        const translate = (1 - fadeIn) * 10 - (1 - fadeOut) * 8

        gsap.set(element, {
          autoAlpha: visibility,
          y: translate,
          pointerEvents: visibility > 0.55 ? 'auto' : 'none',
        })

        if (progress >= scene.start && progress <= scene.end) {
          nextActiveScene = index
        }
      })

      setActiveScene((current) =>
        current === nextActiveScene ? current : nextActiveScene,
      )
      frameRef.current = window.requestAnimationFrame(render)
    }

    frameRef.current = window.requestAnimationFrame(render)
    return () => window.cancelAnimationFrame(frameRef.current)
  }, [clipRanges])

  return (
    <section
      id="inicio"
      className="scroll-world"
      ref={rootRef}
      style={{ height: `${scrollWorldConfig.scrollHeightVh}vh` }}
    >
      <div className="scroll-world__stage">
        <div className={`preloader ${ready ? 'preloader--hidden' : ''}`}>
          <span className="preloader__mandala" aria-hidden="true" />
          <p>Preparando la experiencia</p>
        </div>

        <div className="brand-backdrop" ref={brandBackdropRef} aria-hidden="true" />

        <div className="scroll-world__media" ref={mediaRef} aria-hidden="true">
          {scrollWorldConfig.clips.map((clip, index) => (
            <img
              className={`scroll-world__poster ${
                activeScene === index ||
                (index === scrollWorldConfig.clips.length - 1 &&
                  activeScene >= scrollWorldConfig.clips.length - 1)
                  ? 'scroll-world__poster--active'
                  : ''
              }`}
              src={clip.poster}
              alt=""
              key={clip.id}
              onLoad={() => index === 0 && reducedMotion && setReady(true)}
            />
          ))}
          {mediaSources.map((source, index) =>
            source ? (
              <video
                key={scrollWorldConfig.clips[index].id}
                ref={(element) => {
                  videoRefs.current[index] = element
                }}
                className="scroll-world__video"
                src={source}
                poster={scrollWorldConfig.clips[index].poster}
                muted
                playsInline
                preload="auto"
              />
            ) : null,
          )}
          <div className="scroll-world__vignette" />
          <div className="scroll-world__grain" />
          <div className="scroll-world__jaali scroll-world__jaali--left" />
          <div className="scroll-world__jaali scroll-world__jaali--right" />
        </div>

        <FeastPath progressRef={renderedProgress} reducedMotion={reducedMotion} />

        <div className="brand-logo-layer" ref={brandLogoRef}>
          <div className="brand-logo-stack">
            <div className="brand-logo-stack__namaste-wrap" ref={brandNamasteRef}>
              <div
                className="brand-logo-stack__namaste-metal"
                role="img"
                aria-label="India Gate"
              />
            </div>
            <img
              className="brand-logo-stack__banner"
              ref={brandBannerRef}
              src={publicUrl('brand/wordmark-banner.png?v=3')}
              alt="India Gate — Tres Hermanos Boadilla"
              width={1497}
              height={429}
              decoding="async"
            />
          </div>
          <p className="brand-logo-layer__hint">
            <ChevronDown aria-hidden="true" size={16} />
            Desliza para entrar
          </p>
        </div>

        <div className="scroll-world__chrome" ref={chromeRef}>
          <div className="sound-pill" aria-hidden="true">
            <VolumeX size={13} strokeWidth={1.5} />
            <span>Ambiente silenciado</span>
          </div>
          <div className="progress-rail" aria-hidden="true">
            <span className="progress-rail__line">
              <span className="progress-rail__fill" />
            </span>
            <span>{String(activeScene + 1).padStart(2, '0')}</span>
            <span className="progress-rail__separator">/</span>
            <span>{String(scrollWorldConfig.scenes.length).padStart(2, '0')}</span>
          </div>
        </div>

        <div className="story-layer">
          {scrollWorldConfig.scenes.map((scene, index) => (
            <article
              className={`story-card story-card--${scene.align}${
                index === 0 ? ' story-card--brand-silent' : ''
              }`}
              key={scene.id}
              ref={(element) => {
                sceneRefs.current[index] = element
              }}
            >
              {index === 0 ? (
                <h1 className="visually-hidden">{scene.title}</h1>
              ) : (
                <>
                  <div className="story-card__index">{scene.index}</div>
                  <p className="story-card__eyebrow">
                    <span aria-hidden="true" />
                    {scene.eyebrow}
                  </p>
                  <h1>{scene.title}</h1>
                  <p className="story-card__body">{scene.body}</p>
                  {scene.cta ? (
                    <ShimmerButton
                      label="Descubrir el menú"
                      onClick={() => {
                        window.location.hash = '#carta'
                      }}
                    />
                  ) : (
                    <p className="story-card__note">
                      <ChevronDown aria-hidden="true" size={15} />
                      {scene.note}
                    </p>
                  )}
                </>
              )}
            </article>
          ))}
        </div>

        <div className="bottom-ornament" aria-hidden="true">
          <span />
          <i />
          <span />
        </div>
      </div>
    </section>
  )
}
