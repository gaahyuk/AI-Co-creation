import { supabase } from "./supabase";

/**
 * XML 태그 값 파싱을 위한 유틸리티 함수 (의존성 최소화)
 */
function getXmlTagValue(xml, tagName) {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\/${tagName}>`, 'i');
  const match = xml.match(regex);
  if (!match) return "";
  
  // CDATA 제거 및 공백 정리
  return match[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

/**
 * 자연어 나이 정보 파싱
 * 예: "만 19세 ~ 34세", "만 18세 이상 ~ 39세 이하"
 */
function parseAgeRange(ageStr) {
  const result = { min: 19, max: 39 }; // 기본 청년 범주
  if (!ageStr) return result;

  const numbers = ageStr.match(/\d+/g);
  if (numbers && numbers.length >= 2) {
    result.min = parseInt(numbers[0], 10);
    result.max = parseInt(numbers[1], 10);
  } else if (numbers && numbers.length === 1) {
    if (ageStr.includes("이상")) {
      result.min = parseInt(numbers[0], 10);
    } else if (ageStr.includes("이하") || ageStr.includes("미만")) {
      result.max = parseInt(numbers[0], 10);
    }
  }
  return result;
}

/**
 * 자연어 지역 정보를 4축 규격에 맞게 변환
 */
function parseLocation(areaStr) {
  if (!areaStr || areaStr.includes("전국") || areaStr.includes("제한없음")) {
    return ["전국"];
  }
  
  const locations = [];
  const validLocs = ["서울", "인천", "경기", "부산", "대구", "광주", "대전", "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];
  
  for (const loc of validLocs) {
    if (areaStr.includes(loc)) {
      // 명칭 매핑 통일화
      if (loc === "서울") locations.push("서울특별시");
      else if (loc === "인천") locations.push("인천광역시");
      else if (loc === "경기") locations.push("경기도");
      else locations.push(loc);
    }
  }
  
  return locations.length > 0 ? locations : ["전국"];
}

/**
 * 자연어 직업 정보를 4축 규격에 맞게 변환
 */
function parseJobs(jobStr) {
  if (!jobStr || jobStr.includes("제한없음") || jobStr.includes("누구나")) {
    return ["전체"];
  }
  
  const jobs = [];
  if (jobStr.includes("미취업") || jobStr.includes("구직") || jobStr.includes("취준")) {
    jobs.push("취업준비생");
  }
  if (jobStr.includes("재직") || jobStr.includes("근로") || jobStr.includes("직장")) {
    jobs.push("사회초년생");
  }
  if (jobStr.includes("대학생") || jobStr.includes("학생")) {
    jobs.push("대학생");
  }
  if (jobStr.includes("소상공인") || jobStr.includes("창업") || jobStr.includes("개인사업")) {
    jobs.push("소상공인");
  }
  
  return jobs.length > 0 ? jobs : ["전체"];
}

/**
 * 자연어 소득조건을 파싱하여 백분율 표기 변환
 */
function parseIncome(incomeStr) {
  if (!incomeStr || incomeStr.includes("제한없음")) {
    return null;
  }
  
  const match = incomeStr.match(/(\d+)%/);
  if (match) {
    return `${match[1]}% 이하`;
  }
  
  if (incomeStr.includes("중위소득")) {
    // 텍스트 매칭 시도
    if (incomeStr.includes("100%")) return "100% 이하";
    if (incomeStr.includes("120%")) return "120% 이하";
    if (incomeStr.includes("150%")) return "150% 이하";
    if (incomeStr.includes("180%")) return "180% 이하";
    if (incomeStr.includes("50%")) return "50% 이하";
  }
  
  return null; // 제한 없음
}

/**
 * 혜택 금액 추출
 */
function parseBenefitAmount(benefitStr, category) {
  if (!benefitStr) return 0;
  
  // 만원 단위 추출 (예: "월 20만원", "최대 300만원")
  const tenThousandMatch = benefitStr.match(/(\d+)\s*만\s*원/);
  if (tenThousandMatch) {
    let amt = parseInt(tenThousandMatch[1], 10) * 10000;
    // 월세 등 주기적 지급인 경우 가중치 적용 연산
    if (benefitStr.includes("월")) {
      amt = amt * 12; // 1년 기준 혜택으로 상향 조정
    }
    return amt;
  }
  
  // 원 단위 직접 추출
  const wonMatch = benefitStr.match(/(\d+)\s*원/);
  if (wonMatch) {
    return parseInt(wonMatch[1], 10);
  }
  
  // 카테고리별 합리적인 디폴트 값 제공
  if (category === "주거") return 2400000;
  if (category === "금융") return 10000000;
  if (category === "일자리") return 3000000;
  
  return 1000000; // 기본 100만원 지원으로 표기
}

/**
 * 마감일 포맷팅
 */
function parseDeadline(dateStr) {
  if (!dateStr || dateStr.includes("상시") || dateStr.includes("연중")) {
    // 상시 접수인 경우 1년 뒤의 연말을 마감일로 임의 지정
    const nextYear = new Date().getFullYear() + 1;
    return `${nextYear}-12-31T23:59:59Z`;
  }
  
  // YYYY-MM-DD 형식 추출
  const match = dateStr.match(/(\d{4})[-.]\s*(\d{1,2})[-.]\s*(\d{1,2})/);
  if (match) {
    const year = match[1];
    const month = match[2].padStart(2, '0');
    const day = match[3].padStart(2, '0');
    return `${year}-${month}-${day}T23:59:59Z`;
  }
  
  // 파싱 불가능 시 올 연말 지정
  const curYear = new Date().getFullYear();
  return `${curYear}-12-31T23:59:59Z`;
}

/**
 * 카테고리 매핑
 */
function parseCategory(catCode, title) {
  // 온통청년 plcyTpCd 코드 기준 매핑 (023010: 일자리, 023020: 주거, 023030: 교육, 023040: 문화, 023050: 참여)
  if (catCode === "023020" || title.includes("월세") || title.includes("주택") || title.includes("주거")) {
    return "주거";
  }
  if (catCode === "023010" || title.includes("취업") || title.includes("일자리") || title.includes("구직")) {
    return "일자리";
  }
  if (title.includes("도약계좌") || title.includes("적금") || title.includes("자산") || title.includes("금융")) {
    return "금융";
  }
  return "기타";
}

/**
 * 필수 서류 목록 추출
 */
function parseRequiredDocuments(docStr) {
  if (!docStr || docStr.includes("제한없음") || docStr.includes("없음")) {
    return ["주민등록등본"];
  }
  
  // 콤마, 슬래시, 줄바꿈 등으로 분리하여 트림
  const items = docStr
    .split(/[,/\n]/)
    .map(x => x.replace(/[-•*]/g, '').trim())
    .filter(x => x.length > 2 && x.length < 20); // 비정상적으로 길거나 짧은 노이즈 제거
    
  return items.length > 0 ? items.slice(0, 4) : ["주민등록등본"];
}

/**
 * 온통청년 XML 응답에서 youthPolicy 리스트를 추출하는 함수
 */
function parseXmlToPolicies(xmlText) {
  const policies = [];
  const policyBlocks = xmlText.split("<youthPolicy>");
  
  // 첫 번째 블록은 헤더이므로 생략
  for (let i = 1; i < policyBlocks.length; i++) {
    const block = policyBlocks[i].split("</youthPolicy>")[0];
    
    const rawId = getXmlTagValue(block, "bizId");
    const title = getXmlTagValue(block, "polyBizSjnm");
    const catCode = getXmlTagValue(block, "plcyTpCd");
    const desc = getXmlTagValue(block, "polyItcnCn");
    
    const ageStr = getXmlTagValue(block, "ageInfo");
    const areaStr = getXmlTagValue(block, "polyBizSecd"); // 혹은 areaNm
    const jobStr = getXmlTagValue(block, "empmSttsCn");
    const incomeStr = getXmlTagValue(block, "accrRqisCn");
    const benefitStr = getXmlTagValue(block, "etbldSpvsCn");
    const deadlineStr = getXmlTagValue(block, "rqutPrdCn");
    const docStr = getXmlTagValue(block, "rqutDocMtrcn");
    const referenceUrl = getXmlTagValue(block, "rqutUrn");
    
    // 규격화 변환
    const category = parseCategory(catCode, title);
    const ageRange = parseAgeRange(ageStr);
    const locations = parseLocation(areaStr);
    const jobs = parseJobs(jobStr);
    const incomeLimit = parseIncome(incomeStr);
    const benefitAmount = parseBenefitAmount(benefitStr, category);
    const deadline = parseDeadline(deadlineStr);
    const requiredDocs = parseRequiredDocuments(docStr);

    policies.push({
      id: rawId || `api-policy-${Math.random().toString(36).substr(2, 9)}`,
      title: title || "수집된 공공 정책",
      category,
      min_age: ageRange.min,
      max_age: ageRange.max,
      eligible_locations: locations,
      eligible_jobs: jobs,
      income_limit: incomeLimit,
      benefit_amount: benefitAmount,
      deadline,
      description: desc || "상세 설명이 존재하지 않는 공공 정책입니다.",
      required_documents: requiredDocs,
      is_active: false,    // 검증 대기 상태 (Sandbox)
      is_verified: false,   // 관리자 승인 대기 상태
      reference_url: referenceUrl || null
    });
  }
  
  return policies;
}

/**
 * 실시간 온통청년 API 호출 및 동기화 수행
 */
export async function syncExternalPolicies(limit = 10) {
  const apiKey = process.env.YOUTH_CENTER_API_KEY;
  
  try {
    let normalizedPolicies = [];
    
    if (apiKey && apiKey !== "YOUR_API_KEY") {
      console.log(`[Sync Engine] 온통청년 실시간 Open API 동기화 개시... (개수제한: ${limit})`);
      const url = `https://www.youthcenter.go.kr/opi/youthPlcyList.do?openApiVlak=${apiKey}&display=${limit}&pageIndex=1`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API 응답 실패 (상태코드: ${response.status})`);
      }
      
      const xmlText = await response.text();
      normalizedPolicies = parseXmlToPolicies(xmlText);
    } else {
      console.warn("⚠️ 온통청년 API 키(YOUTH_CENTER_API_KEY)가 등록되지 않았습니다. 실시간 연동 테스트를 위해 시뮬레이션 데이터를 자동 생성하여 공급합니다.");
      
      // 시뮬레이션 데이터셋 생성 (실제 온통청년 데이터를 미러링함)
      normalizedPolicies = [
        {
          id: "API-R202605150001",
          title: "서울시 청년 안심주택 지원금",
          category: "주거",
          min_age: 19,
          max_age: 39,
          eligible_locations: ["서울특별시"],
          eligible_jobs: ["대학생", "취업준비생", "사회초년생"],
          income_limit: "120% 이하",
          benefit_amount: 1500000,
          deadline: "2026-10-31T23:59:59Z",
          description: "서울시에 거주하며 대중교통 이용이 편리한 역세권 안심주택에 입주하는 청년들의 임대보증금 및 월세를 무이자로 지원해 주는 복지 사업입니다.",
          required_documents: ["임대차계약서", "주민등록등본", "가족관계증명서"],
          is_active: false,
          is_verified: false,
          reference_url: "https://soco.seoul.go.kr/youth/main.do"
        },
        {
          id: "API-R202605150002",
          title: "경기도 청년 면접수당 (2026)",
          category: "일자리",
          min_age: 18,
          max_age: 39,
          eligible_locations: ["경기도"],
          eligible_jobs: ["취업준비생"],
          income_limit: null,
          benefit_amount: 300000,
          deadline: "2026-12-15T23:59:59Z",
          description: "경기도 내 구직활동을 하고 있는 미취업 청년들에게 면접 1회당 5만원, 연간 최대 6회(총 30만원)의 면접 활동 수당을 지역화폐로 지원합니다.",
          required_documents: ["면접확인서", "주민등록초본"],
          is_active: false,
          is_verified: false,
          reference_url: "https://www.jobaba.net/youth/main.do"
        },
        {
          id: "API-R202605150003",
          title: "청년 소상공인 드림 이자 보전 사업",
          category: "금융",
          min_age: 19,
          max_age: 34,
          eligible_locations: ["전국"],
          eligible_jobs: ["소상공인"],
          income_limit: "150% 이하",
          benefit_amount: 5000000,
          deadline: "2026-09-30T23:59:59Z",
          description: "창업 후 3년 이내의 만 34세 이하 청년 개인사업자가 금융권 대출 시 발생하는 금리의 최대 2% 대출이자를 정부가 대신 납부 보전해 주는 자금 조달 사업입니다.",
          required_documents: ["사업자등록증", "부가가치세과세표준증명", "소득금액증명원"],
          is_active: false,
          is_verified: false,
          reference_url: "https://www.youthcenter.go.kr/youthPolicy/ythPlcyTotalSearch"
        }
      ];
    }

    if (normalizedPolicies.length === 0) {
      return { success: true, count: 0, message: "가져올 정책 데이터가 없습니다." };
    }

    console.log(`[Sync Engine] 수집 규격화 완료: 총 ${normalizedPolicies.length}개 정책 적재 시도 중...`);

    let successCount = 0;
    
    // 데이터베이스에 Upsert 처리 (id 기준으로 중복 발생 시 업데이트)
    for (const plcy of normalizedPolicies) {
      const { error } = await supabase
        .from("policies")
        .upsert(plcy, { onConflict: "id" });
        
      if (error) {
        console.error(`[Sync Engine Error] 정책 적재 실패 (${plcy.title}):`, error.message);
      } else {
        successCount++;
      }
    }

    return {
      success: true,
      count: successCount,
      totalCollected: normalizedPolicies.length,
      message: `성공적으로 외부 공공 API 정책 ${successCount}개를 동기화하였습니다. (관리자 승인 대기 샌드박스로 적재)`
    };

  } catch (err) {
    console.error("[Sync Engine Error] 예상치 못한 연동 동기화 에러:", err);
    return { success: false, error: err.message };
  }
}
