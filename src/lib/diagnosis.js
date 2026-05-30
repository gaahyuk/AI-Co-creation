/**
 * 사용자의 프로필 정보와 정책의 요구 조건을 비교하여 자격 부합 여부 및 적합도 점수(%)를 산출합니다.
 */

// 1. 생년월일 기준 만 나이 계산
export function calculateAge(birthDateString) {
  if (!birthDateString) return null;
  const today = new Date();
  const birthDate = new Date(birthDateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// 2. 소득 구간 문자열을 비교값(숫자 %)으로 변환
function parseIncomeLevel(level) {
  if (!level) return 200; // 기본값: 제한 없음 혹은 최상위 소득
  if (level.includes("50% 이하")) return 50;
  if (level.includes("100% 이하")) return 100;
  if (level.includes("120% 이하")) return 120;
  if (level.includes("150% 이하")) return 150;
  if (level.includes("180% 이하")) return 180;
  return 200; // 150% 초과 또는 제한 없음
}

function parsePolicyIncomeLimit(limit) {
  if (!limit) return 200; // 제한 없음
  const num = parseInt(limit.replace(/[^0-9]/g, ""), 10);
  return isNaN(num) ? 200 : num;
}

/**
 * 정책별 개별 조건 검증 및 종합 매칭도 계산
 * @param {Object} profile - 사용자 프로필 { birth_date, location, employment_status, income_level }
 * @param {Object} policy - 정책 정보 { min_age, max_age, eligible_locations, eligible_jobs, income_limit }
 * @returns {Object} { isEligible, score, details: { ageMatch, locationMatch, jobMatch, incomeMatch } }
 */
export function diagnosePolicy(profile, policy) {
  const result = {
    isEligible: false,
    score: 0,
    details: {
      age: { pass: true, message: "나이 조건 충족" },
      location: { pass: true, message: "거주지 조건 충족" },
      job: { pass: true, message: "직업 조건 충족" },
      income: { pass: true, message: "소득 조건 충족" }
    }
  };

  if (!profile) return result;

  // 1. 나이 검증
  const age = calculateAge(profile.birth_date);
  if (age !== null) {
    const minAge = policy.min_age || 0;
    const maxAge = policy.max_age || 150;
    if (age < minAge || age > maxAge) {
      result.details.age.pass = false;
      result.details.age.message = `대상 나이(만 ${minAge}~${maxAge}세)가 아닙니다. (현재 만 ${age}세)`;
    } else {
      result.details.age.message = `대상 나이 충족 (현재 만 ${age}세)`;
    }
  } else {
    // 나이 정보 미입력 시 미달 처리
    result.details.age.pass = false;
    result.details.age.message = "생년월일이 등록되지 않았습니다.";
  }

  // 2. 지역 검증
  const userLoc = profile.location || "";
  const policyLocs = policy.eligible_locations || [];
  
  if (policyLocs.length > 0 && !policyLocs.includes("전국")) {
    const isMatched = policyLocs.some(loc => userLoc.includes(loc) || loc.includes(userLoc));
    if (!isMatched && userLoc) {
      result.details.location.pass = false;
      result.details.location.message = `지원 가능 지역이 아닙니다. (${policyLocs.join(", ")} 제한)`;
    } else if (!userLoc) {
      result.details.location.pass = false;
      result.details.location.message = "거주지역 정보가 등록되지 않았습니다.";
    } else {
      result.details.location.message = `지역 조건 충족 (${userLoc})`;
    }
  } else {
    result.details.location.message = "전국 단위 지원 (지역 제한 없음)";
  }

  // 3. 직업/고용 상태 검증
  const userJob = profile.employment_status || "";
  const policyJobs = policy.eligible_jobs || [];
  
  if (policyJobs.length > 0 && !policyJobs.includes("전체")) {
    const isMatched = policyJobs.includes(userJob);
    if (!isMatched && userJob) {
      result.details.job.pass = false;
      result.details.job.message = `지원 대상 직업군이 아닙니다. (${policyJobs.join(", ")} 대상)`;
    } else if (!userJob) {
      result.details.job.pass = false;
      result.details.job.message = "직업/고용 상태 정보가 등록되지 않았습니다.";
    } else {
      result.details.job.message = `직업 조건 충족 (${userJob})`;
    }
  } else {
    result.details.job.message = "직업 제한 없음 (전체 대상)";
  }

  // 4. 소득 요건 검증
  const userIncome = parseIncomeLevel(profile.income_level);
  const policyIncomeLimit = parsePolicyIncomeLimit(policy.income_limit);
  
  if (policy.income_limit && policyIncomeLimit < 200) {
    if (userIncome > policyIncomeLimit) {
      result.details.income.pass = false;
      result.details.income.message = `소득 기준 초과 (기준: 중위소득 ${policyIncomeLimit}% 이하)`;
    } else if (!profile.income_level) {
      result.details.income.pass = false;
      result.details.income.message = "소득 구간 정보가 등록되지 않았습니다.";
    } else {
      result.details.income.message = `소득 조건 충족 (기준: 중위소득 ${policyIncomeLimit}% 이하)`;
    }
  } else {
    result.details.income.message = "소득 제한 없음";
  }

  // 5. 종합 판정 및 점수 계산 (각 25점 만점)
  let score = 0;
  if (result.details.age.pass) score += 25;
  if (result.details.location.pass) {
    // 지역 제한이 있는 국소 정책 매칭 시 가점 부여 (전국 정책 매칭 대비 로컬 정책 우선 노출 효과)
    const isLocal = policyLocs.length > 0 && !policyLocs.includes("전국");
    score += isLocal ? 25 : 20;
  }
  if (result.details.job.pass) {
    const isSpecificJob = policyJobs.length > 0 && !policyJobs.includes("전체");
    score += isSpecificJob ? 25 : 20;
  }
  if (result.details.income.pass) {
    const isSpecificIncome = policy.income_limit && policyIncomeLimit < 200;
    score += isSpecificIncome ? 25 : 20;
  }

  result.score = Math.min(100, score);
  // 4가지 조건이 모두 충족(pass)될 때만 신청 가능 판정
  result.isEligible = result.details.age.pass && 
                      result.details.location.pass && 
                      result.details.job.pass && 
                      result.details.income.pass;

  return result;
}
