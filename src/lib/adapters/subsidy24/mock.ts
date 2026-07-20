import type { PolicySourceClient, RawPolicyRecord } from "@/lib/adapters/types";

// 보조금24는 전 연령 대상 정보성 API로, 실제로는 자격조건이 자유텍스트 위주다.
// 이 fixture는 rawConditionText만 채워두고 ageMin/ageMax/incomeCondition은 비워둬서,
// 정규화 단계의 text-condition-tagger가 실제로 파싱하도록 한다.
const FIXTURE: RawPolicyRecord[] = [
  {
    sourceId: "sb24-001",
    title: "기초생활보장 생계급여",
    category: "복지문화",
    regionCodes: [],
    jobStatusCodes: [],
    rawConditionText: "만 0세 이상 제한 없음. 기준 중위소득 30% 이하 가구 대상.",
    applyStart: "2026-01-01",
    applyEnd: "2026-12-31",
    applyUrl: "https://www.gov.kr/mock/sb24-001",
    requiredDocTypes: ["income_certificate", "family_relation_certificate"],
  },
  {
    sourceId: "sb24-002",
    title: "한부모가족 아동양육비 지원",
    category: "복지문화",
    regionCodes: [],
    jobStatusCodes: [],
    rawConditionText: "중위소득 63% 이하 한부모가족 대상 아동양육비 지원.",
    applyStart: "2026-01-01",
    applyEnd: "2026-12-31",
    applyUrl: "https://www.gov.kr/mock/sb24-002",
    requiredDocTypes: ["family_relation_certificate", "income_certificate"],
  },
  {
    sourceId: "sb24-003",
    title: "장애인연금",
    category: "복지문화",
    regionCodes: [],
    jobStatusCodes: [],
    rawConditionText: "만 18세 이상 중증장애인으로 중위소득 70% 이하인 자.",
    applyStart: "2026-01-01",
    applyEnd: "2026-12-31",
    applyUrl: "https://www.gov.kr/mock/sb24-003",
    requiredDocTypes: ["income_certificate"],
  },
  {
    sourceId: "sb24-004",
    title: "청년내일저축계좌",
    category: "일자리",
    regionCodes: [],
    jobStatusCodes: ["employed"],
    rawConditionText: "만 19세 이상 34세 이하 근로소득이 있는 청년으로 중위소득 100% 이하 가구.",
    applyStart: "2026-04-01",
    applyEnd: "2026-05-31",
    applyUrl: "https://www.gov.kr/mock/sb24-004",
    requiredDocTypes: ["employment_certificate", "income_certificate"],
  },
  {
    sourceId: "sb24-005",
    title: "농어업인 안전보험료 지원",
    category: "일자리",
    regionCodes: [],
    jobStatusCodes: ["self_employed"],
    // 자격요건이 서술형이라 나이/소득 정규식 추출이 실패하는 대표 사례 (수작업 확인 필요)
    rawConditionText:
      "농림축산식품부 고시에 따른 농어업인 및 농어업 관련 종사자로서 별도 심사위원회 승인을 받은 자",
    applyStart: "2026-01-01",
    applyEnd: "2026-12-31",
    applyUrl: "https://www.gov.kr/mock/sb24-005",
    requiredDocTypes: [],
  },
  {
    sourceId: "sb24-006",
    title: "국가보훈대상자 의료지원",
    category: "복지문화",
    regionCodes: [],
    jobStatusCodes: [],
    // 나이/소득 언급이 전혀 없고 "보훈 등록 여부"처럼 우리 프로필 모델(나이/지역/고용/소득)로는
    // 판별 불가능한 조건이라 자동 매칭이 불가능한 사례 (확인필요로 분류되어야 함)
    rawConditionText: "국가보훈등록증을 소지한 보훈대상자 및 그 가족.",
    applyStart: "2026-01-01",
    applyEnd: "2026-12-31",
    applyUrl: "https://www.gov.kr/mock/sb24-006",
    requiredDocTypes: [],
  },
  {
    sourceId: "sb24-007",
    title: "저소득층 에너지바우처",
    category: "복지문화",
    regionCodes: [],
    jobStatusCodes: [],
    rawConditionText: "중위소득 50% 이하 가구 중 노인, 영유아, 장애인 등이 포함된 가구.",
    applyStart: "2026-10-01",
    applyEnd: "2027-01-31",
    applyUrl: "https://www.gov.kr/mock/sb24-007",
    requiredDocTypes: ["income_certificate"],
  },
  {
    sourceId: "sb24-008",
    title: "청년 구직활동지원금",
    category: "일자리",
    regionCodes: [],
    jobStatusCodes: ["unemployed"],
    rawConditionText: "만 18세 이상 34세 이하 미취업 청년으로 중위소득 120% 이하.",
    applyStart: "2026-02-01",
    applyEnd: "2026-11-30",
    applyUrl: "https://www.gov.kr/mock/sb24-008",
    requiredDocTypes: ["unemployment_certificate"],
  },
];

class MockSubsidy24Client implements PolicySourceClient {
  async fetchPolicies({ page }: { page: number; updatedSince?: Date }) {
    if (page > 1) return [];
    return FIXTURE;
  }
}

export function createMockSubsidy24Client(): PolicySourceClient {
  return new MockSubsidy24Client();
}
