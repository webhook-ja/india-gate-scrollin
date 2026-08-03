import { useEffect, useRef, type MutableRefObject } from 'react'
import gsap from 'gsap'
import { scrollWorldConfig, type FeastDish } from '../lib/scroll-world-config'

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value))

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const x = clamp((value - edge0) / (edge1 - edge0))
  return x * x * (3 - 2 * x)
}

type FeastPathProps = {
  progressRef: MutableRefObject<number>
  reducedMotion?: boolean
}

function dishPose(dish: FeastDish, progress: number, reducedMotion: boolean) {
  const mid = (dish.start + dish.end) / 2
  const span = Math.max(0.001, dish.end - dish.start)
  const local = clamp((progress - dish.start) / span)
  const approach = smoothstep(dish.start - 0.08, dish.start + span * 0.35, progress)
  const leave = 1 - smoothstep(dish.end - span * 0.35, dish.end + 0.06, progress)
  const visibility = approach * leave
  const hero = 1 - Math.min(1, Math.abs(progress - mid) / (span * 0.75))

  if (reducedMotion) {
    return {
      opacity: visibility > 0.2 ? clamp(0.35 + hero * 0.65) : 0,
      x: dish.lane * 18,
      y: (1 - hero) * 24,
      z: hero * 40,
      rotateX: 0,
      rotateY: dish.lane * -4,
      rotateZ: 0,
      scale: 0.82 + hero * 0.28,
      blur: 0,
    }
  }

  const pathY = (1 - local) * 140 - local * 90
  const depth = (1 - hero) * -280 - (1 - visibility) * 120
  const laneX = dish.lane * (118 + (1 - hero) * 70)

  return {
    opacity: clamp(visibility * (0.25 + hero * 0.85)),
    x: laneX,
    y: pathY + (1 - hero) * 40,
    z: depth + hero * 220,
    rotateX: 18 - hero * 16,
    rotateY: dish.lane * (-18 + hero * 10),
    rotateZ: dish.lane * (1 - hero) * 4,
    scale: 0.55 + hero * 0.55 + visibility * 0.08,
    blur: (1 - hero) * 2.5,
  }
}

export function FeastPath({ progressRef, reducedMotion = false }: FeastPathProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const plateRefs = useRef<(HTMLDivElement | null)[]>([])
  const frameRef = useRef(0)
  const pathStart = scrollWorldConfig.feastPathStart

  useEffect(() => {
    const tick = () => {
      const root = rootRef.current
      const progress = progressRef.current
      if (root) {
        const pathLocal = clamp((progress - pathStart) / (1 - pathStart))
        const pathVisible = smoothstep(pathStart - 0.02, pathStart + 0.08, progress)

        gsap.set(root, {
          autoAlpha: pathVisible,
          force3D: true,
        })

        scrollWorldConfig.feastDishes.forEach((dish, index) => {
          const el = plateRefs.current[index]
          if (!el) return
          const pose = dishPose(dish, progress, reducedMotion)
          gsap.set(el, {
            opacity: pose.opacity,
            x: pose.x,
            y: pose.y,
            z: pose.z,
            rotateX: pose.rotateX,
            rotateY: pose.rotateY,
            rotateZ: pose.rotateZ,
            scale: pose.scale,
            filter: pose.blur > 0.15 ? `blur(${pose.blur.toFixed(2)}px)` : 'none',
            force3D: true,
            transformPerspective: 1200,
          })
        })

        root.style.setProperty('--feast-path-local', pathLocal.toFixed(4))
      }
      frameRef.current = window.requestAnimationFrame(tick)
    }

    frameRef.current = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frameRef.current)
  }, [progressRef, reducedMotion, pathStart])

  return (
    <div className="feast-path" ref={rootRef} aria-hidden="true">
      <div className="feast-path__atmosphere" />
      <div className="feast-path__rail" />
      <div className="feast-path__stage">
        {scrollWorldConfig.feastDishes.map((dish, index) => (
          <div
            className={`feast-path__plate feast-path__plate--lane-${
              dish.lane === 0 ? 'center' : dish.lane < 0 ? 'left' : 'right'
            }`}
            key={dish.id}
            ref={(el) => {
              plateRefs.current[index] = el
            }}
          >
            <img src={`${dish.src}?v=feast2`} alt="" draggable={false} decoding="async" />
          </div>
        ))}
      </div>
    </div>
  )
}
