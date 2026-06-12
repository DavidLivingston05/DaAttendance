const Logo = ({ className = "h-12 w-auto" }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 450 70"
      width="100%"
      height="100%"
      className={className}
    >
      <defs>
        <linearGradient id="nightStarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="50%" stopColor="#D946EF" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
        
        <linearGradient id="nightTextGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#D946EF" />
        </linearGradient>
      </defs>

      <g transform="translate(5, 5) scale(0.35)">
        <path d="M 90 25 L 115 75 L 170 75 L 125 110 L 142 162 L 90 130 L 38 162 L 55 110 L 10 75 L 65 75 Z" 
              fill="none" 
              stroke="url(#nightStarGradient)" 
              strokeWidth="16" 
              strokeLinejoin="round" 
              strokeLinecap="round" />
              
        <polygon points="90,52 106,85 142,85 113,106 124,140 90,120 56,140 67,106 38,85 74,85" 
                fill="none" 
                stroke="url(#nightStarGradient)" 
                strokeWidth="6" 
                strokeLinejoin="round" 
                opacity="0.6" />
      </g>

      <text x="85" y="26" 
            fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" 
            fontSize="11" 
            fontWeight="700" 
            letterSpacing="4" 
            fill="#9CA3AF">CHILDREN'S MINISTRY</text>

      <text x="85" y="56" 
            fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" 
            fontSize="32" 
            fontWeight="800" 
            letterSpacing="-0.5" 
            fill="url(#nightTextGradient)">DaAttendance</text>
    </svg>
  );
};

export default Logo;
