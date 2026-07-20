"use client";

import { useState } from "react";

export function PolicyShare({
  policyId,
  policyTitle,
  amount,
}: {
  policyId: string;
  policyTitle: string;
  amount: number | null;
}) {
  const [copied, setCopied] = useState(false);

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://policy-match.com";
  const policyUrl = `${baseUrl}/policies/${policyId}`;
  const shareText = `${policyTitle}에 신청했어요! ${amount ? `약 ${(amount / 10000).toFixed(0)}만원 받을 수 있어요!` : ""}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(policyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKakaoShare = () => {
    if ((window as any).Kakao && (window as any).Kakao.isInitialized()) {
      (window as any).Kakao.Share.sendDefault({
        objectType: "feed",
        content: {
          title: policyTitle,
          description: shareText,
          imageUrl: `${baseUrl}/og-image.png`,
          link: {
            mobileWebUrl: policyUrl,
            webUrl: policyUrl,
          },
        },
      });
    }
  };

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(policyUrl)}`;
    window.open(twitterUrl, "_blank");
  };

  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(policyUrl)}`;
    window.open(facebookUrl, "_blank");
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h3 className="mb-4 font-bold text-slate-900">📤 공유하기</h3>

      <div className="grid gap-3">
        <button
          onClick={handleKakaoShare}
          className="flex items-center justify-center gap-2 rounded-lg bg-yellow-300 px-4 py-2.5 font-semibold text-yellow-900 hover:bg-yellow-400"
        >
          <span>💬</span> 카카오톡으로 공유
        </button>

        <button
          onClick={handleTwitterShare}
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-400 px-4 py-2.5 font-semibold text-white hover:bg-blue-500"
        >
          <span>𝕏</span> 트위터에 공유
        </button>

        <button
          onClick={handleFacebookShare}
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700"
        >
          <span>f</span> 페이스북에 공유
        </button>

        <button
          onClick={handleCopyLink}
          className="flex items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2.5 font-semibold text-slate-900 hover:bg-slate-200"
        >
          <span>🔗</span> {copied ? "복사됨!" : "링크 복사"}
        </button>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        이 정책을 친구들과 공유하면 함께 신청할 수 있어요!
      </p>
    </div>
  );
}
