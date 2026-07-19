import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("build contains the finished thought lab", async () => {
  const [layout, page, app] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ThoughtLabApp.tsx", import.meta.url), "utf8"),
    access(new URL("../dist/server/index.js", import.meta.url)),
    access(new URL("../public/og.png", import.meta.url)),
  ]);

  assert.match(layout, /序理 · 个人思维成长系统/);
  assert.match(layout, /记录真实思考，重建思维结构，用证据看见长期成长。/);
  assert.match(layout, /og\.png/);
  assert.match(page, /ThoughtLabApp/);
  assert.match(app, /思维记录/);
  assert.match(app, /评估体系/);
  assert.match(app, /证据不足/);
  assert.doesNotMatch(
    `${layout}\n${page}\n${app}`,
    /codex-preview|Your site is taking shape|react-loading-skeleton/i,
  );
});
