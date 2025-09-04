export function Button({ children, ...props }) {
    return (
      <button
        {...props}
        className={`px-3 py-2 rounded-md border bg-blue-600 text-white hover:bg-blue-700 ${props.className}`}
      >
        {children}
      </button>
    );
  }
  