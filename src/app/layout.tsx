import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "청년정책 - 나에게 맞는 정책 찾기",
  description: "내 정보로 신청 가능한 청년 정책을 추천받고 신청까지",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <div className="app">{children}</div>
      </body>
    </html>
  );
}
