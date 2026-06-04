import React from 'react';

/**
 * High-quality responsive SVG representation of the FlipStudy Brand Logo
 * Features: An open book with white and pink folding pages, crowned by an arching sakura (cherry blossom) branch.
 */
export function FlipStudyLogo({ className = "w-12 h-12", showText = false, textClassName = "" }) {
  return (
    <div className={`flex items-center gap-3 ${showText ? '' : 'justify-center'}`}>
      <svg
        viewBox="0 0 200 160"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Cherry Blossom Sakura Branch */}
        <path
          d="M 50 55 C 65 35, 110 32, 145 42"
          stroke="#5C4033"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 120 38 C 130 30, 142 35, 150 40"
          stroke="#5C4033"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* Sakura Blossoms (Pink Flowers & Buds) */}
        {/* Flower 1 - Left */}
        <g transform="translate(58, 48)">
          <circle cx="0" cy="0" r="5" fill="#FF8DA1" />
          <circle cx="-5" cy="-5" r="4" fill="#FFD1DC" opacity="0.95" />
          <circle cx="5" cy="-5" r="4" fill="#FFD1DC" opacity="0.95" />
          <circle cx="-6" cy="4" r="4" fill="#FFD1DC" opacity="0.95" />
          <circle cx="6" cy="4" r="4" fill="#FFD1DC" opacity="0.95" />
          <circle cx="0" cy="7" r="4" fill="#FFD1DC" opacity="0.95" />
          <circle cx="0" cy="0" r="1.5" fill="#F48FB1" />
        </g>

        {/* Flower 2 - Middle */}
        <g transform="translate(90, 36)">
          <circle cx="0" cy="0" r="6" fill="#FF8DA1" />
          <circle cx="-6" cy="-6" r="5" fill="#FFB7C5" />
          <circle cx="6" cy="-6" r="5" fill="#FFB7C5" />
          <circle cx="-7" cy="5" r="5" fill="#FFB7C5" />
          <circle cx="7" cy="5" r="5" fill="#FFB7C5" />
          <circle cx="0" cy="8" r="5" fill="#FFB7C5" />
          <circle cx="0" cy="0" r="2" fill="#E91E63" />
        </g>

        {/* Flower 3 - Right */}
        <g transform="translate(132, 41)">
          <circle cx="0" cy="0" r="5" fill="#FF8DA1" />
          <circle cx="-4" cy="-5" r="4.2" fill="#FFD1DC" />
          <circle cx="4" cy="-5" r="4.2" fill="#FFD1DC" />
          <circle cx="-5" cy="4" r="4.2" fill="#FFD1DC" />
          <circle cx="5" cy="4" r="4.2" fill="#FFD1DC" />
          <circle cx="0" cy="6.5" r="4.2" fill="#FFD1DC" />
          <circle cx="0" cy="0" r="1.5" fill="#F48FB1" />
        </g>

        {/* Falling Petals */}
        <g transform="translate(155, 52)">
          <path d="M 0 0 C 3 -3, 8 -1, 7 4 C 6 8, 1 9, -1 6 Z" fill="#FFB7C5" transform="rotate(15)" />
        </g>
        <g transform="translate(168, 62)">
          <path d="M 0 0 C 3 -3, 8 -1, 7 4 C 6 8, 1 9, -1 6 Z" fill="#FFD1DC" transform="rotate(45) scale(0.8)" />
        </g>

        {/* Backdrop Glow of the Book */}
        <ellipse cx="100" cy="115" rx="72" ry="30" fill="#FFF0F3" opacity="0.4" />

        {/* Book Cover (Base Shadow / Dark edges) */}
        <path
          d="M 28 116 L 96 128 C 98 128.5, 102 128.5, 104 128 L 172 116 C 176 115, 178 117, 175 121 L 105 133 C 102 133.5, 98 133.5, 96 133 L 25 121 C 22 117, 24 115, 28 116 Z"
          fill="#333333"
        />

        {/* Left Side Pages (White base) */}
        <path
          d="M 32 114 Q 65 116, 96 125 L 96 85 Q 65 74, 32 78 Z"
          fill="#FFFFFF"
          stroke="#4D4D4D"
          strokeWidth="1.5"
        />
        {/* Book shadow effect inside binding */}
        <path
          d="M 91 123.5 Q 94 124.5, 96 125 L 96 85 Q 94 84.5, 91 83.5 Z"
          fill="#E5E5E5"
        />

        {/* Right Side Pages (Vibrant Pink theme representing FlipStudy's gorgeous pages) */}
        <path
          d="M 168 114 Q 135 116, 104 125 L 104 85 Q 135 74, 168 78 Z"
          fill="#FFB7C5"
          stroke="#FF8DA1"
          strokeWidth="1"
        />
        
        {/* Extra curling pink flipping page on active study */}
        <path
          d="M 104 85 C 122 75, 148 64, 155 78 C 160 88, 130 115, 104 125 Z"
          fill="#FF8DA1"
          stroke="#E91E63"
          strokeWidth="1.2"
          opacity="0.9"
        />
        <path
          d="M 104 85 C 118 78, 138 72, 144 82 C 148 90, 126 112, 104 125 Z"
          fill="#FFD1DC"
          opacity="0.85"
        />
      </svg>
      {showText && (
        <div className="flex flex-col select-none">
          <span className={`font-sans font-black tracking-tight text-zinc-900 dark:text-white uppercase ${textClassName || 'text-base sm:text-lg'}`}>
            Flip<span className="text-rose-600 dark:text-rose-400">Study</span>
          </span>
          <p className="text-[8px] uppercase font-mono tracking-widest text-zinc-500 dark:text-gray-400 font-bold leading-none mt-0.5">
            YOUR STUDY COMPANION
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * High-quality responsive SVG representation of the Sora AI Chatbot Logo
 * Features: Cute round astronaut chatbot head with blue glowing eyes in a blue-indigo-purple chat-bubble circular frame.
 */
export function SoraChatbotLogo({ className = "w-10 h-10" }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Background cosmic galaxy bubble gradient */}
        <radialGradient id="cosmicBg" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
          <stop offset="0%" stopColor="#251E3E" />
          <stop offset="60%" stopColor="#120D24" />
          <stop offset="100%" stopColor="#0B0716" />
        </radialGradient>
        
        {/* Circular Speech outline gradient */}
        <linearGradient id="bubbleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" /> {/* Sky Blue */}
          <stop offset="45%" stopColor="#818CF8" /> {/* Indigo */}
          <stop offset="100%" stopColor="#C084FC" /> {/* Violet */}
        </linearGradient>

        {/* Visor glowing glass gradient */}
        <linearGradient id="glassVisor" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0E091E" />
          <stop offset="100%" stopColor="#241B45" />
        </linearGradient>

        {/* Robot white helmet shadow */}
        <radialGradient id="helmetShade" cx="50%" cy="30%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="85%" stopColor="#E0DBEC" />
          <stop offset="100%" stopColor="#C6C0D9" />
        </radialGradient>
      </defs>

      {/* Outer circular speech frame with gradients */}
      <circle cx="60" cy="56" r="48" fill="url(#cosmicBg)" />
      
      {/* Dialogue Bubble tail shape */}
      <path
        d="M 23 88 C 21 95, 14 104, 11 106 C 10.5 106.5, 11.5 107.2, 12.2 106.8 C 17 103, 33 94, 33 94"
        stroke="url(#bubbleGradient)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="url(#cosmicBg)"
      />
      
      {/* Circle speech stroke */}
      <circle cx="60" cy="56" r="48" stroke="url(#bubbleGradient)" strokeWidth="4.5" />

      {/* Sparkle / Star twinkle context */}
      <path
        d="M 85 28 Q 87 31, 91 32 Q 87 33, 85 36 Q 83 33, 79 32 Q 83 31, 85 28 Z"
        fill="#FFFFFF"
        opacity="0.9"
      />
      <circle cx="44" cy="31" r="1" fill="#FFFFFF" opacity="0.6" />
      <circle cx="28" cy="48" r="0.8" fill="#FFFFFF" opacity="0.5" />

      {/* -- Robot Body Trunk -- */}
      <ellipse cx="60" cy="85" rx="22" ry="11" fill="url(#helmetShade)" stroke="#4C3A80" strokeWidth="1" />
      {/* Light blue collar indicator */}
      <path d="M 48 80 Q 60 85, 72 80" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />

      {/* -- Robot Antenna -- */}
      <path d="M 60 36 L 60 25" stroke="url(#helmetShade)" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="60" cy="22" r="4.5" fill="#818CF8" />
      <circle cx="60" cy="22" r="2.5" fill="#38BDF8" />

      {/* -- Helmet Side Audio Rings (Ears) -- */}
      <g transform="translate(35, 54)">
        <ellipse cx="0" cy="0" rx="4.5" ry="8" fill="#818CF8" stroke="#4C3A80" strokeWidth="1" />
        <ellipse cx="-2" cy="0" rx="1.5" ry="4" fill="#38BDF8" />
      </g>
      <g transform="translate(85, 54)">
        <ellipse cx="0" cy="0" rx="4.5" ry="8" fill="#818CF8" stroke="#4C3A80" strokeWidth="1" />
        <ellipse cx="2" cy="0" rx="1.5" ry="4" fill="#38BDF8" />
      </g>

      {/* -- Robot Main Circular Head Helmet -- */}
      <circle cx="60" cy="54" r="24.5" fill="url(#helmetShade)" stroke="#302456" strokeWidth="0.8" />

      {/* -- Dark Visor Shield Face Glass -- */}
      <rect x="42" y="42" width="36" height="23" rx="10" fill="url(#glassVisor)" stroke="#5C4D8C" strokeWidth="1" />

      {/* -- Friendly Smart Glowing Blue Curved Eyes (Visor Content) -- */}
      {/* Left Eye */}
      <path
        d="M 48 51 Q 52 46, 56 51"
        stroke="#38BDF8"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Right Eye */}
      <path
        d="M 64 51 Q 68 46, 72 51"
        stroke="#38BDF8"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Tiny happy glowing face smile below eyes */}
      <path
        d="M 58 57.5 Q 60 59.5, 62 57.5"
        stroke="#38BDF8"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />

      {/* Glass reflection highlight overlay */}
      <path
        d="M 45 46 A 8 8 0 0 1 54 44"
        stroke="#FFFFFF"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.35"
      />
    </svg>
  );
}
