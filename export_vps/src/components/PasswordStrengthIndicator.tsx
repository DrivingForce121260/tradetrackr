import React from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
}

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ password }) => {
  const getPasswordStrength = (password: string) => {
    let score = 0;
    const feedback: string[] = [];

    // Mindestlö¤nge
    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('Mindestens 8 Zeichen');
    }

    // GroöŸbuchstaben
    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Mindestens ein GroöŸbuchstabe');
    }

    // Kleinbuchstaben
    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Mindestens ein Kleinbuchstabe');
    }

    // Zahlen
    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push('Mindestens eine Zahl');
    }

    // Sonderzeichen
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Mindestens ein Sonderzeichen');
    }

    return { score, feedback };
  };

  const { score, feedback } = getPasswordStrength(password);
  const maxScore = 5;

  const getStrengthColor = () => {
    if (score <= 2) return 'text-red-500';
    if (score <= 3) return 'text-orange-500';
    if (score <= 4) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStrengthText = () => {
    if (score <= 2) return 'Schwach';
    if (score <= 3) return 'Mittel';
    if (score <= 4) return 'Gut';
    return 'Stark';
  };

  const getStrengthIcon = () => {
    if (score <= 2) return <XCircle className="h-4 w-4" />;
    if (score <= 3) return <AlertCircle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  if (!password) return null;

  return (
    <div className="space-y-2">
      {/* Stö¤rke-Balken */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getStrengthColor().replace('text-', 'bg-')}`}
            style={{ width: `${(score / maxScore) * 100}%` }}
          />
        </div>
        <span className={`text-sm font-medium ${getStrengthColor()}`}>
          {getStrengthText()}
        </span>
        {getStrengthIcon()}
      </div>

      {/* Feedback-Liste */}
      <div className="space-y-1">
        {feedback.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-xs text-gray-600">
            <XCircle className="h-3 w-3 text-red-500" />
            {item}
          </div>
        ))}
        {score === maxScore && (
          <div className="flex items-center gap-2 text-xs text-green-600">
            <CheckCircle className="h-3 w-3" />
            Passwort erfüllt alle Anforderungen
          </div>
        )}
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator;

