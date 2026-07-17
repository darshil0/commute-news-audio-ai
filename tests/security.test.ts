import assert from "assert";
import crypto from "crypto";
import { isBlockedIp, USERNAME_PATTERN, safeSyncFilePath, signToken, verifyToken } from "../server";

async function runTests() {
  console.log("Starting security verification suite...");

  // --- TEST 1: isBlockedIp helper logic ---
  const blockedIps = [
    "127.0.0.1", "127.0.0.2", "10.0.0.1", "10.255.255.255",
    "169.254.169.254", "169.254.10.10", "172.16.0.1", "172.31.255.255",
    "192.168.1.1", "192.168.255.255", "0.0.0.0", "::1", "fc00::1", "fe80::1"
  ];
  const allowedIps = [
    "8.8.8.8", "1.1.1.1", "172.32.0.1", "172.15.255.255", "192.169.0.1", "2001:db8::1"
  ];

  for (const ip of blockedIps) {
    assert.strictEqual(isBlockedIp(ip), true, `IP ${ip} should be blocked`);
  }
  for (const ip of allowedIps) {
    assert.strictEqual(isBlockedIp(ip), false, `IP ${ip} should be allowed`);
  }
  console.log("✓ Blocked/Allowed IP validation tests passed.");

  // --- TEST 2: Username pattern ---
  const validUsernames = ["alice", "bob-123", "charlie_under", "a-b_3"];
  const invalidUsernames = [
    "ab", "a".repeat(33), "alice/bob", "alice..bob", "../alice", "alice?", "ALICE"
  ];

  for (const u of validUsernames) {
    assert.ok(USERNAME_PATTERN.test(u), `Username ${u} should be valid`);
  }
  for (const u of invalidUsernames) {
    assert.ok(!USERNAME_PATTERN.test(u), `Username ${u} should be invalid`);
  }
  console.log("✓ Username safety pattern tests passed.");

  // --- TEST 3: Safe sync file paths ---
  assert.ok(safeSyncFilePath("alice").endsWith("sync_alice.json"));
  assert.throws(() => safeSyncFilePath("../../../etc/passwd"), /Invalid session identity/);
  assert.throws(() => safeSyncFilePath("nested/dir"), /Invalid session identity/);
  console.log("✓ Path traversal defense validation tests passed.");

  // --- TEST 4: Token Sign & Expiry ---
  const token = signToken("alice", "test-secret");
  assert.strictEqual(verifyToken(token, "test-secret"), "alice", "Token verification failed for fresh token");

  // Old expired token (31 days ago)
  const expiredToken = signToken("alice", "test-secret", Date.now() - (31 * 24 * 60 * 60 * 1000));
  assert.strictEqual(verifyToken(expiredToken, "test-secret"), null, "Expired token should be rejected");

  // Missing exp claim (simulated legacy token)
  const legacyPayload = JSON.stringify({ username: "alice", ts: Date.now() });
  const legacyBody = Buffer.from(legacyPayload).toString("base64url");
  const legacySig = crypto.createHmac("sha256", "test-secret").update(legacyBody).digest("base64url");
  const legacyToken = `${legacyBody}.${legacySig}`;
  assert.strictEqual(verifyToken(legacyToken, "test-secret"), null, "Token missing exp claim should be rejected");

  console.log("✓ Token signature and expiry tests passed.");

  console.log("\nAll logic security unit tests passed successfully on actual exports from server.ts!");
}

runTests().catch((err) => {
  console.error("Test suite failed:", err);
  process.exit(1);
});
