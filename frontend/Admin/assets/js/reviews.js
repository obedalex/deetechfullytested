(async function () {
  const { requireAdmin, apiFetch, API_BASE, toast, confirmAction } = window.AdminAPI || {};
  if (!requireAdmin || !(await requireAdmin())) return;

  const listEl = document.getElementById("reviewsList");
  const emptyEl = document.getElementById("reviewsEmpty");
  const summaryEl = document.getElementById("reviewsSummary");
  const summaryTotalEl = document.getElementById("reviewsSummaryTotal");
  const summaryApprovedEl = document.getElementById("reviewsSummaryApproved");
  const summaryRejectedEl = document.getElementById("reviewsSummaryRejected");
  const searchEl = document.getElementById("reviewSearch");
  const statusEl = document.getElementById("reviewStatusFilter");
  const reloadBtn = document.getElementById("reviewReloadBtn");

  let currentReviews = [];

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function stars(rating) {
    const safe = Math.max(0, Math.min(5, Number(rating || 0)));
    return `${"\u2605".repeat(safe)}${"\u2606".repeat(5 - safe)}`;
  }

  function fmtDate(value) {
    try {
      return value ? new Date(value).toLocaleString() : "-";
    } catch {
      return "-";
    }
  }

  async function loadReviews() {
    if (!listEl) return;
    const q = String(searchEl?.value || "").trim();
    const status = String(statusEl?.value || "all");
    listEl.innerHTML = "<div class='loading'>Loading reviews...</div>";

    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (status && status !== "all") query.set("status", status);

    const reviews = await apiFetch(`${API_BASE}/reviews${query.toString() ? `?${query.toString()}` : ""}`);
    currentReviews = Array.isArray(reviews) ? reviews : [];
    render();
  }

  function render() {
    if (!listEl || !summaryEl || !emptyEl) return;

    const total = currentReviews.length;
    const approved = currentReviews.filter((r) => r.approved !== false).length;
    const rejected = total - approved;
    if (summaryTotalEl) summaryTotalEl.textContent = String(total);
    if (summaryApprovedEl) summaryApprovedEl.textContent = String(approved);
    if (summaryRejectedEl) summaryRejectedEl.textContent = String(rejected);

    if (!total) {
      listEl.innerHTML = "";
      emptyEl.classList.remove("hidden");
      return;
    }
    emptyEl.classList.add("hidden");

    listEl.innerHTML = "";
    currentReviews.forEach((review) => {
      const id = review._id;
      const userId = review?.user?._id || "";
      const card = document.createElement("article");
      card.className = "review-card";
      card.innerHTML = `
        <div class="review-head">
          <div class="review-meta">
            <div class="review-user">${escapeHtml(review?.user?.name || "Unknown User")}</div>
            <div class="review-product">${escapeHtml(review?.product?.name || "Unknown Product")}</div>
            <div class="review-sub">${escapeHtml(review?.user?.email || "-")} \u2022 ${escapeHtml(fmtDate(review.createdAt))}</div>
          </div>
          <span class="review-status ${review.approved === false ? "rejected" : "approved"}">
            ${review.approved === false ? "Rejected" : "Approved"}
          </span>
        </div>
        <div class="review-stars">${stars(review.rating)} (${Number(review.rating || 0)}/5)</div>
        <p class="review-comment">${escapeHtml(review.comment || "")}</p>
        <div class="review-actions">
          <button class="btn-admin btn-ghost" data-moderate="${id}" data-approve="true">Approve</button>
          <button class="btn-admin btn-ghost" data-moderate="${id}" data-approve="false">Reject</button>
          <button class="btn-admin btn-ghost" data-user="${escapeHtml(userId)}">Open User</button>
          <button class="btn-admin btn-danger" data-delete="${id}">Delete</button>
        </div>
      `;
      listEl.appendChild(card);
    });
  }

  listEl?.addEventListener("click", async (e) => {
    const moderateBtn = e.target.closest("[data-moderate]");
    if (moderateBtn) {
      const id = moderateBtn.getAttribute("data-moderate");
      const approved = moderateBtn.getAttribute("data-approve") === "true";
      await apiFetch(`${API_BASE}/reviews/${id}/moderate`, {
        method: "PUT",
        body: JSON.stringify({ approved }),
      });
      toast?.(`Review ${approved ? "approved" : "rejected"}`, "success");
      await loadReviews();
      return;
    }

    const deleteBtn = e.target.closest("[data-delete]");
    if (deleteBtn) {
      const id = deleteBtn.getAttribute("data-delete");
      const ok = await confirmAction?.("Delete this review permanently?", {
        title: "Delete Review",
        confirmText: "Delete",
      });
      if (!ok) return;
      await apiFetch(`${API_BASE}/reviews/${id}`, { method: "DELETE" });
      toast?.("Review deleted", "success");
      await loadReviews();
      return;
    }

    const userBtn = e.target.closest("[data-user]");
    if (userBtn) {
      const userId = userBtn.getAttribute("data-user");
      if (!userId) return;
      window.location.href = `users.html?user=${encodeURIComponent(userId)}`;
    }
  });

  const debouncedSearch = (() => {
    let t = null;
    return () => {
      clearTimeout(t);
      t = setTimeout(() => {
        loadReviews().catch((err) => {
          console.error(err);
          toast?.("Failed to load reviews", "error");
        });
      }, 300);
    };
  })();

  searchEl?.addEventListener("input", debouncedSearch);
  statusEl?.addEventListener("change", () => loadReviews().catch(() => toast?.("Failed to load reviews", "error")));
  reloadBtn?.addEventListener("click", () => loadReviews().catch(() => toast?.("Failed to load reviews", "error")));

  loadReviews().catch((err) => {
    console.error(err);
    toast?.("Failed to load reviews", "error");
  });
})();




