import { signIn } from "@/lib/auth";
import { isKakaoConfigured, isNaverConfigured } from "@/lib/social-providers";

export function SocialLoginButtons() {
  const kakaoReady = isKakaoConfigured();
  const naverReady = isNaverConfigured();

  return (
    <div className="flex flex-col gap-2">
      <form
        action={async () => {
          "use server";
          await signIn("kakao", { redirectTo: "/profile" });
        }}
      >
        <button
          type="submit"
          disabled={!kakaoReady}
          className="w-full rounded-xl bg-[#FEE500] px-3 py-2.5 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          {kakaoReady ? "카카오로 계속하기" : "카카오로 계속하기 (앱 키 설정 필요)"}
        </button>
      </form>
      <form
        action={async () => {
          "use server";
          await signIn("naver", { redirectTo: "/profile" });
        }}
      >
        <button
          type="submit"
          disabled={!naverReady}
          className="w-full rounded-xl bg-[#03C75A] px-3 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {naverReady ? "네이버로 계속하기" : "네이버로 계속하기 (앱 키 설정 필요)"}
        </button>
      </form>
      {(!kakaoReady || !naverReady) && (
        <p className="text-xs text-gray-400">
          KAKAO_CLIENT_ID / NAVER_CLIENT_ID 등을 .env에 넣으면 버튼이 활성화됩니다.
        </p>
      )}
    </div>
  );
}
