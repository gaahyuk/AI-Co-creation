"use client";

// 서류함(서류 메타데이터) localStorage 관리 + 파일명 기반 자동 분류기
// (참조: 이윤호 브랜치 src/lib/document-classifier.ts, src/lib/adapters/clova-ocr/mock.ts 포팅.
//  베이스에는 서버/DB가 없으므로 실제 파일은 저장하지 않고 파일명·크기 등 메타데이터만
//  localStorage에 보관한다.)

import { useEffect, useState } from "react";
import { DOCUMENT_GUIDES } from "@/lib/document-guides-data";

const DOCUMENTS_KEY = "youth.documents";

/** localStorage에 저장되는 서류 메타데이터 */
export interface StoredDocMeta {
  id: string;
  fileName: string; // 원본 파일명
  size: number; // 바이트
  mimeType: string;
  docType: string | null; // 표준 문서유형 코드 (null = 미분류)
  ocrText: string; // 모의 OCR 추출 텍스트
  confidence: number; // 모의 OCR 신뢰도 (0~1)
  uploadedAt: string; // ISO 날짜
}

/** 문서유형 코드 → 이름 (가이드 데이터 기준) */
export const DOC_TYPE_OPTIONS = DOCUMENT_GUIDES.map((g) => ({
  code: g.code,
  name: g.title,
}));

export function docTypeName(code: string | null | undefined): string {
  return DOC_TYPE_OPTIONS.find((d) => d.code === code)?.name ?? "미분류";
}

// ---------------------------------------------------------------------------
// 분류기: 텍스트에서 표준 문서유형 코드를 추정한다.
// 키워드가 매칭되는 첫 유형을 사용하고, 없으면 null(미분류)을 반환해
// 사용자가 직접 지정하게 한다. (원본 document-classifier.ts 포팅 + student_id 추가)
// ---------------------------------------------------------------------------
const DOC_TYPE_KEYWORDS: Array<[RegExp, string]> = [
  [/주민등록/, "resident_registration"],
  [/소득금액증명|소득증명|소득분위/, "income_certificate"],
  [/재직증명/, "employment_certificate"],
  [/수급자격|구직급여|실업급여/, "unemployment_certificate"],
  [/가족관계증명/, "family_relation_certificate"],
  [/통장사본|계좌번호|통장 사본/, "bankbook_copy"],
  [/학생증|재학증명/, "student_id"],
];

export function classifyDocType(text: string): string | null {
  for (const [pattern, docType] of DOC_TYPE_KEYWORDS) {
    if (pattern.test(text)) {
      return docType;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// 모의 OCR: 실제 OCR 서비스 없이, 업로드된 파일명에 포함된 키워드로
// 그럴듯한 한국어 공문서 샘플 텍스트를 골라 반환한다.
// 키워드가 없으면 분류가 애매한 일반 문서 텍스트를 반환해 "미분류" 경로도 재현한다.
// (원본 clova-ocr/mock.ts 포팅)
// ---------------------------------------------------------------------------
const SAMPLE_TEXTS: Record<string, string> = {
  resident_registration:
    "주민등록등본\n세대주 성명: 홍길동\n주소: 서울특별시 종로구 세종대로 1\n발급일: 2026-01-05",
  income_certificate:
    "소득금액증명원\n귀속연도: 2025\n성명: 홍길동\n소득금액: 24,000,000원\n국세청장",
  employment_certificate:
    "재직증명서\n성명: 홍길동\n부서: 개발팀\n직위: 사원\n재직기간: 2024-03-01 ~ 현재",
  unemployment_certificate:
    "수급자격증명서(구직급여)\n성명: 홍길동\n수급기간: 2026-01-01 ~ 2026-06-30\n고용센터장",
  family_relation_certificate:
    "가족관계증명서\n본인: 홍길동\n부: 홍판서\n모: 성춘향\n등록기준지: 서울특별시",
  bankbook_copy: "통장사본\n은행명: 국민은행\n예금주: 홍길동\n계좌번호: 123-456-789012",
  student_id: "학생증\n성명: 홍길동\n학교: 한국대학교\n학번: 20261234\n유효기간: 2026-02",
};

const FALLBACK_TEXT =
  "문서 제목 없음\n스캔된 이미지입니다. 자동 분류를 위한 키워드를 찾지 못했습니다.";

const FILENAME_HINTS: Array<[RegExp, keyof typeof SAMPLE_TEXTS]> = [
  [/등본/, "resident_registration"],
  [/소득/, "income_certificate"],
  [/재직/, "employment_certificate"],
  [/실업|구직급여|수급/, "unemployment_certificate"],
  [/가족관계/, "family_relation_certificate"],
  [/통장|계좌/, "bankbook_copy"],
  [/학생증|재학/, "student_id"],
];

function pickSampleText(fileName: string): string {
  for (const [pattern, key] of FILENAME_HINTS) {
    if (pattern.test(fileName)) {
      return SAMPLE_TEXTS[key];
    }
  }
  return FALLBACK_TEXT;
}

/** 파일명 기반 모의 OCR + 자동 분류 */
export function analyzeFileName(fileName: string): {
  ocrText: string;
  confidence: number;
  docType: string | null;
} {
  const ocrText = pickSampleText(fileName);
  const confidence = ocrText === FALLBACK_TEXT ? 0.4 : 0.95;
  return { ocrText, confidence, docType: classifyDocType(ocrText) };
}

/**
 * 정책 제출서류 문구(splitDocuments 결과 한 줄)를 표준 문서유형 코드에 매칭.
 * "내가 가진 서류" 표시용 — 서류함과 정책 체크리스트를 연결한다.
 */
export function matchRequirementToDocType(requirement: string): string | null {
  return classifyDocType(requirement);
}

// ---------------------------------------------------------------------------
// localStorage 입출력
// ---------------------------------------------------------------------------
export function loadDocuments(): StoredDocMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DOCUMENTS_KEY);
    return raw ? (JSON.parse(raw) as StoredDocMeta[]) : [];
  } catch {
    return [];
  }
}

function saveDocuments(docs: StoredDocMeta[]): void {
  localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(docs));
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 서류함 상태 훅 (localStorage 동기화) */
export function useDocLocker() {
  const [docs, setDocs] = useState<StoredDocMeta[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setDocs(loadDocuments());
    setLoaded(true);
  }, []);

  const persist = (next: StoredDocMeta[]) => {
    setDocs(next);
    saveDocuments(next);
  };

  /** 파일 등록 — 파일 자체는 저장하지 않고 메타데이터만 보관 */
  const add = (file: { name: string; size: number; type: string }): StoredDocMeta => {
    const { ocrText, confidence, docType } = analyzeFileName(file.name);
    const meta: StoredDocMeta = {
      id: newId(),
      fileName: file.name,
      size: file.size,
      mimeType: file.type || "application/octet-stream",
      docType,
      ocrText,
      confidence,
      uploadedAt: new Date().toISOString(),
    };
    persist([meta, ...docs]);
    return meta;
  };

  const remove = (id: string) => {
    persist(docs.filter((d) => d.id !== id));
  };

  /** 분류 수동 수정 */
  const setType = (id: string, docType: string | null) => {
    persist(docs.map((d) => (d.id === id ? { ...d, docType } : d)));
  };

  /** 보유 중인 문서유형 코드 집합 */
  const ownedTypes = new Set(
    docs.map((d) => d.docType).filter((t): t is string => t !== null),
  );

  return { docs, loaded, add, remove, setType, ownedTypes };
}

/** 파일 크기 표시 문자열 */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${bytes}B`;
}
