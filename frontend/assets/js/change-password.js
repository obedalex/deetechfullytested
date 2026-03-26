// assets/js/change-password.js
(function () {
  const { API_BASE_AUTH, API_BASE_USERS, showToast } = window.CONFIG || {};
  const { getUser, getToken } = window.auth || {
    getUser: () => null,
    getToken: () => null,
  };

  const $id = (id) => document.getElementById(id);
  const PROFILE_URL = `${API_BASE_USERS}/profile`;
  const LOGIN_URL = `${API_BASE_AUTH}/login`;

  const isStrongPassword = (pwd) =>
    pwd.length >= 8 &&
    /[A-Z]/.test(pwd) &&
    /[a-z]/.test(pwd) &&
    /[0-9]/.test(pwd) &&
    /[^A-Za-z0-9]/.test(pwd);

  document.addEventListener("DOMContentLoaded", () => {
    const form = $id("changePasswordForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const user = getUser();
      const token = getToken();

      if (!user || !token) {
        showToast("Please login first.", "error");
        setTimeout(() => (location.href = "login.html"), 1000);
        return;
      }

      const currentPassword = $id("currentPassword").value.trim();
      const newPassword = $id("newPassword").value.trim();
      const confirmPassword = $id("confirmPassword").value.trim();

      if (newPassword !== confirmPassword) {
        showToast("New passwords do not match.", "error");
        return;
      }

      if (!isStrongPassword(newPassword)) {
        showToast(
          "Password must be 8+ chars, include uppercase, lowercase, number & symbol.",
          "error"
        );
        return;
      }

      try {
        const verifyRes = await fetch(LOGIN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email, password: currentPassword }),
        });

        if (!verifyRes.ok) {
          showToast("Current password is incorrect.", "error");
          return;
        }

        const res = await fetch(PROFILE_URL, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ password: newPassword }),
        });

        const data = await res.json();
        if (res.ok) {
          showToast("Password updated successfully.", "success");
          setTimeout(() => (location.href = "account.html"), 1200);
        } else {
          showToast(data.message || "Password change failed", "error");
        }
      } catch (err) {
        console.error("Password change error:", err);
        showToast("Server error.", "error");
      }
    });
  });
})();
