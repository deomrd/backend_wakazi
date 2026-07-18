const test = require("node:test");
const assert = require("node:assert/strict");
const { Prisma } = require("@prisma/client");
const { PrismaRapportRepository } = require("../dist/modulRapport/infrastructure/prismaRepository/prismaRapportRepository.js");

const decimal = (value) => new Prisma.Decimal(value);

test("impute un remboursement à sa date et corrige la marge de la période", async () => {
  const prisma = {
    boutique: { findUnique: async () => ({ nom: "Boutique test", devise: "USD" }) },
    vente: {
      findMany: async () => [{
        montantTotal: decimal(100),
        lignesVente: [{
          produitId: "p1",
          quantite: decimal(2),
          prixAchat: decimal(30),
          prixUnitaire: decimal(50),
          sousTotal: decimal(100),
          produit: { nom: "Produit 1" },
        }],
      }],
    },
    remboursementVente: {
      findMany: async () => [{
        montant: decimal(50),
        lignes: [{
          produitId: "p1",
          quantite: decimal(1),
          sousTotal: decimal(50),
          produit: { nom: "Produit 1" },
        }],
        vente: { lignesVente: [{ produitId: "p1", prixAchat: decimal(30) }] },
      }],
    },
    depense: { findMany: async () => [{ montant: decimal(10) }] },
    produit: { findMany: async () => [{ produitId: "p1", nom: "Produit 1", stockActuel: decimal(5), prixAchat: decimal(30), prixVente: decimal(50) }] },
    dette: { findMany: async () => [] },
    detteFournisseur: { findMany: async () => [] },
    achat: { findMany: async () => [] },
  };

  const report = await new PrismaRapportRepository(prisma).getFinancialReport("shop-1", {
    dateDebut: new Date("2026-07-16T00:00:00.000Z"),
    dateFin: new Date("2026-07-16T23:59:59.999Z"),
  });

  assert.equal(report.ventes.chiffreAffairesBrut.toFixed(2), "100.00");
  assert.equal(report.ventes.remboursements.toFixed(2), "50.00");
  assert.equal(report.coutMarchandisesVendues.toFixed(2), "30.00");
  assert.equal(report.margeBrute.toFixed(2), "20.00");
  assert.equal(report.beneficeNet.toFixed(2), "10.00");
  assert.equal(report.meilleursProduits[0].quantite.toFixed(3), "1.000");
});
