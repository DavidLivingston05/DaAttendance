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
        <linearGradient id="galaxyStarGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#9D16BD" />
          <stop offset="60%" stopColor="#D946EF" />
          <stop offset="100%" stopColor="#FF66D8" />
        </linearGradient>
        
        <linearGradient id="pureGalaxyText" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FF7BE5" />
          <stop offset="40%" stopColor="#D946EF" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
      </defs>

      <g transform="translate(5, 5) scale(0.35)">
        <path d="M 90 25 L 115 75 L 170 75 L 125 110 L 142 162 L 90 130 L 38 162 L 55 110 L 10 75 L 65 75 Z" 
              fill="none" 
              stroke="url(#galaxyStarGradient)" 
              strokeWidth="16" 
              strokeLinejoin="round" 
              strokeLinecap="round" />
              
        <polygon points="90,52 106,85 142,85 113,106 124,140 90,120 56,140 67,106 38,85 74,85" 
                fill="none" 
                stroke="url(#galaxyStarGradient)" 
                strokeWidth="6" 
                strokeLinejoin="round" 
                opacity="0.5" />
      </g>

      <text x="85" y="26" 
            fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" 
            fontSize="11" 
            fontWeight="700" 
            letterSpacing="4" 
            fill="#C084FC" 
            opacity="0.8">CHILDREN'S MINISTRY</text>

      <text x="85" y="56" 
            fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" 
            fontSize="34" 
            fontWeight="900" 
            letterSpacing="-0.5" 
            fill="url(#pureGalaxyText)">DaAttendance</text>
    </svg>
  );
};

export default Logo;
