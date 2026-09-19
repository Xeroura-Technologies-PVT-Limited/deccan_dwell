"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthFrame, buttonClass, fieldClass, labelClass } from "./AuthFrame";
import Link from "next/link";

export function LoginForm({
  portal,
}: {
  portal: "guest" | "admin";
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, intent: "login" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not sign in");
      if (portal === "admin" && data.user.role !== "admin") {
        throw new Error("This login is for the hotel team");
      }
      if (data.user.role === "admin") {
        router.push("/admin");
        router.refresh();
        return;
      }
      router.push("/?intro=0");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame
      kicker={portal === "admin" ? "Hotel desk" : "Guest"}
      title={portal === "admin" ? "Client login" : "Sign in"}
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <label className="block">
          <span className={labelClass}>Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={fieldClass}
          />
        </label>
        {error && <p className="text-sm text-red-300">{error}</p>}
        <button type="submit" disabled={loading} className={buttonClass}>
          {loading ? "Please wait…" : "Sign in"}
        </button>
      </form>
      {portal === "guest" && (
        <p className="mt-8 font-[family-name:var(--font-body)] text-sm text-[var(--dd-cream)]/60">
          New here?{" "}
          <Link href="/signup" className="text-[var(--dd-gold)]">
            Create an account
          </Link>
        </p>
      )}
    </AuthFrame>
  );
}

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "register",
          name,
          email,
          phone,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create account");
      router.push("/?intro=0");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame kicker="Guest" title="Create your stay">
      <form onSubmit={onSubmit} className="space-y-5">
        <label className="block">
          <span className={labelClass}>Full name</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
        </label>
        <label className="block">
          <span className={labelClass}>Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} />
        </label>
        <label className="block">
          <span className={labelClass}>Phone</span>
          <input required value={phone} onChange={(e) => setPhone(e.target.value)} className={fieldClass} />
        </label>
        <label className="block">
          <span className={labelClass}>Password</span>
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={fieldClass} />
        </label>
        {error && <p className="text-sm text-red-300">{error}</p>}
        <button type="submit" disabled={loading} className={buttonClass}>
          {loading ? "Please wait…" : "Create account"}
        </button>
      </form>
      <p className="mt-8 font-[family-name:var(--font-body)] text-sm text-[var(--dd-cream)]/60">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--dd-gold)]">
          Sign in
        </Link>
      </p>
    </AuthFrame>
  );
}
