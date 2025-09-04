import React from "react";

export function Label({ children, className = "", ...props }) {
  return (
    <label {...props} className={`text-sm font-medium ${className}`}>
      {children}
    </label>
  );
}

