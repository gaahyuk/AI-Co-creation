export type IncomeCondition =
  | {
      type: "bracket_percent";
      maxPercent: number; // 기준 중위소득 대비 상한 퍼센트 (예: 120 = 120% 이하)
    }
  | {
      type: "amount_max";
      maxAnnualWon: number; // 연소득 상한(원). 온통청년이 %가 아닌 절대금액으로 조건을 줄 때 사용.
    };

export interface RawPolicyRecord {
  sourceId: string;
  title: string;
  category: string;
  ageMin?: number | null;
  ageMax?: number | null;
  regionCodes?: string[] | null; // null/빈배열 = 전국
  jobStatusCodes?: string[] | null;
  incomeCondition?: IncomeCondition | null;
  rawConditionText?: string | null;
  description?: string | null; // 정책 소개 원문
  supportContent?: string | null; // 지원내용 상세 원문
  applyStart?: string | null; // ISO date
  applyEnd?: string | null;
  applyUrl?: string | null;
  requiredDocTypes?: string[];
  requiredDocsText?: string | null; // 제출서류 안내 원문
  provisionInstName?: string | null; // 주관/제공 기관명
  keywords?: string | null; // 정책 키워드(콤마구분)
  estimatedAmount?: number | null; // 대표 지원금액(원)
}

export interface NormalizedPolicy {
  sourceSystem: string;
  sourceId: string;
  title: string;
  category: string;
  ageMin: number | null;
  ageMax: number | null;
  regionCodes: string[] | null;
  jobStatusCodes: string[] | null;
  incomeCondition: IncomeCondition | null;
  rawConditionText: string | null;
  description: string | null;
  supportContent: string | null;
  conditionsVerified: boolean;
  applyStart: Date | null;
  applyEnd: Date | null;
  applyUrl: string | null;
  requiredDocTypes: string[];
  requiredDocsText: string | null;
  provisionInstName: string | null;
  keywords: string | null;
  estimatedAmount: number | null;
}

export interface PolicySourceClient {
  fetchPolicies(params: { page: number; updatedSince?: Date }): Promise<RawPolicyRecord[]>;
}

export interface OcrResult {
  text: string;
  confidence: number;
}

export interface OcrClient {
  // fileName은 실제 클로바 OCR에서는 쓰이지 않지만, mock 구현체가 그럴듯한 샘플 텍스트를
  // 고르기 위한 힌트로 사용한다.
  extractText(fileName: string, filePath: string): Promise<OcrResult>;
}

export interface AlimtalkResult {
  status: "sent" | "failed";
}

export interface AlimtalkClient {
  send(
    to: string,
    templateCode: string,
    variables: Record<string, string>
  ): Promise<AlimtalkResult>;
}
