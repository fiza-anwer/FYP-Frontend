import { useState, useEffect } from "react";
import { Link } from "react-router";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import Button from "../ui/button/Button";
import { authApi } from "../../api/client";
import { setToken } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { offerToSaveCredentials, redirectAfterAuth } from "../../utils/passwordManager";
import { setLoginStockAlerts } from "../common/StockAlertsBanner";

const LAST_LOGIN_EMAIL_KEY = "lastLoginEmail";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAST_LOGIN_EMAIL_KEY);
      if (saved) setEmail(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if ((!challengeToken && (!email.trim() || !password)) || (challengeToken && verificationCode.length !== 6)) {
      setError(challengeToken ? "Enter the 6-digit code from your authenticator app." : "Email and password are required.");
      return;
    }
    setLoading(true);
    const emailNorm = email.trim().toLowerCase();
    try {
      const res = challengeToken
        ? await authApi.verifyTwoFactor({ challenge_token: challengeToken, code: verificationCode })
        : await authApi.login({ email: emailNorm, password });
      if (res.requires_two_factor && res.challenge_token) {
        setChallengeToken(res.challenge_token);
        return;
      }
      if (!res.token || !res.user) throw new Error("Sign-in response was incomplete. Please try again.");
      setToken(res.token);
      setUser(res.user as Parameters<typeof setUser>[0]);
      if (!res.user.isSuperadmin && res.stock_alerts) {
        setLoginStockAlerts(res.stock_alerts);
      }
      try {
        if (rememberEmail) {
          localStorage.setItem(LAST_LOGIN_EMAIL_KEY, emailNorm);
        } else {
          localStorage.removeItem(LAST_LOGIN_EMAIL_KEY);
        }
      } catch {
        /* ignore */
      }
      if (!challengeToken) await offerToSaveCredentials(emailNorm, password);
      const nextPath = res.user.isSuperadmin ? "/superadmin/tenants" : "/";
      redirectAfterAuth(nextPath);
      return;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="w-full max-w-md pt-10 mx-auto">
        <Link
          to="/signup"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon className="size-5" />
          Back to sign up
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Sign In
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {challengeToken ? "Enter the 6-digit code from your authenticator app." : "Sign in with your email and password."}
            </p>
          </div>
          {error && (
            <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-900/30 dark:text-red-400">
              {error}
            </div>
          )}
          {!challengeToken && (
            <div className="relative py-3 sm:py-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
              </div>
            </div>
          )}
          <form
            name="signin"
            action="/signin"
            method="post"
            autoComplete="on"
            onSubmit={handleSubmit}
          >
            <div className="space-y-6">
              {!challengeToken && (
                <>
                  <div>
                    <Label htmlFor="signin-email">
                      Email <span className="text-error-500">*</span>{" "}
                    </Label>
                    <Input
                      id="signin-email"
                      name="email"
                      placeholder="info@gmail.com"
                      type="email"
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="signin-password">
                      Password <span className="text-error-500">*</span>{" "}
                    </Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                      />
                      <span
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                      >
                        {showPassword ? (
                          <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                        ) : (
                          <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox checked={rememberEmail} onChange={setRememberEmail} />
                    <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                      Remember me
                    </span>
                  </div>
                </>
              )}
              {challengeToken && (
                <div>
                  <Label htmlFor="signin-two-factor-code">Authenticator code</Label>
                  <Input
                    id="signin-two-factor-code"
                    name="one-time-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="6-digit code"
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ""))}
                    disabled={loading}
                  />
                  <button
                    className="mt-2 text-sm text-brand-500 hover:text-brand-600"
                    type="button"
                    onClick={() => {
                      setChallengeToken("");
                      setVerificationCode("");
                      setError("");
                    }}
                  >
                    Back to sign in
                  </button>
                </div>
              )}
              <div>
                <Button className="w-full" size="sm" type="submit" disabled={loading || (challengeToken !== "" && verificationCode.length !== 6)}>
                  {loading ? (challengeToken ? "Verifying..." : "Signing in...") : (challengeToken ? "Verify code" : "Sign in")}
                </Button>
              </div>
            </div>
          </form>

            {!challengeToken && <div className="mt-5">
              <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                Don&apos;t have an account?{" "}
                <Link
                  to="/signup"
                  className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                >
                  Sign Up
                </Link>
              </p>
            </div>}
          </div>
        </div>
      </div>
  );
}
