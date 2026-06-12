const Logo = ({ className = "h-12 w-auto" }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 550 160" 
      className={className}
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4A2E80" />
          <stop offset="40%" stopColor="#633175" />
          <stop offset="100%" stopColor="#A43A6D" />
        </linearGradient>
      </defs>

      {/* --- ICON GROUP --- */}
      <g fill="url(#logoGradient)">
        {/* The Open Book Base */}
        <path d="M 60 115 C 75 110, 95 90, 110 90 C 115 90, 118 105, 118 115 C 118 122, 100 135, 80 142 C 68 146, 62 144, 60 142 C 58 144, 52 146, 40 142 C 20 135, 2 122, 2 115 C 2 105, 5 90, 10 90 C 25 90, 45 110, 60 115 Z" />
        <path d="M 60 110 C 72 105, 90 82, 102 82 C 105 82, 112 100, 112 108 C 95 102, 75 116, 60 126 C 45 116, 25 102, 8 108 C 8 100, 15 82, 18 82 C 30 82, 48 105, 60 110 Z" opacity="0.85" />
        <path d="M 60 102 C 68 96, 85 75, 94 75 C 97 75, 104 94, 104 98 C 90 92, 72 108, 60 116 C 48 108, 30 92, 16 98 C 16 94, 23 75, 26 75 C 35 75, 52 96, 60 102 Z" opacity="0.7" />
        
        {/* The Interlocking Star */}
        <polygon points="60,10 76,43 111,43 83,64 93,98 60,77 27,98 37,64 9,43 44,43" />
        <polygon points="60,28 70,51 95,51 75,66 82,90 60,74 38,90 45,66 25,51 50,51" fill="#FFFFFF" />
        <polygon points="48,68 60,60 72,68 60,76" fill="url(#logoGradient)" />
      </g>

      {/* --- TYPOGRAPHY GROUP --- */}
      <text 
        x="135" 
        y="62" 
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
        fontSize="38" 
        fontWeight="800" 
        letterSpacing="0.5" 
        fill="#333333"
      >
        CHILDREN'S
      </text>
      <text 
        x="135" 
        y="98" 
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
        fontSize="38" 
        fontWeight="800" 
        letterSpacing="0.5" 
        fill="#333333"
      >
        MINISTRY
      </text>

      {/* "DaAttendance" - Sleek, Medium Weight Brand Identifier */}
      <text 
        x="135" 
        y="132" 
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
        fontSize="28" 
        fontWeight="500" 
        letterSpacing="0" 
        fill="#222222"
      >
        DaAttendance
      </text>
    </svg>
  );
};

export default Logo;
