const Logo = ({ className = "h-12 w-auto" }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 600 160"
      width="100%"
      height="100%"
      className={className}
    >
      <defs>
        <linearGradient id="daGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7A22E0" />
          <stop offset="50%" stopColor="#9D16BD" />
          <stop offset="100%" stopColor="#E01177" />
        </linearGradient>
        
        <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1E1B4B" />
          <stop offset="100%" stopColor="#312E81" />
        </linearGradient>
      </defs>

      <g transform="translate(10, -10)">
        <path d="M 90 25 L 115 75 L 170 75 L 125 110 L 142 162 L 90 130 L 38 162 L 55 110 L 10 75 L 65 75 Z" 
              fill="none" 
              stroke="url(#daGradient)" 
              strokeWidth="14" 
              strokeLinejoin="round" 
              strokeLinecap="round" />
              
        <polygon points="90,52 106,85 142,85 113,106 124,140 90,120 56,140 67,106 38,85 74,85" 
                fill="none" 
                stroke="url(#daGradient)" 
                strokeWidth="6" 
                strokeLinejoin="round" 
                opacity="0.8" />
      </g>

      <text x="210" y="62" 
            fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" 
            fontSize="15" 
            fontWeight="800" 
            letterSpacing="6" 
            fill="#6B7280">CHILDREN'S MINISTRY</text>

      <text x="210" y="112" 
            fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" 
            fontSize="48" 
            fontWeight="900" 
            letterSpacing="-1" 
            fill="url(#textGradient)">DaAttendance</text>
    </svg>
  );
};

export default Logo;
