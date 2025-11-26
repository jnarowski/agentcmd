import { useState } from "react";
import { EyeIcon, EyeOffIcon, CopyIcon, CheckIcon } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Field, FieldContent, FieldLabel } from "@/client/components/ui/field";
import { cn } from "@/client/utils/cn";

interface SecretDisplayProps {
  secret: string;
  label?: string;
  className?: string;
}

export function SecretDisplay({ secret, label = "Webhook Secret", className }: SecretDisplayProps) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleReveal = () => setRevealed(!revealed);

  const maskedSecret = "*".repeat(32);
  const displayValue = revealed ? secret : maskedSecret;

  return (
    <Field className={className}>
      <FieldLabel>{label}</FieldLabel>
      <FieldContent>
        <div className="flex gap-2">
          <Input
            value={displayValue}
            readOnly
            className={cn(
              "flex-1 font-mono text-sm",
              !revealed && "select-none"
            )}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={toggleReveal}
            aria-label={revealed ? "Hide secret" : "Show secret"}
          >
            {revealed ? (
              <EyeOffIcon className="h-4 w-4" />
            ) : (
              <EyeIcon className="h-4 w-4" />
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleCopy}
            aria-label="Copy secret"
          >
            {copied ? (
              <CheckIcon className="h-4 w-4" />
            ) : (
              <CopyIcon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </FieldContent>
    </Field>
  );
}
