import type { ReactNode, FormEvent } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { ErrorAlert } from "@/client/components/ui/error-alert";
import { FieldGroup } from "@/client/components/ui/field";

export interface AuthFormCardProps {
  title: string;
  description: string;
  error?: string | null;
  onSubmit: (e: FormEvent) => void;
  children: ReactNode;
}

/**
 * Shared auth form card wrapper
 * Provides consistent layout for login and signup forms
 */
export function AuthFormCard({
  title,
  description,
  error,
  onSubmit,
  children,
}: AuthFormCardProps) {
  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ErrorAlert error={error} className="mb-4" />
        <form onSubmit={onSubmit}>
          <FieldGroup>{children}</FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
