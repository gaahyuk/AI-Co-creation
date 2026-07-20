import type { AlimtalkClient, AlimtalkResult } from "@/lib/adapters/types";

// 카카오 비즈니스 채널/템플릿 승인 + 발송대행사(Solapi, 알리고 등) 계정 발급 전까지
// 사용하는 mock 구현체. 실제로 발송하지 않고 콘솔에 로그만 남긴다.
class MockAlimtalkClient implements AlimtalkClient {
  async send(
    to: string,
    templateCode: string,
    variables: Record<string, string>
  ): Promise<AlimtalkResult> {
    console.log(
      `[mock-alimtalk] to=${to} template=${templateCode} variables=${JSON.stringify(variables)}`
    );
    return { status: "sent" };
  }
}

export function createMockAlimtalkClient(): AlimtalkClient {
  return new MockAlimtalkClient();
}
