const test = require("node:test");
const assert = require("node:assert/strict");
const { createAchatSchema, payDetteFournisseurSchema } = require("../dist/modulAchat/presentation/validationZod/achatSchema.js");
const { createInventaireSchema } = require("../dist/modulInventaire/presentation/validationZod/inventaireSchema.js");
const { createVenteSchema, refundVenteSchema } = require("../dist/modulVente/presentation/validationZod/venteSchema.js");

test("accepte un achat valide et convertit les montants", () => {
  const result = createAchatSchema.parse({
    fournisseurId: "supplier-1",
    montantPaye: "25",
    methodePaiement: "ESPECES",
    lignes: [{ produitId: "product-1", quantite: "2", prixAchat: "10" }],
  });
  assert.equal(result.montantPaye, 25);
  assert.equal(result.lignes[0].quantite, 2);
});

test("refuse les quantités négatives dans un inventaire", () => {
  const result = createInventaireSchema.safeParse({ lignes: [{ produitId: "product-1", quantiteComptee: -1 }] });
  assert.equal(result.success, false);
});

test("refuse un remboursement sans ligne", () => {
  const result = refundVenteSchema.safeParse({ motif: "Retour client", methode: "ESPECES", lignes: [] });
  assert.equal(result.success, false);
});

test("refuse un paiement fournisseur nul", () => {
  const result = payDetteFournisseurSchema.safeParse({ montant: 0, methode: "ESPECES" });
  assert.equal(result.success, false);
});

test("refuse un produit en double dans une vente", () => {
  const result = createVenteSchema.safeParse({
    lignes: [
      { produitId: "product-1", quantite: 2 },
      { produitId: "product-1", quantite: 3 },
    ],
  });
  assert.equal(result.success, false);
});

test("refuse un produit en double dans un achat", () => {
  const result = createAchatSchema.safeParse({
    lignes: [
      { produitId: "product-1", quantite: 2, prixAchat: 10 },
      { produitId: "product-1", quantite: 3, prixAchat: 10 },
    ],
  });
  assert.equal(result.success, false);
});

test("refuse un produit en double dans un inventaire", () => {
  const result = createInventaireSchema.safeParse({
    lignes: [
      { produitId: "product-1", quantiteComptee: 2 },
      { produitId: "product-1", quantiteComptee: 3 },
    ],
  });
  assert.equal(result.success, false);
});

test("refuse un produit en double dans un remboursement", () => {
  const result = refundVenteSchema.safeParse({
    motif: "Retour client",
    methode: "ESPECES",
    lignes: [
      { produitId: "product-1", quantite: 1 },
      { produitId: "product-1", quantite: 1 },
    ],
  });
  assert.equal(result.success, false);
});
