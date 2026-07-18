const state = {
  token: localStorage.getItem("wakazi_token") || "",
  user: JSON.parse(localStorage.getItem("wakazi_user") || "null"),
  products: [],
  clients: [],
  debts: [],
  expenses: [],
  apports: [],
  closures: [],
  dashboard: null,
  movements: [],
  restocks: [],
  suppliers: [],
  purchases: [],
  supplierDebts: [],
  inventories: [],
  cashRegisters: [],
  currentCashSession: null,
  cashSessions: [],
  report: null,
  categories: [],
  employees: [],
  boutique: null,
  saleLines: [],
  scannedProduct: null,
  qrStream: null,
  qrScanTimer: null,
  signupStep: 0,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = payload?.message || payload?.error || `Erreur HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function compact(data) {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== "" && value !== null && value !== undefined)
  );
}

function numberOrUndefined(value) {
  return value === "" || value === undefined ? undefined : Number(value);
}

function toast(message, type = "ok") {
  const node = document.createElement("div");
  node.className = `toast ${type === "error" ? "error" : ""}`;
  node.textContent = message;
  $("#toastLog").appendChild(node);
  setTimeout(() => node.remove(), 4600);
}

function setSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem("wakazi_token", token);
  localStorage.setItem("wakazi_user", JSON.stringify(user));
  renderSession();
}

function clearSession() {
  state.token = "";
  state.user = null;
  localStorage.removeItem("wakazi_token");
  localStorage.removeItem("wakazi_user");
  renderSession();
}

function renderSession() {
  $("#sessionName").textContent = state.user?.nom || "Non connecte";
  $("#sessionMeta").textContent = state.user
    ? `${state.user.roleNom} - ${state.user.boutiqueNom}`
    : "Aucun token actif";

  if ($("#newUsername")) {
    $("#newUsername").value = state.user?.nomUtilisateur || "";
  }
}

function showView(id) {
  $$(".view").forEach((view) => view.classList.toggle("active", view.id === id));
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === id));
}

function canManageBoutique() {
  return state.user?.roleNom === "PROPRIETAIRE";
}

function canManageStock() {
  return ["PROPRIETAIRE", "GERANT"].includes(state.user?.roleNom);
}

function canOperateCash() {
  return ["PROPRIETAIRE", "GERANT", "VENDEUR"].includes(state.user?.roleNom);
}

function updateSignupStep(nextStep) {
  state.signupStep = Math.max(0, Math.min(2, nextStep));
  $$("[data-step]").forEach((step) => step.classList.toggle("active", Number(step.dataset.step) === state.signupStep));
  $$("[data-step-dot]").forEach((dot) => dot.classList.toggle("active", Number(dot.dataset.stepDot) === state.signupStep));
  $("#prevStepBtn").classList.toggle("hidden", state.signupStep === 0);
  $("#nextStepBtn").classList.toggle("hidden", state.signupStep === 2);
  $("#createAccountBtn").classList.toggle("hidden", state.signupStep !== 2);

  if (state.signupStep === 2) {
    const data = formData($("#signupForm"));
    $("#signupReview").innerHTML = `
      <strong>${data.nom || "-"}</strong><br>
      ${data.telephone || "-"}<br>
      ${data.nomBoutique || "-"} - ${data.typeEntreprise || "-"}<br>
      ${data.adresseBoutique || "-"} - ${data.devise || "USD"}
    `;
  }
}

function validateCurrentSignupStep() {
  const fields = $$(`[data-step="${state.signupStep}"] input, [data-step="${state.signupStep}"] select`);
  return fields.every((field) => field.reportValidity());
}

function money(value) {
  return Number(value || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function currentCurrencies() {
  const principale = state.boutique?.devise || state.user?.devise || "USD";
  const secondaire = state.boutique?.deviseSecondaire || "";
  return { principale, secondaire, taux: Number(state.boutique?.tauxDeviseSecondaire || 0) };
}

function convertToPrincipal(amount, currency) {
  const { principale, secondaire, taux } = currentCurrencies();
  const value = Number(amount || 0);

  if (!currency || currency === principale) return value;
  if (currency === secondaire && taux > 0) return value / taux;

  return value;
}

function convertFromPrincipal(amount, currency) {
  const { principale, secondaire, taux } = currentCurrencies();
  const value = Number(amount || 0);

  if (!currency || currency === principale) return value;
  if (currency === secondaire && taux > 0) return value * taux;

  return value;
}

function todayInputValue() {
  const today = new Date();
  const offset = today.getTimezoneOffset() * 60000;
  return new Date(today.getTime() - offset).toISOString().slice(0, 10);
}

function setClosureDefaults() {
  const dateInput = $("#closureDate");
  if (dateInput && !dateInput.value) {
    dateInput.value = todayInputValue();
  }

  const openingCashInput = $("#closureOpeningCash");
  if (openingCashInput && openingCashInput.value === "") {
    openingCashInput.value = "0";
  }
}

function setDashboardDefaults() {
  const startInput = $("#dashboardDateStart");
  const endInput = $("#dashboardDateEnd");
  const today = todayInputValue();

  if (startInput && !startInput.value) {
    startInput.value = today;
  }

  if (endInput && !endInput.value) {
    endInput.value = today;
  }
}

function renderProductOptions() {
  const options = state.products
    .map((product) => `<option value="${product.produitId}">${product.nom} - stock ${product.stockActuel}</option>`)
    .join("");
  $("#movementProduct").innerHTML = options;
  $("#restockProduct").innerHTML = options;
  $("#updateProduct").innerHTML = options;
  if ($("#purchaseProduct")) $("#purchaseProduct").innerHTML = options;
  if ($("#inventoryProduct")) $("#inventoryProduct").innerHTML = options;
  $("#productSuggestions").innerHTML = state.products
    .map((product) => `<option value="${product.nom}">${product.codeQR} - ${money(product.prixVente)} - stock ${product.stockActuel}</option>`)
    .concat(state.products.map((product) => `<option value="${product.codeQR}">${product.nom} - ${money(product.prixVente)} - stock ${product.stockActuel}</option>`))
    .join("");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function printSaleReceipt(receipt, popup) {
  const sale = receipt.vente;
  const rows = (sale.lignesVente || []).map((line) => `
    <tr><td>${escapeHtml(line.produit?.nom || "Produit")}</td><td>${line.quantite}</td><td>${money(line.prixUnitaire)}</td><td>${money(line.sousTotal)}</td></tr>
  `).join("");
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Recu ${escapeHtml(sale.numeroVente)}</title><style>body{font-family:Arial,sans-serif;max-width:700px;margin:30px auto;color:#111}h1{margin-bottom:4px}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{border-bottom:1px solid #ddd;padding:8px;text-align:left}.totals{text-align:right;font-size:18px}.muted{color:#666}@media print{button{display:none}}</style></head><body>
    <h1>${escapeHtml(sale.boutique.nom)}</h1><div class="muted">${escapeHtml(sale.boutique.adresse || "")} ${sale.boutique.RCCM ? `- RCCM ${escapeHtml(sale.boutique.RCCM)}` : ""}</div>
    <h2>Recu ${escapeHtml(sale.numeroVente)}</h2><div>Date: ${new Date(sale.createdAt).toLocaleString("fr-FR")}</div><div>Client: ${escapeHtml(sale.client?.nom || "Comptoir")}</div><div>Vendeur: ${escapeHtml(sale.User?.nom || "-")}</div>
    <table><thead><tr><th>Produit</th><th>Quantite</th><th>Prix</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="totals">Total: <strong>${money(sale.montantTotal)} ${escapeHtml(sale.boutique.devise)}</strong><br>Paye: ${money(sale.montantPaye)}<br>Reste: ${money(sale.resteAPayer)}<br>Rembourse: ${money(receipt.totalRembourse)}<br>Net: ${money(receipt.montantNet)}</div>
    <p>Merci pour votre confiance.</p><button onclick="window.print()">Imprimer / Enregistrer PDF</button></body></html>`);
  popup.document.close();
}

function setReportDefaults() {
  const end = todayInputValue();
  const start = `${end.slice(0, 7)}-01`;
  if ($("#reportDateStart") && !$("#reportDateStart").value) $("#reportDateStart").value = start;
  if ($("#reportDateEnd") && !$("#reportDateEnd").value) $("#reportDateEnd").value = end;
}

function renderSupplierOptions() {
  if (!$("#purchaseSupplier")) return;
  $("#purchaseSupplier").innerHTML = `<option value="">Aucun</option>${state.suppliers
    .filter((supplier) => supplier.statut)
    .map((supplier) => `<option value="${supplier.fournisseurId}">${supplier.nom}</option>`)
    .join("")}`;
  const payable = state.supplierDebts.filter((debt) => debt.statut !== "PAYEE");
  $("#supplierDebtSelect").innerHTML = payable
    .map((debt) => `<option value="${debt.detteFournisseurId}">${debt.fournisseur?.nom || "Fournisseur"} - ${money(debt.montantRestant)}</option>`)
    .join("");
}

function renderClientOptions() {
  $("#clientSuggestions").innerHTML = state.clients
    .map((client) => `<option value="${client.nom}">${client.telephone || ""}</option>`)
    .join("");
}

function renderDebtOptions() {
  const payable = state.debts.filter((debt) => debt.statut !== "PAYEE");
  $("#debtSelect").innerHTML = payable
    .map((debt) => `<option value="${debt.detteId}">${debt.client?.nom || "Client"} - ${money(debt.montantRestant)}</option>`)
    .join("");
}

function renderApportOptions() {
  const recoverable = state.apports.filter((apport) => apport.statut !== "RECUPERE");
  $("#retraitApportSelect").innerHTML = recoverable
    .map((apport) => `<option value="${apport.apportId}">${apport.libelle} - restant ${money(apport.montantRestant)}</option>`)
    .join("");
}

function saleLineTotal(line) {
  return Number(line.quantite) * Number(line.prixUnitaire);
}

function invoiceTotal() {
  return state.saleLines.reduce((total, line) => total + saleLineTotal(line), 0);
}

function renderInvoice() {
  $("#invoiceLinesTable").innerHTML = state.saleLines
    .map(
      (line, index) => `
        <tr>
          <td>${line.nom}</td>
          <td>${line.quantite}</td>
          <td>${money(line.prixUnitaire)}</td>
          <td>${money(saleLineTotal(line))}</td>
          <td><button class="ghost small danger" type="button" data-invoice-remove="${index}">Retirer</button></td>
        </tr>
      `
    )
    .join("") || emptyRow(5, "Ajoutez un produit a la facture");
  $("#invoiceTotal").textContent = money(invoiceTotal());
  $("#invoiceCount").textContent = `${state.saleLines.length} produit${state.saleLines.length > 1 ? "s" : ""}`;
  updateSalePaymentPreview();
}

function clearInvoice() {
  state.saleLines = [];
  renderInvoice();
}

function findProductForSale(rawName) {
  const name = rawName.trim().toLowerCase();
  if (!name) return null;

  return state.products.find((product) =>
    product.nom.toLowerCase() === name ||
    String(product.codeQR || "").toLowerCase() === name
  );
}

async function getProductByQr(codeQR) {
  const local = findProductForSale(codeQR);
  if (local) return local;

  const response = await api(`/api/stock/produits/qr/${encodeURIComponent(codeQR)}`);
  return response.data;
}

function findClientForSale(rawName) {
  const name = rawName.trim().toLowerCase();
  if (!name) return null;
  return state.clients.find((client) => client.nom.toLowerCase() === name);
}

async function findOrCreateClientForSale(rawName) {
  const name = rawName.trim();
  if (!name) return null;

  const existing = findClientForSale(name);
  if (existing) return existing;

  const response = await api("/api/ventes/clients", {
    method: "POST",
    body: JSON.stringify({ nom: name }),
  });

  await loadClients();
  return response.data;
}

function addSaleLineFromForm() {
  const product = findProductForSale($("#saleProductName").value);
  const quantity = Number($("#saleQty").value || 0);

  if (!product) {
    toast("Choisissez un produit dans la liste auto-completee.", "error");
    return false;
  }

  if (!quantity || quantity <= 0) {
    toast("La quantite doit etre superieure a 0.", "error");
    return false;
  }

  addProductToInvoice(product, quantity);

  $("#saleProductName").value = "";
  $("#saleQty").value = "1";
  $("#saleProductName").focus();
  return true;
}

function addProductToInvoice(product, quantity) {
  const existing = state.saleLines.find((line) => line.produitId === product.produitId);
  if (existing) {
    existing.quantite = Number(existing.quantite) + quantity;
  } else {
    state.saleLines.push({
      produitId: product.produitId,
      nom: product.nom,
      quantite: quantity,
      prixUnitaire: Number(product.prixVente),
    });
  }

  renderInvoice();
}

async function startQrScanner() {
  if (!("BarcodeDetector" in window)) {
    const code = window.prompt("Entrez ou collez le code QR du produit");
    if (code) await handleScannedQr(code);
    return;
  }

  stopQrScanner();

  try {
    state.qrStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });

    const video = $("#qrVideo");
    video.srcObject = state.qrStream;
    video.classList.remove("hidden");
    $("#stopQrScanBtn").classList.remove("hidden");
    await video.play();

    const detector = new BarcodeDetector({ formats: ["qr_code"] });
    state.qrScanTimer = window.setInterval(async () => {
      if (!video.videoWidth) return;

      try {
        const codes = await detector.detect(video);
        const rawValue = codes[0]?.rawValue;
        if (rawValue) {
          await handleScannedQr(rawValue);
        }
      } catch {
        stopQrScanner();
        toast("Lecture QR interrompue.", "error");
      }
    }, 500);
  } catch (error) {
    stopQrScanner();
    toast("Camera indisponible. Verifiez les permissions du navigateur.", "error");
  }
}

function stopQrScanner() {
  if (state.qrScanTimer) {
    window.clearInterval(state.qrScanTimer);
    state.qrScanTimer = null;
  }

  if (state.qrStream) {
    state.qrStream.getTracks().forEach((track) => track.stop());
    state.qrStream = null;
  }

  const video = $("#qrVideo");
  if (video) {
    video.pause();
    video.srcObject = null;
    video.classList.add("hidden");
  }

  $("#stopQrScanBtn")?.classList.add("hidden");
}

async function handleScannedQr(codeQR) {
  stopQrScanner();

  try {
    const product = await getProductByQr(codeQR.trim());
    state.scannedProduct = product;
    $("#qrRawCode").value = codeQR.trim();
    $("#qrProductName").value = `${product.nom} - ${money(product.prixVente)} - stock ${product.stockActuel}`;
    $("#qrQty").value = "1";
    $("#qrQty").focus();
    toast(`Produit scanne: ${product.nom}`);
  } catch (error) {
    state.scannedProduct = null;
    $("#qrRawCode").value = codeQR.trim();
    $("#qrProductName").value = "";
    toast(error.message, "error");
  }
}

async function addScannedProductToInvoice() {
  if (!state.scannedProduct) {
    toast("Scannez d'abord un produit.", "error");
    return;
  }

  const quantity = Number($("#qrQty").value || 0);
  if (!quantity || quantity <= 0) {
    toast("La quantite doit etre superieure a 0.", "error");
    return;
  }

  addProductToInvoice(state.scannedProduct, quantity);
  toast("Produit ajoute a la facture");
  state.scannedProduct = null;
  $("#qrRawCode").value = "";
  $("#qrProductName").value = "";
  $("#qrQty").value = "1";
  await startQrScanner();
}

async function loadProducts() {
  const params = new URLSearchParams(compact({
    search: $("#productSearch")?.value,
    limit: 100,
  }));
  const response = await api(`/api/stock/produits?${params.toString()}`);
  state.products = response.data || [];
  $("#productsTable").innerHTML = state.products
    .map(
      (product) => `
        <tr>
          <td>${product.nom}</td>
          <td>${product.codeQR}</td>
          <td>${money(product.prixVente)}</td>
          <td>${product.stockActuel} ${product.uniteMesure}</td>
          <td class="row-actions">
            <button class="ghost small" type="button" data-product-detail="${product.produitId}">Detail</button>
            <button class="ghost small danger" type="button" data-product-delete="${product.produitId}">Supprimer</button>
          </td>
        </tr>
      `
    )
    .join("");
  renderProductOptions();
}

async function loadCategories() {
  const response = await api("/api/stock/categories");
  state.categories = response.data || [];
  $("#categoryList").innerHTML = state.categories.map((category) => `<span class="chip">${category.nom}</span>`).join("");
}

async function loadMovements() {
  const response = await api("/api/stock/mouvements");
  state.movements = response.data || [];
  $("#movementsTable").innerHTML = state.movements
    .map((movement) => {
      const product = state.products.find((item) => item.produitId === movement.produitId);
      return `
        <tr>
          <td>${product?.nom || movement.produitId}</td>
          <td>${movement.type}</td>
          <td>${movement.quantite}</td>
          <td>${movement.raison || "-"}</td>
        </tr>
      `;
    })
    .join("");
}

async function loadRestocks() {
  const response = await api("/api/stock/ravitaillements");
  state.restocks = response.data || [];
  $("#restocksTable").innerHTML = state.restocks
    .map(
      (restock) => `
        <tr>
          <td>${restock.produit?.nom || restock.produitId}</td>
          <td>${restock.quantite}</td>
          <td>${money(restock.coutTotal)}</td>
          <td>${restock.fournisseur || "-"}</td>
        </tr>
      `
    )
    .join("");
}

async function loadSuppliers() {
  const response = await api("/api/achats/fournisseurs?limit=100");
  state.suppliers = response.data || [];
  $("#suppliersTable").innerHTML = state.suppliers.map((supplier) => `
    <tr><td>${supplier.nom}</td><td>${supplier.telephone || "-"}</td><td>${supplier.email || "-"}</td><td>${supplier.statut ? "Actif" : "Desactive"}</td></tr>
  `).join("") || emptyRow(4, "Aucun fournisseur");
  renderSupplierOptions();
}

async function loadPurchases() {
  const response = await api("/api/achats?limit=100");
  state.purchases = response.data || [];
  $("#purchasesTable").innerHTML = state.purchases.map((purchase) => `
    <tr>
      <td>${purchase.numeroAchat}</td><td>${purchase.fournisseur?.nom || "Comptant"}</td>
      <td>${money(purchase.montantTotal)}</td><td>${money(purchase.montantPaye)}</td>
      <td>${money(purchase.resteAPayer)}</td><td>${purchase.statut}</td>
    </tr>
  `).join("") || emptyRow(6, "Aucun achat");
}

async function loadSupplierDebts() {
  const response = await api("/api/achats/dettes?limit=100");
  state.supplierDebts = response.data || [];
  $("#supplierDebtsTable").innerHTML = state.supplierDebts.map((debt) => `
    <tr><td>${debt.fournisseur?.nom || "-"}</td><td>${debt.achat?.numeroAchat || "-"}</td><td>${money(debt.montantTotal)}</td><td>${money(debt.montantRestant)}</td><td>${debt.statut}</td></tr>
  `).join("") || emptyRow(5, "Aucune dette fournisseur");
  renderSupplierOptions();
}

async function loadInventories() {
  const response = await api("/api/inventaires?limit=100");
  state.inventories = response.data || [];
  $("#inventoriesTable").innerHTML = state.inventories.flatMap((inventory) =>
    (inventory.lignes || []).map((line) => `
      <tr><td>${inventory.reference}</td><td>${new Date(inventory.createdAt).toLocaleDateString("fr-FR")}</td><td>${line.produit?.nom || "-"}</td><td>${line.quantiteTheorique}</td><td>${line.quantiteComptee}</td><td>${line.ecart}</td></tr>
    `)
  ).join("") || emptyRow(6, "Aucun inventaire");
}

async function loadCashRegisters() {
  const response = await api("/api/caisses");
  state.cashRegisters = response.data || [];
  $("#cashRegisterList").innerHTML = state.cashRegisters.map((register) => `<span class="chip">${register.nom}${register.sessions?.length ? " - ouverte" : ""}</span>`).join("");
  $("#cashOpenRegister").innerHTML = state.cashRegisters.filter((register) => register.active).map((register) => `<option value="${register.caisseId}">${register.nom}</option>`).join("");
}

function renderCashSession(preview) {
  const session = state.currentCashSession;
  $("#cashSessionTitle").textContent = session ? `${session.caisse?.nom || "Caisse"} - ouverte` : "Aucune session";
  const details = preview?.details || {};
  $("#cashSessionMetrics").innerHTML = `
    <div><span>Fond ouverture</span><strong>${money(session?.fondOuverture)}</strong></div>
    <div><span>Ventes</span><strong>${money(details.ventes)}</strong></div>
    <div><span>Depenses</span><strong>${money(details.depenses)}</strong></div>
    <div><span>Achats</span><strong>${money(details.achats)}</strong></div>
    <div><span>Remboursements</span><strong>${money(details.remboursements)}</strong></div>
    <div><span>Attendu</span><strong>${money(preview?.montantAttendu)}</strong></div>
  `;
}

async function loadOpenCashSession() {
  const response = await api("/api/caisses/sessions/ouverte");
  state.currentCashSession = response.data || null;
  renderCashSession(null);
  if (state.currentCashSession) await previewCashSession();
}

async function previewCashSession() {
  if (!state.currentCashSession) throw new Error("Aucune session de caisse ouverte.");
  const response = await api(`/api/caisses/sessions/${state.currentCashSession.sessionCaisseId}/preview`);
  renderCashSession(response.data);
  return response.data;
}

async function loadCashSessions() {
  const response = await api("/api/caisses/sessions?limit=100");
  state.cashSessions = response.data || [];
  $("#cashSessionsTable").innerHTML = state.cashSessions.map((session) => `
    <tr>
      <td>${session.caisse?.nom || "-"}</td><td>${new Date(session.ouverteAt).toLocaleString("fr-FR")}</td>
      <td>${money(session.montantAttendu)}</td><td>${money(session.montantReel)}</td><td>${money(session.ecart)}</td><td>${session.statut}</td>
      <td>${session.statut === "FERMEE" ? `<button class="ghost small" type="button" data-cash-validate="${session.sessionCaisseId}">Valider</button>` : "-"}</td>
    </tr>
  `).join("") || emptyRow(7, "Aucune session");
}

async function loadReport() {
  const params = new URLSearchParams(compact({ dateDebut: $("#reportDateStart")?.value, dateFin: $("#reportDateEnd")?.value }));
  const response = await api(`/api/rapports/financier?${params.toString()}`);
  state.report = response.data;
  const report = state.report || {};
  $("#reportKpis").innerHTML = `
    <div><span>Chiffre affaires net</span><strong>${money(report.ventes?.chiffreAffairesNet)}</strong></div>
    <div><span>Marge brute</span><strong>${money(report.margeBrute)}</strong></div>
    <div><span>Depenses</span><strong>${money(report.depenses)}</strong></div>
    <div><span>Benefice net</span><strong>${money(report.beneficeNet)}</strong></div>
    <div><span>Creances clients</span><strong>${money(report.creancesClients)}</strong></div>
    <div><span>Dettes fournisseurs</span><strong>${money(report.dettesFournisseurs)}</strong></div>
    <div><span>Valeur stock</span><strong>${money(report.stock?.valeurAchat)}</strong></div>
  `;
  $("#reportProductsTable").innerHTML = (report.meilleursProduits || []).map((product) => `<tr><td>${product.nom}</td><td>${product.quantite}</td><td>${money(product.chiffreAffaires)}</td></tr>`).join("") || emptyRow(3);
}

async function loadClients() {
  const response = await api("/api/ventes/clients");
  state.clients = response.data || [];
  renderClientOptions();
}

async function loadSales() {
  const response = await api(`/api/ventes?${new URLSearchParams(compact({
    dateDebut: $("#salesDateStart")?.value,
    dateFin: $("#salesDateEnd")?.value,
    statut: $("#salesStatusFilter")?.value,
    limit: 100,
  })).toString()}`);
  const sales = response.data || [];
  $("#salesTable").innerHTML = sales
    .map(
      (sale) => `
        <tr>
          <td>${sale.numeroVente}</td>
          <td>${sale.client?.nom || "Comptoir"}</td>
          <td>${money(sale.montantTotal)}</td>
          <td>${money(sale.montantPaye)}</td>
          <td>${sale.methodePaiement || "-"}</td>
          <td>${sale.statut}</td>
          <td class="row-actions">
            <button class="ghost small" type="button" data-sale-detail="${sale.venteId}">Detail</button>
            <button class="ghost small" type="button" data-sale-receipt="${sale.venteId}">Recu</button>
            ${canManageStock() && !["ANNULEE", "REMBOURSEE"].includes(sale.statut) ? `<button class="ghost small" type="button" data-sale-refund="${sale.venteId}">Rembourser</button>` : ""}
            ${canManageStock() && !["ANNULEE", "REMBOURSEE", "REMBOURSEE_PARTIELLEMENT"].includes(sale.statut) ? `<button class="ghost small danger" type="button" data-sale-cancel="${sale.venteId}">Annuler</button>` : ""}
          </td>
        </tr>
      `
    )
    .join("");
}

async function loadDebts() {
  const response = await api("/api/ventes/dettes/liste");
  state.debts = response.data || [];
  $("#debtsTable").innerHTML = state.debts
    .map(
      (debt) => `
        <tr>
          <td>${debt.client?.nom || "-"}</td>
          <td>${renderDebtProducts(debt)}</td>
          <td>${money(debt.montantTotal)}</td>
          <td>${money(debt.montantRestant)}</td>
          <td>${debt.statut}</td>
        </tr>
      `
    )
    .join("") || emptyRow(5, "Aucune dette");
  renderDebtOptions();
}

function renderDebtProducts(debt) {
  const lignes = debt.vente?.lignesVente || [];
  if (!lignes.length) return "-";

  return lignes
    .map((line) => `${line.produit?.nom || "Produit"} x ${line.quantite} (${money(line.sousTotal)})`)
    .join("<br>");
}

async function loadExpenses() {
  const response = await api(`/api/depenses?${new URLSearchParams(compact({
    search: $("#expenseSearch")?.value,
    methodePaiement: $("#expenseMethodFilter")?.value,
    limit: 100,
  })).toString()}`);
  state.expenses = response.data || [];
  const total = state.expenses.reduce((sum, expense) => sum + Number(expense.montant || 0), 0);
  $("#expensesTotal").textContent = money(total);
  $("#expensesTable").innerHTML = state.expenses
    .map(
      (expense) => `
        <tr>
          <td>${expense.libelle}</td>
          <td>${expense.categorie}</td>
          <td>${money(expense.montant)}</td>
          <td>${expense.methodePaiement}</td>
          <td class="row-actions">
            <button class="ghost small" type="button" data-expense-detail="${expense.depenseId}">Detail</button>
            <button class="ghost small danger" type="button" data-expense-delete="${expense.depenseId}">Supprimer</button>
          </td>
        </tr>
      `
    )
    .join("");
}

async function loadApports() {
  const response = await api("/api/apports?limit=100");
  state.apports = response.data || [];
  $("#apportsTable").innerHTML = state.apports
    .map((apport) => `
      <tr>
        <td>${apport.libelle}<br><small>${apport.user?.nom || "-"}</small></td>
        <td>${money(apport.montant)}</td>
        <td>${money(apport.montantRestant)}</td>
        <td>${apport.statut}</td>
        <td>${(apport.retraits || []).map((retrait) => `${money(retrait.montant)} - ${new Date(retrait.dateRetrait).toLocaleDateString("fr-FR")}`).join("<br>") || "-"}</td>
      </tr>
    `)
    .join("") || emptyRow(5, "Aucun apport");
  renderApportOptions();
}

async function loadEmployees() {
  const params = new URLSearchParams(compact({
    search: $("#employeeSearch")?.value,
    roleNom: $("#employeeRoleFilter")?.value,
    statut: $("#employeeStatusFilter")?.value,
    limit: 100,
  }));
  const response = await api(`/api/employes?${params.toString()}`);
  state.employees = response.data || [];
  $("#employeesTable").innerHTML = state.employees
    .map(
      (employee) => `
        <tr>
          <td>${employee.nomUtilisateur || "-"}</td>
          <td>${employee.nom}</td>
          <td>${employee.roleNom}</td>
          <td>${employee.adresse || "-"}</td>
          <td>${employee.statut ? "Actif" : "Desactive"}</td>
          <td class="row-actions">
            <button class="ghost small" type="button" data-employee-reset="${employee.userId}">Reset PIN</button>
            ${
              employee.statut
                ? `<button class="ghost small danger" type="button" data-employee-disable="${employee.userId}">Desactiver</button>`
                : `<button class="ghost small" type="button" data-employee-enable="${employee.userId}">Reactiver</button>`
            }
          </td>
        </tr>
      `
    )
    .join("") || emptyRow(6);
}

function renderBoutiqueSettings() {
  const boutique = state.boutique || {};
  $("#settingsTitle").textContent = boutique.nom ? `Parametres - ${boutique.nom}` : "Parametres boutique";
  $("#boutiqueNom").value = boutique.nom || "";
  $("#boutiqueAdresse").value = boutique.adresse || "";
  $("#boutiqueDevise").value = boutique.devise || "USD";
  $("#boutiqueDeviseSecondaire").value = boutique.deviseSecondaire || "";
  $("#boutiqueTauxDeviseSecondaire").value = boutique.tauxDeviseSecondaire || "";
  $("#boutiqueRccm").value = boutique.RCCM || "";
  $("#boutiqueType").value = boutique.typeEntreprise || "BOUTIQUE_ALIMENTAIRE";
  renderCurrencyOptions();
  updateSalePaymentPreview();
}

async function loadBoutiqueSettings() {
  const response = await api("/api/parametres/boutique");
  state.boutique = response.data;
  renderBoutiqueSettings();
}

function renderCurrencyOptions() {
  const { principale, secondaire } = currentCurrencies();
  const options = [
    `<option value="${principale}">${principale} principale</option>`,
    secondaire ? `<option value="${secondaire}">${secondaire} secondaire</option>` : "",
  ].join("");

  if ($("#saleCurrency")) $("#saleCurrency").innerHTML = options;
  if ($("#debtCurrency")) $("#debtCurrency").innerHTML = options;
}

function updateSalePaymentPreview() {
  if (!$("#salePaidPrincipalPreview")) return;

  const currency = $("#saleCurrency")?.value || currentCurrencies().principale;
  const amount = $("#salePaidAmount")?.value || convertFromPrincipal(invoiceTotal(), currency);
  $("#salePaidPrincipalPreview").value = money(convertToPrincipal(amount, currency));
}

async function updateBoutiqueField(path, payload, message) {
  const response = await api(`/api/parametres/boutique/${path}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  state.boutique = response.data;
  renderBoutiqueSettings();
  toast(message);
}

function renderClosurePreview(data) {
  $("#closurePreview").innerHTML = `
    <div><span>Ventes payees</span><strong>${money(data?.totalMontantPaye)}</strong></div>
    <div><span>Depenses</span><strong>${money(data?.totalDepenses)}</strong></div>
    <div><span>Especes nettes</span><strong>${money(data?.montantEspeces)}</strong></div>
    <div><span>Caisse attendue</span><strong>${money(data?.montantAttenduCaisse)}</strong></div>
  `;
}

async function previewClosure() {
  setClosureDefaults();
  const form = $("#closureForm");
  const data = compact(formData(form));
  const params = new URLSearchParams(
    compact({
      dateJournee: data.dateJournee,
      fondCaisseOuverture: data.fondCaisseOuverture || 0,
    })
  );
  const response = await api(`/api/clotures/preview?${params.toString()}`);
  renderClosurePreview(response.data);
  return response.data;
}

async function loadClosures() {
  const response = await api(`/api/clotures?${new URLSearchParams(compact({
    dateDebut: $("#closureDateStart")?.value,
    dateFin: $("#closureDateEnd")?.value,
    limit: 100,
  })).toString()}`);
  state.closures = response.data || [];
  $("#closuresTable").innerHTML = state.closures
    .map(
      (closure) => `
        <tr>
          <td>${new Date(closure.dateJournee).toLocaleDateString("fr-FR")}</td>
          <td>${money(closure.totalMontantPaye)}</td>
          <td>${money(closure.totalDepenses)}</td>
          <td>${money(closure.montantAttenduCaisse)}</td>
          <td>${money(closure.montantReelCaisse)}</td>
          <td>${money(closure.ecartCaisse)}</td>
          <td><button class="ghost small" type="button" data-closure-detail="${closure.clotureJourneeId}">Detail</button></td>
        </tr>
      `
    )
    .join("");
}

function emptyRow(columns, message = "Aucune donnee") {
  return `<tr><td colspan="${columns}">${message}</td></tr>`;
}

async function loadDashboard() {
  setDashboardDefaults();
  const params = new URLSearchParams(compact({
    dateDebut: $("#dashboardDateStart").value,
    dateFin: $("#dashboardDateEnd").value,
  }));
  const response = await api(`/api/dashboard/summary?${params.toString()}`);
  state.dashboard = response.data;
  renderDashboard(response.data);
}

function renderDashboard(data) {
  const indicateurs = data?.indicateurs || {};
  $("#dashboardTitle").textContent = data?.dateJournee
    ? `Vue du ${new Date(data.dateJournee).toLocaleDateString("fr-FR")}`
    : "Vue du jour";
  $("#dashboardClosureStatus").textContent = data?.cloturee ? "Journee cloturee" : "Journee ouverte";
  $("#dashboardClosureStatus").classList.toggle("ok", Boolean(data?.cloturee));
  $("#dashboardKpis").innerHTML = `
    <div><span>Ventes payees</span><strong>${money(indicateurs.totalMontantPaye)}</strong><small>${indicateurs.nombreVentes || 0} vente(s)</small></div>
    <div><span>Depenses</span><strong>${money(indicateurs.totalDepenses)}</strong><small>Sorties du jour</small></div>
    <div><span>Apports</span><strong>${money(indicateurs.totalApports)}</strong><small>Retraits ${money(indicateurs.totalRetraitsApports)}</small></div>
    <div><span>Caisse attendue</span><strong>${money(indicateurs.caisseAttendue)}</strong><small>Especes nettes ${money(indicateurs.especesNettes)}</small></div>
    <div><span>Dettes ouvertes</span><strong>${money(indicateurs.totalDettesOuvertes)}</strong><small>${indicateurs.nombreDettesOuvertes || 0} dette(s)</small></div>
    ${(data?.comptesDevises || []).map((account) => `
      <div><span>Encaisse ${account.devise}</span><strong>${money(account.encaisseDevise)}</strong><small>Equivalent ${money(account.equivalentPrincipal)}</small></div>
    `).join("")}
  `;

  $("#dashboardTopProducts").innerHTML = (data?.meilleursProduits || [])
    .map(
      (product) => `
        <tr>
          <td>${product.nom}</td>
          <td>${product.quantite}</td>
          <td>${money(product.montant)}</td>
        </tr>
      `
    )
    .join("") || emptyRow(3);

  $("#dashboardLowStock").innerHTML = (data?.produitsStockFaible || [])
    .map(
      (product) => `
        <tr>
          <td>${product.nom}</td>
          <td>${product.stockActuel} ${product.uniteMesure}</td>
          <td>${money(product.prixVente)}</td>
        </tr>
      `
    )
    .join("") || emptyRow(3, "Aucune alerte stock");

  $("#dashboardRecentSales").innerHTML = (data?.dernieresVentes || [])
    .map(
      (sale) => `
        <tr>
          <td>${sale.numeroVente}</td>
          <td>${sale.client?.nom || "Comptoir"}</td>
          <td>${money(sale.montantPaye)}</td>
        </tr>
      `
    )
    .join("") || emptyRow(3);

  $("#dashboardRecentExpenses").innerHTML = (data?.dernieresDepenses || [])
    .map(
      (expense) => `
        <tr>
          <td>${expense.libelle}</td>
          <td>${expense.categorie}</td>
          <td>${money(expense.montant)}</td>
        </tr>
      `
    )
    .join("") || emptyRow(3);
}

async function refreshAll() {
  if (!state.token) return;
  const loaders = [
    loadProducts(),
    loadCategories(),
    loadClients(),
    loadSales(),
    loadDebts(),
    loadExpenses(),
    ...(canManageStock() ? [loadApports()] : []),
    loadBoutiqueSettings(),
    loadDashboard(),
  ];

  if (canManageBoutique()) {
    loaders.push(loadEmployees());
  }

  if (canManageStock()) {
    loaders.push(
      loadClosures(), loadMovements(), loadRestocks(),
      loadSuppliers(), loadPurchases(), loadSupplierDebts(), loadInventories(), loadReport()
    );
  }

  if (canOperateCash()) {
    loaders.push(loadCashRegisters(), loadOpenCashSession());
  }

  if (canManageStock()) {
    loaders.push(loadCashSessions());
  }

  await Promise.allSettled(loaders);

  if (canManageStock()) {
    await previewClosure().catch(() => null);
  }
}

async function checkHealth() {
  try {
    await api("/api/health", { headers: {} });
    $("#apiStatus").textContent = "API active";
    $("#apiStatus").classList.add("ok");
  } catch {
    $("#apiStatus").textContent = "API indisponible";
    $("#apiStatus").classList.remove("ok");
  }
}

function bindEvents() {
  $$(".nav-item").forEach((item) => {
    item.addEventListener("click", () => showView(item.dataset.view));
  });

  $("#logoutBtn").addEventListener("click", async () => {
    stopQrScanner();
    try {
      if (state.token) await api("/api/auth/signin/logout", { method: "POST" });
    } catch {
      // La session locale doit toujours être supprimée, même si l'API est indisponible.
    } finally {
      clearSession();
      toast("Session fermee");
    }
  });

  $("#nextStepBtn").addEventListener("click", () => {
    if (validateCurrentSignupStep()) updateSignupStep(state.signupStep + 1);
  });

  $("#prevStepBtn").addEventListener("click", () => updateSignupStep(state.signupStep - 1));

  $("#signupForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const data = compact(formData(form));
      await api("/api/auth/signup/create_account", {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast("Boutique creee");
      $("#loginIdentifiant").value = data.telephone;
      $("#loginPin").value = data.motDePasse;
      updateSignupStep(0);
      form.reset();
      $("#signupDevise").value = "USD";
    } catch (error) {
      toast(error.message, "error");
    }
  });

  $("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const data = formData(form);
      const identifiant = data.identifiant.trim();
      const loginPayload = /^\d+$/.test(identifiant)
        ? { telephone: identifiant, motDePasse: data.motDePasse }
        : { nomUtilisateur: identifiant, motDePasse: data.motDePasse };
      const response = await api("/api/auth/signin/login", {
        method: "POST",
        body: JSON.stringify(loginPayload),
      });
      setSession(response.token, response.data);
      toast("Connexion reussie");
      if (response.data?.doitChangerPin) {
        toast("Vous devez changer votre PIN avant de continuer.");
        showView("accountView");
        return;
      }
      await refreshAll();
      showView("dashboardView");
    } catch (error) {
      toast(error.message, "error");
    }
  });

  $("#changePinForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const response = await api("/api/auth/signin/change-pin", {
        method: "POST",
        body: JSON.stringify(formData(form)),
      });
      setSession(response.token, response.data);
      toast("PIN modifie");
      form.reset();
      await refreshAll();
      showView("dashboardView");
    } catch (error) {
      toast(error.message, "error");
    }
  });

  $("#changeUsernameForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const response = await api("/api/auth/signin/username", {
        method: "PATCH",
        body: JSON.stringify(formData(form)),
      });
      setSession(state.token, response.data);
      toast("Nom utilisateur modifie");
      form.reset();
    } catch (error) {
      toast(error.message, "error");
    }
  });

  $("#employeeForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const response = await api("/api/employes", {
        method: "POST",
        body: JSON.stringify(compact(formData(form))),
      });
      toast(`Employe cree. PIN par defaut: ${response.pinParDefaut}`);
      form.reset();
      await loadEmployees();
    } catch (error) {
      toast(error.message, "error");
    }
  });

  $("#boutiqueNomForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await updateBoutiqueField("nom", formData(event.currentTarget), "Nom boutique modifie");
    } catch (error) {
      toast(error.message, "error");
    }
  });

  $("#boutiqueAdresseForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const data = formData(event.currentTarget);
      await updateBoutiqueField("adresse", { adresse: data.adresse || null }, "Adresse modifiee");
    } catch (error) {
      toast(error.message, "error");
    }
  });

  $("#boutiqueDeviseForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await updateBoutiqueField("devise", formData(event.currentTarget), "Devise modifiee");
    } catch (error) {
      toast(error.message, "error");
    }
  });

  $("#boutiqueDeviseSecondaireForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const data = formData(event.currentTarget);
      await updateBoutiqueField("devise-secondaire", { deviseSecondaire: data.deviseSecondaire || null }, "Devise secondaire modifiee");
    } catch (error) {
      toast(error.message, "error");
    }
  });

  $("#boutiqueTauxDeviseSecondaireForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const data = formData(event.currentTarget);
      await updateBoutiqueField("taux-devise-secondaire", {
        tauxDeviseSecondaire: data.tauxDeviseSecondaire ? Number(data.tauxDeviseSecondaire) : null,
      }, "Taux modifie");
    } catch (error) {
      toast(error.message, "error");
    }
  });

  $("#boutiqueRccmForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const data = formData(event.currentTarget);
      await updateBoutiqueField("rccm", { RCCM: data.RCCM || null }, "RCCM modifie");
    } catch (error) {
      toast(error.message, "error");
    }
  });

  $("#boutiqueTypeForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await updateBoutiqueField("type-entreprise", formData(event.currentTarget), "Type entreprise modifie");
    } catch (error) {
      toast(error.message, "error");
    }
  });

  $("#productForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const data = formData(form);
      await api("/api/stock/produits", {
        method: "POST",
        body: JSON.stringify(
          compact({
            nom: data.nom,
            prixAchat: Number(data.prixAchat),
            prixVente: Number(data.prixVente),
            stockActuel: numberOrUndefined(data.stockActuel),
            uniteMesure: data.uniteMesure,
          })
        ),
      });
      toast("Produit ajoute");
      form.reset();
      $("#productStock").value = "0";
      await loadProducts();
    } catch (error) {
      toast(error.message, "error");
    }
  });

  $("#movementForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const data = formData(form);
      await api("/api/stock/mouvements", {
        method: "POST",
        body: JSON.stringify(
          compact({
            produitId: data.produitId,
            type: data.type,
            quantite: Number(data.quantite),
            raison: data.raison,
          })
        ),
      });
      toast("Mouvement enregistre");
      form.reset();
      await Promise.all([loadProducts(), loadMovements()]);
    } catch (error) {
      toast(error.message, "error");
    }
  });

  $("#categoryForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      await api("/api/stock/categories", {
        method: "POST",
        body: JSON.stringify(compact(formData(form))),
      });
      toast("Categorie ajoutee");
      form.reset();
      await loadCategories();
    } catch (error) {
      toast(error.message, "error");
    }
  });

  $("#restockForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const data = formData(form);
      await api(`/api/stock/produits/${data.produitId}/ravitaillements`, {
        method: "POST",
        body: JSON.stringify(
          compact({
            quantite: Number(data.quantite),
            prixAchatUnitaire: numberOrUndefined(data.prixAchatUnitaire),
            fournisseur: data.fournisseur,
          })
        ),
      });
      toast("Ravitaillement enregistre");
      form.reset();
      await Promise.all([loadProducts(), loadMovements(), loadRestocks()]);
    } catch (error) {
      toast(error.message, "error");
    }
  });

  $("#productUpdateForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const data = formData(form);
      await api(`/api/stock/produits/${data.produitId}`, {
        method: "PATCH",
        body: JSON.stringify({ prixVente: Number(data.prixVente) }),
      });
      toast("Produit modifie");
      form.reset();
      await loadProducts();
    } catch (error) {
      toast(error.message, "error");
    }
  });

  $("#clientForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      await api("/api/ventes/clients", {
        method: "POST",
        body: JSON.stringify(compact(formData(form))),
      });
      toast("Client ajoute");
      form.reset();
      await loadClients();
    } catch (error) {
      toast(error.message, "error");
    }
  });

  $("#saleForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const data = formData(form);
      const paymentMode = data.paymentMode || "ESPECES";
      const client = await findOrCreateClientForSale(data.clientNom || "");

      if ((data.produitNom || "").trim()) {
        const added = addSaleLineFromForm();
        if (!added) return;
      }

      if (state.saleLines.length === 0) {
        toast("Ajoutez au moins un produit a la facture.", "error");
        return;
      }

      if (paymentMode === "CREDIT" && !client) {
        toast("Selectionnez un client pour une vente a credit.", "error");
        return;
      }

      await api("/api/ventes", {
        method: "POST",
        body: JSON.stringify(
          compact({
            clientId: client?.clientId,
            montantPaye: paymentMode === "CREDIT" ? 0 : convertToPrincipal(
              data.montantPayeDevisePaiement || convertFromPrincipal(invoiceTotal(), data.devisePaiement),
              data.devisePaiement
            ),
            montantPayeDevisePaiement: paymentMode === "CREDIT"
              ? 0
              : Number(data.montantPayeDevisePaiement || convertFromPrincipal(invoiceTotal(), data.devisePaiement)),
            devisePaiement: data.devisePaiement,
            methodePaiement: paymentMode === "CREDIT" ? undefined : paymentMode,
            lignes: state.saleLines.map((line) => ({
              produitId: line.produitId,
              quantite: Number(line.quantite),
              prixUnitaire: Number(line.prixUnitaire),
            })),
          })
        ),
      });
      toast("Vente creee");
      stopQrScanner();
      form.reset();
      $("#saleQty").value = "1";
      clearInvoice();
      await Promise.all([loadProducts(), loadSales(), loadDebts(), loadDashboard()]);
    } catch (error) {
      toast(error.message, "error");
    }
  });

  $("#debtPaymentForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const data = formData(form);
      const principalAmount = convertToPrincipal(data.montant, data.devisePaiement);
      await api(`/api/ventes/dettes/${data.detteId}/paiements`, {
        method: "POST",
        body: JSON.stringify({
          montant: principalAmount,
          montantDevisePaiement: Number(data.montant),
          devisePaiement: data.devisePaiement,
          methode: data.methode,
        }),
      });
      toast("Paiement enregistre");
      form.reset();
      await Promise.all([loadDebts(), loadSales(), loadDashboard()]);
    } catch (error) {
      toast(error.message, "error");
    }
  });

  $("#expenseForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const data = formData(form);
      await api("/api/depenses", {
        method: "POST",
        body: JSON.stringify(
          compact({
            libelle: data.libelle,
            categorie: data.categorie,
            montant: Number(data.montant),
            methodePaiement: data.methodePaiement,
            referencePaiement: data.referencePaiement,
            notes: data.notes,
          })
        ),
      });
      toast("Depense enregistree");
      form.reset();
      await Promise.all([loadExpenses(), loadDashboard(), previewClosure().catch(() => null)]);
    } catch (error) {
      toast(error.message, "error");
    }
  });

  $("#apportForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const data = formData(form);
      await api("/api/apports", {
        method: "POST",
        body: JSON.stringify(compact({
          libelle: data.libelle,
          montant: Number(data.montant),
          methodePaiement: data.methodePaiement,
          referencePaiement: data.referencePaiement,
        })),
      });
      toast("Apport enregistre");
      form.reset();
      await Promise.all([loadApports(), loadDashboard(), previewClosure().catch(() => null)]);
    } catch (error) {
      toast(error.message, "error");
    }
  });

  $("#retraitApportForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const data = formData(form);
      await api(`/api/apports/${data.apportId}/retraits`, {
        method: "POST",
        body: JSON.stringify(compact({
          montant: Number(data.montant),
          notes: data.notes,
        })),
      });
      toast("Retrait d'apport enregistre");
      form.reset();
      await Promise.all([loadApports(), loadDashboard(), previewClosure().catch(() => null)]);
    } catch (error) {
      toast(error.message, "error");
    }
  });

  $("#closureForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const data = formData(form);
      await api("/api/clotures", {
        method: "POST",
        body: JSON.stringify(
          compact({
            dateJournee: data.dateJournee,
            fondCaisseOuverture: Number(data.fondCaisseOuverture || 0),
            montantReelCaisse: Number(data.montantReelCaisse),
            notes: data.notes,
          })
        ),
      });
      toast("Journee cloturee");
      form.reset();
      setClosureDefaults();
      await previewClosure().catch(() => renderClosurePreview(null));
      await Promise.all([loadClosures(), loadDashboard()]);
    } catch (error) {
      toast(error.message, "error");
    }
  });

  $("#supplierForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      await api("/api/achats/fournisseurs", { method: "POST", body: JSON.stringify(compact(formData(form))) });
      toast("Fournisseur ajoute"); form.reset(); await loadSuppliers();
    } catch (error) { toast(error.message, "error"); }
  });

  $("#purchaseForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const data = formData(form);
      await api("/api/achats", { method: "POST", body: JSON.stringify(compact({
        fournisseurId: data.fournisseurId,
        montantPaye: Number(data.montantPaye || 0),
        methodePaiement: data.methodePaiement,
        dateEcheance: data.dateEcheance,
        lignes: [{ produitId: data.produitId, quantite: Number(data.quantite), prixAchat: Number(data.prixAchat) }],
      })) });
      toast("Achat enregistre et stock mis a jour"); form.reset(); $("#purchasePaid").value = "0";
      await Promise.all([loadPurchases(), loadSupplierDebts(), loadProducts(), loadMovements(), loadReport()]);
    } catch (error) { toast(error.message, "error"); }
  });

  $("#supplierDebtPaymentForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const data = formData(form);
      await api(`/api/achats/dettes/${data.detteFournisseurId}/paiements`, { method: "POST", body: JSON.stringify({ montant: Number(data.montant), methode: data.methode }) });
      toast("Dette fournisseur payee"); form.reset(); await Promise.all([loadSupplierDebts(), loadPurchases(), loadReport()]);
    } catch (error) { toast(error.message, "error"); }
  });

  $("#inventoryForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const data = formData(form);
      await api("/api/inventaires", { method: "POST", body: JSON.stringify(compact({ notes: data.notes, lignes: [{ produitId: data.produitId, quantiteComptee: Number(data.quantiteComptee) }] })) });
      toast("Inventaire valide et stock ajuste"); form.reset(); await Promise.all([loadInventories(), loadProducts(), loadMovements(), loadReport()]);
    } catch (error) { toast(error.message, "error"); }
  });

  $("#cashRegisterForm").addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget;
    try { await api("/api/caisses", { method: "POST", body: JSON.stringify(formData(form)) }); toast("Caisse creee"); form.reset(); await loadCashRegisters(); }
    catch (error) { toast(error.message, "error"); }
  });

  $("#cashOpenForm").addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget;
    try { const data = formData(form); await api("/api/caisses/sessions/ouvrir", { method: "POST", body: JSON.stringify({ caisseId: data.caisseId, fondOuverture: Number(data.fondOuverture) }) }); toast("Session de caisse ouverte"); await Promise.all([loadCashRegisters(), loadOpenCashSession(), ...(canManageStock() ? [loadCashSessions()] : [])]); }
    catch (error) { toast(error.message, "error"); }
  });

  $("#cashMovementForm").addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget;
    try { if (!state.currentCashSession) throw new Error("Aucune session ouverte."); const data = formData(form); await api(`/api/caisses/sessions/${state.currentCashSession.sessionCaisseId}/mouvements`, { method: "POST", body: JSON.stringify({ type: data.type, montant: Number(data.montant), libelle: data.libelle }) }); toast("Mouvement de caisse ajoute"); form.reset(); await previewCashSession(); }
    catch (error) { toast(error.message, "error"); }
  });

  $("#cashCloseForm").addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget;
    try { if (!state.currentCashSession) throw new Error("Aucune session ouverte."); const data = formData(form); await api(`/api/caisses/sessions/${state.currentCashSession.sessionCaisseId}/fermer`, { method: "POST", body: JSON.stringify({ montantReel: Number(data.montantReel) }) }); toast("Session de caisse fermee"); form.reset(); await Promise.all([loadCashRegisters(), loadOpenCashSession(), ...(canManageStock() ? [loadCashSessions()] : [])]); }
    catch (error) { toast(error.message, "error"); }
  });

  $("#refreshStockBtn").addEventListener("click", () => loadProducts().catch((error) => toast(error.message, "error")));
  $("#refreshDashboardBtn").addEventListener("click", () => loadDashboard().catch((error) => toast(error.message, "error")));
  $("#dashboardDateStart").addEventListener("change", () => loadDashboard().catch((error) => toast(error.message, "error")));
  $("#dashboardDateEnd").addEventListener("change", () => loadDashboard().catch((error) => toast(error.message, "error")));
  $("#refreshSalesBtn").addEventListener("click", () => loadSales().catch((error) => toast(error.message, "error")));
  $("#refreshDebtsBtn").addEventListener("click", () => loadDebts().catch((error) => toast(error.message, "error")));
  $("#refreshExpensesBtn").addEventListener("click", () => loadExpenses().catch((error) => toast(error.message, "error")));
  $("#refreshApportsBtn").addEventListener("click", () => loadApports().catch((error) => toast(error.message, "error")));
  $("#refreshEmployeesBtn").addEventListener("click", () => loadEmployees().catch((error) => toast(error.message, "error")));
  $("#refreshSettingsBtn").addEventListener("click", () => loadBoutiqueSettings().catch((error) => toast(error.message, "error")));
  $("#saleCurrency").addEventListener("change", updateSalePaymentPreview);
  $("#salePaidAmount").addEventListener("input", updateSalePaymentPreview);
  $("#employeeSearch").addEventListener("input", () => loadEmployees().catch((error) => toast(error.message, "error")));
  $("#employeeRoleFilter").addEventListener("change", () => loadEmployees().catch((error) => toast(error.message, "error")));
  $("#employeeStatusFilter").addEventListener("change", () => loadEmployees().catch((error) => toast(error.message, "error")));
  $("#previewClosureBtn").addEventListener("click", () => previewClosure().catch((error) => toast(error.message, "error")));
  $("#closureDate").addEventListener("change", () => previewClosure().catch((error) => toast(error.message, "error")));
  $("#closureOpeningCash").addEventListener("input", () => previewClosure().catch(() => null));
  $("#refreshClosuresBtn").addEventListener("click", () => loadClosures().catch((error) => toast(error.message, "error")));
  $("#productSearch").addEventListener("input", () => loadProducts().catch((error) => toast(error.message, "error")));
  $("#salesDateStart").addEventListener("change", () => loadSales().catch((error) => toast(error.message, "error")));
  $("#salesDateEnd").addEventListener("change", () => loadSales().catch((error) => toast(error.message, "error")));
  $("#salesStatusFilter").addEventListener("change", () => loadSales().catch((error) => toast(error.message, "error")));
  $("#expenseSearch").addEventListener("input", () => loadExpenses().catch((error) => toast(error.message, "error")));
  $("#expenseMethodFilter").addEventListener("change", () => loadExpenses().catch((error) => toast(error.message, "error")));
  $("#closureDateStart").addEventListener("change", () => loadClosures().catch((error) => toast(error.message, "error")));
  $("#closureDateEnd").addEventListener("change", () => loadClosures().catch((error) => toast(error.message, "error")));
  $("#refreshMovementsBtn").addEventListener("click", () => loadMovements().catch((error) => toast(error.message, "error")));
  $("#refreshRestocksBtn").addEventListener("click", () => loadRestocks().catch((error) => toast(error.message, "error")));
  $("#refreshPurchasesBtn").addEventListener("click", () => Promise.all([loadSuppliers(), loadPurchases(), loadSupplierDebts()]).catch((error) => toast(error.message, "error")));
  $("#refreshInventoriesBtn").addEventListener("click", () => loadInventories().catch((error) => toast(error.message, "error")));
  $("#cashPreviewBtn").addEventListener("click", () => previewCashSession().catch((error) => toast(error.message, "error")));
  $("#refreshCashSessionsBtn").addEventListener("click", () => loadCashSessions().catch((error) => toast(error.message, "error")));
  $("#refreshReportBtn").addEventListener("click", () => loadReport().catch((error) => toast(error.message, "error")));
  $("#printReportBtn").addEventListener("click", () => window.print());
  $("#addSaleLineBtn").addEventListener("click", addSaleLineFromForm);
  $("#clearInvoiceBtn").addEventListener("click", clearInvoice);
  $("#startQrScanBtn").addEventListener("click", () => startQrScanner().catch((error) => toast(error.message, "error")));
  $("#stopQrScanBtn").addEventListener("click", stopQrScanner);
  $("#addScannedProductBtn").addEventListener("click", () => addScannedProductToInvoice().catch((error) => toast(error.message, "error")));
  $("#saleProductName").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addSaleLineFromForm();
    }
  });
  $("#saleQty").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addSaleLineFromForm();
    }
  });

  document.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const detailProductId = target.dataset.productDetail;
    if (detailProductId) {
      try {
        const response = await api(`/api/stock/produits/${detailProductId}`);
        toast(`Produit: ${response.data.nom}, stock ${response.data.stockActuel}`);
      } catch (error) {
        toast(error.message, "error");
      }
    }

    const deleteProductId = target.dataset.productDelete;
    if (deleteProductId) {
      try {
        await api(`/api/stock/produits/${deleteProductId}`, { method: "DELETE" });
        toast("Produit supprime");
        await loadProducts();
      } catch (error) {
        toast(error.message, "error");
      }
    }

    const saleId = target.dataset.saleDetail;
    if (saleId) {
      try {
        const response = await api(`/api/ventes/${saleId}`);
        toast(`Vente ${response.data.numeroVente}: ${money(response.data.montantTotal)}`);
      } catch (error) {
        toast(error.message, "error");
      }
    }

    const receiptSaleId = target.dataset.saleReceipt;
    if (receiptSaleId) {
      const popup = window.open("", "_blank");
      try {
        const response = await api(`/api/ventes/${receiptSaleId}/recu`);
        if (!popup) throw new Error("Autorisez les fenêtres contextuelles pour imprimer le reçu.");
        printSaleReceipt(response.data, popup);
      } catch (error) {
        if (popup) popup.close();
        toast(error.message, "error");
      }
    }

    const cancelSaleId = target.dataset.saleCancel;
    if (cancelSaleId) {
      const motif = window.prompt("Motif de l'annulation:");
      if (motif) {
        try {
          await api(`/api/ventes/${cancelSaleId}/annulation`, { method: "POST", body: JSON.stringify({ motif }) });
          toast("Vente annulee et stock restitue");
          await Promise.all([loadSales(), loadProducts(), loadDebts(), loadReport(), loadDashboard()]);
        } catch (error) { toast(error.message, "error"); }
      }
    }

    const refundSaleId = target.dataset.saleRefund;
    if (refundSaleId) {
      try {
        const response = await api(`/api/ventes/${refundSaleId}`);
        const lines = response.data.lignesVente || [];
        const choice = Number(window.prompt(`Produit à rembourser:\n${lines.map((line, index) => `${index + 1}. ${line.produit?.nom || line.produitId} (vendu: ${line.quantite})`).join("\n")}`));
        const line = lines[choice - 1];
        if (!line) throw new Error("Produit sélectionné invalide.");
        const quantite = Number(window.prompt("Quantité à rembourser:", String(line.quantite)));
        const motif = window.prompt("Motif du remboursement:");
        const methode = window.prompt("Moyen de remboursement: ESPECES, MOBILE_MONEY ou BANQUE", "ESPECES");
        if (!quantite || !motif || !["ESPECES", "MOBILE_MONEY", "BANQUE"].includes(methode)) return;
        await api(`/api/ventes/${refundSaleId}/remboursements`, { method: "POST", body: JSON.stringify({ motif, methode, lignes: [{ produitId: line.produitId, quantite }] }) });
        toast("Remboursement enregistre et stock restitue");
        await Promise.all([loadSales(), loadProducts(), loadReport(), loadDashboard()]);
      } catch (error) { toast(error.message, "error"); }
    }

    const invoiceRemoveIndex = target.dataset.invoiceRemove;
    if (invoiceRemoveIndex !== undefined) {
      state.saleLines.splice(Number(invoiceRemoveIndex), 1);
      renderInvoice();
    }

    const expenseId = target.dataset.expenseDetail;
    if (expenseId) {
      try {
        const response = await api(`/api/depenses/${expenseId}`);
        toast(`Depense ${response.data.libelle}: ${money(response.data.montant)}`);
      } catch (error) {
        toast(error.message, "error");
      }
    }

    const deleteExpenseId = target.dataset.expenseDelete;
    if (deleteExpenseId) {
      try {
        await api(`/api/depenses/${deleteExpenseId}`, { method: "DELETE" });
        toast("Depense supprimee");
        await loadExpenses();
      } catch (error) {
        toast(error.message, "error");
      }
    }

    const closureId = target.dataset.closureDetail;
    if (closureId) {
      try {
        const response = await api(`/api/clotures/${closureId}`);
        toast(`Cloture: attendu ${money(response.data.montantAttenduCaisse)}, ecart ${money(response.data.ecartCaisse)}`);
      } catch (error) {
        toast(error.message, "error");
      }
    }

    const resetEmployeeId = target.dataset.employeeReset;
    if (resetEmployeeId) {
      try {
        const response = await api(`/api/employes/${resetEmployeeId}/reset-pin`, { method: "POST" });
        toast(`PIN reinitialise: ${response.pinParDefaut}`);
        await loadEmployees();
      } catch (error) {
        toast(error.message, "error");
      }
    }

    const disableEmployeeId = target.dataset.employeeDisable;
    if (disableEmployeeId) {
      try {
        await api(`/api/employes/${disableEmployeeId}/desactiver`, { method: "PATCH" });
        toast("Employe desactive");
        await loadEmployees();
      } catch (error) {
        toast(error.message, "error");
      }
    }

    const enableEmployeeId = target.dataset.employeeEnable;
    if (enableEmployeeId) {
      try {
        await api(`/api/employes/${enableEmployeeId}/reactiver`, { method: "PATCH" });
        toast("Employe reactive");
        await loadEmployees();
      } catch (error) {
        toast(error.message, "error");
      }
    }

    const validateCashSessionId = target.dataset.cashValidate;
    if (validateCashSessionId) {
      try {
        await api(`/api/caisses/sessions/${validateCashSessionId}/valider`, { method: "POST", body: JSON.stringify({ approuve: window.confirm("Valider cette session ? Cliquez sur Annuler pour la rejeter.") }) });
        toast("Session de caisse contrôlée");
        await loadCashSessions();
      } catch (error) { toast(error.message, "error"); }
    }
  });
}

bindEvents();
renderSession();
updateSignupStep(0);
setClosureDefaults();
setDashboardDefaults();
setReportDefaults();
checkHealth();
renderInvoice();
renderClosurePreview(null);
refreshAll();
