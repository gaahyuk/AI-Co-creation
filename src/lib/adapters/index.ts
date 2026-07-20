import { createMockYouthCenterClient } from "@/lib/adapters/youth-center/mock";
import { createRealYouthCenterClient } from "@/lib/adapters/youth-center/real";
import { createMockSubsidy24Client } from "@/lib/adapters/subsidy24/mock";
import { createMockClovaOcrClient } from "@/lib/adapters/clova-ocr/mock";
import { createMockAlimtalkClient } from "@/lib/adapters/kakao-alimtalk/mock";
import type { AlimtalkClient, OcrClient, PolicySourceClient } from "@/lib/adapters/types";

// USE_MOCK_* 플래그가 "false"일 때만 실제 연동 어댑터로 교체한다.
export function getYouthCenterClient(): PolicySourceClient {
  if (process.env.USE_MOCK_YOUTH_CENTER_API !== "false") {
    return createMockYouthCenterClient();
  }
  return createRealYouthCenterClient();
}

export function getSubsidy24Client(): PolicySourceClient {
  if (process.env.USE_MOCK_SUBSIDY24_API !== "false") {
    return createMockSubsidy24Client();
  }
  throw new Error("보조금24 실제 연동 어댑터가 아직 구현되지 않았습니다 (3단계 예정).");
}

export function getOcrClient(): OcrClient {
  if (process.env.USE_MOCK_OCR !== "false") {
    return createMockClovaOcrClient();
  }
  throw new Error("클로바 OCR 실제 연동 어댑터가 아직 구현되지 않았습니다 (2단계 키 발급 후 예정).");
}

export function getAlimtalkClient(): AlimtalkClient {
  if (process.env.USE_MOCK_ALIMTALK !== "false") {
    return createMockAlimtalkClient();
  }
  throw new Error("카카오 알림톡 실제 연동 어댑터가 아직 구현되지 않았습니다 (발송대행사 계정 발급 후 예정).");
}
