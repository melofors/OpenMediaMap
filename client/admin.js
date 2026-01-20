import { API_BASE_URL } from './config.js';
import { auth, onAuthStateChanged } from './auth.js';

/* =========================================================
   AUTH HELPERS
========================================================= */
async function getAuthHeaders(extra = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const token = await user.getIdToken();
  return {
    "Authorization": `Bearer ${token}`,
    ...extra
  };
}

/* =========================================================
   AUTH GATE
========================================================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("You must be logged in as an admin to view this page.");
    window.location.href = "login.html";
    return;
  }

  try {
    const tokenResult = await user.getIdTokenResult();
    if (!tokenResult.claims.admin) {
      alert("Access denied. You are not an admin.");
      window.location.href = "index.html";
      return;
    }

    document.getElementById("admin-content").style.display = "block";

    await loadPendingSubmissions();
    await loadAdminLogs();

  } catch (err) {
    console.error("Admin auth failed:", err);
    alert("Authentication error.");
    window.location.href = "login.html";
  }
});

/* =========================================================
   LOAD PENDING SUBMISSIONS
========================================================= */
async function loadPendingSubmissions() {
  try {
    const headers = await getAuthHeaders();

    const res = await fetch(
      `${API_BASE_URL}/api/submissions/admin/pending`,
      { headers }
    );

    if (!res.ok) throw new Error("Failed to fetch submissions");

    const submissions = await res.json();
    renderSubmissions(submissions);

  } catch (err) {
    console.error(err);
    alert("Error loading submissions.");
  }
}

/* =========================================================
   RENDER PENDING SUBMISSIONS
========================================================= */
function renderSubmissions(submissions) {
  const container = document.getElementById("submissions-container");
  container.innerHTML = "";

  if (!submissions || submissions.length === 0) {
    container.innerHTML = "<p>No pending submissions.</p>";
    return;
  }

  submissions.forEach((sub) => {
    const div = document.createElement("div");
    div.className = "submission";

    const locationDisplay = sub.location
      ? `(${sub.lat}, ${sub.lng})`
      : "Unknown";

    div.innerHTML = `
      <img class="admin" src="${sub.photo_url}" width="200"/>
      <p><strong>Caption:</strong> ${sub.caption}</p>
      <p><strong>Source:</strong> ${sub.source}</p>
      <p><strong>Photographer:</strong> ${sub.photographer || "Unknown"}</p>
      <p><strong>Date Taken:</strong> ${formatFlexibleDate(sub.year, sub.month, sub.day, sub.estimated)}</p>
      <p><strong>Coordinates:</strong> ${locationDisplay}</p>
      <p><strong>Date Submitted:</strong> ${new Date(sub.created_at).toLocaleString()}</p>
      <p><strong>Notes:</strong> ${sub.notes || ""}</p>
      <p><strong>Uploader:</strong> ${sub.user_id}</p>
      <div class="button-row">
        <button class="approve-btn" data-id="${sub.id}" data-action="approve">Approve</button>
        <button class="reject-btn" data-id="${sub.id}" data-action="reject">Reject</button>
      </div>
      <hr>
    `;
    container.appendChild(div);
  });

  bindModerationButtons();
}

/* =========================================================
   DATE HELPERS
========================================================= */
function formatFlexibleDate(year, month, day, estimated) {
  if (!year) return "Unknown";

  const prefix = estimated ? "c. " : "";

  if (year && !month) return `${prefix}${year}`;
  if (year && month && !day) return `${prefix}${monthName(month)} ${year}`;
  if (year && month && day) return `${prefix}${monthName(month)} ${day}, ${year}`;

  return "Unknown";
}

function monthName(month) {
  return [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ][month] || "";
}

/* =========================================================
   MODERATION BUTTONS
========================================================= */
function bindModerationButtons() {
  document.querySelectorAll(".approve-btn, .reject-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      await moderateSubmission(btn.dataset.id, btn.dataset.action);
    });
  });
}

/* =========================================================
   APPROVE / REJECT
========================================================= */
async function moderateSubmission(id, action) {
  try {
    const headers = await getAuthHeaders();
    const method = action === "approve" ? "POST" : "DELETE";

    const res = await fetch(
      `${API_BASE_URL}/api/submissions/admin/${id}/${action}`,
      { method, headers }
    );

    if (!res.ok) throw new Error(`Failed to ${action}`);

    await loadPendingSubmissions();

  } catch (err) {
    console.error(err);
    alert("Error processing submission.");
  }
}

/* =========================================================
   SOFT DELETE
========================================================= */
document.getElementById("delete-record-btn").addEventListener("click", async () => {
  const id = document.getElementById("delete-id").value.trim();
  const reason = document.getElementById("delete-reason").value.trim();
  const status = document.getElementById("delete-status");

  if (!id || !reason) {
    status.textContent = "Provide ID and reason.";
    status.style.color = "red";
    return;
  }

  try {
    const headers = await getAuthHeaders({ "Content-Type": "application/json" });

    const res = await fetch(
      `${API_BASE_URL}/api/submissions/admin/${id}/soft-delete`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ reason })
      }
    );

    if (!res.ok) throw new Error("Delete failed");

    status.textContent = "Record deleted.";
    status.style.color = "green";

    await loadPendingSubmissions();

  } catch (err) {
    console.error(err);
    status.textContent = "Delete failed.";
    status.style.color = "red";
  }
});

/* =========================================================
   ADMIN LOGS
========================================================= */
async function loadAdminLogs() {
  try {
    const headers = await getAuthHeaders();

    const res = await fetch(
      `${API_BASE_URL}/api/admin/actions`,
      { headers }
    );

    if (!res.ok) throw new Error("Failed to load admin logs");

    const logs = await res.json();
    renderAdminLogs(logs);

  } catch (err) {
    console.error(err);
    document.getElementById("admin-logs").innerHTML =
      "<p><em>Error loading admin logs.</em></p>";
  }
}

function renderAdminLogs(logs) {
  const container = document.getElementById("admin-logs");
  container.innerHTML = "";

  if (!logs || logs.length === 0) {
    container.innerHTML = "<p><em>No admin actions recorded.</em></p>";
    return;
  }

  const table = document.createElement("table");
  table.className = "admin-log-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>Time</th>
        <th>Admin</th>
        <th>Action</th>
        <th>Record</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");

  logs.forEach(log => {
    const tr = document.createElement("tr");
    const actionClass = `action-${String(log.action_type).toLowerCase()}`;
    tr.innerHTML = `
      <td>${new Date(log.created_at).toLocaleString()}</td>
      <td>${log.admin_username}</td>
      <td><span class="${actionClass}">${log.action_type}</span></td>
      <td>${log.record_id}</td>
    `;
    tbody.appendChild(tr);
  });

  container.appendChild(table);
}