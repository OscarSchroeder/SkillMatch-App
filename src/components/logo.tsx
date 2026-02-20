export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="SkillMatch"
    >
      {/* "Skill Match" text */}
      <text
        x="0"
        y="46"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
        fontSize="42"
        fill="#6F42C1"
        letterSpacing="-1"
      >
        Skill Match
      </text>
      {/* Orange spark icon – top right */}
      <g transform="translate(195, 4)">
        {/* 8-ray spark / loader shape */}
        <rect x="9" y="0" width="4" height="8" rx="2" fill="#FFA14A" transform="rotate(0 11 11)" />
        <rect x="9" y="0" width="4" height="8" rx="2" fill="#FFA14A" transform="rotate(45 11 11)" opacity="0.85" />
        <rect x="9" y="0" width="4" height="8" rx="2" fill="#FFA14A" transform="rotate(90 11 11)" opacity="0.7" />
        <rect x="9" y="0" width="4" height="8" rx="2" fill="#FFA14A" transform="rotate(135 11 11)" opacity="0.55" />
        <rect x="9" y="0" width="4" height="8" rx="2" fill="#FFA14A" transform="rotate(180 11 11)" opacity="0.4" />
        <rect x="9" y="0" width="4" height="8" rx="2" fill="#FFA14A" transform="rotate(225 11 11)" opacity="0.3" />
        <rect x="9" y="0" width="4" height="8" rx="2" fill="#FFA14A" transform="rotate(270 11 11)" opacity="0.2" />
        <rect x="9" y="0" width="4" height="8" rx="2" fill="#FFA14A" transform="rotate(315 11 11)" opacity="0.1" />
      </g>
    </svg>
  )
}

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 22 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="SkillMatch icon"
    >
      <rect x="9" y="0" width="4" height="8" rx="2" fill="#FFA14A" transform="rotate(0 11 11)" />
      <rect x="9" y="0" width="4" height="8" rx="2" fill="#FFA14A" transform="rotate(45 11 11)" opacity="0.85" />
      <rect x="9" y="0" width="4" height="8" rx="2" fill="#FFA14A" transform="rotate(90 11 11)" opacity="0.7" />
      <rect x="9" y="0" width="4" height="8" rx="2" fill="#FFA14A" transform="rotate(135 11 11)" opacity="0.55" />
      <rect x="9" y="0" width="4" height="8" rx="2" fill="#FFA14A" transform="rotate(180 11 11)" opacity="0.4" />
      <rect x="9" y="0" width="4" height="8" rx="2" fill="#FFA14A" transform="rotate(225 11 11)" opacity="0.3" />
      <rect x="9" y="0" width="4" height="8" rx="2" fill="#FFA14A" transform="rotate(270 11 11)" opacity="0.2" />
      <rect x="9" y="0" width="4" height="8" rx="2" fill="#FFA14A" transform="rotate(315 11 11)" opacity="0.1" />
    </svg>
  )
}
