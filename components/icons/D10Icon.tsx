import React from 'react';

const D10Icon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <path d="M12 2 2 9.5l10 10.5 10-10.5L12 2z" />
    <path d="m2 9.5 10 2 10-2" />
  </svg>
);

export default D10Icon;
