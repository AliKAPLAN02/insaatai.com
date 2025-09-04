export function Card({ children, className }) {
    return <div className={`rounded-lg border p-4 ${className}`}>{children}</div>;
  }
  export function CardHeader({ children }) {
    return <div className="mb-2 font-semibold">{children}</div>;
  }
  export function CardTitle({ children }) {
    return <h2 className="text-lg font-bold">{children}</h2>;
  }
  export function CardContent({ children }) {
    return <div>{children}</div>;
  }
  