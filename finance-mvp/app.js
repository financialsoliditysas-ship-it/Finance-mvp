const categories = ["Ventas", "Arriendo", "Energia", "Agua", "Telefonia", "Internet", "Salarios", "Transporte", "Materias primas", "Mantenimiento", "Impuestos", "Otros"];
let transactions = [];
let payables = [];
const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const $ = (id) => document.getElementById(id);

function initCategories() {
  $("category").innerHTML = categories.map((category) => `<option>${category}</option>`).join("");
}

function showDashboard() {
  $("authView").classList.add("hidden");
  $("dashboardView").classList.remove("hidden");
  render();
}

function render() {
  const totals = transactions.reduce((acc, item) => {
    acc[item.type] += item.amount;
    return acc;
  }, { income: 0, cost: 0, expense: 0 });
  const cash = totals.income - totals.cost - totals.expense - payables.reduce((sum, item) => sum + item.amount, 0);
  $("incomeKpi").textContent = money.format(totals.income);
  $("costKpi").textContent = money.format(totals.cost);
  $("expenseKpi").textContent = money.format(totals.expense);
  $("cashKpi").textContent = money.format(cash);
  $("transactionRows").innerHTML = transactions.map((item) => `<tr><td>${labelType(item.type)}</td><td>${item.description}</td><td>${item.category}</td><td>${money.format(item.amount)}</td></tr>`).join("");
  renderChart(totals);
  renderCategories();
  renderPayables();
}

function labelType(type) {
  return { income: "Ingreso", cost: "Costo", expense: "Gasto" }[type];
}

function renderChart(totals) {
  const values = [totals.income, totals.cost, totals.expense, Math.max(totals.income - totals.cost, 0), totals.expense * 0.65, totals.income * 0.75];
  const max = Math.max(...values, 1);
  $("cashChart").innerHTML = values.map((value) => `<div class="bar" title="${money.format(value)}" style="height:${Math.max(8, (value / max) * 100)}%"></div>`).join("");
}

function renderCategories() {
  const totals = transactions.reduce((acc, item) => {
    if (item.type !== "income") acc[item.category] = (acc[item.category] || 0) + item.amount;
    return acc;
  }, {});
  const rows = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 8);
  $("categoryList").innerHTML = rows.length ? rows.map(([category, value]) => `<div class="category-row"><span>${category}</span><strong>${money.format(value)}</strong></div>`).join("") : "<p class='muted'>Agrega movimientos para ver rubros.</p>";
}

function renderPayables() {
  $("payablesList").innerHTML = payables.length ? payables.map((item) => `<article><div><strong>${item.supplier}</strong><p class="muted">${item.concept}</p></div><strong>${money.format(item.amount)}</strong></article>`).join("") : "<p class='muted'>Sin saldos por pagar registrados.</p>";
}

function addTransaction(type, description, category, amount) {
  transactions.unshift({ type, description, category, amount });
  render();
}

function seedDemo() {
  transactions = [
    { type: "income", description: "Ventas mostrador", category: "Ventas", amount: 2820000 },
    { type: "income", description: "Pedidos empresariales", category: "Ventas", amount: 1360000 },
    { type: "cost", description: "Harina y levadura", category: "Materias primas", amount: 920000 },
    { type: "expense", description: "Arriendo local", category: "Arriendo", amount: 1150000 },
    { type: "expense", description: "Energia septiembre", category: "Energia", amount: 360000 },
    { type: "expense", description: "Nomina auxiliar", category: "Salarios", amount: 980000 }
  ];
  payables = [
    { supplier: "Molinos del Norte", concept: "Materia prima a 15 dias", amount: 640000 },
    { supplier: "Servicios Municipales", concept: "Agua pendiente", amount: 125000 }
  ];
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

document.addEventListener("DOMContentLoaded", () => {
  initCategories();
  seedDemo();
  $("dashboardView").classList.add("hidden");
  $("authView").classList.remove("hidden");
  $("loginForm").addEventListener("submit", (event) => {
    event.preventDefault();
    showDashboard();
  });
  $("logoutBtn").addEventListener("click", () => {
    $("dashboardView").classList.add("hidden");
    $("authView").classList.remove("hidden");
  });
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-tab]").forEach((tab) => tab.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.add("hidden"));
      button.classList.add("active");
      $(button.dataset.tab).classList.remove("hidden");
    });
  });
  $("transactionForm").addEventListener("submit", (event) => {
    event.preventDefault();
    addTransaction($("type").value, $("description").value, $("category").value, Number($("amount").value));
    event.currentTarget.reset();
  });
  $("payableForm").addEventListener("submit", (event) => {
    event.preventDefault();
    payables.unshift({ supplier: $("supplier").value, concept: $("payableConcept").value, amount: Number($("payableAmount").value) });
    event.currentTarget.reset();
    render();
  });
  $("seedBtn").addEventListener("click", seedDemo);
  $("receiptInput").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const category = guessCategory(file.name);
    addTransaction("expense", `Factura cargada: ${file.name}`, category, 85000);
    $("receiptPreview").innerHTML = `<img src="${URL.createObjectURL(file)}" alt="Factura cargada" /><h3>Gasto detectado</h3><p>Rubro: <strong>${category}</strong></p><p>Valor demo: <strong>${money.format(85000)}</strong></p>`;
  });
});
