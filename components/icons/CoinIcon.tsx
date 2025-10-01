import React from 'react';

const CoinIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <circle cx="12" cy="12" r="10" />
    <path d="M12 17.77L15.29 20l-1.18-4.21 3.39-2.73-4.38-.38L12 8.77l-1.12 3.91-4.38.38 3.39 2.73L8.71 20l3.29-2.23z" />
  </svg>
);

export default CoinIcon;
