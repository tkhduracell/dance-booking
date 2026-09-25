import { SignInForm } from "@/app/components/auth/sign-in-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Logga in - Gasasteget",
};

export default function SignInPage() {
  return <SignInForm />;
}
