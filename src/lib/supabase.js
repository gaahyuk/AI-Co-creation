import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isPlaceholder = 
  !supabaseUrl || 
  !supabaseAnonKey || 
  supabaseUrl === "your-supabase-url" || 
  supabaseUrl.includes("placeholder-project") || 
  supabaseAnonKey.includes("placeholder") ||
  supabaseAnonKey === "your-supabase-anon-key";

if (isPlaceholder) {
  console.warn(
    "⚠️ Supabase 환경 변수가 누락되었거나 플레이스홀더입니다. 로컬 Mock 데이터베이스 모드로 실행됩니다."
  );
}

// Helper to get/set localStorage items safely
const getLocal = (key, defaultVal = []) => {
  if (typeof window === "undefined") return defaultVal;
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultVal;
  } catch (_) {
    return defaultVal;
  }
};

const setLocal = (key, val) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.error(`Failed to write to localStorage for key: ${key}`, err);
  }
};

// Seed initial policies & profiles locally if they don't exist
const seedLocalPoliciesIfNeeded = () => {
  if (typeof window === "undefined") return;

  // Seed profiles if not exist
  const existingProfiles = localStorage.getItem("local_db_profiles");
  if (!existingProfiles) {
    const defaultProfiles = [];
    setLocal("local_db_profiles", defaultProfiles);
  }

  const existing = localStorage.getItem("local_db_policies");
  if (!existing) {
    const seedList = [
      {
        id: "policy-youth-rent",
        title: "청년월세 특별지원",
        category: "주거",
        min_age: 19,
        max_age: 34,
        eligible_locations: ["전국"],
        eligible_jobs: ["대학생", "취업준비생", "사회초년생"],
        income_limit: "100% 이하",
        benefit_amount: 2400000,
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
        benefit_amount: 50000000,
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
        benefit_amount: 3000000,
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
        benefit_amount: 3000000,
        deadline: "2026-06-15T23:59:59Z",
        description: "인천에 거주하는 미취업 청년들의 적극적인 구직활동을 위해 매월 50만원씩 6개월간 총 300만원의 구직활동비를 체크카드 포인트 형태로 지원합니다.",
        required_documents: ["주민등록등본", "소득금액증명원"],
        reference_url: "https://youth.incheon.go.kr"
      }
    ];
    setLocal("local_db_policies", seedList);
  }
};

if (isPlaceholder) {
  seedLocalPoliciesIfNeeded();
}

// Mock auth module
const mockAuth = {
  getSession: async () => {
    if (typeof window === "undefined") return { data: { session: null }, error: null };
    const session = getLocal("mock_session", null);
    return { data: { session }, error: null };
  },
  onAuthStateChange: (callback) => {
    if (typeof window === "undefined") {
      return { data: { subscription: { unsubscribe: () => {} } }, error: null };
    }
    
    // Immediately call callback once
    const session = getLocal("mock_session", null);
    setTimeout(() => callback("SIGNED_IN", session), 50);

    return {
      data: {
        subscription: {
          unsubscribe: () => {}
        }
      },
      error: null
    };
  },
  signInWithPassword: async ({ email, password }) => {
    if (typeof window === "undefined") return { data: { user: null }, error: null };
    const mockUser = {
      id: "mock-user-uuid-1234-5678",
      email: email || "tester@policyflow.ai",
      created_at: new Date().toISOString()
    };
    const mockSession = {
      user: mockUser,
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
      expires_at: Math.floor(Date.now() / 1000) + 3600
    };
    setLocal("mock_session", mockSession);

    // Register profile mock data if not existing
    const profiles = getLocal("local_db_profiles");
    if (!profiles.some(p => p.id === mockUser.id)) {
      const defaultProfile = {
        id: mockUser.id,
        birth_date: "1998-05-15",
        location: "인천광역시",
        employment_status: "취업준비생",
        income_level: "중위소득 100% 이하",
        is_admin: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setLocal("local_db_profiles", [...profiles, defaultProfile]);
    }

    return { data: { session: mockSession, user: mockUser }, error: null };
  },
  signUp: async ({ email, password }) => {
    const mockUser = {
      id: "mock-user-uuid-1234-5678",
      email: email || "tester@policyflow.ai",
      created_at: new Date().toISOString()
    };
    return { data: { user: mockUser }, error: null };
  },
  signOut: async () => {
    if (typeof window === "undefined") return { error: null };
    localStorage.removeItem("mock_session");
    return { error: null };
  }
};

// Mock Query Builder
class MockQueryBuilder {
  constructor(tableName) {
    this.tableName = `local_db_${tableName}`;
    this.filters = [];
    this.orderConfig = null;
    this.isSingle = false;
    this.action = "select"; // default action
    this.actionData = null;
  }

  select(fields) {
    this.action = "select";
    return this;
  }

  eq(column, value) {
    this.filters.push({ column, value, type: "eq" });
    return this;
  }

  order(column, config) {
    this.orderConfig = { column, ...config };
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  insert(data) {
    this.action = "insert";
    this.actionData = data;
    return this;
  }

  update(data) {
    this.action = "update";
    this.actionData = data;
    return this;
  }

  delete() {
    this.action = "delete";
    return this;
  }

  async then(onfulfilled, onrejected) {
    try {
      let records = getLocal(this.tableName);

      if (this.action === "insert") {
        const normalizedData = Array.isArray(this.actionData) ? this.actionData : [this.actionData];
        const newRecords = normalizedData.map(item => ({
          id: item.id || Math.random().toString(36).substr(2, 9),
          created_at: new Date().toISOString(),
          ...item
        }));
        records = [...records, ...newRecords];
        setLocal(this.tableName, records);
        return onfulfilled({
          data: this.isSingle ? newRecords[0] : newRecords,
          error: null
        });
      }

      if (this.action === "update") {
        let matchedData = null;
        const updated = records.map(item => {
          const match = this.filters.every(f => {
            if (f.type === "eq") {
              return item[f.column] === f.value;
            }
            return true;
          });
          if (match) {
            matchedData = { ...item, ...this.actionData, updated_at: new Date().toISOString() };
            return matchedData;
          }
          return item;
        });
        setLocal(this.tableName, updated);
        return onfulfilled({ data: this.isSingle ? matchedData : updated, error: null });
      }

      if (this.action === "delete") {
        const remaining = records.filter(item => {
          const match = this.filters.every(f => {
            if (f.type === "eq") {
              return item[f.column] === f.value;
            }
            return true;
          });
          return !match;
        });
        setLocal(this.tableName, remaining);
        return onfulfilled({ error: null });
      }

      // Default: select
      // Apply eq filters
      for (const filter of this.filters) {
        if (filter.type === "eq") {
          records = records.filter(item => item[filter.column] === filter.value);
        }
      }

      // Apply sorting
      if (this.orderConfig) {
        const { column, ascending } = this.orderConfig;
        records.sort((a, b) => {
          const valA = a[column];
          const valB = b[column];
          if (valA < valB) return ascending ? -1 : 1;
          if (valA > valB) return ascending ? 1 : -1;
          return 0;
        });
      }

      let result = records;
      if (this.isSingle) {
        if (records.length === 0) {
          throw { code: "PGRST116", message: "No rows found" };
        }
        result = records[0];
      }

      return onfulfilled({ data: result, error: null });
    } catch (err) {
      if (err.code === "PGRST116") {
        return onfulfilled({ data: null, error: err });
      }
      return onfulfilled({ data: null, error: err });
    }
  }
}

const mockSupabase = {
  auth: mockAuth,
  from: (tableName) => new MockQueryBuilder(tableName)
};

export const supabase = isPlaceholder
  ? mockSupabase
  : createClient(supabaseUrl, supabaseAnonKey);
