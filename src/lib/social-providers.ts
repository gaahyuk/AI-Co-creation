// 카카오/네이버 개발자 콘솔에서 REST API 키를 발급받아 .env에 넣기 전까지는
// 소셜 로그인 버튼을 비활성 상태로 노출한다.
export function isKakaoConfigured(): boolean {
  return Boolean(process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET);
}

export function isNaverConfigured(): boolean {
  return Boolean(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET);
}
