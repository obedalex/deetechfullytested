(async function () {
  const { requireAdmin, apiFetch, API_BASE, toast } = window.AdminAPI || {};
  if (!requireAdmin || !(await requireAdmin())) return;

  const els = {
    statsGrid: document.getElementById("statsGrid"),
    orderStatusBars: document.getElementById("orderStatusBars"),
    ordersTotalMeta: document.getElementById("ordersTotalMeta"),
    healthGrid: document.getElementById("healthGrid"),
    healthMeta: document.getElementById("healthMeta"),
    quickLinks: document.getElementById("quickLinks"),
    recentActivity: document.getElementById("recentActivity"),
    activityMeta: document.getElementById("activityMeta"),
  };

  function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function text(v) {
    return String(v ?? "").trim();
  }

  function asArray(v) {
    if (Array.isArray(v)) return v;
    if (Array.isArray(v?.items)) return v.items;
    if (Array.isArray(v?.data)) return v.data;
    if (Array.isArray(v?.rows)) return v.rows;
    return [];
  }

  function safeDate(value) {
    const d = value ? new Date(value) : null;
    return d && !Number.isNaN(d.getTime()) ? d : null;
  }

  function formatCurrency(v) {
    return `GHC ${num(v).toFixed(2)}`;
  }

  function formatDate(value) {
    const d = safeDate(value);
    return d ? d.toLocaleString() : "-";
  }

  function shortId(id) {
    const raw = text(id);
    return raw ? raw.slice(-8).toUpperCase() : "-";
  }

  function createIcon(path) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${path}"/></svg>`;
  }

  const quickLinkDefs = [
    { href: "orders.html", label: "Orders", iconClass: "icon-orders", icon: createIcon("M7 4h10v2h2v14H5V6h2V4Zm0 4v10h10V8H7Zm2 2h6v2H9Z") },
    { href: "products.html", label: "Products", iconClass: "icon-products", icon: createIcon("M4 5h16v2H4Zm2 4h12v10H6Zm2 2v6h8v-6Z") },
    { href: "banners.html", label: "Banners", iconClass: "icon-banners", icon: createIcon("M3 5h18v14H3Zm2 2v10h14V7Zm2 2h6v6H7Z") },
    { href: "messages.html", label: "Messages", iconClass: "icon-messages", icon: createIcon("M4 4h16v12H7l-3 3V4Zm2 2v8.17L6.17 14H18V6Z") },
    { href: "reviews.html", label: "Reviews", iconClass: "icon-reviews", icon: createIcon("M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z") },
    { href: "users.html", label: "Users", iconClass: "icon-users", icon: createIcon("M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2-8 4.5V21h16v-2.5c0-2.5-3.58-4.5-8-4.5Z") },
    { href: "affiliates.html", label: "Affiliates", iconClass: "icon-affiliates", icon: createIcon("M12 2 2 7l10 5 8-4v6h2V7L12 2Zm-7 9v4c0 2.76 3.13 5 7 5s7-2.24 7-5v-4l-7 3.5L5 11Z") },
    { href: "discounts.html", label: "Discounts", iconClass: "icon-discounts", icon: createIcon("M5 7a2 2 0 1 1 0-4h14v4h-1a2 2 0 1 0 0 4h1v4H5a2 2 0 1 1 0-4h1a2 2 0 1 0 0-4H5Z") },
  ];

  function renderQuickLinks() {
    if (!els.quickLinks) return;
    els.quickLinks.innerHTML = quickLinkDefs
      .map((link) => `
        <a class="quick-link" href="${link.href}">
          <span class="icon ${link.iconClass}">${link.icon}</span>
          <span class="label">${link.label}</span>
        </a>
      `)
      .join("");
  }

  function renderLoading() {
    if (!els.statsGrid) return;
    els.statsGrid.innerHTML = `
      <article class="kpi-card kpi-users"><h4>Active Users</h4><div class="kpi-value">...</div><div class="kpi-meta">Loading users</div></article>
      <article class="kpi-card kpi-products"><h4>Total Products</h4><div class="kpi-value">...</div><div class="kpi-meta">Loading products</div></article>
      <article class="kpi-card kpi-orders"><h4>Total Orders</h4><div class="kpi-value">...</div><div class="kpi-meta">Loading orders</div></article>
      <article class="kpi-card kpi-revenue"><h4>Total Revenue</h4><div class="kpi-value">...</div><div class="kpi-meta">Loading revenue</div></article>
    `;

    if (els.orderStatusBars) {
      els.orderStatusBars.innerHTML = '<div class="dashboard-empty">Loading order status...</div>';
    }
    if (els.healthGrid) {
      els.healthGrid.innerHTML = '<div class="dashboard-empty">Loading section health...</div>';
    }
    if (els.recentActivity) {
      els.recentActivity.innerHTML = '<div class="dashboard-empty">Loading recent activity...</div>';
    }
  }

  function calcOrderStatus(orders) {
    const total = orders.length;
    const counts = {
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };

    orders.forEach((o) => {
      const raw = text(o.orderStatus || "pending").toLowerCase();
      if (Object.prototype.hasOwnProperty.call(counts, raw)) counts[raw] += 1;
      else counts.pending += 1;
    });

    return { total, counts };
  }

  function renderStatusBars(orderSummary) {
    if (!els.orderStatusBars) return;
    const total = Math.max(orderSummary.total, 1);
    const rows = [
      ["pending", "Pending"],
      ["processing", "Processing"],
      ["shipped", "Shipped"],
      ["delivered", "Delivered"],
      ["cancelled", "Rejected"],
    ];

    if (els.ordersTotalMeta) {
      els.ordersTotalMeta.textContent = `${orderSummary.total} Orders`;
    }

    els.orderStatusBars.innerHTML = rows
      .map(([key, label]) => {
        const count = num(orderSummary.counts[key]);
        const percent = Math.round((count / total) * 100);
        return `
          <div class="status-row">
            <div class="status-label">${label}</div>
            <div class="status-track"><span class="status-fill status-${key}" style="width:${percent}%"></span></div>
            <div class="status-value">${count}</div>
          </div>
        `;
      })
      .join("");
  }

  function renderOverview(stats) {
    if (!els.statsGrid) return;

    const cards = [
      {
        cls: "kpi-users",
        label: "Active Users",
        value: num(stats.users.total).toLocaleString(),
        meta: `${num(stats.users.admins)} Admins`
      },
      {
        cls: "kpi-products",
        label: "Total Products",
        value: num(stats.products.total).toLocaleString(),
        meta: `${num(stats.products.featured)} Featured`
      },
      {
        cls: "kpi-orders",
        label: "Total Orders",
        value: num(stats.orders.total).toLocaleString(),
        meta: `${num(stats.orders.pending)} Pending`
      },
      {
        cls: "kpi-revenue",
        label: "Total Revenue",
        value: formatCurrency(stats.orders.revenue),
        meta: `${num(stats.orders.delivered)} Delivered`
      },
    ];

    els.statsGrid.innerHTML = cards
      .map((c) => `
        <article class="kpi-card ${c.cls}">
          <h4>${c.label}</h4>
          <div class="kpi-value">${c.value}</div>
          <div class="kpi-meta">${c.meta}</div>
        </article>
      `)
      .join("");
  }

  function renderHealth(stats) {
    if (!els.healthGrid) return;

    const rows = [
      ["Banners", stats.banners.total],
      ["Messages", stats.messages.total],
      ["New Messages", stats.messages.new],
      ["Reviews", stats.reviews.total],
      ["Pending Reviews", stats.reviews.pending],
      ["Affiliates", stats.affiliates.total],
      ["Active Discounts", stats.discounts.active],
      ["Total Discounts", stats.discounts.total],
    ];

    if (els.healthMeta) {
      els.healthMeta.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }

    els.healthGrid.innerHTML = rows
      .map(([name, value]) => `
        <div class="health-item">
          <div class="name">${name}</div>
          <div class="value">${num(value).toLocaleString()}</div>
        </div>
      `)
      .join("");
  }

  function renderActivity(activity) {
    if (!els.recentActivity) return;
    if (!activity.length) {
      els.recentActivity.innerHTML = '<div class="dashboard-empty">No recent activity available.</div>';
      return;
    }

    if (els.activityMeta) {
      els.activityMeta.textContent = `${activity.length} latest updates`;
    }

    els.recentActivity.innerHTML = activity
      .slice(0, 8)
      .map((a) => `
        <article class="activity-item">
          <p class="title">${a.title}</p>
          <p class="meta">${a.meta}</p>
        </article>
      `)
      .join("");
  }

  async function loadAllStats() {
    renderLoading();
    renderQuickLinks();

    const reqs = await Promise.allSettled([
      apiFetch(`${API_BASE}/dashboard`),
      apiFetch(`${API_BASE}/users/admin/users`),
      apiFetch(`${API_BASE}/products`),
      apiFetch(`${API_BASE}/orders`),
      apiFetch(`${API_BASE}/banners`),
      apiFetch(`${API_BASE}/support`),
      apiFetch(`${API_BASE}/reviews`),
      apiFetch(`${API_BASE}/affiliates/admin`),
      apiFetch(`${API_BASE}/admin/discounts`),
    ]);

    const [
      dashboardRes,
      usersRes,
      productsRes,
      ordersRes,
      bannersRes,
      messagesRes,
      reviewsRes,
      affiliatesRes,
      discountsRes,
    ] = reqs;

    const dashboard = dashboardRes.status === "fulfilled" ? dashboardRes.value : {};
    const users = usersRes.status === "fulfilled" ? asArray(usersRes.value) : [];
    const products = productsRes.status === "fulfilled" ? asArray(productsRes.value) : [];
    const orders = ordersRes.status === "fulfilled" ? asArray(ordersRes.value) : [];
    const banners = bannersRes.status === "fulfilled" ? asArray(bannersRes.value) : [];
    const messages = messagesRes.status === "fulfilled" ? asArray(messagesRes.value) : [];
    const reviews = reviewsRes.status === "fulfilled" ? asArray(reviewsRes.value) : [];
    const affiliates = affiliatesRes.status === "fulfilled" ? asArray(affiliatesRes.value) : [];
    const discounts = discountsRes.status === "fulfilled" ? asArray(discountsRes.value) : [];

    const orderSummary = calcOrderStatus(orders);

    const stats = {
      users: {
        total: users.length || num(dashboard.totalUsers),
        admins: users.filter((u) => text(u.role) === "admin").length,
      },
      products: {
        total: products.length || num(dashboard.totalProducts),
        featured: products.filter((p) => p.isFeatured === true).length,
      },
      orders: {
        total: orders.length || num(dashboard.totalOrders),
        pending: orderSummary.counts.pending,
        delivered: orderSummary.counts.delivered,
        revenue: num(dashboard.totalRevenue) || orders.reduce((sum, o) => sum + num(o.totalPrice), 0),
      },
      banners: { total: banners.length },
      messages: {
        total: messages.length,
        new: messages.filter((m) => ["new", "open"].includes(text(m.status).toLowerCase())).length,
      },
      reviews: {
        total: reviews.length,
        pending: reviews.filter((r) => text(r.status).toLowerCase() === "pending").length,
      },
      affiliates: { total: affiliates.length },
      discounts: {
        total: discounts.length,
        active: discounts.filter((d) => d.isActive === true || text(d.status).toLowerCase() === "active").length,
      },
    };

    renderOverview(stats);
    renderStatusBars(orderSummary);
    renderHealth(stats);

    const activity = [];

    orders
      .slice()
      .sort((a, b) => (safeDate(b.updatedAt || b.createdAt)?.getTime() || 0) - (safeDate(a.updatedAt || a.createdAt)?.getTime() || 0))
      .slice(0, 4)
      .forEach((o) => {
        activity.push({
          title: `Order #${shortId(o._id)} - ${text(o.orderStatus || "pending").toUpperCase()}`,
          meta: `${text(o.user?.name || o.guestName || "Guest")} | ${formatDate(o.updatedAt || o.createdAt)}`,
        });
      });

    messages
      .slice()
      .sort((a, b) => (safeDate(b.updatedAt || b.createdAt)?.getTime() || 0) - (safeDate(a.updatedAt || a.createdAt)?.getTime() || 0))
      .slice(0, 4)
      .forEach((m) => {
        activity.push({
          title: `Support: ${text(m.subject || "New Message")}`,
          meta: `${text(m.name || m.user?.name || "User")} | ${formatDate(m.updatedAt || m.createdAt)}`,
        });
      });

    activity.sort((a, b) => {
      const da = Date.parse(a.meta.split("|").pop() || "") || 0;
      const db = Date.parse(b.meta.split("|").pop() || "") || 0;
      return db - da;
    });

    renderActivity(activity);

    const failed = reqs.filter((r) => r.status === "rejected").length;
    if (failed && toast) {
      toast(`Dashboard loaded with ${failed} section${failed > 1 ? "s" : ""} unavailable.`, "info");
    }
  }

  loadAllStats().catch((error) => {
    console.error("Dashboard load failed:", error);
    if (toast) toast("Failed to load dashboard data", "error");
  });
})();


