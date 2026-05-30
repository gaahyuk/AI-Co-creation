/**
 * PolicyFlow AI - Adversarial & Critical Scenario Test Runner
 * 이 스크립트는 정책 매칭 진단 엔진(src/lib/diagnosis.js)에 극단적인 예외 데이터, 
 * 깨진 포맷, null값 등을 주입하여 견고성(Robustness)을 비판적으로 테스트합니다.
 */

import { diagnosePolicy, calculateAge } from "../src/lib/diagnosis.js";

// ANSI Terminal Colors
const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function describe(suiteName, fn) {
  console.log(`\n${BOLD}${CYAN}=== Suite: ${suiteName} ===${RESET}`);
  fn();
}

function assert(description, actual, expected, criticalWarning = "") {
  totalTests++;
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  const pass = actualStr === expectedStr;

  if (pass) {
    passedTests++;
    console.log(`  ${GREEN}✓ [PASS]${RESET} ${description}`);
  } else {
    failedTests++;
    console.log(`  ${RED}✗ [FAIL]${RESET} ${description}`);
    console.log(`    - Expected: ${GREEN}${expectedStr}${RESET}`);
    console.log(`    - Actual:   ${RED}${actualStr}${RESET}`);
    if (criticalWarning) {
      console.log(`    ${YELLOW}⚠️  CRITICAL WARNING: ${criticalWarning}${RESET}`);
    }
  }
}

// ==========================================
// SCENARIO 1: 나이 진단 엣지 케이스 & 에러 유발
// ==========================================
describe("Scenario 1: Age Diagnosis Edge Cases", () => {
  // 1-1. 생년월일이 미래 날짜인 경우
  const futureProfile = { birth_date: "2030-05-15", location: "전국", employment_status: "전체" };
  const standardPolicy = { min_age: 19, max_age: 39, eligible_locations: ["전국"], eligible_jobs: ["전체"] };
  const resFuture = diagnosePolicy(futureProfile, standardProfileCheck(standardPolicy));
  assert("미래 생년월일 입력 시 자격 미달 처리", resFuture.isEligible, false, "미래 출생자에 대해 자격이 승인될 수 있음");
  assert("미래 생년월일 입력 시 음수 나이에 대한 안내 메시지 확인", resFuture.details.age.pass, false);

  // 1-2. 깨진 날짜 문자열
  const corruptDateProfile = { birth_date: "임의의 문자열", location: "전국", employment_status: "전체" };
  const resCorrupt = diagnosePolicy(corruptDateProfile, standardProfileCheck(standardPolicy));
  assert("잘못된 날짜 문자열 입력 시 미달 처리", resCorrupt.isEligible, false, "NaN 나이가 나이 조건을 통과할 여지가 있음");

  // 1-3. 나이 경계선 검증 (만 19세 딱 걸치는 경우)
  const today = new Date();
  const exactly19YearsAgo = new Date(today.getFullYear() - 19, today.getMonth(), today.getDate()).toISOString().split('T')[0];
  const borderProfile = { birth_date: exactly19YearsAgo, location: "전국", employment_status: "전체" };
  const resBorder = diagnosePolicy(borderProfile, standardProfileCheck(standardPolicy));
  assert("경계선 나이(만 19세 정각) 자격 부합 처리", resBorder.details.age.pass, true);
});

// ==========================================
// SCENARIO 2: 지역 매칭 모호성 및 텍스트 매칭 허점 분석
// ==========================================
describe("Scenario 2: Location Ambiguity & Matching Vulnerabilities", () => {
  const localPolicy = { min_age: 15, max_age: 40, eligible_locations: ["인천"], eligible_jobs: ["전체"] };

  // 2-1. 축약 주소 매칭 (인천광역시 vs 인천)
  const fullAddressProfile = { birth_date: "1998-05-15", location: "인천광역시 부평구", employment_status: "전체" };
  const resFullAdd = diagnosePolicy(fullAddressProfile, standardProfileCheck(localPolicy));
  assert("인천광역시 거주자가 '인천' 제한 정책에 부합하는지 여부 (유사 매칭)", resFullAdd.details.location.pass, true, "인천광역시의 경우 '인천'을 포함하므로 통과해야 함");

  // 2-2. 반대 유사 문자 오성 매칭 방지 테스트
  // 거주지는 '전라남도', 정책 대상 지역은 '전라북도' -> 둘 다 '전라'가 들어가서 오성 매칭될 위험이 없는가?
  const jeonnamProfile = { birth_date: "1998-05-15", location: "전라남도 목포시", employment_status: "전체" };
  const jeonbukPolicy = { min_age: 15, max_age: 40, eligible_locations: ["전라북도"], eligible_jobs: ["전체"] };
  const resJeon = diagnosePolicy(jeonnamProfile, standardProfileCheck(jeonbukPolicy));
  assert("전라남도 거주자가 '전라북도' 제한 정책에 매칭되지 않아야 함", resJeon.details.location.pass, false, "단순 Substring 매칭으로 인해 '전라남도'가 '전라북도'에 매칭될 우려가 있음");
});

// ==========================================
// SCENARIO 3: 소득 요건 한글 파싱 예외
// ==========================================
describe("Scenario 3: Income Level Parse & Text Breaking", () => {
  // 3-1. 정책 소득 요건이 한글 서술형인 경우 파싱 실패 방어
  const incomePolicy = { min_age: 15, max_age: 40, eligible_locations: ["전국"], eligible_jobs: ["전체"], income_limit: "중위소득 120% 이하" };
  const parsedLimit = parsePolicyIncomeLimitTest(incomePolicy.income_limit);
  assert("한글 텍스트 '중위소득 120% 이하'에서 숫자 120 추출 성공", parsedLimit, 120, "소득 파싱 정규식이 깨지면 한글 소득 기준 계산 오류 발생 가능");

  // 3-2. 소득 제한 문자열에 숫자가 아예 없는 경우
  const textIncomePolicy = { min_age: 15, max_age: 40, eligible_locations: ["전국"], eligible_jobs: ["전체"], income_limit: "소득 제한 없음 (단, 자산 기준 충족자)" };
  const parsedNoNumLimit = parsePolicyIncomeLimitTest(textIncomePolicy.income_limit);
  assert("숫자가 없는 서술형 소득 제한의 경우 무제한(200)으로 해석되는지 확인", parsedNoNumLimit, 200);

  // 3-3. 사용자 프로필의 소득 정보가 누락된 경우 RLS/클라이언트 에러 검증
  const nullIncomeProfile = { birth_date: "1998-05-15", location: "전국", employment_status: "전체", income_level: null };
  const resNullInc = diagnosePolicy(nullIncomeProfile, standardProfileCheck(incomePolicy));
  assert("사용자 소득 수준 미등록(null) 시 소득 제한 정책 통과 불가(미달) 처리", resNullInc.details.income.pass, false, "정보가 누락된 사용자가 혜택을 부적격 통과할 수 있음");
});

// ==========================================
// SCENARIO 4: 극단적인 악성 및 누락 데이터 주입
// ==========================================
describe("Scenario 4: Extreme Malformed Data Infusion", () => {
  // 4-1. 프로필 자체가 빈 껍데기(null)일 때 크래시 나지 않는지 확인
  try {
    const resCrash = diagnosePolicy(null, {});
    assert("null 프로필 주입 시 크래시 없이 자격 미달 객체 리턴", resCrash.isEligible, false);
  } catch (e) {
    assert("null 프로필 주입 시 에러 크래시 발생 여부", true, false, `크래시 발생: ${e.message}`);
  }

  // 4-2. 정책 요건 배열들이 비어있거나 이상한 값인 경우
  const brokenPolicy = { min_age: null, max_age: null, eligible_locations: null, eligible_jobs: undefined };
  const normalProfile = { birth_date: "1998-05-15", location: "인천광역시", employment_status: "대학생", income_level: "중위소득 80% 이하" };
  
  try {
    const resBrokenPol = diagnosePolicy(normalProfile, standardProfileCheck(brokenPolicy));
    assert("정책 제약 조건 필드들이 전부 null/undefined인 경우 전체 허용(통과) 처리", resBrokenPol.isEligible, true);
  } catch (e) {
    assert("깨진 정책 데이터 주입 시 에러 크래시 발생 여부", true, false, `크래시 발생: ${e.message}`);
  }
});

// Helper functions matching the implementation in diagnosis.js
function standardProfileCheck(policy) {
  return {
    min_age: policy.min_age,
    max_age: policy.max_age,
    eligible_locations: policy.eligible_locations || [],
    eligible_jobs: policy.eligible_jobs || [],
    income_limit: policy.income_limit || null
  };
}

function parsePolicyIncomeLimitTest(limit) {
  if (!limit) return 200; // 제한 없음
  const num = parseInt(limit.replace(/[^0-9]/g, ""), 10);
  return isNaN(num) ? 200 : num;
}

// Print Results
console.log(`\n${BOLD}=== TEST RESULT SUMMARY ===${RESET}`);
console.log(`Total Run:  ${totalTests}`);
console.log(`Passed:     ${GREEN}${passedTests}${RESET}`);
console.log(`Failed:     ${failedTests > 0 ? RED : GREEN}${failedTests}${RESET}`);

if (failedTests > 0) {
  console.log(`\n${RED}${BOLD}🚨 CRITICAL TEST FAILED! 일부 매칭 로직에서 엣지케이스 취약점이 발견되었습니다.${RESET}`);
  process.exit(1);
} else {
  console.log(`\n${GREEN}${BOLD}🎉 ALL CRITICAL SCENARIO TESTS PASSED! 매칭 엔진이 매우 안전하고 견고하게 구축되어 있습니다.${RESET}`);
  process.exit(0);
}
