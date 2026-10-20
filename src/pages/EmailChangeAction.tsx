import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import PageMeta from "../components/common/PageMeta";
import { api } from "../api/client";

type ActionResponse = { message: string; security_notice_sent?: boolean };

export default function EmailChangeAction() {
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("Checking your email link…");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const action = searchParams.get("action");
    const token = searchParams.get("token");
    if (!action || !token || !["confirm", "cancel", "rollback", "verify"].includes(action)) {
      setError("This email link is invalid.");
      return;
    }
    api<ActionResponse>(`/api/auth/email-change/${action}`, {
      method: "POST",
      body: JSON.stringify({ token }),
    })
      .then((result) => {
        if (!active) return;
        setMessage(
          result.security_notice_sent === false
            ? `${result.message} A security notification could not be delivered to the old address.`
            : result.message
        );
        if (action === "confirm" || action === "rollback") {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Could not process this email link.");
      });
    return () => {
      active = false;
    };
  }, [searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <PageMeta title="Email security | UniSell" description="Confirm or cancel a UniSell email change." />
      <section className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Email security</h1>
        <p className={`mt-3 text-sm ${error ? "text-red-600" : "text-gray-600 dark:text-gray-300"}`} role={error ? "alert" : "status"}>
          {error || message}
        </p>
        <Link className="mt-6 inline-flex rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700" to="/signin">
          Go to sign in
        </Link>
      </section>
    </main>
  );
}
