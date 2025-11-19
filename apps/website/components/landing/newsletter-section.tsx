"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export default function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setStatus("error");
      setMessage("Please enter your email address");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_address: email,
          first_name: firstName || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage("Thanks for subscribing! Check your email to confirm.");
        setEmail("");
        setFirstName("");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch (error) {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  return (
    <section className="mx-auto max-w-[80rem] px-6 md:px-8">
      <div className="py-20">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-violet-500/10 p-12 text-center">
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-4xl font-bold lg:text-5xl bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
              Stay Updated
            </h2>
            <p className="mt-4 text-xl text-gray-300">
              Get the latest tips, tutorials, and updates on AI agent workflows delivered to your inbox.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="text"
                  placeholder="First name (optional)"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={status === "loading"}
                  className="flex-1 h-12 bg-black/40 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-500/50"
                />
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === "loading"}
                  required
                  className="flex-1 h-12 bg-black/40 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-500/50"
                />
                <Button
                  type="submit"
                  size="lg"
                  disabled={status === "loading"}
                  className="h-12 px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                >
                  {status === "loading" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Subscribing...
                    </>
                  ) : (
                    "Subscribe"
                  )}
                </Button>
              </div>

              {message && (
                <p
                  className={`text-sm ${
                    status === "success"
                      ? "text-emerald-400"
                      : status === "error"
                      ? "text-red-400"
                      : "text-gray-400"
                  }`}
                >
                  {message}
                </p>
              )}
            </form>

            <p className="mt-4 text-sm text-gray-400">
              No spam. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
