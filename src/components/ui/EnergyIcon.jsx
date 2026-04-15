import React from 'react'
import s from './EnergyIcon.module.css'

function FlowerPetal({ active }) {
  const fill   = active ? '#ED93B1' : 'var(--bg-muted)'
  const center = active ? '#D4537E' : 'var(--border-medium)'
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" className={s.petal}>
      <g transform="translate(10,10)">
        <ellipse rx="2.8" ry="5.2" cx="0" cy="-6.5" fill={fill} transform="rotate(0)"   opacity="0.95"/>
        <ellipse rx="2.8" ry="5.2" cx="0" cy="-6.5" fill={fill} transform="rotate(72)"  opacity="0.95"/>
        <ellipse rx="2.8" ry="5.2" cx="0" cy="-6.5" fill={fill} transform="rotate(144)" opacity="0.88"/>
        <ellipse rx="2.8" ry="5.2" cx="0" cy="-6.5" fill={fill} transform="rotate(216)" opacity="0.95"/>
        <ellipse rx="2.8" ry="5.2" cx="0" cy="-6.5" fill={fill} transform="rotate(288)" opacity="0.95"/>
        <circle r="2.8" fill={center}/>
        <circle r="1.4" fill={active ? '#FBEAF0' : 'transparent'}/>
      </g>
    </svg>
  )
}

function FlamePetal({ active }) {
  const outer = active ? '#EF9F27' : 'var(--bg-muted)'
  const inner = active ? '#FCDE5A' : 'var(--border-soft)'
  return (
    <svg width="18" height="22" viewBox="0 0 18 22" className={s.petal}>
      <g transform="translate(9,11)">
        <path d="M0,-10 C3,-6 6,-2 4,3 C3,6 1,7 0,9 C-1,7 -3,6 -4,3 C-6,-2 -3,-6 0,-10Z" fill={outer}/>
        <path d="M0,-5 C2,-2 3,1 2,4 C1,6 0,7 0,8 C0,7 -1,6 -2,4 C-3,1 -2,-2 0,-5Z" fill={inner}/>
      </g>
    </svg>
  )
}

function GemPetal({ active }) {
  const fill  = active ? '#7F77DD' : 'var(--bg-muted)'
  const light = active ? '#CECBF6' : 'var(--border-soft)'
  const dark  = active ? '#534AB7' : 'var(--border-medium)'
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" className={s.petal}>
      <g transform="translate(8,9)">
        <polygon points="0,-8 6,-2 4,7 -4,7 -6,-2" fill={fill}/>
        <polygon points="0,-8 6,-2 0,-1"            fill={light} opacity="0.9"/>
        <polygon points="0,-8 -6,-2 0,-1"           fill={dark}  opacity="0.7"/>
        <polygon points="4,7 -4,7 0,-1"             fill={dark}  opacity="0.55"/>
      </g>
    </svg>
  )
}

const ICON_MAP = {
  female:  FlowerPetal,
  male:    FlamePetal,
  neutral: GemPetal,
}

/**
 * EnergyIcon
 * @param {string}  gender   — 'female' | 'male' | 'neutral'
 * @param {number}  used     — sorts used today
 * @param {number}  limit    — sorts limit (5 free, 50 pro)
 */
export default function EnergyIcon({ gender = 'neutral', used = 0, limit = 5 }) {
  const Petal = ICON_MAP[gender] ?? GemPetal
  const remaining = Math.max(0, limit - used)

  return (
    <div className={s.wrap} title={`${remaining} of ${limit} sorts remaining today`}>
      <div className={s.petals}>
        {Array.from({ length: limit }, (_, i) => (
          <Petal key={i} active={i < remaining} />
        ))}
      </div>
      <span className={s.label}>{remaining}/{limit}</span>
    </div>
  )
}
