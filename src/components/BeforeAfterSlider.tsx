'use client'

import { useRef, useState, useCallback } from 'react'
import { MoveHorizontal } from 'lucide-react'

interface BeforeAfterSliderProps {
  beforeSrc: string
  afterSrc: string
  beforeLabel?: string
  afterLabel?: string
  containerStyle?: React.CSSProperties
}

/**
 * Draggable split-screen comparison slider.
 * The "after" image fills the stage; the "before" image is clipped
 * from the left up to the divider position.
 */
export default function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = 'Before',
  afterLabel = 'After',
  containerStyle,
}: BeforeAfterSliderProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const [pos, setPos] = useState(50)

  const updateFromClientX = useCallback((clientX: number) => {
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    const pct = ((clientX - rect.left) / rect.width) * 100
    setPos(Math.min(100, Math.max(0, pct)))
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    updateFromClientX(e.clientX)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragging.current) updateFromClientX(e.clientX)
  }
  const stopDrag = () => { dragging.current = false }

  return (
    <div
      ref={stageRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      style={{
        position: 'relative',
        userSelect: 'none',
        touchAction: 'none',
        cursor: 'ew-resize',
        overflow: 'hidden',
        ...containerStyle,
      }}
    >
      {/* After (edited) image — full stage */}
      <img
        src={afterSrc}
        alt={afterLabel}
        draggable={false}
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }}
      />

      {/* Before (original) image — clipped to the left of the divider */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          clipPath: `inset(0 ${100 - pos}% 0 0)`,
          pointerEvents: 'none',
        }}
      >
        <img
          src={beforeSrc}
          alt={beforeLabel}
          draggable={false}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      </div>

      {/* Divider + handle */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: `${pos}%`,
          width: 3,
          background: '#ffffff',
          boxShadow: '0 0 12px rgba(0,0,0,0.45)',
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: '#ffffff',
            boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#111827',
          }}
        >
          <MoveHorizontal size={20} strokeWidth={2.5} />
        </div>
      </div>

      {/* Corner labels */}
      <span style={{
        position: 'absolute', top: 12, left: 12, fontSize: 11, fontWeight: 800,
        letterSpacing: '0.6px', textTransform: 'uppercase',
        padding: '4px 10px', borderRadius: 9999,
        background: 'rgba(17,24,39,0.72)', color: '#ffffff', backdropFilter: 'blur(4px)',
        pointerEvents: 'none',
      }}>
        {beforeLabel}
      </span>
      <span style={{
        position: 'absolute', top: 12, right: 12, fontSize: 11, fontWeight: 800,
        letterSpacing: '0.6px', textTransform: 'uppercase',
        padding: '4px 10px', borderRadius: 9999,
        background: 'rgba(16,185,129,0.85)', color: '#ffffff', backdropFilter: 'blur(4px)',
        pointerEvents: 'none',
      }}>
        {afterLabel}
      </span>
    </div>
  )
}
