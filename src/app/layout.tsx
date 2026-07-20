import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "맞춤 청년정책",
  description: "내 프로필에 맞는 청년정책을 찾아주는 서비스",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const isAdmin = session?.user?.id
    ? (await prisma.user.findUnique({ where: { id: session.user.id }, select: { isAdmin: true } }))
        ?.isAdmin ?? false
    : false;

  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {session?.user && (
          <nav className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 text-sm backdrop-blur">
            <div className="mx-auto flex w-full max-w-xl items-center justify-between">
              <div className="flex items-center gap-4 font-medium text-slate-600">
                <Link href="/policies" className="font-bold text-violet-600">
                  청년정책
                </Link>
                <Link href="/profile" className="hover:text-slate-900">
                  프로필
                </Link>
                <Link href="/documents" className="hover:text-slate-900">
                  서류함
                </Link>
                {isAdmin && (
                  <Link href="/admin" className="text-violet-600 hover:text-violet-700">
                    관리자
                  </Link>
                )}
              </div>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button type="submit" className="text-slate-400 hover:text-slate-600">
                  로그아웃
                </button>
              </form>
            </div>
          </nav>
        )}
        {children}
      </body>
    </html>
  );
}
