export const Spinner = ({ className = '' }: { className?: string }) => (
  <span
    role="status"
    aria-label="Loading"
    className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
  />
);
