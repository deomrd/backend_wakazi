const test = require("node:test");
const assert = require("node:assert/strict");
const app = require("../dist/app.js").default;
const { prisma } = require("../dist/config/db.js");

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await prisma.$disconnect();
});

test("sert l'API de santé et l'interface", async () => {
  const [healthResponse, pageResponse] = await Promise.all([
    fetch(`${baseUrl}/api/health`),
    fetch(`${baseUrl}/`),
  ]);
  assert.equal(healthResponse.status, 200);
  assert.equal((await healthResponse.json()).status, "ok");
  assert.equal(pageResponse.status, 200);
  assert.match(healthResponse.headers.get("x-request-id"), /^[A-Za-z0-9._-]+$/);
  assert.equal(healthResponse.headers.get("x-content-type-options"), "nosniff");
  assert.equal(healthResponse.headers.get("x-frame-options"), "DENY");
  assert.match(await pageResponse.text(), /<title>Wakazi Console<\/title>/);
});

test("expose une sonde de vie sans dépendre de MySQL", async () => {
  const response = await fetch(`${baseUrl}/api/health/live`, { headers: { "x-request-id": "test-live-123" } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-request-id"), "test-live-123");
  assert.equal((await response.json()).status, "ok");
});

test("protège tous les nouveaux modules sans jeton", async () => {
  const paths = [
    "/api/achats",
    "/api/inventaires",
    "/api/caisses",
    "/api/rapports/financier",
    "/api/ventes",
  ];
  const responses = await Promise.all(paths.map((path) => fetch(`${baseUrl}${path}`)));
  assert.deepEqual(responses.map((response) => response.status), [401, 401, 401, 401, 401]);
});

test("retourne une erreur JSON propre pour une route inconnue", async () => {
  const response = await fetch(`${baseUrl}/api/inconnue`);
  assert.equal(response.status, 404);
  const body = await response.json();
  assert.equal(body.success, false);
});

test("rejette un corps JSON malformé avant le traitement métier", async () => {
  const response = await fetch(`${baseUrl}/api/achats`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{",
  });
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.success, false);
  assert.match(body.message, /format JSON/i);
  assert.equal(typeof body.requestId, "string");
});

test("ne publie plus les anciennes routes globales de comptes", async () => {
  const responses = await Promise.all([
    fetch(`${baseUrl}/api/auth/signup/compte-externe`),
    fetch(`${baseUrl}/api/auth/signup/by-telephone/243000000000`),
  ]);
  assert.deepEqual(responses.map((response) => response.status), [404, 404]);
});

test("limite les tentatives répétées sur un même identifiant", async () => {
  const attempts = [];
  for (let index = 0; index < 11; index += 1) {
    attempts.push(await fetch(`${baseUrl}/api/auth/signin/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nomUtilisateur: "rate-limit-test", motDePasse: "x" }),
    }));
  }
  assert.deepEqual(attempts.slice(0, 10).map((response) => response.status), Array(10).fill(400));
  assert.equal(attempts[10].status, 429);
  assert.ok(Number(attempts[10].headers.get("retry-after")) > 0);
});

test("limite les créations répétées de boutiques", async () => {
  const attempts = [];
  for (let index = 0; index < 4; index += 1) {
    attempts.push(await fetch(`${baseUrl}/api/auth/signup/create_account`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    }));
  }
  assert.deepEqual(attempts.slice(0, 3).map((response) => response.status), [400, 400, 400]);
  assert.equal(attempts[3].status, 429);
});
