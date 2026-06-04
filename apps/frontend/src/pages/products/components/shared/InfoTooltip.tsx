import React from "react";

export const InfoTooltip: React.FC<{ text: string }> = ({ text }) => (
  <div className="relative flex items-center group">
    <div className="mr-2 text-gray-400 hover:text-indigo-500 cursor-help transition-colors">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </div>
    <div className="absolute bottom-full right-0 mb-2 hidden w-64 p-3 bg-gray-900 border border-gray-700 text-white text-xs rounded-lg shadow-xl group-hover:block z-50 animate-fade-in-up">
      <div className="relative">
        {text}
        <div className="absolute top-full right-4 -mb-1 w-2 h-2 bg-gray-900 border-b border-l border-gray-700 transform -translate-x-1/2 -rotate-45"></div>
      </div>
    </div>
  </div>
);
