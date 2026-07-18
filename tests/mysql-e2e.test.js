const test = require("node:test");
const assert = require("node:assert/strict");

if (process.env.RUN_MYSQL_E2E !== "1") {
  test.skip("parcours E2E MySQL (activer avec npm run test:e2e:mysql)", () => {});
} else {
  test("parcours MVP complet sur une vraie base MySQL", { timeout: 60_000 }, async (t) => {
    const app = require("../dist/app").default;
    const { prisma } = require("../dist/config/db");
    const server = await new Promise((resolve, reject) => {
      const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
      instance.once("error", reject);
    });
    t.after(async () => {
      await new Promise((resolve) => server.close(resolve));
      await prisma.$disconnect();
    });

    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    let token = "";
    const request = async (method, path, body, expectedStatus = 200) => {
      const headers = { Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      if (body !== undefined) headers["Content-Type"] = "application/json";
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await response.text();
      const payload = text ? JSON.parse(text) : undefined;
      assert.equal(response.status, expectedStatus, `${method} ${path}: ${text}`);
      if (payload && expectedStatus < 400) assert.equal(payload.success ?? true, true, `${method} ${path}`);
      return payload;
    };

    const phone = `9${Date.now().toString().slice(-11)}`;
    await request("POST", "/api/auth/signup/create_account", {
      nom: "Proprietaire E2E",
      telephone: phone,
      motDePasse: "4826",
      nomBoutique: "Boutique E2E",
      typeEntreprise: "AUTRE",
      devise: "CDF",
    }, 201);

    const login = await request("POST", "/api/auth/signin/login", { telephone: phone, motDePasse: "4826" });
    token = login.token;
    assert.ok(token);
    assert.equal(login.data.roleNom, "PROPRIETAIRE");

    const category = (await request("POST", "/api/stock/categories", { nom: "Boissons E2E" }, 201)).data;
    const product = (await request("POST", "/api/stock/produits", {
      nom: "Eau E2E",
      prixAchat: 10,
      prixVente: 20,
      stockActuel: 0,
      uniteMesure: "Pieces",
      categorieId: category.categorieId,
    }, 201)).data;
    const supplier = (await request("POST", "/api/achats/fournisseurs", { nom: "Fournisseur E2E", telephone: "990000001" }, 201)).data;
    const client = (await request("POST", "/api/ventes/clients", { nom: "Client E2E", telephone: "990000002" }, 201)).data;
    const cashDesk = (await request("POST", "/api/caisses", { nom: "Caisse E2E" }, 201)).data;
    const cashSession = (await request("POST", "/api/caisses/sessions/ouvrir", {
      caisseId: cashDesk.caisseId,
      fondOuverture: 100,
    }, 201)).data;

    const purchase = (await request("POST", "/api/achats", {
      fournisseurId: supplier.fournisseurId,
      montantPaye: 100,
      methodePaiement: "BANQUE",
      lignes: [{ produitId: product.produitId, quantite: 20, prixAchat: 10 }],
    }, 201)).data;
    assert.equal(Number(purchase.montantTotal), 200);
    const supplierDebts = await request("GET", `/api/achats/dettes?fournisseurId=${supplier.fournisseurId}`);
    assert.equal(supplierDebts.data.length, 1);
    await request("POST", `/api/achats/dettes/${supplierDebts.data[0].detteFournisseurId}/paiements`, { montant: 100, methode: "BANQUE" });

    const partialSale = (await request("POST", "/api/ventes", {
      clientId: client.clientId,
      montantPaye: 40,
      methodePaiement: "ESPECES",
      lignes: [{ produitId: product.produitId, quantite: 3 }],
    }, 201)).data;
    assert.equal(partialSale.statut, "PARTIELLE");
    const customerDebts = await request("GET", `/api/ventes/dettes/liste?clientId=${client.clientId}`);
    assert.equal(customerDebts.data.length, 1);
    await request("POST", `/api/ventes/dettes/${customerDebts.data[0].detteId}/paiements`, { montant: 20, methode: "ESPECES" });

    const paidSale = (await request("POST", "/api/ventes", {
      clientId: client.clientId,
      montantPaye: 40,
      methodePaiement: "ESPECES",
      lignes: [{ produitId: product.produitId, quantite: 2 }],
    }, 201)).data;
    await request("POST", `/api/ventes/${paidSale.venteId}/remboursements`, {
      motif: "Retour produit E2E",
      methode: "ESPECES",
      lignes: [{ produitId: product.produitId, quantite: 1 }],
    }, 201);
    const receipt = await request("GET", `/api/ventes/${partialSale.venteId}/recu`);
    assert.equal(receipt.data.vente.venteId, partialSale.venteId);

    await request("POST", "/api/depenses", {
      categorie: "AUTRE",
      libelle: "Depense E2E",
      montant: 5,
      methodePaiement: "ESPECES",
    }, 201);
    await request("POST", "/api/inventaires", {
      notes: "Comptage E2E",
      lignes: [{ produitId: product.produitId, quantiteComptee: 18 }],
    }, 201);
    const updatedProduct = await request("GET", `/api/stock/produits/${product.produitId}`);
    assert.equal(Number(updatedProduct.data.stockActuel), 18);

    const dashboard = await request("GET", "/api/dashboard/summary");
    assert.ok(dashboard.data);
    const report = await request("GET", "/api/rapports/financier");
    assert.ok(report.data);

    const cashPreview = await request("GET", `/api/caisses/sessions/${cashSession.sessionCaisseId}/preview`);
    assert.equal(Number(cashPreview.data.montantAttendu), 175);
    await request("POST", `/api/caisses/sessions/${cashSession.sessionCaisseId}/fermer`, { montantReel: 175 });
    const validatedSession = await request("POST", `/api/caisses/sessions/${cashSession.sessionCaisseId}/valider`, { approuve: true });
    assert.equal(validatedSession.data.statut, "VALIDEE");

    const closurePreview = await request("GET", "/api/clotures/preview?fondCaisseOuverture=100");
    assert.equal(Number(closurePreview.data.montantAttenduCaisse), 175);
    const closure = (await request("POST", "/api/clotures", {
      fondCaisseOuverture: 100,
      montantReelCaisse: 175,
      notes: "Cloture E2E",
    }, 201)).data;
    assert.equal(Number(closure.ecartCaisse), 0);
    await request("GET", `/api/clotures/${closure.clotureJourneeId}`);

    const blocked = await request("POST", "/api/depenses", {
      categorie: "AUTRE",
      libelle: "Doit etre bloquee",
      montant: 1,
      methodePaiement: "ESPECES",
    }, 400);
    assert.equal(blocked.success, false);

    await request("POST", "/api/auth/signin/logout", undefined, 204);
  });
}
