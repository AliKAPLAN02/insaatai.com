import React from "react";

export function Button({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`px-3 py-2 rounded-md border bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}
