import { Link } from "react-router";
import PageMeta from "../components/common/PageMeta";
import { useAuth } from "../context/AuthContext";

const capabilities = [
  { number: "01", title: "Connect your sales channels", description: "Bring Shopify and Daraz into one workspace and see incoming orders without jumping between store tabs.", tag: "CHANNELS", details: ["Connect a channel to the company that owns the store.", "Choose available product, order, and inventory sync options.", "Review connection status and sync messages in the workspace."] },
  { number: "02", title: "Keep products and stock organized", description: "Manage product details, publish listings, review sync status, and adjust inventory from one catalog.", tag: "PRODUCTS", details: ["Create and edit products, variants, SKUs, and descriptions.", "Choose a company and target channel for eligible listings.", "Review available, allocated, and free stock before making adjustments."] },
  { number: "03", title: "Move orders into fulfillment", description: "Review order and address details, prepare consignments, choose carrier services, and create shipping labels.", tag: "ORDERS", details: ["Review orders imported from active company integrations.", "Check shipping addresses and assign orders to a company when needed.", "Create consignments from eligible orders with the required address details."] },
  { number: "04", title: "Follow every consignment", description: "Keep shipment records and label details beside the order so your team can see what has shipped.", tag: "SHIPPING", details: ["Choose an active carrier integration and configured service.", "Open and print the available shipment label.", "Dispatch eligible consignments and use the carrier tracking link when available."] },
  { number: "05", title: "See where work stands", description: "Use the dashboard to review operational metrics and spot stock or order work that needs attention.", tag: "OVERVIEW", details: ["Review dashboard order and revenue visualizations.", "Use stock alerts to identify items that need a closer look.", "Export dashboard reports for offline review."] },
];

const workflowSteps = [
  { number: "01", title: "Set up your workspace", description: "Create the company record that will own the store connections and shipping origin.", details: ["Add the company name and operational details.", "Enter the ship-from address used when preparing carrier shipments."] },
  { number: "02", title: "Connect a sales channel", description: "Link a Shopify or Daraz store to the company that owns it.", details: ["Enter the requested credentials or complete the channel authorization.", "Choose the product, order, and inventory sync options available to the connection."] },
  { number: "03", title: "Prepare products and inventory", description: "Review the catalog and make sure product information is ready for the channels you use.", details: ["Check SKUs, variants, images, categories, and channel requirements.", "Review available, allocated, and free stock before making a quantity adjustment."] },
  { number: "04", title: "Review incoming orders", description: "Use the shared order list to check ownership, fulfillment state, and delivery details.", details: ["Filter by company and include dispatched orders when needed.", "Assign unowned orders and confirm the shipping address before fulfillment."] },
  { number: "05", title: "Configure a carrier and service", description: "Set up the courier account and service mapping required to prepare consignments.", details: ["Add carrier credentials and activate the carrier integration.", "Map a carrier service code supplied by the courier."] },
  { number: "06", title: "Create, dispatch, and follow the shipment", description: "Turn eligible orders into consignments, print available labels, and follow dispatch information.", details: ["Select orders with valid shipping addresses and create consignments.", "Print the label, dispatch the order, then use its tracking link when available."] },
];

const featureScenarios = [
  { title: "A channel needs attention", description: "Check the integration status and its sync message, then review credentials and the selected sync options before retrying." },
  { title: "A listing is not ready", description: "Review its SKU, variants, images, category, company, and target channel. A local save and a successful channel publish are separate outcomes." },
  { title: "An order is ready to ship", description: "Confirm its company and shipping address, then create a consignment using an active carrier and configured service." },
];

const supportTopics = [
  { title: "Account", description: "Sign-in, profile, password, and account-access questions." },
  { title: "Products", description: "Product details, variants, listing requirements, and publishing results." },
  { title: "Orders", description: "Order ownership, fulfillment state, and shipping-address questions." },
  { title: "Integrations", description: "Store authorization, credentials, sync options, and connection status." },
  { title: "Shipping setup", description: "Carrier accounts, service mappings, consignments, labels, and dispatch." },
];

const plans = [
  { name: "Essentials", price: "$14", summary: "The everyday tools to organize your operation.", features: ["Operations dashboard", "Order management", "Product catalog", "Inventory overview and adjustments"] },
  { name: "Commerce", price: "$24", summary: "For stores selling across connected channels.", features: ["Everything in Essentials", "Shopify and Daraz integrations", "Product publishing and sync", "Inventory sync status"] },
  { name: "Fulfillment", price: "$33", summary: "For teams preparing and shipping more orders.", features: ["Everything in Commerce", "Carrier integrations and services", "Consignment management", "Shipping label generation"], featured: true },
  { name: "Operations", price: "$45", summary: "A broader view for multi-company operations.", features: ["Everything in Fulfillment", "Multiple company setup", "Company and carrier configuration", "Dashboard reports and export"] },
];

const planComparison = [
  { feature: "Operations dashboard and order management", tiers: [true, true, true, true] },
  { feature: "Product catalog and local inventory adjustments", tiers: [true, true, true, true] },
  { feature: "Shopify and Daraz connections", tiers: [false, true, true, true] },
  { feature: "Product publishing and channel sync", tiers: [false, true, true, true] },
  { feature: "Carrier integrations and service setup", tiers: [false, false, true, true] },
  { feature: "Consignments and shipping labels", tiers: [false, false, true, true] },
  { feature: "Multiple companies and report export", tiers: [false, false, false, true] },
];

function PageIntro({ kicker, title, description }: { kicker: string; title: string; description: string }) {
  return (
    <div className="public-page-intro">
      <span className="section-kicker">{kicker}</span>
      <h1 className="landing-section-title">{title}</h1>
      <p>{description}</p>
    </div>
  );
}

export function FeaturesPage() {
  return (
    <main className="public-detail-page">
      <PageMeta title="Features | UniSell" description="Explore UniSell features for store integrations, products, inventory, order management, and shipping." />
      <PageIntro kicker="ONE CONNECTED WORKSPACE" title="The work behind every order, in one place." description="Connect your commerce channels to the daily work of keeping products, stock, orders, and shipments moving." />
      <section className="landing-platform public-feature-section" aria-label="UniSell features">
        <div className="platform-grid">
          {capabilities.map((capability) => (
            <article className="platform-item" key={capability.number}>
              <div className="platform-item-meta"><span>{capability.number}</span><span>{capability.tag}</span></div>
              <h2>{capability.title}</h2>
              <p>{capability.description}</p>
              <ul className="feature-detail-list">
                {capability.details.map((detail) => <li key={detail}>{detail}</li>)}
              </ul>
            </article>
          ))}
        </div>
        <div className="platform-integrations"><span>SUPPORTED CONNECTIONS</span><div><b>Shopify</b><i /><b>Daraz</b><i /><b>DHL</b><i /><b>Leopards</b></div></div>
      </section>
      <section className="feature-workflow-band">
        <div><span className="section-kicker">CONNECTED OPERATIONS</span><h2>Store activity and shipping preparation, side by side.</h2><p>Use channel, product, inventory, order, and consignment views to understand where work stands and what needs attention next.</p></div>
        <Link className="landing-primary-cta" to="/how-it-works">See the workflow <span aria-hidden="true">&#8594;</span></Link>
      </section>
      <section className="feature-scenarios">
        <div className="feature-scenarios-heading"><span className="section-kicker">DAY-TO-DAY USE</span><h2>Know what to check when work pauses.</h2><p>UniSell keeps the next investigation close to the product, order, or connection that needs attention.</p></div>
        <div className="feature-scenario-list">
          {featureScenarios.map((scenario, index) => <article key={scenario.title}><span>0{index + 1}</span><div><h3>{scenario.title}</h3><p>{scenario.description}</p></div></article>)}
        </div>
      </section>
      <section className="public-page-cta"><p>See how the pieces fit together.</p><Link className="landing-primary-cta" to="/how-it-works">Explore the workflow <span aria-hidden="true">&#8594;</span></Link></section>
    </main>
  );
}

export function HowItWorksPage() {
  return (
    <main className="public-detail-page">
      <PageMeta title="How It Works | UniSell" description="Follow the UniSell workflow from connecting a store to creating a shipment." />
      <PageIntro kicker="HOW THE WORK MOVES" title="From connected store to prepared shipment." description="UniSell brings the steps your team repeats every day into one clear sequence." />
      <section className="landing-workflow public-workflow-section" aria-label="The UniSell workflow">
        <ol className="workflow-steps">
          {workflowSteps.map((step) => (
            <li className="workflow-step" key={step.number}>
              <span className="workflow-step-number">{step.number}</span>
              <h2>{step.title}</h2>
              <p>{step.description}</p>
              <ul className="workflow-step-details">
                {step.details.map((detail) => <li key={detail}>{detail}</li>)}
              </ul>
            </li>
          ))}
        </ol>
        <p className="workflow-note">Carrier and service options depend on the integrations configured for your workspace.</p>
      </section>
      <section className="workflow-preparation">
        <div><span className="section-kicker">BEFORE YOU SHIP</span><h2>Set up the details once.</h2><p>Add your company ship-from address, connect a carrier account, and configure the service codes your carrier provides. These are used when preparing consignments.</p></div>
        <div><span className="section-kicker">WHEN AN ORDER ARRIVES</span><h2>Check eligibility before creating a label.</h2><p>Orders need a valid shipping address, and shipping options depend on an active carrier integration and service. UniSell keeps those requirements close to the fulfillment work.</p></div>
      </section>
      <section className="workflow-checklist">
        <div><span className="section-kicker">READY FOR THE NEXT STEP?</span><h2>Use this quick handoff checklist.</h2><p>Most shipping delays come from a missing detail at the handoff. Check these items before creating a consignment.</p></div>
        <ul>
          <li><span>&#10003;</span>The order belongs to the correct company.</li>
          <li><span>&#10003;</span>The customer shipping address is complete.</li>
          <li><span>&#10003;</span>The carrier integration is active and has a service mapped.</li>
          <li><span>&#10003;</span>The order is eligible and has not already been dispatched.</li>
        </ul>
      </section>
      <section className="public-page-cta"><p>See the tools available at each stage.</p><Link className="landing-primary-cta" to="/features">Explore features <span aria-hidden="true">&#8594;</span></Link></section>
    </main>
  );
}

export function PlansPage() {
  const { user } = useAuth();
  const primaryPath = user?.role === "superadmin" ? "/superadmin/tenants" : user ? "/dashboard" : "/signup";

  return (
    <main className="public-detail-page">
      <PageMeta title="Plans | UniSell" description="Compare UniSell subscription tiers for commerce operations, channel integrations, inventory, and shipping." />
      <PageIntro kicker="SUBSCRIPTION OPTIONS" title="Choose the tools your operation needs." description="Compare four feature-based tiers. Prices are displayed monthly; plans do not change app access or connect integrations." />
      <section className="landing-plans public-plans-section" aria-label="Subscription plans">
        <div className="plans-grid">
          {plans.map((plan) => (
            <article className={`plan-card${plan.featured ? " plan-card-featured" : ""}`} key={plan.name}>
              {plan.featured && <span className="plan-recommended">MOST POPULAR</span>}
              <h2>{plan.name}</h2>
              <p className="plan-summary">{plan.summary}</p>
              <p className="plan-price"><strong>{plan.price}</strong><span> / month</span></p>
              <ul>{plan.features.map((feature) => <li key={feature}><span aria-hidden="true">&#10003;</span>{feature}</li>)}</ul>
              <Link className="plan-cta" to={primaryPath}>{user ? "Open workspace" : "Get started"}<span aria-hidden="true">&#8594;</span></Link>
            </article>
          ))}
        </div>
        <div className="plan-comparison">
          <div className="plan-comparison-heading"><span className="section-kicker">AT A GLANCE</span><h2>Compare what each tier covers.</h2><p>The feature groupings are shown for planning only; this page does not apply access limits or process payments.</p></div>
          <div className="plan-comparison-scroll">
            <table>
              <thead><tr><th scope="col">Feature</th>{plans.map((plan) => <th scope="col" key={plan.name}>{plan.name}</th>)}</tr></thead>
              <tbody>
                {planComparison.map((row) => (
                  <tr key={row.feature}><th scope="row">{row.feature}</th>{row.tiers.map((included, index) => <td key={plans[index].name} aria-label={`${plans[index].name}: ${included ? "included" : "not included"}`}>{included ? <span className="comparison-included">&#10003;</span> : <span className="comparison-unavailable">&#8212;</span>}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="plans-note">Prices are monthly and displayed for comparison. No payment is collected and no plan access is changed on this page.</p>
        <section className="plans-faq">
          <h2>Before choosing a tier</h2>
          <div><h3>Are subscriptions active in the app?</h3><p>No. These are display-only plan examples. They do not connect integrations, change account permissions, or start a subscription.</p></div>
          <div><h3>Are prices billed monthly?</h3><p>The displayed amounts are monthly figures. Billing is not connected on this page.</p></div>
        </section>
      </section>
    </main>
  );
}

export function AboutPage() {
  return (
    <main className="public-detail-page">
      <PageMeta title="About UniSell" description="Learn how UniSell brings store operations and shipping preparation together." />
      <PageIntro kicker="ABOUT UNISELL" title="Commerce operations, connected." description="UniSell is built to help teams manage the everyday work between a storefront order and a prepared shipment." />
      <section className="about-story">
        <div className="about-story-lead"><span className="about-story-mark" aria-hidden="true">U</span><p>One workspace for the operational details that keep a commerce business moving.</p></div>
        <div className="about-story-copy">
          <h2>Bring the moving parts closer together.</h2>
          <p>Store platforms, product catalogs, inventory, order queues, carrier accounts, and labels each hold a piece of the fulfillment process. UniSell connects those day-to-day tasks in a single workspace.</p>
          <p>Teams can connect supported sales channels, manage product and stock information, review incoming orders, and prepare consignments using the carrier services available to their account.</p>
          <Link className="landing-secondary-cta" to="/features">See what UniSell can do <span aria-hidden="true">&#8594;</span></Link>
        </div>
      </section>
      <section className="about-principles">
        <article><span>01</span><h2>Clear operations</h2><p>Keep products, stock, and orders visible in one place.</p></article>
        <article><span>02</span><h2>Connected workflow</h2><p>Carry the work from a connected store through shipment preparation.</p></article>
        <article><span>03</span><h2>Useful visibility</h2><p>Review sync status, order details, and consignments as work moves.</p></article>
      </section>
      <section className="about-audience">
        <div><span className="section-kicker">WHO IT IS FOR</span><h2>For the people keeping commerce moving.</h2></div>
        <div><p>Store operators can connect supported sales channels and manage product, inventory, and order work from one workspace.</p><p>Fulfillment teams can check order details, prepare consignments, print available labels, and follow dispatch information alongside the order.</p><Link className="landing-secondary-cta" to="/how-it-works">See how the workflow fits together <span aria-hidden="true">&#8594;</span></Link></div>
      </section>
      <section className="about-platform-scope">
        <div><span className="section-kicker">WHAT THE WORKSPACE BRINGS TOGETHER</span><h2>From the first connection to the last handoff.</h2><p>UniSell focuses on the operational path around a commerce order. Each connection is configured for a company, and available actions depend on its setup and the channel or carrier.</p></div>
        <ol>
          <li><span>01</span><div><h3>Sales channels</h3><p>Shopify and Daraz integrations for connected product, order, and inventory work.</p></div></li>
          <li><span>02</span><div><h3>Store operations</h3><p>Product catalog, inventory adjustments, sync status, order review, and dashboard reporting.</p></div></li>
          <li><span>03</span><div><h3>Shipping preparation</h3><p>Carrier account setup, service mapping, consignments, labels, dispatch, and available tracking links.</p></div></li>
        </ol>
      </section>
    </main>
  );
}

export function ContactPage() {
  return (
    <main className="public-detail-page">
      <PageMeta title="Contact UniSell" description="Find the right way to reach UniSell support or get started with a workspace." />
      <PageIntro kicker="CONTACT UNISELL" title="How can we help?" description="Choose the path that fits. Support contact details are configured for each account, so we keep them inside the signed-in workspace." />
      <section className="contact-options">
        <article className="contact-option">
          <span className="section-kicker">EXISTING CUSTOMERS</span>
          <h2>Get account support</h2>
          <p>Sign in to open Help &amp; Support, view the contact details configured for your account, or submit a support request.</p>
          <Link className="landing-primary-cta" to="/signin">Sign in for support <span aria-hidden="true">&#8594;</span></Link>
        </article>
        <article className="contact-option">
          <span className="section-kicker">NEW TO UNISELL</span>
          <h2>Start with a workspace</h2>
          <p>Create an account to set up your company and see the store and carrier connections available to your operation.</p>
          <Link className="landing-primary-cta" to="/signup">Create an account <span aria-hidden="true">&#8594;</span></Link>
        </article>
      </section>
      <section className="contact-guidance">
        <div><span className="section-kicker">GETTING HELP</span><h2>Make your support request easier to investigate.</h2><p>Include the page you were using, the order or product reference if relevant, what you expected to happen, and the error or result you saw.</p></div>
        <div className="contact-security"><h3>Keep credentials private</h3><p>Do not include passwords, API keys, or access tokens in a support request. Your support contact details and request form are available after you sign in.</p></div>
      </section>
      <section className="contact-topic-section" aria-labelledby="contact-topic-title">
        <div><span className="section-kicker">WHAT CAN WE HELP WITH?</span><h2 id="contact-topic-title">Find the closest support topic.</h2><p>Choose the category that best matches the page or task where you need help.</p></div>
        <div className="contact-topic-grid">
          {supportTopics.map((topic) => <article key={topic.title}><h3>{topic.title}</h3><p>{topic.description}</p></article>)}
        </div>
      </section>
      <section className="contact-process">
        <h2>How to open a support request</h2>
        <ol>
          <li><span>1</span><p>Sign in to your UniSell account.</p></li>
          <li><span>2</span><p>Open Help &amp; Support from the workspace.</p></li>
          <li><span>3</span><p>Choose a category, describe what happened, and add relevant references without sharing credentials.</p></li>
        </ol>
      </section>
      <p className="contact-manual">Looking for setup guidance? <a href="/UniSell-User-Manual.html">Read the UniSell user manual</a>.</p>
    </main>
  );
}