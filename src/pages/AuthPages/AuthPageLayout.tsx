import React from "react";
import GridShape from "../../components/common/GridShape";
import { Link } from "react-router";
import ThemeTogglerTwo from "../../components/common/ThemeTogglerTwo";

export default function AuthLayout({
  children,
  brand = "unisell",
}: {
  children: React.ReactNode;
  /** unisell = tenant signup/login; admin = superadmin sign-in panel */
  brand?: "unisell" | "admin";
}) {
  const logoSrc =
    brand === "admin" ? "/images/logo/auth-logo-admin.svg" : "/images/logo/auth-logo.svg";
  const tagline =
    brand === "admin"
      ? "Platform administration portal"
      : "Simplify management with our dashboard";
  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <div className="relative flex flex-col justify-center w-full h-screen lg:flex-row dark:bg-gray-900 sm:p-0">
        {children}
        <div className="items-center hidden w-full h-full lg:w-1/2 bg-brand-950 dark:bg-white/5 lg:grid">
          <div className="relative flex items-center justify-center z-1">
            {/* <!-- ===== Common Grid Shape Start ===== --> */}
            <GridShape />
            <div className="flex flex-col items-center w-[320px]">
              <Link to="/" className="block mb-3 w-full">
                <img
                  width={231}
                  height={48}
                  src={logoSrc}
                  alt="UniSell"
                  className="w-full max-w-[231px]"
                />
              </Link>
              <p className="text-right w-full text-sm text-gray-400 dark:text-white/60 leading-relaxed pr-1 whitespace-nowrap">
                {tagline}
              </p>
            </div>
          </div>
        </div>
        <div className="fixed z-50 hidden bottom-6 right-6 sm:block">
          <ThemeTogglerTwo />
        </div>
      </div>
    </div>
  );
}
