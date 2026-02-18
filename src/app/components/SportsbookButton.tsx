interface SportsbookButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  fullWidth?: boolean;
  className?: string;
}

export function SportsbookButton({ 
  children, 
  onClick, 
  variant = 'primary',
  fullWidth = true,
  className = ''
}: SportsbookButtonProps) {
  const baseClasses = "h-[52px] rounded-[10px] font-bold transition-all btn-pressed text-base";
  
  const variantClasses = {
    primary: "bg-accent-green text-white dark:glow-green",
    ghost: "bg-transparent border-2 border-accent-green text-accent-green",
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
