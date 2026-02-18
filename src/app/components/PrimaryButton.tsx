interface PrimaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  fullWidth?: boolean;
  className?: string;
}

export function PrimaryButton({ 
  children, 
  onClick, 
  variant = 'primary',
  fullWidth = true,
  className = ''
}: PrimaryButtonProps) {
  const baseClasses = "h-14 rounded-2xl font-medium transition-all btn-pressed";
  
  const variantClasses = {
    primary: "bg-accent-green text-bg-primary glow-green",
    ghost: "bg-transparent border border-accent-green text-accent-green",
    danger: "bg-accent-coral text-white"
  };
  
  const widthClass = fullWidth ? "w-full" : "";
  
  return (
    <button 
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${widthClass} ${className}`}
    >
      {children}
    </button>
  );
}
