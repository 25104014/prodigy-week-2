// ============================================================
//  Employee Management System — app.js
//  Pure JavaScript + localStorage (no Node.js / MongoDB)
// ============================================================

/* ===================== AUTH ===================== */

const ADMIN = { username: "admin", password: "admin123" };

function login() {
  const user = document.getElementById("loginUser").value.trim();
  const pass = document.getElementById("loginPass").value.trim();
  const err  = document.getElementById("loginError");

  if (user === ADMIN.username && pass === ADMIN.password) {
    localStorage.setItem("ems_auth", "true");
    err.style.display = "none";
    document.getElementById("loginPage").style.display = "none";
    document.getElementById("appPage").style.display   = "flex";
    refreshDashboard();
  } else {
    err.style.display = "block";
  }
}

function logout() {
  localStorage.removeItem("ems_auth");
  document.getElementById("appPage").style.display  = "none";
  document.getElementById("loginPage").style.display = "flex";
  document.getElementById("loginUser").value = "";
  document.getElementById("loginPass").value = "";
}

// Auto-login if session exists
window.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("ems_auth") === "true") {
    document.getElementById("loginPage").style.display = "none";
    document.getElementById("appPage").style.display   = "flex";
    refreshDashboard();
  }
  // Allow Enter key on login
  document.getElementById("loginPass").addEventListener("keydown", e => {
    if (e.key === "Enter") login();
  });
  document.getElementById("loginUser").addEventListener("keydown", e => {
    if (e.key === "Enter") login();
  });
});

/* ===================== NAVIGATION ===================== */

const SECTIONS = ["dashboard", "employees", "add", "search"];

function showSection(name) {
  SECTIONS.forEach(s => {
    document.getElementById("sec-" + s).style.display = (s === name) ? "" : "none";
    const navEl = document.getElementById("nav-" + s);
    if (navEl) navEl.classList.toggle("active", s === name);
  });

  const titles = {
    dashboard: "Dashboard",
    employees : "All Employees",
    add       : "Add Employee",
    search    : "Search Employees"
  };
  document.getElementById("currentSection").textContent = titles[name] || "";

  if (name === "dashboard") refreshDashboard();
  if (name === "employees") renderEmployeeTable();
  if (name === "add")       { clearForm(); document.getElementById("formHeading").textContent = "➕ Add New Employee"; }
  if (name === "search")    { document.getElementById("searchInput").value = ""; document.getElementById("searchBody").innerHTML = ""; document.getElementById("searchMsg").style.display = ""; }
}

/* ===================== DATA LAYER ===================== */

function getEmployees() {
  return JSON.parse(localStorage.getItem("ems_employees") || "[]");
}

function saveEmployees(arr) {
  localStorage.setItem("ems_employees", JSON.stringify(arr));
}

function generateId() {
  return "emp_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
}

/* ===================== DASHBOARD ===================== */

function refreshDashboard() {
  const emps = getEmployees();
  document.getElementById("statTotal").textContent    = emps.length;
  document.getElementById("statActive").textContent   = emps.filter(e => e.status === "Active").length;
  document.getElementById("statInactive").textContent = emps.filter(e => e.status === "Inactive").length;
  const depts = [...new Set(emps.map(e => e.dept).filter(Boolean))];
  document.getElementById("statDepts").textContent    = depts.length;

  const tbody = document.getElementById("recentBody");
  const empty = document.getElementById("recentEmpty");
  const recent = [...emps].reverse().slice(0, 5);

  if (recent.length === 0) {
    tbody.innerHTML = "";
    empty.style.display = "";
    return;
  }
  empty.style.display = "none";
  tbody.innerHTML = recent.map(e => `
    <tr>
      <td>${escHtml(e.name)}</td>
      <td>${escHtml(e.dept)}</td>
      <td>${escHtml(e.role)}</td>
      <td><span class="badge ${e.status === 'Active' ? 'badge-active' : 'badge-inactive'}">${e.status}</span></td>
    </tr>
  `).join("");
}

/* ===================== EMPLOYEE TABLE ===================== */

function renderEmployeeTable() {
  const emps     = getEmployees();
  const deptSel  = document.getElementById("filterDept").value;
  const statSel  = document.getElementById("filterStatus").value;

  // Populate department filter options
  const deptFilter = document.getElementById("filterDept");
  const allDepts   = [...new Set(emps.map(e => e.dept).filter(Boolean))];
  const curDept    = deptFilter.value;
  deptFilter.innerHTML = '<option value="">All Departments</option>' +
    allDepts.map(d => `<option value="${escHtml(d)}" ${d === curDept ? "selected" : ""}>${escHtml(d)}</option>`).join("");

  let filtered = emps;
  if (deptSel)  filtered = filtered.filter(e => e.dept   === deptSel);
  if (statSel)  filtered = filtered.filter(e => e.status === statSel);

  const tbody = document.getElementById("empBody");
  const empty = document.getElementById("empEmpty");

  if (filtered.length === 0) {
    tbody.innerHTML = "";
    empty.style.display = "";
    return;
  }
  empty.style.display = "none";

  tbody.innerHTML = filtered.map((e, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><b>${escHtml(e.name)}</b></td>
      <td>${escHtml(e.email)}</td>
      <td>${escHtml(e.phone)}</td>
      <td>${escHtml(e.dept)}</td>
      <td>${escHtml(e.role)}</td>
      <td>${e.salary ? "₹" + Number(e.salary).toLocaleString("en-IN") : "—"}</td>
      <td><span class="badge ${e.status === 'Active' ? 'badge-active' : 'badge-inactive'}">${e.status}</span></td>
      <td>
        <button class="action-btn btn-view"   onclick="viewEmployee('${e.id}')">👁 View</button>
        <button class="action-btn btn-edit"   onclick="editEmployee('${e.id}')">✏ Edit</button>
        <button class="action-btn btn-delete" onclick="openDeleteModal('${e.id}')">🗑 Delete</button>
      </td>
    </tr>
  `).join("");
}

/* ===================== FORM VALIDATION & SAVE ===================== */

function validateForm() {
  let valid = true;
  const fields = [
    { id: "fName",  errId: "err-fName",  msg: "Full name is required.",       check: v => v.trim().length >= 2 },
    { id: "fEmail", errId: "err-fEmail", msg: "Valid email is required.",      check: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) },
    { id: "fPhone", errId: "err-fPhone", msg: "Valid 10-digit phone required.", check: v => /^\d{10}$/.test(v.trim()) },
    { id: "fDept",  errId: "err-fDept",  msg: "Please select a department.",   check: v => v !== "" },
    { id: "fRole",  errId: "err-fRole",  msg: "Job role is required.",         check: v => v.trim().length >= 2 },
  ];

  fields.forEach(f => {
    const val = document.getElementById(f.id).value;
    const errEl = document.getElementById(f.errId);
    if (!f.check(val)) {
      errEl.textContent = f.msg;
      valid = false;
    } else {
      errEl.textContent = "";
    }
  });

  return valid;
}

function saveEmployee() {
  hideMsg("formSuccess");
  hideMsg("formErrMsg");

  if (!validateForm()) return;

  const employees = getEmployees();
  const editId    = document.getElementById("editId").value;

  const emp = {
    id      : editId || generateId(),
    name    : document.getElementById("fName").value.trim(),
    email   : document.getElementById("fEmail").value.trim(),
    phone   : document.getElementById("fPhone").value.trim(),
    dob     : document.getElementById("fDob").value,
    gender  : document.getElementById("fGender").value,
    dept    : document.getElementById("fDept").value,
    role    : document.getElementById("fRole").value.trim(),
    salary  : document.getElementById("fSalary").value,
    join    : document.getElementById("fJoin").value,
    status  : document.getElementById("fStatus").value,
    address : document.getElementById("fAddress").value.trim(),
    createdAt: editId
      ? (employees.find(e => e.id === editId)?.createdAt || new Date().toISOString())
      : new Date().toISOString()
  };

  // Duplicate email check (exclude self on edit)
  const duplicate = employees.find(e => e.email === emp.email && e.id !== emp.id);
  if (duplicate) {
    showMsg("formErrMsg", "❌ An employee with this email already exists.");
    return;
  }

  if (editId) {
    const idx = employees.findIndex(e => e.id === editId);
    if (idx !== -1) employees[idx] = emp;
  } else {
    employees.push(emp);
  }

  saveEmployees(employees);

  showMsg("formSuccess", editId
    ? "✅ Employee updated successfully!"
    : "✅ Employee added successfully!");

  setTimeout(() => {
    hideMsg("formSuccess");
    clearForm();
    document.getElementById("formHeading").textContent = "➕ Add New Employee";
  }, 2000);
}

function clearForm() {
  document.getElementById("editId").value    = "";
  ["fName","fEmail","fPhone","fDob","fSalary","fJoin","fAddress"].forEach(id => {
    document.getElementById(id).value = "";
  });
  document.getElementById("fGender").value = "";
  document.getElementById("fDept").value   = "";
  document.getElementById("fRole").value   = "";
  document.getElementById("fStatus").value = "Active";
  ["err-fName","err-fEmail","err-fPhone","err-fDept","err-fRole"].forEach(id => {
    document.getElementById(id).textContent = "";
  });
  hideMsg("formSuccess");
  hideMsg("formErrMsg");
}

/* ===================== VIEW ===================== */

function viewEmployee(id) {
  const emp = getEmployees().find(e => e.id === id);
  if (!emp) return;

  document.getElementById("viewBody").innerHTML = `
    <div class="detail-grid">
      ${detailItem("Full Name", emp.name)}
      ${detailItem("Email",     emp.email)}
      ${detailItem("Phone",     emp.phone)}
      ${detailItem("Gender",    emp.gender || "—")}
      ${detailItem("Date of Birth", emp.dob || "—")}
      ${detailItem("Department",emp.dept)}
      ${detailItem("Job Role",  emp.role)}
      ${detailItem("Salary",    emp.salary ? "₹" + Number(emp.salary).toLocaleString("en-IN") : "—")}
      ${detailItem("Join Date", emp.join || "—")}
      ${detailItem("Status",    `<span class="badge ${emp.status === 'Active' ? 'badge-active' : 'badge-inactive'}">${emp.status}</span>`)}
      ${detailItem("Address",   emp.address || "—", true)}
    </div>
  `;
  openModal("viewModal");
}

function detailItem(label, value, fullCol) {
  return `<div class="detail-item${fullCol ? ' full-col' : ''}">
    <label>${label}</label>
    <span>${value}</span>
  </div>`;
}

/* ===================== EDIT ===================== */

function editEmployee(id) {
  const emp = getEmployees().find(e => e.id === id);
  if (!emp) return;

  showSection("add");
  document.getElementById("formHeading").textContent = "✏ Edit Employee";
  document.getElementById("editId").value = emp.id;

  document.getElementById("fName").value    = emp.name;
  document.getElementById("fEmail").value   = emp.email;
  document.getElementById("fPhone").value   = emp.phone;
  document.getElementById("fDob").value     = emp.dob    || "";
  document.getElementById("fGender").value  = emp.gender || "";
  document.getElementById("fDept").value    = emp.dept;
  document.getElementById("fRole").value    = emp.role;
  document.getElementById("fSalary").value  = emp.salary || "";
  document.getElementById("fJoin").value    = emp.join   || "";
  document.getElementById("fStatus").value  = emp.status;
  document.getElementById("fAddress").value = emp.address || "";
}

/* ===================== DELETE ===================== */

let _deleteId = null;

function openDeleteModal(id) {
  const emp = getEmployees().find(e => e.id === id);
  if (!emp) return;
  _deleteId = id;
  document.getElementById("delEmpName").textContent = emp.name;
  openModal("deleteModal");
}

function confirmDelete() {
  if (!_deleteId) return;
  let employees = getEmployees();
  employees = employees.filter(e => e.id !== _deleteId);
  saveEmployees(employees);
  _deleteId = null;
  closeModal("deleteModal");
  renderEmployeeTable();
  refreshDashboard();
}

/* ===================== SEARCH ===================== */

function searchEmployees() {
  const q     = document.getElementById("searchInput").value.trim().toLowerCase();
  const tbody = document.getElementById("searchBody");
  const msg   = document.getElementById("searchMsg");

  if (q.length === 0) {
    tbody.innerHTML = "";
    msg.textContent = "Start typing to search employees...";
    msg.style.display = "";
    return;
  }

  const results = getEmployees().filter(e =>
    e.name.toLowerCase().includes(q)  ||
    e.email.toLowerCase().includes(q) ||
    e.role.toLowerCase().includes(q)  ||
    e.dept.toLowerCase().includes(q)  ||
    e.phone.includes(q)
  );

  if (results.length === 0) {
    tbody.innerHTML = "";
    msg.textContent = "No employees match your search.";
    msg.style.display = "";
    return;
  }

  msg.style.display = "none";
  tbody.innerHTML = results.map((e, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><b>${escHtml(e.name)}</b></td>
      <td>${escHtml(e.email)}</td>
      <td>${escHtml(e.dept)}</td>
      <td>${escHtml(e.role)}</td>
      <td><span class="badge ${e.status === 'Active' ? 'badge-active' : 'badge-inactive'}">${e.status}</span></td>
      <td>
        <button class="action-btn btn-view"   onclick="viewEmployee('${e.id}')">👁 View</button>
        <button class="action-btn btn-edit"   onclick="editEmployee('${e.id}')">✏ Edit</button>
        <button class="action-btn btn-delete" onclick="openDeleteModal('${e.id}')">🗑 Delete</button>
      </td>
    </tr>
  `).join("");
}

/* ===================== MODAL HELPERS ===================== */

function openModal(id)  { document.getElementById(id).style.display = "flex"; }
function closeModal(id) { document.getElementById(id).style.display = "none"; }

// Close modals with Escape key
window.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    closeModal("viewModal");
    closeModal("deleteModal");
  }
});

/* ===================== MESSAGE HELPERS ===================== */

function showMsg(id, text) {
  const el = document.getElementById(id);
  if (text) el.innerHTML = text;
  el.style.display = "";
}
function hideMsg(id) {
  document.getElementById(id).style.display = "none";
}

/* ===================== SECURITY HELPER ===================== */

function escHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}