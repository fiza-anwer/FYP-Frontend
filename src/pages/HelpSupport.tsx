import { useEffect, useMemo, useState, type FormEvent } from "react";
import SelectField from "../components/form/SelectField";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { API_BASE, api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useStoreTour } from "../context/StoreTourContext";

type SupportContext = {
  email: string;
  account_type: string;
  tenant_id: string;
  app_version: string;
  contact: { email: string; phone: string; whatsapp: string; hours: string };
  expected_response: string;
};
type SupportAttachment = { name: string; content_type: string; data: string; size: number };
type SupportTicket = {
  id: string;
  ticket_number: string;
  account_email?: string;
  subject: string;
  category: string;
  priority: string;
  description: string;
  status: "Open" | "In progress" | "Resolved" | string;
  created_at: string;
  updated_at: string;
  attachment: { name: string; content_type: string; size: number } | null;
  replies: Array<{ message: string; author: string; created_at: string }>;
};
type TicketCreated = { ticket_number: string; status: string; email_sent: boolean; support_notified: boolean; support_configured: boolean };

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const categories = ["Account", "Product", "Order", "Integration", "Other"];
const priorities = ["Low", "Normal", "High", "Urgent"];
const faqs = [
  { category: "Getting started", question: "How do I get started?", answer: "Add a company, connect a sales channel under Integrations, then sync your products and orders. See the downloadable user manual for the complete walkthrough." },
  { category: "Products", question: "How do I add or edit a product?", answer: "Open Products. Use Add product to create one, or double-click a product row to edit it. Select checkboxes to edit or delete multiple products." },
  { category: "Orders", question: "How do I sync orders?", answer: "Connect and configure a supported company integration, then use Sync from the dashboard or the relevant orders page. Imported orders appear in Orders." },
  { category: "Integrations", question: "How do I connect an integration?", answer: "Open Company Integrations, choose the company and integration, enter the credentials requested by the form, and save. Keep API credentials private." },
  { category: "Products", question: "Why are products or stock not syncing?", answer: "Check that the integration is connected and its credentials are current. Review product status and SKU, then retry the sync. Include the affected product and time in your support request." },
  { category: "Account & security", question: "How do I reset or change my password?", answer: "Open My profile and enter your current password and a new password. If you cannot sign in, submit an Account support request." },
  { category: "Account & security", question: "How can I secure my account?", answer: "Use a unique, strong password and review active sessions regularly." },
];
const guides = [
  {
    title: "Set up a company and start using UniSell",
    category: "Getting started",
    steps: [
      "Open Setup → Companies and choose Add company. Enter your business name and ship-from address; the address is used as the shipment origin on carrier labels.",
      "Open Setup → Company Integrations and choose Add integration. Select the company and a marketplace, enter credentials or complete the channel authorization, enable the sync features you want, then save.",
      "Open Products to review imported listings or create a product. Check the company, SKU, category, price, variant, and channel selection before saving.",
      "Open Inventory and review Available, Allocated, and Free stock. Use Sync to run the available imports/updates and read the result message for warnings.",
      "Open Orders to review imported orders. Configure courier accounts and carrier services before creating consignments and labels.",
    ],
  },
  {
    title: "Add, edit, publish, and remove products",
    category: "Products",
    steps: [
      "Open Products → Add product. Enter a recognizable product name, unique SKU, category, price, stock quantity, and any description, images, tags, or variants.",
      "Choose the company and target channels. A channel-bound product may require a SKU, category, and channel-specific image/variant requirements.",
      "Save the product. Review the sync status and any warning; a local save does not always mean a marketplace listing was created.",
      "Use search, company/platform/status/category filters, and sorting to locate listings. Select a row to use Edit, Delete, Push to Shopify, or Push to Daraz; double-click a row to edit it.",
      "Use Push only for an available target channel. Review the resulting status and message, and fix missing credentials or required listing data before retrying.",
    ],
  },
  {
    title: "Manage inventory accurately",
    category: "Inventory",
    steps: [
      "Open Inventory. Available (total) is on-hand stock, Allocated (ordered) is reserved for orders, and Free stock is the available remainder.",
      "Search by product, SKU, or variant; filter by company, platform, or category; sort by newest, name, or free-stock level.",
      "Select a product and choose Edit, or double-click its row, to adjust stock. The adjustment updates the local inventory record and syncs to supported connected channels.",
      "Choose Sync to import/update supported channel data. Check the success/error message; a disconnected integration or invalid SKU can prevent a channel update.",
      "Use the out-of-stock view when opened from a stock alert, and choose Show all to clear that focused view.",
    ],
  },
  {
    title: "Review and prepare orders for shipping",
    category: "Orders",
    steps: [
      "Orders are imported from active company integrations with order sync enabled. Open Orders and filter by company or sort by newest/oldest.",
      "Use Include dispatched to show or hide completed dispatches. Select rows to enable order actions; check each order’s address and fulfillment state.",
      "If orders have no company assigned, use the assignment form: choose the company and source, then assign. This makes them available in company filters.",
      "Select one or more eligible orders with a shipping address and choose Create consignment. Orders without addresses are excluded.",
      "Choose the carrier integration and carrier service. Review an available route suggestion, then create the consignment to book shipment labels.",
    ],
  },
  {
    title: "Print labels, dispatch, and track shipments",
    category: "Consignments",
    steps: [
      "Before booking, configure an active carrier integration and at least one carrier service under Setup.",
      "Create consignments from eligible orders. A company ship-from address and customer shipping address are used for the shipment.",
      "Open Consignments to filter by company and sort the list. Select eligible consignments and choose Dispatch to submit them to the courier.",
      "Use Print label to open the courier label. Use Track on a dispatched shipment to follow delivery status.",
      "If booking or dispatch fails, verify the carrier credentials, active status, service mapping, addresses, and carrier response before retrying.",
    ],
  },
  {
    title: "Connect marketplaces and manage sync",
    category: "Integrations",
    steps: [
      "Create a company first. Open Company Integrations → Add integration and select the owning company and channel.",
      "Enter the credentials requested by the integration. For Daraz, complete OAuth and save promptly so the returned token is stored.",
      "Enable the required products, orders, and inventory features, then save and confirm the integration is active.",
      "Use the Products page’s Push actions for eligible listings and Inventory’s Sync action for available imports/updates. Review sync badges and warning messages.",
      "If sync stops, check connection status and credentials, feature selection, SKU/category/image requirements, and whether that channel supports the requested update.",
    ],
  },
  {
    title: "Connect courier accounts and service codes",
    category: "Shipping setup",
    steps: [
      "Open Carrier Integrations → Add carrier integration. Select the courier, enter its API credentials, and activate it.",
      "Open Carrier Integration Services → Add service. Choose the carrier integration and map the service code supplied by the courier.",
      "Return to Orders and create a consignment. The active courier and mapped service should now be available for booking.",
      "Edit credentials or service mappings when the courier changes them; deactivate a carrier if it should no longer be offered.",
    ],
  },
  {
    title: "Update account and protect access",
    category: "Account & security",
    steps: [
      "Open My Profile from the account menu. Update your name, avatar, or email as the available profile fields allow, then save.",
      "Use the password form to change your password. Follow the form’s strength guidance and never reuse a password from another service.",
      "Review active sessions and revoke sessions you do not recognize or no longer use.",
      "Never paste marketplace, carrier, or account passwords into support messages. Share the affected page, item/order reference, time, and error instead.",
    ],
  },
];

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString();
}

function statusClass(status: string) {
  if (status === "Resolved") return "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400";
  if (status === "In progress") return "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400";
  return "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
}

export default function HelpSupport() {
  const { user } = useAuth();
  const { startTour } = useStoreTour();
  const [context, setContext] = useState<SupportContext | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [adminTickets, setAdminTickets] = useState<SupportTicket[]>([]);
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Account");
  const [priority, setPriority] = useState("Normal");
  const [description, setDescription] = useState("");
  const [attachment, setAttachment] = useState<SupportAttachment | null>(null);
  const [website, setWebsite] = useState("");
  const [ticketReply, setTicketReply] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"checking" | "online" | "offline">("checking");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searchFaq, setSearchFaq] = useState("");

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      api<SupportContext>("/api/auth/support/config"),
      api<SupportTicket[]>("/api/auth/support/tickets"),
    ]).then(([contextResult, ticketsResult]) => {
      if (!active) return;
      const errors: string[] = [];
      if (contextResult.status === "fulfilled") {
        setContext(contextResult.value);
        if (contextResult.value.account_type === "Superadmin") {
          api<SupportTicket[]>("/api/auth/support/admin/tickets")
            .then((inbox) => { if (active) setAdminTickets(inbox); })
            .catch((err: unknown) => {
              if (active) setError(err instanceof Error ? err.message : "Could not load support inbox");
            });
        }
      }
      else errors.push(contextResult.reason instanceof Error ? contextResult.reason.message : "Could not load account support information");
      if (ticketsResult.status === "fulfilled") setTickets(ticketsResult.value);
      else errors.push(ticketsResult.reason instanceof Error ? ticketsResult.reason.message : "Could not load support tickets");
      if (errors.length) setError(errors.join(". "));
      setLoading(false);
    });
    fetch(`${API_BASE}/health`)
      .then((response) => {
        if (!response.ok) throw new Error("Status request failed");
        return response.json();
      })
      .then(() => { if (active) setStatus("online"); })
      .catch(() => { if (active) setStatus("offline"); });
    return () => {
      active = false;
    };
  }, []);

  const filteredFaqs = useMemo(() => {
    const term = `${query} ${searchFaq}`.trim().toLowerCase();
    if (!term) return faqs;
    return faqs.filter((faq) => `${faq.category} ${faq.question} ${faq.answer}`.toLowerCase().includes(term));
  }, [query, searchFaq]);

  const filteredGuides = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return guides;
    return guides.filter((guide) => `${guide.title} ${guide.category} ${guide.steps.join(" ")}`.toLowerCase().includes(term));
  }, [query]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setError("");
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp", "application/pdf"].includes(file.type)) {
      setError("Attach a PNG, JPEG, WebP, or PDF file.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("Attachment must be 5 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setError("Could not read the attachment.");
        return;
      }
      setAttachment({
        name: file.name,
        content_type: file.type,
        size: file.size,
        data: reader.result.split(",", 2)[1] || "",
      });
    };
    reader.onerror = () => setError("Could not read the attachment.");
    reader.readAsDataURL(file);
  }

  async function submitTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      const result = await api<TicketCreated>("/api/auth/support/tickets", {
        method: "POST",
        body: JSON.stringify({ subject, category, priority, description, attachment, website }),
      });
      setNotice(
        `Support request ${result.ticket_number} created. ${
          result.email_sent
            ? `A copy was emailed to ${context?.email || "your account email"}.`
            : "The request was saved, but the email copy could not be delivered."
        }${!result.support_notified && !result.support_configured ? " The support mailbox is not configured." : !result.support_notified ? " The support team notification could not be delivered." : ""}`
      );
      setSubject("");
      setDescription("");
      setAttachment(null);
      setWebsite("");
      const latest = await api<SupportTicket[]>("/api/auth/support/tickets");
      setTickets(latest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit support request");
    } finally {
      setSubmitting(false);
    }
  }

  async function replyToTicket(ticketId: string) {
    const message = (ticketReply[ticketId] || "").trim();
    if (!message) return;
    setError("");
    try {
      const result = await api<{ message: string; email_sent: boolean; support_notified: boolean }>(`/api/auth/support/tickets/${ticketId}/replies`, {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      setTicketReply((previous) => ({ ...previous, [ticketId]: "" }));
      setTickets(await api<SupportTicket[]>("/api/auth/support/tickets"));
      setNotice(
        `Your reply was added to the ticket.${result.email_sent ? " A copy was sent to your email." : " The email copy could not be delivered."}${
          result.support_notified ? " Support was notified." : context?.contact.email ? " The support team notification could not be delivered." : " The support mailbox is not configured."
        }`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reply to ticket");
    }
  }

  async function replyAsSupport(ticketId: string) {
    const message = (ticketReply[ticketId] || "").trim();
    if (!message) return;
    setError("");
    try {
      const result = await api<{ email_sent: boolean }>(`/api/auth/support/admin/tickets/${ticketId}/replies`, {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      setTicketReply((previous) => ({ ...previous, [ticketId]: "" }));
      setAdminTickets(await api<SupportTicket[]>("/api/auth/support/admin/tickets"));
      setNotice(result.email_sent ? "Support reply saved and emailed to the customer." : "Support reply was saved, but the customer email could not be delivered.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send support reply");
    }
  }

  async function changeTicketStatus(ticketId: string, nextStatus: string) {
    setError("");
    try {
      const result = await api<{ email_sent: boolean }>(`/api/auth/support/admin/tickets/${ticketId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setAdminTickets(await api<SupportTicket[]>("/api/auth/support/admin/tickets"));
      setNotice(result.email_sent ? `Ticket status updated to ${nextStatus}; the customer was notified.` : `Ticket status updated to ${nextStatus}, but the customer email could not be delivered.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update ticket status");
    }
  }

  async function copyDebugInfo() {
    const info = [
      `App version: ${context?.app_version || "unknown"}`,
      `Browser: ${navigator.userAgent}`,
      `Account type: ${context?.account_type || user?.role || "unknown"}`,
      `Tenant ID: ${context?.tenant_id || "not applicable"}`,
      `Email: ${context?.email || user?.email || "unknown"}`,
      `Current page: ${window.location.href}`,
      `System status: ${status === "online" ? "API reachable" : status === "offline" ? "API unavailable" : "checking"}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(info);
      setNotice("Debug information copied.");
    } catch {
      setError("Couldn't access the clipboard. Select and copy the information below.");
    }
  }

  const debugInfo = [
    `App version: ${context?.app_version || "unknown"}`,
    `Browser: ${typeof navigator === "undefined" ? "unknown" : navigator.userAgent}`,
    `Account type: ${context?.account_type || user?.role || "unknown"}`,
    `Tenant ID: ${context?.tenant_id || "not applicable"}`,
  ].join("\n");

  return (
    <div className="space-y-6">
      <PageMeta title="Help & Support | UniSell" description="Search UniSell help, manage support requests, and download the user manual." />
      <PageBreadcrumb pageTitle="Help & support" />

      <section data-tour="help-center" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Help & support</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Search quick answers, follow a guide, or send a support request. Signed in as{" "}
          <span className="font-medium text-gray-900 dark:text-gray-100">{context?.email || user?.email || "your account"}</span>.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-violet-50 px-4 py-3 dark:bg-violet-950/30">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Getting started</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Walk through setup, products, inventory, orders, and shipping workflows. You can restart this full tour whenever you need it.</p>
          </div>
          <button className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700" type="button" onClick={startTour}>
            Start full system tour
          </button>
        </div>
        <label className="mt-5 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Search help articles
          <input
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            type="search"
            placeholder="Search help articles..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          {["Getting started", "Products", "Inventory", "Orders", "Consignments", "Integrations", "Shipping setup", "Account & security"].map((helpCategory) => (
            <button
              key={helpCategory}
              className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-violet-300 hover:text-violet-700 dark:border-gray-700 dark:text-gray-300"
              type="button"
              onClick={() => setQuery(helpCategory)}
            >
              {helpCategory}
            </button>
          ))}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {filteredGuides.map((guide) => (
            <article className="rounded-xl border border-gray-200 p-4 dark:border-gray-800" key={guide.title}>
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">{guide.category}</p>
              <h2 className="mt-1 font-semibold text-gray-900 dark:text-white">{guide.title}</h2>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-400">
                {guide.steps.map((step) => <li key={step}>{step}</li>)}
              </ol>
            </article>
          ))}
          {!filteredGuides.length && <p className="text-sm text-gray-500">No guides match your search.</p>}
        </div>
        <a
          className="mt-5 inline-flex rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          href="/UniSell-User-Manual.html"
          download
        >
          Download UniSell user manual
        </a>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Submit a support request</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {context?.expected_response
              ? `We usually reply within ${context.expected_response}.`
              : "Reply timing depends on the support team's available hours."}
          </p>
          {context?.email && <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">Request email: {context.email}</p>}
          <form className="mt-4 space-y-4" onSubmit={submitTicket}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Subject
              <input className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-white" maxLength={160} required value={subject} onChange={(event) => setSubject(event.target.value)} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Category
                <SelectField className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-white" value={category} onChange={(event) => setCategory(event.target.value)}>
                  {categories.map((option) => <option key={option}>{option}</option>)}
                </SelectField>
              </label>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Priority
                <SelectField className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-white" value={priority} onChange={(event) => setPriority(event.target.value)}>
                  {priorities.map((option) => <option key={option}>{option}</option>)}
                </SelectField>
              </label>
            </div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
              <textarea className="mt-1 min-h-32 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-white" maxLength={10000} required value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe what happened and what you expected." />
            </label>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Screenshot or file (optional, max 5 MB)
              <input className="mt-1 block w-full text-sm text-gray-600 dark:text-gray-400" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={handleFileChange} />
            </label>
            {attachment && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Attached: {attachment.name} ({(attachment.size / 1024).toFixed(0)} KB)
                <button className="ml-2 text-red-600" type="button" onClick={() => setAttachment(null)}>Remove</button>
              </p>
            )}
            <label className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
              Leave this field empty
              <input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Account type: {context?.account_type || user?.role || "unknown"} · Tenant ID: {context?.tenant_id || "not applicable"}
            </p>
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            {notice && <p className="text-sm text-green-700 dark:text-green-400" role="status">{notice}</p>}
            <button className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60" disabled={submitting || loading} type="submit">
              {submitting ? "Submitting..." : "Submit request"}
            </button>
          </form>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">My tickets</h2>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${status === "online" ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400" : status === "offline" ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400" : "bg-gray-100 text-gray-600"}`}>
                {status === "online" ? "API reachable" : status === "offline" ? "API unavailable" : "Checking status"}
              </span>
            </div>
            {tickets.length ? (
              <div className="mt-4 space-y-4">
                {tickets.map((ticket) => (
                  <article className="rounded-xl border border-gray-200 p-4 dark:border-gray-800" key={ticket.id}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-violet-600 dark:text-violet-400">{ticket.ticket_number} · {ticket.category}</p>
                        <h3 className="mt-1 font-medium text-gray-900 dark:text-white">{ticket.subject}</h3>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(ticket.status)}`}>{ticket.status}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400">{ticket.description}</p>
                    {ticket.attachment && <p className="mt-2 text-xs text-gray-500">Attachment: {ticket.attachment.name}</p>}
                    <p className="mt-2 text-xs text-gray-500">Submitted {formatDate(ticket.created_at)}</p>
                    {ticket.replies.map((reply, index) => (
                      <div className="mt-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60" key={`${ticket.id}-${index}`}>
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{reply.author} · {formatDate(reply.created_at)}</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400">{reply.message}</p>
                      </div>
                    ))}
                    {ticket.status !== "Resolved" && (
                      <div className="mt-3 space-y-2">
                        <textarea className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white" maxLength={5000} placeholder="Reply to this request..." value={ticketReply[ticket.id] || ""} onChange={(event) => setTicketReply((previous) => ({ ...previous, [ticket.id]: event.target.value }))} />
                        <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200" type="button" onClick={() => replyToTicket(ticket.id)}>Send reply</button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{loading ? "Loading tickets..." : "You haven't submitted any support requests yet."}</p>
            )}
          </section>

          {context?.account_type === "Superadmin" && (
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Support inbox</h2>
              {adminTickets.length ? (
                <div className="mt-4 space-y-4">
                  {adminTickets.map((ticket) => (
                    <article className="rounded-xl border border-gray-200 p-4 dark:border-gray-800" key={ticket.id}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-violet-600 dark:text-violet-400">{ticket.ticket_number} · {ticket.account_email} · {ticket.category} · {ticket.priority}</p>
                          <h3 className="mt-1 font-medium text-gray-900 dark:text-white">{ticket.subject}</h3>
                        </div>
                        <SelectField
                          aria-label={`Status for ${ticket.ticket_number}`}
                          className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                          value={ticket.status}
                          onChange={(event) => changeTicketStatus(ticket.id, event.target.value)}
                        >
                          {["Open", "In progress", "Resolved"].map((option) => <option key={option}>{option}</option>)}
                        </SelectField>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400">{ticket.description}</p>
                      {ticket.replies.map((reply, index) => (
                        <div className="mt-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60" key={`${ticket.id}-${index}`}>
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{reply.author} · {formatDate(reply.created_at)}</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400">{reply.message}</p>
                        </div>
                      ))}
                      <div className="mt-3 space-y-2">
                        <textarea
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                          maxLength={5000}
                          placeholder="Reply to this customer..."
                          value={ticketReply[ticket.id] || ""}
                          onChange={(event) => setTicketReply((previous) => ({ ...previous, [ticket.id]: event.target.value }))}
                        />
                        <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200" type="button" onClick={() => replyAsSupport(ticket.id)}>Send response</button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">No support requests to display.</p>
              )}
            </section>
          )}

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Direct contact</h2>
            {context?.contact.email && <p className="mt-3 text-sm"><a className="text-violet-600 hover:underline dark:text-violet-400" href={`mailto:${context.contact.email}`}>{context.contact.email}</a></p>}
            {context?.contact.phone && <p className="mt-2 text-sm"><a className="text-violet-600 hover:underline dark:text-violet-400" href={`tel:${context.contact.phone}`}>{context.contact.phone}</a></p>}
            {context?.contact.whatsapp && <p className="mt-2 text-sm"><a className="text-violet-600 hover:underline dark:text-violet-400" href={`https://wa.me/${context.contact.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">Contact on WhatsApp</a></p>}
            {context?.contact.hours && <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">Support hours: {context.contact.hours}</p>}
            {!context?.contact.email && !context?.contact.phone && !context?.contact.whatsapp && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">No direct support contact has been configured. Submit a request above to create a ticket.</p>
            )}
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Signed in as {context?.email || user?.email || "unknown"}</p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Account type: {context?.account_type || user?.role || "unknown"} · Tenant ID: {context?.tenant_id || "not applicable"}</p>
            <button className="mt-4 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/5" type="button" onClick={copyDebugInfo}>
              Copy debug info
            </button>
            <textarea className="mt-3 block w-full rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400" aria-label="Debug information" readOnly rows={4} value={debugInfo} />
          </section>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">FAQ / Quick answers</h2>
          <input className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white" type="search" aria-label="Search FAQs" placeholder="Search quick answers..." value={searchFaq} onChange={(event) => setSearchFaq(event.target.value)} />
        </div>
        <div className="mt-4 divide-y divide-gray-100 dark:divide-gray-800">
          {filteredFaqs.map((faq) => (
            <details className="py-3" key={faq.question}>
              <summary className="cursor-pointer font-medium text-gray-800 dark:text-gray-200">{faq.question}<span className="ml-2 text-xs font-normal text-violet-600 dark:text-violet-400">{faq.category}</span></summary>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{faq.answer}</p>
            </details>
          ))}
          {!filteredFaqs.length && <p className="py-4 text-sm text-gray-500">No quick answers match your search.</p>}
        </div>
      </section>
    </div>
  );
}
