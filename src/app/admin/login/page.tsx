import { LoginForm } from "@/components/AuthForms";

export const metadata = { title: "Front desk sign in", robots: { index: false, follow: true }, alternates: { canonical: null } };

export default function AdminLoginPage() {
  return <LoginForm portal="admin" />;
}
