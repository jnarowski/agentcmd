import { cn } from "@/client/utils/cn";
import { AuthFormCard } from "@/client/pages/auth/components/AuthFormCard";
import { LoadingButton } from "@/client/components/ui/loading-button";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/client/components/ui/field";
import { Input } from "@/client/components/ui/input";
import { Logo } from "@/client/components/Logo";
import type { FormEvent, ComponentProps } from "react";

interface LoginFormProps extends ComponentProps<"div"> {
  email: string;
  password: string;
  isLoading?: boolean;
  error?: string;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onSubmit: (e: FormEvent) => void;
  onSignUpClick?: () => void;
}

export function LoginForm({
  className,
  email,
  password,
  isLoading = false,
  error,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onSignUpClick,
  ...props
}: LoginFormProps) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex justify-center mb-2">
        <Logo size="lg" />
      </div>
      <AuthFormCard
        title="Login to your account"
        description="Enter your email below to login to your account"
        error={error}
        onSubmit={onSubmit}
      >
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            required
          />
        </Field>
        <Field>
          <LoadingButton
            type="submit"
            isLoading={isLoading}
            loadingText="Signing in..."
            className="w-full"
          >
            Login
          </LoadingButton>
          <FieldDescription className="text-center">
            Don&apos;t have an account?{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onSignUpClick?.();
              }}
              className="underline"
            >
              Sign up
            </a>
          </FieldDescription>
        </Field>
      </AuthFormCard>
    </div>
  );
}
