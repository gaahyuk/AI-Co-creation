import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // 홈페이지 스크린샷
  await page.goto('http://localhost:3000');
  await page.screenshot({ path: 'home.png', fullPage: true });
  console.log('✓ Home page screenshot saved');

  // 정책 상세 페이지 스크린샷
  await page.goto('http://localhost:3000/policies/policy-youth-rent');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'policy-detail.png', fullPage: true });
  console.log('✓ Policy detail page screenshot saved');

  await browser.close();
})();
