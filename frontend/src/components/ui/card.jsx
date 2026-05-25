// file: src/components/ui/card.jsx

const Card = ({ className = '', children, ...props }) => (
  <div
    className={`rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}
    {...props}
  >
    {children}
  </div>
);

const CardHeader = ({ className = '', children, ...props }) => (
  <div className={`flex flex-col space-y-1.5 p-6 border-b border-slate-200 ${className}`} {...props}>
    {children}
  </div>
);

const CardContent = ({ className = '', children, ...props }) => (
  <div className={`p-6 pt-0 ${className}`} {...props}>
    {children}
  </div>
);

const CardTitle = ({ className = '', children, ...props }) => (
  <h2 className={`text-2xl font-semibold leading-none tracking-tight text-slate-900 ${className}`} {...props}>
    {children}
  </h2>
);

const CardDescription = ({ className = '', children, ...props }) => (
  <p className={`text-sm text-slate-500 ${className}`} {...props}>
    {children}
  </p>
);

const CardFooter = ({ className = '', children, ...props }) => (
  <div className={`flex items-center p-6 pt-0 ${className}`} {...props}>
    {children}
  </div>
);

export { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter };
