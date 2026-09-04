const categories = ["Ventas", "Arriendo", "Energia", "Agua", "Telefonia", "Internet", "Salarios", "Transporte", "Materias primas", "Mantenimiento", "Impuestos", "Otros"];
const storageKey = "finanzas-mvp-v2";
const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const $ = (id) => document.getElementById(id);
let state = { businessName: "Panaderia La Aurora", openingCash: 300000, transactions: [], payables: [], tests: [] };
let editingTransactionId = null;

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (saved) state = { ...state, ...JSON.parse(saved) };
}
function saveState() { localStorage.setItem(storageKey, JSON.stringify(state)); }
function id() { return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()); }
function labelType(type) { return { income: "Ingreso", cost: "Costo", expense: "Gasto" }[type]; }
function initCategories() { $("category").innerHTML = categories.map((category) => `<option>${category}</option>`).join(""); }
function today() { return new Date().toISOString().slice(0, 10); }
function movementDate(item) { return item.date || (item.createdAt ? item.createdAt.slice(0, 10) : today()); }
function formatDate(value) { return new Date(value + "T00:00:00").toLocaleDateString("es-CO", { year: "numeric", month: "2-digit", day: "2-digit" }); }
function monthLabel() { return new Date().toLocaleDateString("es-CO", { month: "long", year: "numeric" }); }

function showDashboard() {
  state.businessName = $("businessName").value.trim() || state.businessName;
  saveState();
  $("businessLabel").textContent = state.businessName;
  $("settingsBusiness").value = state.businessName;
  $("openingCash").value = state.openingCash;
  $("authView").classList.add("hidden");
  $("dashboardView").classList.remove("hidden");
  render();
}

function totals() {
  const base = state.transactions.reduce((acc, item) => {
    acc[item.type] += item.amount;
    return acc;
  }, { income: 0, cost: 0, expense: 0 });
  base.pending = state.payables.filter((item) => !item.paid).reduce((sum, item) => sum + item.amount, 0);
  base.cash = state.openingCash + base.income - base.cost - base.expense - base.pending;
  base.margin = base.income ? ((base.income - base.cost - base.expense) / base.income) * 100 : 0;
  return base;
}

function render() {
  const t = totals();
  $("businessLabel").textContent = state.businessName;
  $("periodLabel").textContent = monthLabel();
  $("incomeKpi").textContent = money.format(t.income);
  $("costKpi").textContent = money.format(t.cost);
  $("expenseKpi").textContent = money.format(t.expense);
  $("cashKpi").textContent = money.format(t.cash);
  renderInsights(t);
  renderRows();
  renderChart(t);
  renderCategories();
  renderPayables();
  renderTests();
}

function renderInsights(t) {
  const alerts = [];
  if (t.cash < 0) alerts.push(["Riesgo de caja", "La caja queda negativa al descontar proveedores pendientes."]);
  if (t.pending > 0) alerts.push(["Proveedores", `${money.format(t.pending)} pendientes por pagar.`]);
  if (t.margin < 10 && t.income > 0) alerts.push(["Margen bajo", `La utilidad estimada esta en ${t.margin.toFixed(1)}%.`]);
  if (!alerts.length) alerts.push(["Operando estable", "Caja positiva y gastos bajo control para este periodo."]);
  $("insights").innerHTML = alerts.map(([title, text]) => `<article><strong>${title}</strong><span>${text}</span></article>`).join("");
}

function renderRows() {
  $("transactionRows").innerHTML = state.transactions.map((item) => `<tr><td>${formatDate(movementDate(item))}</td><td>${labelType(item.type)}</td><td>${item.description}</td><td>${item.category}</td><td>${money.format(item.amount)}</td><td><button class="mini" data-edit="${item.id}">Editar</button><button class="mini danger-text" data-delete="${item.id}">Borrar</button></td></tr>`).join("");
  document.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", () => editTransaction(button.dataset.edit)));
  document.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => deleteTransaction(button.dataset.delete)));
}

function renderChart(t) {
  const values = [state.openingCash, t.income, t.cost, t.expense, t.pending, Math.max(t.cash, 0)];
  const labels = ["Caja inicial", "Ingresos", "Costos", "Gastos", "Por pagar", "Caja final"];
  const max = Math.max(...values, 1);
  $("cashChart").innerHTML = values.map((value, index) => `<div class="bar-wrap"><div class="bar" title="${labels[index]} ${money.format(value)}" style="height:${Math.max(8, (value / max) * 100)}%"></div><small>${labels[index]}</small></div>`).join("");
}

function renderCategories() {
  const byCategory = state.transactions.reduce((acc, item) => {
    if (item.type !== "income") acc[item.category] = (acc[item.category] || 0) + item.amount;
    return acc;
  }, {});
  const rows = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 8);
  $("categoryList").innerHTML = rows.length ? rows.map(([category, value]) => `<div class="category-row"><span>${category}</span><strong>${money.format(value)}</strong></div>`).join("") : "<p class='muted'>Agrega movimientos para ver rubros.</p>";
}

function renderPayables() {
  $("payablesList").innerHTML = state.payables.length ? state.payables.map((item) => `<article class="${item.paid ? "paid" : ""}"><div><strong>${item.supplier}</strong><p class="muted">${item.concept}${item.due ? " · vence " + item.due : ""}</p></div><strong>${money.format(item.amount)}</strong><button class="mini" data-pay="${item.id}">${item.paid ? "Reabrir" : "Pagado"}</button></article>`).join("") : "<p class='muted'>Sin saldos por pagar registrados.</p>";
  document.querySelectorAll("[data-pay]").forEach((button) => button.addEventListener("click", () => togglePayable(button.dataset.pay)));
}


function renderTests() {
  const list = $("testList");
  if (!list) return;
  list.innerHTML = state.tests.length ? state.tests.map((item) => `<article><div><strong>${item.name}</strong><p class="muted">${item.type} · ${item.result} · dificultad ${item.difficulty}/5</p><p>${item.notes || "Sin notas"}</p></div><small>${new Date(item.createdAt).toLocaleDateString("es-CO")}</small></article>`).join("") : "<p class='muted'>Sin pruebas registradas todavia.</p>";
}

function upsertTransaction(type, description, category, amount, date = today()) {
  if (editingTransactionId) {
    state.transactions = state.transactions.map((item) => item.id === editingTransactionId ? { ...item, type, description, category, amount, date } : item);
    editingTransactionId = null;
    $("transactionSubmit").textContent = "Agregar";
  } else {
    state.transactions.unshift({ id: id(), type, description, category, amount, date, createdAt: new Date().toISOString() });
  }
  saveState();
  render();
}

function editTransaction(itemId) {
  const item = state.transactions.find((row) => row.id === itemId);
  if (!item) return;
  editingTransactionId = itemId;
  $("type").value = item.type;
  $("description").value = item.description;
  $("category").value = item.category;
  $("amount").value = item.amount;
  $("movementDate").value = movementDate(item);
  $("transactionSubmit").textContent = "Guardar";
}
function deleteTransaction(itemId) { state.transactions = state.transactions.filter((item) => item.id !== itemId); saveState(); render(); }
function togglePayable(itemId) { state.payables = state.payables.map((item) => item.id === itemId ? { ...item, paid: !item.paid } : item); saveState(); render(); }

function seedDemo() {
  state.openingCash = 300000;
  state.transactions = [
    { id: id(), type: "income", description: "Ventas mostrador", category: "Ventas", amount: 2820000, date: "2026-09-01" },
    { id: id(), type: "income", description: "Pedidos empresariales", category: "Ventas", amount: 1360000, date: "2026-09-03" },
    { id: id(), type: "cost", description: "Harina y levadura", category: "Materias primas", amount: 920000, date: "2026-09-04" },
    { id: id(), type: "expense", description: "Arriendo local", category: "Arriendo", amount: 1150000, date: "2026-09-01" },
    { id: id(), type: "expense", description: "Energia", category: "Energia", amount: 360000, date: "2026-09-02" },
    { id: id(), type: "expense", description: "Nomina auxiliar", category: "Salarios", amount: 980000, date: "2026-09-04" }
  ];
  state.payables = [
    { id: id(), supplier: "Molinos del Norte", concept: "Materia prima a 15 dias", due: "2026-09-15", amount: 640000, paid: false },
    { id: id(), supplier: "Servicios Municipales", concept: "Agua pendiente", due: "2026-09-10", amount: 125000, paid: false }
  ];
  saveState();
  render();
}

function guessCategory(fileName) {
  const name = fileName.toLowerCase();
  if (name.includes("energia") || name.includes("luz")) return "Energia";
  if (name.includes("agua")) return "Agua";
  if (name.includes("internet")) return "Internet";
  if (name.includes("transporte")) return "Transporte";
  if (name.includes("arriendo")) return "Arriendo";
  if (name.includes("harina") || name.includes("materia")) return "Materias primas";
  return "Otros";
}

function exportCsv() {
  const lines = [["fecha", "tipo", "descripcion", "rubro", "valor"], ...state.transactions.map((item) => [movementDate(item), labelType(item.type), item.description, item.category, item.amount]), [], ["pruebas", "perfil", "resultado", "dificultad", "notas"], ...state.tests.map((item) => [item.name, item.type, item.result, item.difficulty, item.notes])];
  const csv = lines.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `movimientos-${state.businessName.toLowerCase().replaceAll(" ", "-")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function bindTabs() {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-tab]").forEach((tab) => tab.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.add("hidden"));
      button.classList.add("active");
      $(button.dataset.tab).classList.remove("hidden");
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadState();
  initCategories();
  bindTabs();
  $("movementDate").value = today();
  $("businessName").value = state.businessName;
  $("loginForm").addEventListener("submit", (event) => { event.preventDefault(); showDashboard(); });
  $("logoutBtn").addEventListener("click", () => { $("dashboardView").classList.add("hidden"); $("authView").classList.remove("hidden"); });
  $("transactionForm").addEventListener("submit", (event) => { event.preventDefault(); upsertTransaction($("type").value, $("description").value, $("category").value, Number($("amount").value), $("movementDate").value || today()); event.currentTarget.reset(); $("movementDate").value = today(); });
  $("payableForm").addEventListener("submit", (event) => { event.preventDefault(); state.payables.unshift({ id: id(), supplier: $("supplier").value, concept: $("payableConcept").value, due: $("payableDue").value, amount: Number($("payableAmount").value), paid: false }); saveState(); event.currentTarget.reset(); render(); });
  $("testForm").addEventListener("submit", (event) => { event.preventDefault(); state.tests.unshift({ id: id(), name: $("testerName").value, type: $("testerType").value, result: $("testResult").value, difficulty: $("testDifficulty").value, notes: $("testNotes").value, createdAt: new Date().toISOString() }); saveState(); event.currentTarget.reset(); render(); });
  $("settingsForm").addEventListener("submit", (event) => { event.preventDefault(); state.businessName = $("settingsBusiness").value.trim() || state.businessName; state.openingCash = Number($("openingCash").value || 0); saveState(); render(); });
  $("seedBtn").addEventListener("click", seedDemo);
  $("exportBtn").addEventListener("click", exportCsv);
  $("clearBtn").addEventListener("click", () => { if (confirm("Borrar todos los datos de prueba de este navegador?")) { localStorage.removeItem(storageKey); state = { businessName: "Panaderia La Aurora", openingCash: 0, transactions: [], payables: [], tests: [] }; render(); } });
  $("receiptInput").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const category = guessCategory(file.name);
    const imgUrl = URL.createObjectURL(file);
    $("receiptPreview").innerHTML = `<img src="${imgUrl}" alt="Factura cargada" /><h3>Revision de factura</h3><label>Descripcion<input id="receiptDesc" value="Factura: ${file.name}" /></label><label>Rubro<select id="receiptCategory">${categories.map((item) => `<option ${item === category ? "selected" : ""}>${item}</option>`).join("")}</select></label><label>Fecha<input id="receiptDate" type="date" value="${today()}" /></label><label>Valor<input id="receiptAmount" type="number" value="85000" min="0" step="1000" /></label><button id="confirmReceipt">Guardar gasto</button>`;
    $("confirmReceipt").addEventListener("click", () => upsertTransaction("expense", $("receiptDesc").value, $("receiptCategory").value, Number($("receiptAmount").value), $("receiptDate").value || today()));
  });
  if (!state.transactions.length && !state.payables.length) seedDemo();
});
