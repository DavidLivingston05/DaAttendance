const Logo = ({ className = "h-12 w-auto" }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 760 140"
      width="100%"
      height="100%"
      className={className}
    >
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FF5E3A"/>
          <stop offset="60%" stopColor="#FF9233"/>
          <stop offset="100%" stopColor="#FFC300"/>
        </linearGradient>

        <filter id="cleanGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feComponentTransfer in="blur" result="glowCore">
            <feFuncA type="linear" slope="0.6"/>
          </feComponentTransfer>
          <feComposite in="SourceGraphic" in2="glowCore" operator="over"/>
        </filter>
      </defs>

      <g transform="translate(10, 10)">
        <rect x="0" y="45" width="9" height="40" rx="4.5" fill="#FF5E3A" />
        <rect x="16" y="25" width="9" height="80" rx="4.5" fill="url(#logoGrad)" />
        <rect x="32" y="5" width="9" height="120" rx="4.5" fill="url(#logoGrad)" filter="url(#cleanGlow)" />
        <rect x="48" y="20" width="9" height="90" rx="4.5" fill="url(#logoGrad)" />
        <rect x="64" y="40" width="9" height="50" rx="4.5" fill="#FF9233" />
        <rect x="80" y="30" width="9" height="70" rx="4.5" fill="url(#logoGrad)" />
        <rect x="96" y="50" width="9" height="30" rx="4.5" fill="#FFC300" />
        
        <path d="M-10,65 L-2,65 M107,65 L115,65" stroke="#FFC300" strokeWidth="3" strokeLinecap="round" opacity="0.8"/>
      </g>

      <text x="145" y="102" 
            fontFamily="system-ui, -apple-system, sans-serif" 
            fontSize="82" 
            fontWeight="800" 
            fill="#FFFFFF" 
            letterSpacing="-2">Da</text>

      <text x="260" y="102" 
            fontFamily="system-ui, -apple-system, sans-serif" 
            fontSize="82" 
            fontWeight="800" 
            fill="url(#logoGrad)" 
            letterSpacing="-2">Song</text>

      <text x="485" y="100" 
            fontFamily="system-ui, -apple-system, sans-serif" 
            fontSize="20" 
            fontWeight="600" 
            fill="#A0A0AA" 
            letterSpacing="9">STUDIO</text>

      <circle cx="735" cy="92" r="4.5" fill="#FF9233" filter="url(#cleanGlow)"/>
    </svg>
  );
};

export default Logo;
