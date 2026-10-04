import test from "node:test";
import assert from "node:assert/strict";

import { resolveCookieSecurity } from "./cookie-security.ts";

test("secure cookies only when the request is actually HTTPS", () => {
  assert.equal(resolveCookieSecurity({ nodeEnv: "production", forwardedProto: "https" }), true);
  assert.equal(resolveCookieSecurity({ nodeEnv: "production", forwardedProto: "http" }), false);
  assert.equal(resolveCookieSecurity({ nodeEnv: "development", forwardedProto: "https" }), false);
});
