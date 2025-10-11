import React from 'react';

const CreatureTokenIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="black"
    strokeWidth="0.5"
    {...props}
  >
    <path d="M12,2A5,5,0,0,0,7,7a5,5,0,0,0,5,5,5,5,0,0,0,5-5A5,5,0,0,0,12,2Z M12,14c-4.42,0-8,1.79-8,4v2h16v-2C20,15.79,16.42,14,12,14Z" />
  </svg>
);

export default CreatureTokenIcon;
