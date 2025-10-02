import React from 'react';

const GenerateIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="m5 3-3 3 3 3" />
    <path d="m3 5 3-3 3 3" />
    <path d="M12 21a9 9 0 0 0 9-9" />
    <path d="M21 12h-3.5" />
    <path d="M21 3v2" />
    <path d="M19.5 5.5 18 7" />
    <path d="M12 3h.01" />
    <path d="M5.5 19.5 7 18" />
  </svg>
);

export default GenerateIcon;
