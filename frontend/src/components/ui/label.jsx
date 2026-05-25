// file: src/components/ui/label.jsx

const Label = ({ className = '', ...props }) => (
  <label
    className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700 ${className}`}
    {...props}
  />
);

export { Label };
