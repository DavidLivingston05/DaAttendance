const Logo = ({ className = "h-16 w-auto" }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 580 170" 
      className={className}
    >
      <defs>
        <linearGradient id="logoGradientLarge" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4A154B" />
          <stop offset="60%" stopColor="#6B21A8" />
          <stop offset="100%" stopColor="#9333EA" />
        </linearGradient>
      </defs>

      {/* --- ICON GROUP --- */}
      <g fill="url(#logoGradientLarge)">
        {/* 1. Geometric Outer Star */}
        <polygon points="85,12 107,58 156,58 116,86 131,133 85,104 39,133 54,86 14,58 63,58" />
        
        {/* 2. Inner Star Cutout */}
        <polygon points="85,35 99,65 132,65 106,84 116,115 85,95 54,115 64,84 38,65 71,65" fill="#FFFFFF" />
        
        {/* 3. Symmetric Open Book Base Layers */}
        {/* Bottom Layer */}
        <path d="M 85,122 C 102,116 130,99 153,99 C 161,99 164,113 164,122 C 164,130 141,145 113,153 C 96,158 88,155 85,153 C 82,155 74,158 57,153 C 29,145 6,130 6,122 C 6,113 9,99 17,99 C 40,99 68,116 85,122 Z" />
        
        {/* Middle Page Layer */}
        <path d="M 85,129 C 100,123 125,108 145,108 C 150,108 156,124 156,131 C 136,124 111,138 85,147 C 59,138 34,124 14,131 C 14,124 20,108 25,108 C 45,108 70,123 85,129 Z" opacity="0.85" />
        
        {/* Top Page Layer */}
        <path d="M 85,136 C 96,130 116,119 134,119 C 137,119 143,133 143,138 C 127,132 106,145 85,153 C 64,145 43,132 27,138 C 27,133 33,119 36,119 C 54,119 74,130 85,136 Z" opacity="0.7" />
        
        {/* Sharp baseline connection anchor */}
        <polygon points="71,90 85,80 99,90 85,100" fill="url(#logoGradientLarge)" />
      </g>

      {/* --- TYPOGRAPHY GROUP --- */}
      <text 
        x="185" 
        y="60" 
        fontFamily="system-ui, -apple-system, sans-serif" 
        fontSize="42" 
        fontWeight="800" 
        letterSpacing="0.75" 
        fill="#1F2937"
      >
        CHILDREN'S
      </text>
      
      <text 
        x="185" 
        y="100" 
        fontFamily="system-ui, -apple-system, sans-serif" 
        fontSize="42" 
        fontWeight="800" 
        letterSpacing="0.75" 
        fill="#1F2937"
      >
        MINISTRY
      </text>

      <text 
        x="185" 
        y="138" 
        fontFamily="system-ui, -apple-system, sans-serif" 
        fontSize="30" 
        fontWeight="600" 
        letterSpacing="0.2" 
        fill="#4B5563"
      >
        DaAttendance
      </text>
    </svg>
  );
};

export default Logo;
