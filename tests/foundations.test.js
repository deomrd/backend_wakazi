const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { loadAppConfig } = require("../dist/config/env.js");
const { checkDatabaseHealth } = require("../dist/shared/health/databaseHealth.js");
const { createAuthenticationMiddleware } = require("../dist/shared/security/authMiddleware.js");
const { JwtAuthService } = require("../dist/modulSignin/infrastructure/security/jwtAuthService.js");

test("valide une configuration complète et refuse les secrets faibles", () => {
  const config = loadAppConfig({
    NODE_ENV: "production",
    DATABASE_URL: "mysql://user:pass@localhost:3306/test",
    JWT_SECRET: "a-secure-random-secret-with-more-than-32-characters",
    PORT: "8080",
    TRUST_PROXY_HOPS: "1",
  });
  assert.equal(config.port, 8080);
  assert.equal(config.trustProxyHops, 1);
  assert.throws(() => loadAppConfig({
    NODE_ENV: "production",
    DATABASE_URL: "mysql://localhost/test",
    JWT_SECRET: "change_me",
  }), /JWT_SECRET/);
});

test("distingue une base prête d'une base en délai dépassé", async () => {
  const ready = await checkDatabaseHealth({ $queryRawUnsafe: async () => [{ ok: 1 }] }, 50);
  const unavailable = await checkDatabaseHealth({ $queryRawUnsafe: async () => new Promise(() => {}) }, 10);
  assert.equal(ready.status, "up");
  assert.equal(unavailable.status, "down");
});

test("valide le rôle, la boutique et la version du jeton depuis la base", async () => {
  const user = {
    userId: "user-1",
    nom: "Test",
    nomUtilisateur: "test",
    telephone: "243000000000",
    roleNom: "GERANT",
    boutiqueId: "shop-1",
    boutiqueNom: "Shop",
    statut: true,
    doitChangerPin: false,
    authVersion: 3,
  };
  const token = new JwtAuthService().generateToken(user);
  const database = {
    user: {
      findUnique: async () => ({
        statut: true,
        doitChangerPin: false,
        authVersion: 3,
        UserRoles: [{ boutiqueId: "shop-1", Roles: { nom: "GERANT" } }],
      }),
    },
  };
  const app = express();
  app.get("/protected", createAuthenticationMiddleware(database, process.env.JWT_SECRET), (req, res) => res.json(req.user));
  const server = await listen(app);
  try {
    const response = await fetch(`${server.url}/protected`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(response.status, 200);
    const context = await response.json();
    assert.equal(context.role, "GERANT");
    assert.equal(context.boutiqueId, "shop-1");
    assert.equal(context.authVersion, 3);
  } finally {
    await server.close();
  }
});

test("refuse immédiatement un jeton révoqué", async () => {
  const user = {
    userId: "user-1",
    nom: "Test",
    nomUtilisateur: "test",
    telephone: "243000000000",
    roleNom: "VENDEUR",
    boutiqueId: "shop-1",
    boutiqueNom: "Shop",
    statut: true,
    doitChangerPin: false,
    authVersion: 1,
  };
  const token = new JwtAuthService().generateToken(user);
  const database = {
    user: {
      findUnique: async () => ({
        statut: true,
        doitChangerPin: false,
        authVersion: 2,
        UserRoles: [{ boutiqueId: "shop-1", Roles: { nom: "VENDEUR" } }],
      }),
    },
  };
  const app = express();
  app.get("/protected", createAuthenticationMiddleware(database, process.env.JWT_SECRET), (_req, res) => res.sendStatus(204));
  const server = await listen(app);
  try {
    const response = await fetch(`${server.url}/protected`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(response.status, 401);
  } finally {
    await server.close();
  }
});

test("refuse un jeton dont le rôle n'appartient plus à la boutique", async () => {
  const token = new JwtAuthService().generateToken({
    userId: "user-2",
    nom: "Test",
    nomUtilisateur: "test-2",
    telephone: "243000000001",
    roleNom: "GERANT",
    boutiqueId: "shop-2",
    boutiqueNom: "Shop 2",
    statut: true,
    doitChangerPin: false,
    authVersion: 0,
  });
  const database = {
    user: {
      findUnique: async () => ({
        statut: true,
        doitChangerPin: false,
        authVersion: 0,
        UserRoles: [],
      }),
    },
  };
  const app = express();
  app.get("/protected", createAuthenticationMiddleware(database, process.env.JWT_SECRET), (_req, res) => res.sendStatus(204));
  const server = await listen(app);
  try {
    const response = await fetch(`${server.url}/protected`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(response.status, 401);
  } finally {
    await server.close();
  }
});

async function listen(app) {
  let server;
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}
