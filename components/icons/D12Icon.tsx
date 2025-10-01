import React from 'react';

const D12Icon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <path d="M12 2.69l5.23 4.05L21.5 12l-4.27 5.26L12 21.31l-5.23-4.05L2.5 12l4.27-5.26z" />
    <path d="M12 2.69v6.62" />
    <path d="M12 21.31v-6.62" />
    <path d="m2.5 12 5.06-2.02" />
    <path d="M21.5 12 16.44 9.98" />
  </svg>
);

export default D12Icon;
