(function () {
  var ORIGIN = "https://deetechfullytested.vercel.app";
  var path = window.location.pathname.replace(/\\/g, "/");
  var file = path.split("/").pop() || "index.html";
  var params = new URLSearchParams(window.location.search || "");
  var canonical = ORIGIN;

  if (!file || file === "index.html") {
    canonical = ORIGIN + "/";
  } else if (file === "products.html") {
    var cat = (params.get("cat") || "").trim();
    canonical = ORIGIN + "/products.html";
    if (cat && cat.toLowerCase() !== "all") {
      canonical += "?cat=" + encodeURIComponent(cat);
    }
  } else if (file === "account.html") {
    var tab = (params.get("tab") || "").trim().toLowerCase();
    canonical = ORIGIN + "/account.html";
    if (tab === "reviews") {
      canonical += "?tab=reviews";
    }
  } else {
    canonical = ORIGIN + "/" + file;
  }

  var canonicalLink = document.querySelector('link[rel="canonical"]');
  if (!canonicalLink) {
    canonicalLink = document.createElement("link");
    canonicalLink.setAttribute("rel", "canonical");
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute("href", canonical);
})();
