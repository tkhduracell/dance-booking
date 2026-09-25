import { redirect } from "next/navigation";

// F2-R2: no separate sign-up; /register always redirects to /login.
export default function RegisterPage() {
  redirect("/login");
}
