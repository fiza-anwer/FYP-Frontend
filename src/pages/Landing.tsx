import PageMeta from "../components/common/PageMeta";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router";
import "./Landing.css";

const workflowRows = [
  { number: "#US-2841", channel: "Shopify", destination: "Lahore, PK", status: "Ready to ship", tone: "ready" },
  { number: "#DZ-1906", channel: "Daraz", destination: "Karachi, PK", status: "Label created", tone: "label" },
  { number: "#US-2838", channel: "Shopify", destination: "Islamabad, PK", status: "In transit", tone: "transit" },
];

export default function Landing() {
  const { user } = useAuth();
  const workspacePath = user?.role === "superadmin" ? "/superadmin/tenants" : "/dashboard";
  const primaryPath = user ? workspacePath : "/signup";

  return (
    <main className="landing-home">
      <PageMeta
        title="UniSell | Every order, moving together"
        description="Manage orders, inventory, integrations, and shipping from one clear workspace with UniSell."
      />
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <div className="landing-eyebrow"><span /> COMMERCE OPERATIONS, CONNECTED</div>
          <h1 id="landing-title">From store order<br /><em>to shipped.</em></h1>
          <p className="landing-intro">UniSell brings Shopify and Daraz orders, products, inventory, and carrier shipping into one workspace, so your team can manage the full order journey in one place.</p>
          <div className="landing-hero-actions">
            <Link className="landing-primary-cta" to={primaryPath}>{user ? "Go to your workspace" : "Create your workspace"}<span aria-hidden="true">&#8594;</span></Link>
            <Link className="landing-secondary-cta" to="/how-it-works">Explore the workflow <span aria-hidden="true">&#8594;</span></Link>
          </div>
          <div className="landing-proof"><span className="proof-check" aria-hidden="true">&#10003;</span> Store integrations | inventory | orders | shipping</div>
        </div>

        <div className="landing-preview-wrap" aria-label="Preview of the UniSell operations dashboard">
          <div className="preview-note"><span className="preview-live-dot" /> YOUR OPERATIONS, AT A GLANCE</div>
          <div className="landing-preview">
            <div className="preview-topbar">
              <div className="preview-brand"><img src="/images/logo/logo-admin.svg" alt="UniSell" /><span className="preview-divider" /> <span className="preview-section-name">Overview</span></div>
              <div className="preview-account"><span className="preview-account-dot">A</span><span>Atlas Goods</span><span className="preview-chevron">&#8964;</span></div>
            </div>
            <div className="preview-content">
              <div className="preview-heading-row"><div><div className="preview-overline">MONDAY, 14 OCTOBER</div><h2>Good morning, Amina</h2><p>Here is what is happening across your store.</p></div><span className="preview-date">Last 30 days <span>&#8964;</span></span></div>
              <div className="preview-stat-grid">
                <div className="preview-stat"><div className="preview-stat-label">Open orders <span className="preview-stat-icon icon-orders">&#8599;</span></div><strong>128</strong><small><b>+12.8%</b> vs last month</small><div className="preview-spark spark-one"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div></div>
                <div className="preview-stat"><div className="preview-stat-label">To fulfill <span className="preview-stat-icon icon-fulfill">&#8594;</span></div><strong>34</strong><small><b className="stat-neutral">8 due today</b></small><div className="preview-progress"><span /></div></div>
                <div className="preview-stat"><div className="preview-stat-label">Inventory health <span className="preview-stat-icon icon-stock">&#10003;</span></div><strong>96<span className="stat-percent">%</span></strong><small><b>All channels synced</b></small><div className="preview-spark spark-three"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div></div>
              </div>
              <div className="preview-orders-head"><div><h3>Recent orders</h3><span>What needs your attention</span></div><span className="preview-all-orders">View orders <b>&#8594;</b></span></div>
              <div className="preview-table">
                {workflowRows.map((row) => (
                  <div className="preview-order-row" key={row.number}>
                    <span className="preview-order-mark" aria-hidden="true">&#8599;</span>
                    <span className="preview-order-id">{row.number}<small>{row.channel}</small></span>
                    <span className="preview-destination">{row.destination}</span>
                    <span className={`preview-status status-${row.tone}`}><i />{row.status}</span>
                  </div>
                ))}
              </div>
              <div className="preview-footer"><span><i /> All systems operational</span><span>Updated just now</span></div>
            </div>
          </div>
          <div className="preview-float-chip"><span className="float-check">&#10003;</span><span><b>Order shipped</b><small>Label created successfully</small></span><span className="float-time">NOW</span></div>
        </div>
      </section>

      <section className="landing-home-directory" aria-label="Explore UniSell">
        <div>
          <span className="section-kicker">GET TO KNOW UNISELL</span>
          <h2>One platform for the work behind every order.</h2>
          <p>Explore the tools, process, and subscription options for your operation.</p>
        </div>
        <div className="landing-home-links">
          <Link to="/features">Explore features <span aria-hidden="true">&#8594;</span></Link>
          <Link to="/how-it-works">How it works <span aria-hidden="true">&#8594;</span></Link>
          <Link to="/plans">Compare plans <span aria-hidden="true">&#8594;</span></Link>
        </div>
      </section>
    </main>
  );
}