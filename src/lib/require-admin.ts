import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!user.isAdmin) {
    redirect("/policies");
  }

  return user;
}
