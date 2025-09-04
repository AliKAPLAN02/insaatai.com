import React from "react";

export function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={`w-full rounded-md border px-3 py-2 outline-none focus:ring focus:ring-blue-200 ${className}`}
    />
  );
}
