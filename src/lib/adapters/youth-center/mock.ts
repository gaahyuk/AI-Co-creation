import type { PolicySourceClient, RawPolicyRecord } from "@/lib/adapters/types";

// 온통청년 API 실제 키 발급 전까지 사용하는 fixture. 필드는 나이/지역/소득/고용상태가
// 구조화되어 내려온다고 가정한 온통청년 API 응답 형태를 흉내낸다.
const FIXTURE: RawPolicyRecord[] = [
  {
    sourceId: "yc-001",
    title: "청년 월세 특별지원",
    category: "주거",
    ageMin: 19,
    ageMax: 34,
    regionCodes: [],
    jobStatusCodes: [],
    incomeCondition: { type: "bracket_percent", maxPercent: 150 },
    applyStart: "2026-01-01",
    applyEnd: "2026-12-31",
    applyUrl: "https://www.youthcenter.go.kr/mock/yc-001",
    requiredDocTypes: ["resident_registration", "income_certificate"],
  },
  {
    sourceId: "yc-002",
    title: "서울 청년수당",
    category: "일자리",
    ageMin: 19,
    ageMax: 34,
    regionCodes: ["11"],
    jobStatusCodes: ["unemployed"],
    incomeCondition: { type: "bracket_percent", maxPercent: 150 },
    applyStart: "2026-03-01",
    applyEnd: "2026-08-31",
    applyUrl: "https://www.youthcenter.go.kr/mock/yc-002",
    requiredDocTypes: ["resident_registration", "unemployment_certificate"],
  },
  {
    sourceId: "yc-003",
    title: "경기 청년 면접수당",
    category: "일자리",
    ageMin: 18,
    ageMax: 39,
    regionCodes: ["41"],
    jobStatusCodes: ["unemployed", "student"],
    incomeCondition: null,
    applyStart: "2026-01-01",
    applyEnd: "2026-12-31",
    applyUrl: "https://www.youthcenter.go.kr/mock/yc-003",
    requiredDocTypes: ["resident_registration"],
  },
  {
    sourceId: "yc-004",
    title: "청년 전세자금대출 이자지원",
    category: "주거",
    ageMin: 19,
    ageMax: 34,
    regionCodes: [],
    jobStatusCodes: [],
    incomeCondition: { type: "bracket_percent", maxPercent: 100 },
    applyStart: "2026-01-01",
    applyEnd: "2026-12-31",
    applyUrl: "https://www.youthcenter.go.kr/mock/yc-004",
    requiredDocTypes: ["income_certificate", "bankbook_copy"],
  },
  {
    sourceId: "yc-005",
    title: "국가장학금 (청년 학자금)",
    category: "교육",
    ageMin: null,
    ageMax: null,
    regionCodes: [],
    jobStatusCodes: ["student"],
    incomeCondition: { type: "bracket_percent", maxPercent: 200 },
    applyStart: "2026-02-01",
    applyEnd: "2026-04-30",
    applyUrl: "https://www.youthcenter.go.kr/mock/yc-005",
    requiredDocTypes: ["family_relation_certificate", "income_certificate"],
  },
  {
    sourceId: "yc-006",
    title: "청년 창업 지원금",
    category: "일자리",
    ageMin: 19,
    ageMax: 39,
    regionCodes: [],
    jobStatusCodes: ["self_employed", "unemployed"],
    incomeCondition: null,
    applyStart: "2026-01-01",
    applyEnd: "2026-06-30",
    applyUrl: "https://www.youthcenter.go.kr/mock/yc-006",
    requiredDocTypes: ["resident_registration"],
  },
  {
    sourceId: "yc-007",
    title: "부산 청년 참여 거버넌스단",
    category: "참여권리",
    ageMin: 19,
    ageMax: 39,
    regionCodes: ["26"],
    jobStatusCodes: [],
    incomeCondition: null,
    applyStart: "2026-05-01",
    applyEnd: "2026-05-31",
    applyUrl: "https://www.youthcenter.go.kr/mock/yc-007",
    requiredDocTypes: ["resident_registration"],
  },
  {
    sourceId: "yc-008",
    title: "청년 마음건강 바우처",
    category: "복지문화",
    ageMin: 19,
    ageMax: 34,
    regionCodes: [],
    jobStatusCodes: [],
    incomeCondition: null,
    applyStart: "2026-01-01",
    applyEnd: "2026-12-31",
    applyUrl: "https://www.youthcenter.go.kr/mock/yc-008",
    requiredDocTypes: [],
  },
];

class MockYouthCenterClient implements PolicySourceClient {
  async fetchPolicies({ page }: { page: number; updatedSince?: Date }) {
    if (page > 1) return [];
    return FIXTURE;
  }
}

export function createMockYouthCenterClient(): PolicySourceClient {
  return new MockYouthCenterClient();
}
