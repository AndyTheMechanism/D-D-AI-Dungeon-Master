import React from 'react';

const D20Icon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <path d="M12 2l10 7-4 11H6L2 9l10-7z" />
    <path d="M2 9l4 11" />
    <path d="M22 9l-4 11" />
    <path d="M6 20h12" />
    <path d="M12 2v7.5" />
    <path d="M12 21.5V14" />
    <path d="M4.7 15.5L12 14" />
    <path d="M19.3 15.5L12 14" />
  </svg>
);

export default D20Icon;
