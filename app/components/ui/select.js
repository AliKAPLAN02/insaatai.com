import React from "react";

function flattenItems(children, out = []) {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const disp = child.type && child.type.displayName;

    if (disp === "SelectContent") {
      flattenItems(child.props.children, out);
    } else if (disp === "SelectItem") {
      out.push({ value: child.props.value, label: child.props.children });
    } else if (child.props && child.props.children) {
      flattenItems(child.props.children, out);
    }
  });
  return out;
}

function findPlaceholder(children) {
  let placeholder = "";
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const disp = child.type && child.type.displayName;
    if (disp === "SelectTrigger") {
      React.Children.forEach(child.props.children, (sub) => {
        if (React.isValidElement(sub) && sub.type && sub.type.displayName === "SelectValue") {
          placeholder = sub.props.placeholder || "";
        }
      });
    }
  });
  return placeholder;
}

export function Select({ value, onValueChange, children, className = "" }) {
  const options = flattenItems(children);
  const placeholder = findPlaceholder(children) || "Seçiniz";

  return (
    <select
      className={`w-full rounded-md border px-3 py-2 outline-none focus:ring focus:ring-blue-200 ${className}`}
      value={value || ""}
      onChange={(e) => onValueChange && onValueChange(e.target.value)}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function SelectTrigger({ children }) { return <>{children}</>; }
SelectTrigger.displayName = "SelectTrigger";

export function SelectValue() { return null; }
SelectValue.displayName = "SelectValue";

export function SelectContent({ children }) { return <>{children}</>; }
SelectContent.displayName = "SelectContent";

export function SelectItem({ value, children }) { return null; }
SelectItem.displayName = "SelectItem";
