interface REPBadgeProps {
  percentage: number;
  size?: 'small' | 'medium' | 'large';
  showTooltip?: boolean;
  userName?: string;
}

export function REPBadge({ percentage, size = 'small', showTooltip, userName }: REPBadgeProps) {
  const getColor = () => {
    if (percentage >= 90) return 'gold';
    if (percentage >= 70) return 'accent-green';
    return 'accent-coral';
  };

  const color = getColor();
  
  const sizeClasses = {
    small: 'w-5 h-5 text-[8px]',
    medium: 'w-7 h-7 text-[10px]',
    large: 'w-10 h-10 text-xs'
  };

  return (
    <div className="relative inline-block" title={showTooltip && userName ? `${userName} completes ${percentage}% of punishments` : undefined}>
      <div className={`${sizeClasses[size]} rounded-full bg-${color} flex items-center justify-center font-black text-bg-primary tabular-nums border-2 border-bg-primary`}>
        {percentage}%
      </div>
    </div>
  );
}
