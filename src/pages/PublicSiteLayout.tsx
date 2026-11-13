import { Link, Navigate, NavLink, Outlet } from "react-router";
import { useAuth } from "../context/AuthContext";
import "./Landing.css";

const publicLinks = [
  { label: "Features", to: "/features" },
  { label: "How it works", to: "/how-it-works" },
  { label: "Plans", to: "/plans" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

export default function PublicSiteLayout() {
  const { user } = useAuth();
  const workspacePath = user?.role === "superadmin" ? "/superadmin/tenants" : "/dashboard";

  if (user) return <Navigate to={workspacePath} replace />;

  return (
    <div className="landing-page">
      <header className="landing-header">
        <Link className="landing-brand" to="/" aria-label="UniSell home">
          <img src="/images/logo/logo-admin.svg" alt="UniSell" />
        </Link>
        <nav className="landing-nav" aria-label="Main navigation">
          {publicLinks.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? "landing-nav-active" : undefined}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <details className="landing-mobile-nav">
          <summary aria-label="Open site navigation"><i /><i /><i /></summary>
          <nav aria-label="Mobile navigation">
            {publicLinks.map((item) => <NavLink key={item.to} to={item.to} onClick={(event) => {
              const menu = event.currentTarget.closest("details");
              if (menu) menu.open = false;
            }}>{item.label}</NavLink>)}
          </nav>
        </details>
        <div className="landing-header-actions">
          <Link className="landing-login" to="/signin">Sign in</Link>
          <Link className="landing-nav-cta" to="/signup">Get started<span aria-hidden="true">&#8599;</span></Link>
        </div>
      </header>
      <Outlet />
      <footer className="landing-footer">
        <Link className="landing-brand" to="/" aria-label="UniSell home"><img src="/images/logo/logo-admin.svg" alt="UniSell" /></Link>
        <nav className="landing-footer-links" aria-label="Footer navigation">
          {publicLinks.map((item) => <Link key={item.to} to={item.to}>{item.label}</Link>)}
        </nav>
        <span>Commerce operations, connected.</span>
      </footer>
    </div>
  );
}