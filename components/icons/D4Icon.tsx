import React from 'react';

const D4Icon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <path d="M12 2 3 22h18L12 2z" />
    <path d="m3 22 9-12" />
    <path d="M21 22 12 10" />
  </svg>
);

export default D4Icon;
