import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { api, setToken } from "../api/client";
import { useAuth, type AuthUser } from "../context/AuthContext";

type ProfileResponse = { user: AuthUser };
type ProfileUpdateResponse = { token?: string; user: AuthUser; pending_email?: string; password_notice_sent?: boolean };
type ActiveSession = {
  id: string;
  user_agent: string;
  ip_address: string;
  created_at: string;
  last_seen_at: string;
  current: boolean;
};

const MAX_AVATAR_BYTES = 1024 * 1024;
const COMMON_PASSWORDS = new Set([
  "password1234", "password12345", "password123456", "qwerty123456",
  "123456789012", "1234567890123", "letmein123456", "admin12345678",
  "welcome123456", "iloveyou123456", "changeme123456", "abc123456789",
]);

export default function MyProfile() {
  const { user, isSuperadmin, setUser } = useAuth();
  const [name, setName] = useState(user?.name || user?.tenant_name || user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [initialProfile, setInitialProfile] = useState({ name: "", email: "", avatar: "" });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.two_factor_enabled === true);
  const [twoFactorSetup, setTwoFactorSetup] = useState<{ secret: string; otpauth_url: string } | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [securityBusy, setSecurityBusy] = useState(false);

  const isDirty =
    name.trim() !== initialProfile.name ||
    email.trim() !== initialProfile.email ||
    avatar !== initialProfile.avatar ||
    newPassword.length > 0;
  const isCommonPassword =
    COMMON_PASSWORDS.has(newPassword.toLowerCase()) ||
    /(password|qwerty|letmein|admin|welcome|iloveyou|changeme|monkey|dragon)/i.test(newPassword) ||
    /^(.)\1{7,}$/.test(newPassword) ||
    /^(0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef)/i.test(newPassword);
  const passwordStrength = newPassword.length === 0
    ? 0
    : isCommonPassword
      ? 1
      : Math.min(4, (newPassword.length >= 12 ? 1 : 0) + (/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) ? 1 : 0) + (/\d/.test(newPassword) ? 1 : 0) + (/[^A-Za-z0-9]/.test(newPassword) ? 1 : 0));
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][passwordStrength];
  const prettyDate = (value: unknown) => {
    if (typeof value !== "string" && !(value instanceof Date)) return "Not available";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleString();
  };

  useEffect(() => {
    let active = true;
    api<ProfileResponse>("/api/auth/profile")
      .then(async ({ user: profile }) => {
        if (!active) return;
        setUser(profile);
        setName(profile.name || profile.tenant_name || profile.username || "");
        setEmail(profile.email || "");
        setAvatar(profile.avatar || "");
        setInitialProfile({
          name: profile.name || profile.tenant_name || profile.username || "",
          email: profile.email || "",
          avatar: profile.avatar || "",
        });
        setPendingEmail(typeof profile.pending_email === "string" ? profile.pending_email : "");
        setTwoFactorEnabled(profile.two_factor_enabled === true);
        const currentSessions = await api<ActiveSession[]>("/api/auth/sessions");
        if (active) setSessions(currentSessions);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Failed to load profile");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [setUser]);

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Choose a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Avatar images must be 1 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatar(reader.result);
        setError("");
      } else {
        setError("Could not read the selected image.");
      }
    };
    reader.onerror = () => setError("Could not read the selected image.");
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const payload: Record<string, string | null> = { name: name.trim(), email: email.trim(), avatar };
      if (newPassword) {
        payload.current_password = currentPassword;
        payload.password = newPassword;
      } else if (email.trim().toLowerCase() !== (user?.email || "").toLowerCase()) {
        payload.current_password = currentPassword;
      }
      const result = await api<ProfileUpdateResponse>("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      if (result.token) setToken(result.token);
      setUser(result.user);
      setName(result.user.name || result.user.tenant_name || "");
      setEmail(result.user.email || "");
      setAvatar(result.user.avatar || "");
      setInitialProfile({
        name: result.user.name || result.user.tenant_name || "",
        email: result.user.email || "",
        avatar: result.user.avatar || "",
      });
      setPendingEmail(result.pending_email || (typeof result.user.pending_email === "string" ? result.user.pending_email : ""));
      setCurrentPassword("");
      setNewPassword("");
      setNotice(
        result.pending_email
          ? `A confirmation link was sent to ${result.pending_email}. Your current email remains active until you confirm it.`
          : result.password_notice_sent === false
            ? "Your profile was updated, but we couldn't send the password-change notice email."
            : "Your profile has been updated."
      );
      if (result.password_notice_sent === false) setError("Password-change notice email could not be sent. Check the backend email configuration.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  async function sendVerificationEmail() {
      setSecurityBusy(true);
      setError("");
      try {
        const result = await api<{ message: string }>("/api/auth/email-verification", { method: "POST" });
        setNotice(result.message);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not send verification email");
      } finally {
        setSecurityBusy(false);
      }
    }

  async function startTwoFactorSetup() {
      setSecurityBusy(true);
      setError("");
      try {
        const setup = await api<{ secret: string; otpauth_url: string }>("/api/auth/two-factor/setup", { method: "POST" });
        setTwoFactorSetup(setup);
        setTwoFactorCode("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not start two-factor setup");
      } finally {
        setSecurityBusy(false);
      }
    }

  async function enableTwoFactor() {
      setSecurityBusy(true);
      setError("");
      try {
        await api<{ message: string }>("/api/auth/two-factor/enable", {
          method: "POST",
          body: JSON.stringify({ code: twoFactorCode }),
        });
        setTwoFactorEnabled(true);
        setTwoFactorSetup(null);
        setTwoFactorCode("");
        setNotice("Authenticator two-factor authentication is enabled.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not enable two-factor authentication");
      } finally {
        setSecurityBusy(false);
      }
    }

  async function disableTwoFactor() {
      setSecurityBusy(true);
      setError("");
      try {
        await api<{ message: string }>("/api/auth/two-factor/disable", {
          method: "POST",
          body: JSON.stringify({ current_password: disablePassword, code: twoFactorCode }),
        });
        setTwoFactorEnabled(false);
        setTwoFactorCode("");
        setDisablePassword("");
        setNotice("Two-factor authentication is disabled.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not disable two-factor authentication");
      } finally {
        setSecurityBusy(false);
      }
    }

  async function revokeOtherSessions() {
      setSecurityBusy(true);
      setError("");
      try {
        await api<{ revoked: number }>("/api/auth/sessions/others", { method: "DELETE" });
        const currentSessions = await api<ActiveSession[]>("/api/auth/sessions");
        setSessions(currentSessions);
        setNotice("Other signed-in devices have been signed out.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not sign out other devices");
      } finally {
        setSecurityBusy(false);
      }
    }
  return (
    <div>
      <PageMeta title="My Profile | UniSell" description="View and update your UniSell account details." />
      <PageBreadcrumb pageTitle="My profile" />
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Account details</h1>
        {loading ? (
          <p className="mt-5 text-sm text-gray-500 dark:text-gray-400">Loading profile…</p>
        ) : (
          <form className="mt-5 space-y-6" onSubmit={handleSubmit}>
            <div className="flex items-center gap-4">
              {avatar ? (
                <img className="h-16 w-16 rounded-full object-cover" src={avatar} alt="Profile avatar" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-xl font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {(name.trim().charAt(0) || "?").toUpperCase()}
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <label className="cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/5">
                  Change avatar
                  <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarChange} />
                </label>
                {avatar && (
                  <button
                    className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                    type="button"
                    onClick={() => setAvatar("")}
                  >
                    Remove
                  </button>
                )}
                <p className="w-full text-xs text-gray-500 dark:text-gray-400">PNG, JPEG, or WebP; up to 1 MB.</p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Name
                <input
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  autoComplete="name"
                  maxLength={100}
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                <span className="flex items-center gap-2">
                  Email
                  <span className={`rounded-full px-2 py-0.5 text-xs ${user?.email_verified ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"}`}>
                    {user?.email_verified ? "Verified" : "Not verified"}
                  </span>
                </span>
                <input
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                {pendingEmail && (
                  <span className="mt-2 block text-xs text-amber-700 dark:text-amber-400">
                    Confirmation pending for {pendingEmail}. Your current address remains active.
                  </span>
                )}
                {!user?.email_verified && (
                  <button
                    className="mt-2 text-xs font-medium text-violet-600 hover:text-violet-700 disabled:opacity-60 dark:text-violet-400"
                    type="button"
                    onClick={sendVerificationEmail}
                    disabled={securityBusy}
                  >
                    Send verification link
                  </button>
                )}
              </label>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Current password
                <span className="relative mt-2 block">
                  <input
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-11 text-gray-900 outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    type={showCurrentPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    placeholder="Required to change email or password"
                  />
                  <button
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    type="button"
                    aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                    aria-pressed={showCurrentPassword}
                    onClick={() => setShowCurrentPassword((visible) => !visible)}
                  >
                    {showCurrentPassword ? (
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                        <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.2A10.8 10.8 0 0112 5c5 0 8.5 4.2 9.5 7-.4 1.1-1.2 2.3-2.3 3.4M6.2 6.2C4.3 7.4 3 9.3 2.5 12c.5 2.8 4 7 9.5 7 1 0 2-.2 2.9-.5" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                        <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="12" r="2.5" strokeWidth="1.7" />
                      </svg>
                    )}
                  </button>
                </span>
                <span className="mt-1 block text-xs font-normal text-gray-500 dark:text-gray-400">
                  Five incorrect attempts are allowed per 15-minute window.
                </span>
              </label>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                New password
                <span className="relative mt-2 block">
                  <input
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-11 text-gray-900 outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    type={showNewPassword ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={12}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Leave blank to keep current password"
                  />
                  <button
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    type="button"
                    aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                    aria-pressed={showNewPassword}
                    onClick={() => setShowNewPassword((visible) => !visible)}
                  >
                    {showNewPassword ? (
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                        <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.2A10.8 10.8 0 0112 5c5 0 8.5 4.2 9.5 7-.4 1.1-1.2 2.3-2.3 3.4M6.2 6.2C4.3 7.4 3 9.3 2.5 12c.5 2.8 4 7 9.5 7 1 0 2-.2 2.9-.5" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                        <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="12" r="2.5" strokeWidth="1.7" />
                      </svg>
                    )}
                  </button>
                </span>
                {newPassword && (
                  <span className="mt-2 block">
                    <span className="flex gap-1" aria-label={`Password strength: ${strengthLabel}`}>
                      {[1, 2, 3, 4].map((level) => (
                        <span
                          key={level}
                          className={`h-1.5 flex-1 rounded-full ${passwordStrength >= level ? (passwordStrength < 2 ? "bg-red-500" : passwordStrength < 4 ? "bg-amber-500" : "bg-green-500") : "bg-gray-200 dark:bg-gray-700"}`}
                        />
                      ))}
                    </span>
                    <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                      {isCommonPassword ? "Too common or predictable. Choose another password." : `${strengthLabel} — use at least 12 characters and a mix of uppercase, lowercase, numbers, and symbols. Common passwords are rejected.`}
                    </span>
                  </span>
                )}
              </label>
            </div>

            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            {notice && <p role="status" className="text-sm text-green-700 dark:text-green-400">{notice}</p>}
            <div className="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
              <div className="space-y-1 text-sm text-gray-500 dark:text-gray-400">
                <p className="capitalize">Account type: {user?.role || (isSuperadmin ? "Superadmin" : "User")}</p>
                <p>Member since: {prettyDate(user?.member_since)}</p>
                <p>Last login: {prettyDate(user?.last_login_at)}</p>
              </div>
              <button
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={saving || !isDirty}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        )}
      </section>
      {!loading && (
        <>
          <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Two-factor authentication</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Verify with your authenticator on a new browser, then again after six months on that browser.
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${twoFactorEnabled ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}>
                {twoFactorEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            {!twoFactorEnabled && !twoFactorSetup && (
              <button
                className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
                type="button"
                onClick={startTwoFactorSetup}
                disabled={securityBusy}
              >
                Set up authenticator
              </button>
            )}
            {twoFactorSetup && (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Add UniSell in your authenticator app using this setup key, then enter the 6-digit code shown by the app.
                </p>
                <code className="block break-all rounded-lg bg-gray-100 p-3 font-mono text-sm text-gray-900 dark:bg-gray-800 dark:text-gray-100">
                  {twoFactorSetup.secret}
                </code>
                <a className="text-sm font-medium text-violet-600 hover:underline dark:text-violet-400" href={twoFactorSetup.otpauth_url}>
                  Open authenticator app
                </a>
                <div className="flex flex-wrap gap-3">
                  <input
                    className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    aria-label="Authenticator verification code"
                    placeholder="6-digit code"
                    value={twoFactorCode}
                    onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, ""))}
                  />
                  <button
                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
                    type="button"
                    onClick={enableTwoFactor}
                    disabled={securityBusy || twoFactorCode.length !== 6}
                  >
                    Verify and enable
                  </button>
                  <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700 dark:text-gray-200" type="button" onClick={() => setTwoFactorSetup(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {twoFactorEnabled && (
              <div className="mt-4 flex flex-wrap gap-3">
                <input
                  className="w-48 rounded-lg border border-gray-300 px-3 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Current password"
                  value={disablePassword}
                  onChange={(event) => setDisablePassword(event.target.value)}
                />
                <input
                  className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  aria-label="Authenticator verification code"
                  placeholder="6-digit code"
                  value={twoFactorCode}
                  onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, ""))}
                />
                <button
                  className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-900"
                  type="button"
                  onClick={disableTwoFactor}
                  disabled={securityBusy || !disablePassword || twoFactorCode.length !== 6}
                >
                  Disable 2FA
                </button>
              </div>
            )}
          </section>

          <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Active sessions</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Devices currently signed in to your account.</p>
              </div>
              <button
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/5"
                type="button"
                onClick={revokeOtherSessions}
                disabled={securityBusy || sessions.length <= 1}
              >
                Log out other devices
              </button>
            </div>
            <ul className="mt-4 divide-y divide-gray-100 dark:divide-gray-800">
              {sessions.map((session) => (
                <li className="flex flex-wrap items-center justify-between gap-3 py-3" key={session.id}>
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {session.user_agent || "Unknown device"} {session.current && <span className="ml-2 text-xs text-green-600 dark:text-green-400">This device</span>}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Last active {prettyDate(session.last_seen_at)} · IP {session.ip_address || "unknown"}
                    </p>
                  </div>
                </li>
              ))}
              {sessions.length === 0 && <li className="py-3 text-sm text-gray-500 dark:text-gray-400">No active sessions found.</li>}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
