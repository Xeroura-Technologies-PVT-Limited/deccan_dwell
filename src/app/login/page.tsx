import { LoginForm } from "@/components/AuthForms";

export const metadata = { title: "Sign in", robots: { index: false, follow: true }, alternates: { canonical: null } };

export default function LoginPage() {
  return <LoginForm portal="guest" />;
}
