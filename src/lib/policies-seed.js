import { supabase } from "./supabase";

export const seedPoliciesList = [
  {
    id: "policy-youth-rent",
    title: "청년월세 특별지원",
    category: "주거",
    min_age: 19,
    max_age: 34,
    eligible_locations: ["전국"],
    eligible_jobs: ["대학생", "취업준비생", "사회초년생"],
    income_limit: "100% 이하",
    benefit_amount: 2400000, // 최대 240만원
    deadline: "2026-12-31T23:59:59Z",
    description: "청년층의 주거비 부담 경감을 위해 실제 납부하는 월세를 최대 20만원까지 12개월 동안 지원하는 사업입니다.",
    required_documents: ["임대차계약서", "월세이체증빙서류", "주민등록등본"],
    reference_url: "https://www.bokjiro.go.kr"
  },
  {
    id: "policy-youth-saving",
    title: "청년도약계좌",
    category: "금융",
    min_age: 19,
    max_age: 34,
    eligible_locations: ["전국"],
    eligible_jobs: ["사회초년생", "소상공인"],
    income_limit: "150% 이하",
    benefit_amount: 50000000, // 최대 5000만원
    deadline: "2026-08-31T23:59:59Z",
    description: "청년의 중장기 자산형성을 돕기 위해 5년간 매월 일정 금액을 납입하면 정부 기여금과 비과세 혜택을 더해 만기 시 목돈을 돌려주는 계좌입니다.",
    required_documents: ["소득금액증명원"],
    reference_url: "https://ylaccount.kinfa.or.kr"
  },
  {
    id: "policy-youth-job",
    title: "국민취업지원제도 (I유형)",
    category: "일자리",
    min_age: 15,
    max_age: 34,
    eligible_locations: ["전국"],
    eligible_jobs: ["취업준비생"],
    income_limit: "120% 이하",
    benefit_amount: 3000000, // 최대 300만원
    deadline: "2026-11-30T23:59:59Z",
    description: "취업을 희망하는 청년들에게 취업지원서비스를 종합적으로 제공하고, 저소득 구직자에게는 최소한의 생계 안정을 위한 구직촉진수당(월 50만원씩 6개월)을 지급하는 제도입니다.",
    required_documents: ["구직등록필증", "주민등록등본"],
    reference_url: "https://www.kua.go.kr"
  },
  {
    id: "policy-incheon-dream",
    title: "인천 청년 드림체크카드",
    category: "금융",
    min_age: 19,
    max_age: 39,
    eligible_locations: ["인천"],
    eligible_jobs: ["취업준비생"],
    income_limit: "150% 이하",
    benefit_amount: 3000000, // 최대 300만원
    deadline: "2026-06-15T23:59:59Z", // 마감 임박 정책 예시!
    description: "인천에 거주하는 미취업 청년들의 적극적인 구직활동을 위해 매월 50만원씩 6개월간 총 300만원의 구직활동비를 체크카드 포인트 형태로 지원합니다.",
    required_documents: ["주민등록등본", "소득금액증명원"],
    reference_url: "https://youth.incheon.go.kr"
  }
];

export async function seedPolicies() {
  try {
    console.log("[Seeding] 정책 데이터 시딩 확인 시작...");
    
    // Check if policies already exist to prevent redundant API writes
    const { data: existing, error: fetchError } = await supabase
      .from("policies")
      .select("id");

    if (fetchError) {
      console.error("[Seeding Error] 정책 조회 실패:", fetchError);
      return { success: false, error: fetchError.message };
    }

    if (existing && existing.length > 0) {
      console.log(`[Seeding] 기존 정책이 이미 존재함 (개수: ${existing.length}개). 시딩을 건너뜁니다.`);
      return { success: true, bypassed: true, count: existing.length };
    }

    // Insert all seed policies
    const { error: insertError } = await supabase
      .from("policies")
      .insert(seedPoliciesList);

    if (insertError) {
      console.error("[Seeding Error] 정책 적재 실패:", insertError);
      return { success: false, error: insertError.message };
    }

    console.log(`[Seeding] 정책 데이터 시딩 완료! 총 ${seedPoliciesList.length}개 적재됨.`);
    return { success: true, count: seedPoliciesList.length };
  } catch (err) {
    console.error("[Seeding Error] 예상치 못한 오류:", err);
    return { success: false, error: err.message };
  }
}
