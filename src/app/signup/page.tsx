import { SignupForm } from "@/components/AuthForms";

export const metadata = { title: "Create an account", robots: { index: false, follow: true }, alternates: { canonical: null } };

export default function SignupPage() {
  return <SignupForm />;
}
