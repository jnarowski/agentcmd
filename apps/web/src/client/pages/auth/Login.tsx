import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/client/stores/index";
import { LoginForm } from "@/client/pages/auth/components/LoginForm";
import { useDocumentTitle } from "@/client/hooks/useDocumentTitle";
import { RandomBackground } from "@/client/components/backgrounds/RandomBackground";
import type { FormEvent } from "react";

function Login() {
  useDocumentTitle("Login | Agent Workflows");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  // Read environment variable to control background rendering (defaults to enabled)
  const enableBackgrounds = import.meta.env.VITE_ENABLE_BACKGROUNDS !== "false";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError("Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUpClick = () => {
    navigate("/signup");
  };

  return (
    <>
      {enableBackgrounds && <RandomBackground />}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          <LoginForm
            email={email}
            password={password}
            isLoading={isLoading}
            error={error}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onSubmit={handleSubmit}
            onSignUpClick={handleSignUpClick}
          />
        </div>
      </div>
    </>
  );
}

export default Login;
