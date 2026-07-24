import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// 테스트에서도 tsconfig의 "@/*" 경로 별칭을 해석할 수 있도록 별칭을 등록한다.
// (Next.js 빌드는 tsconfig paths로 해석하지만 vitest는 별도 설정이 필요하다.)
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
