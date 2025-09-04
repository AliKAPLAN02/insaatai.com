import React from "react";

export function Checkbox({ checked, onCheckedChange, className = "", ...props }) {
  const handleChange = (e) => onCheckedChange && onCheckedChange(e.target.checked);
  return (
    <input
      type="checkbox"
      checked={!!checked}
      onChange={handleChange}
      className={`h-4 w-4 rounded border-gray-300 ${className}`}
      {...props}
    />
  );
}
