interface PasswordStrengthMeterProps {
  password: string;
}

type StrengthLevel = 'weak' | 'medium' | 'strong';

interface StrengthConfig {
  label: string;
  color: string;
  bgColor: string;
  width: string;
}

function calculatePasswordStrength(password: string): StrengthLevel {
  const length = password.length;

  if (length === 0) return 'weak';
  if (length < 12) return 'weak';
  if (length < 16) return 'medium';
  return 'strong';
}

const strengthConfigs: Record<StrengthLevel, StrengthConfig> = {
  weak: {
    label: 'Weak',
    color: 'text-red-600',
    bgColor: 'bg-red-600',
    width: 'w-1/3',
  },
  medium: {
    label: 'Medium',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-600',
    width: 'w-2/3',
  },
  strong: {
    label: 'Strong',
    color: 'text-green-600',
    bgColor: 'bg-green-600',
    width: 'w-full',
  },
};

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) return null;

  const strength = calculatePasswordStrength(password);
  const config = strengthConfigs[strength];

  return (
    <div className="space-y-2">
      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${config.bgColor} transition-all duration-300 ease-in-out ${config.width}`}
        />
      </div>
      <p className={`text-sm font-medium ${config.color}`}>
        Password strength: {config.label}
      </p>
    </div>
  );
}
