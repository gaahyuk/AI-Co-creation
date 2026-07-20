import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "./profile-form";
import { NewsletterSubscription } from "./newsletter-subscription";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
  });

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">내 프로필</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">
          정확한 정책 매칭을 위해 조건을 입력해주세요.
        </p>
        <ProfileForm
          defaults={{
            birthDate: profile?.birthDate
              ? profile.birthDate.toISOString().slice(0, 10)
              : undefined,
            regionCode: profile?.regionCode,
            jobStatus: profile?.jobStatus,
            incomeBracket: profile?.incomeBracket ?? undefined,
            incomeAmount: profile?.incomeAmount,
            major: profile?.major,
            phone: profile?.phone,
          }}
        />
      </div>

      <div className="mt-6">
        <NewsletterSubscription />
      </div>
    </div>
  );
}
