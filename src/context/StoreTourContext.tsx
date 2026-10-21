import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth, type AuthUser } from "./AuthContext";

type TourStep = {
  path: string;
  target: string;
  mobileTarget?: string;
  title: string;
  body: string;
};

type PageTour = "products" | "integrations";
type ActiveTour = { kind: "store" | PageTour; steps: TourStep[] };
type StoreTourContextValue = {
  startTour: () => void;
  startPageTour: (page: PageTour) => void;
};
type TargetRect = { top: number; left: number; right: number; bottom: number; width: number; height: number };

const StoreTourContext = createContext<StoreTourContextValue | null>(null);
const STORAGE_PREFIX = "unisell:onboarding";

export function onboardingStorageKey(user: AuthUser | null) {
  const identity = user?.tenant_name || user?.email || user?.username || "account";
  return `${STORAGE_PREFIX}:${identity.toLowerCase()}`;
}

const storeSteps: TourStep[] = [
  {
    path: "/",
    target: "[data-tour='sidebar-navigation']",
    mobileTarget: "[data-tour='mobile-sidebar-toggle']",
    title: "Find your way around",
    body: "Use the sidebar to move between your dashboard, orders, products, inventory, and store setup.",
  },
  {
    path: "/",
    target: "[data-tour='dashboard-overview']",
    title: "Your store at a glance",
    body: "Review sales, order activity, catalog size, and products that may need attention.",
  },
  {
    path: "/products",
    target: "[data-tour='products-add']",
    title: "Build your catalog",
    body: "Add products here, then manage listings and select rows for bulk actions.",
  },
  {
    path: "/orders",
    target: "[data-tour='orders-overview']",
    title: "Manage orders",
    body: "Review imported orders and follow their fulfillment status from this page.",
  },
  {
    path: "/company-integrations",
    target: "[data-tour='integrations-add']",
    title: "Connect a sales channel",
    body: "Add an integration to sync supported products, inventory, and orders.",
  },
  {
    path: "/",
    target: "[data-tour='profile-menu']",
    title: "Account and preferences",
    body: "Use the top-right menu for account settings, help, and sign out; theme controls are beside it.",
  },
  {
    path: "/help-support",
    target: "[data-tour='help-center']",
    title: "Help whenever you need it",
    body: "Search guides, contact support, and replay this tour from the Help & support page.",
  },
];

const pageSteps: Record<PageTour, TourStep[]> = {
  products: [
    {
      path: "/products",
      target: "[data-tour='products-add']",
      title: "Add a product",
      body: "Create a catalog listing here. Add a title, SKU, price, and any variants you need.",
    },
    {
      path: "/products",
      target: "[data-tour='products-list'], [data-tour-form='products-list']",
      title: "Manage your catalog",
      body: "Search and filter listings, double-click a row to edit, or select rows for bulk actions.",
    },
  ],
  integrations: [
    {
      path: "/company-integrations",
      target: "[data-tour='integrations-add']",
      title: "Connect a channel",
      body: "Choose Add integration to link a sales channel to one of your companies.",
    },
    {
      path: "/company-integrations",
      target: "[data-tour='integrations-list'], [data-tour-form='integrations-list']",
      title: "Review connections",
      body: "Check connection status here and edit or remove integrations when needed.",
    },
  ],
};

function toRect(element: Element): TargetRect {
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

function TourExperience({
  activeTour,
  stepIndex,
  welcomeOpen,
  dismissWelcome,
  beginStoreTour,
  closeTour,
  goToStep,
}: {
  activeTour: ActiveTour | null;
  stepIndex: number;
  welcomeOpen: boolean;
  dismissWelcome: () => void;
  beginStoreTour: () => void;
  closeTour: () => void;
  goToStep: (index: number) => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [targetMissing, setTargetMissing] = useState(false);
  const [complete, setComplete] = useState(false);
  const [completionKind, setCompletionKind] = useState<ActiveTour["kind"] | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const step = activeTour?.steps[stepIndex] || null;

  useEffect(() => {
    if (!welcomeOpen && !activeTour && !complete) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const getFocusable = () => dialog?.querySelectorAll<HTMLElement>(
      "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
    ) || [];
    getFocusable()[0]?.focus();
    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleTab);
    return () => {
      window.removeEventListener("keydown", handleTab);
      previouslyFocused?.focus();
    };
  }, [activeTour, complete, stepIndex, welcomeOpen]);

  useEffect(() => {
    if (!step || location.pathname === step.path) return;
    navigate(step.path);
  }, [location.pathname, navigate, step]);

  useEffect(() => {
    if (!step) {
      setTargetRect(null);
      setTargetMissing(false);
      return;
    }
    const targetSelector = window.innerWidth < 1024 && step.mobileTarget ? step.mobileTarget : step.target;
    let frame = 0;
    let observer: ResizeObserver | undefined;
    let target: Element | null = null;
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      setTargetMissing(true);
      cancelled = true;
      window.cancelAnimationFrame(frame);
    }, 5000);
    setTargetRect(null);
    setTargetMissing(false);

    const updatePosition = () => {
      if (target) setTargetRect(toRect(target));
    };
    const findTarget = () => {
      if (cancelled) return;
      target = document.querySelector(targetSelector);
      if (target) {
        window.clearTimeout(timeout);
        target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
        frame = window.requestAnimationFrame(() => {
          if (cancelled || !target) return;
          updatePosition();
          observer = new ResizeObserver(updatePosition);
          observer.observe(target);
          window.addEventListener("resize", updatePosition);
          window.addEventListener("scroll", updatePosition, true);
        });
        return;
      }
      frame = window.requestAnimationFrame(findTarget);
    };

    frame = window.requestAnimationFrame(findTarget);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      observer?.disconnect();
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [step]);

  useEffect(() => {
    if (!activeTour) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeTour();
      if (event.key === "ArrowRight" && stepIndex < activeTour.steps.length - 1) goToStep(stepIndex + 1);
      if (event.key === "ArrowLeft" && stepIndex > 0) goToStep(stepIndex - 1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTour, closeTour, goToStep, stepIndex]);

  useEffect(() => {
    if (!complete) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setComplete(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [complete]);

  const next = () => {
    if (!activeTour) return;
    if (stepIndex < activeTour.steps.length - 1) goToStep(stepIndex + 1);
    else {
      setCompletionKind(activeTour.kind);
      closeTour();
      setComplete(true);
    }
  };

  const rect = targetRect;
  const tooltipWidth = Math.min(360, window.innerWidth - 32);
  const tooltipLeft = rect
    ? rect.width < tooltipWidth && rect.right + tooltipWidth + 16 > window.innerWidth
      ? Math.max(16, rect.left - tooltipWidth - 16)
      : Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, rect.right + 16))
    : Math.max(16, (window.innerWidth - tooltipWidth) / 2);
  const tooltipTop = rect
    ? rect.height < 240
      ? rect.bottom + 232 < window.innerHeight
        ? rect.bottom + 12
        : Math.max(16, rect.top - 220)
      : Math.max(16, Math.min(window.innerHeight - 220, rect.top + Math.min(rect.height / 2, 120) - 80))
    : Math.max(16, (window.innerHeight - 200) / 2);

  if (welcomeOpen) {
    const name = user?.name || user?.tenant_name || "there";
    return (
      <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-slate-950/60 p-4" role="presentation">
        <section
          aria-labelledby="store-tour-welcome-title"
          aria-modal="true"
          ref={dialogRef}
          className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900"
          role="dialog"
        >
          <p className="text-sm font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">Welcome to UniSell</p>
          <h2 id="store-tour-welcome-title" className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">Welcome, {name}!</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">Would you like a quick 2-minute tour of your store tools?</p>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5" type="button" onClick={dismissWelcome}>Skip for now</button>
            <button className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700" type="button" onClick={beginStoreTour}>Start tour</button>
          </div>
        </section>
      </div>
    );
  }

  if (activeTour && step) {
    const left = rect ? Math.max(16, Math.min(tooltipLeft, window.innerWidth - tooltipWidth - 16)) : tooltipLeft;
    const top = rect ? Math.max(16, Math.min(tooltipTop, window.innerHeight - 220)) : tooltipTop;
    const panels = rect
      ? [
          { top: 0, left: 0, width: "100vw", height: Math.max(0, rect.top - 8) },
          { top: rect.bottom + 8, left: 0, width: "100vw", height: Math.max(0, window.innerHeight - rect.bottom - 8) },
          { top: Math.max(0, rect.top - 8), left: 0, width: Math.max(0, rect.left - 8), height: rect.height + 16 },
          { top: Math.max(0, rect.top - 8), left: rect.right + 8, width: Math.max(0, window.innerWidth - rect.right - 8), height: rect.height + 16 },
        ]
      : [{ top: 0, left: 0, width: "100vw", height: "100vh" }];

    return (
      <>
        {panels.map((panel, index) => (
          <div
            aria-hidden="true"
            className="fixed z-[100000] bg-slate-950/65"
            key={index}
            style={{ top: panel.top, left: panel.left, width: panel.width, height: panel.height }}
          />
        ))}
        {rect && (
          <div
            aria-hidden="true"
            className="pointer-events-none fixed z-[100001] rounded-xl border-2 border-violet-400 shadow-[0_0_0_4px_rgba(139,92,246,0.2)]"
            style={{ top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8 }}
          />
        )}
        <section
          aria-label="Store tour"
          aria-modal="true"
          ref={dialogRef}
          className="fixed z-[100002] w-[calc(100vw-32px)] rounded-2xl border border-violet-100 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
          role="dialog"
          aria-labelledby="store-tour-step-title"
          style={{ maxWidth: tooltipWidth, left, top }}
        >
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              {stepIndex + 1} of {activeTour.steps.length}
            </p>
            <button className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white" type="button" onClick={closeTour}>Skip tour</button>
          </div>
          <h2 id="store-tour-step-title" className="mt-2 text-lg font-bold text-gray-900 dark:text-white">{targetMissing ? "This area is not available" : step.title}</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
            {targetMissing ? "You can continue the tour or skip it. This page element could not be found." : step.body}
          </p>
          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
              disabled={stepIndex === 0}
              type="button"
              onClick={() => goToStep(stepIndex - 1)}
            >
              Back
            </button>
            <button className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700" type="button" onClick={next}>
              {stepIndex === activeTour.steps.length - 1 ? "Finish tour" : "Next"}
            </button>
          </div>
        </section>
      </>
    );
  }

  if (complete) {
    return (
      <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-slate-950/60 p-4" role="presentation">
        <section ref={dialogRef} aria-labelledby="store-tour-complete-title" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900" role="dialog">
          <h2 id="store-tour-complete-title" className="text-xl font-bold text-gray-900 dark:text-white">
            {completionKind === "store" ? "You’re ready to get started" : completionKind === "products" ? "You know your way around Products" : "You’re ready to connect a channel"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
            {completionKind === "store"
              ? "Add your first product to begin building your store catalog."
              : completionKind === "products"
                ? "Use the product list to add, find, and manage your catalog."
                : "Connect a sales channel to sync supported store data."}
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5" type="button" onClick={() => setComplete(false)}>Done</button>
            <button
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
              type="button"
              onClick={() => {
                setComplete(false);
                navigate(completionKind === "integrations" ? "/company-integrations" : "/products");
              }}
            >
              {completionKind === "store" ? "Add your first product" : completionKind === "integrations" ? "Go to integrations" : "Go to Products"}
            </button>
          </div>
        </section>
      </div>
    );
  }
  return null;
}

export function StoreTourProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [activeTour, setActiveTour] = useState<ActiveTour | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const storageKey = onboardingStorageKey(user);
  const isTenant = user?.role === "tenant";

  useEffect(() => {
    if (!user || !isTenant) return;
    setWelcomeOpen(localStorage.getItem(storageKey) !== "seen");
  }, [isTenant, storageKey, user]);

  const markSeen = useCallback(() => {
    localStorage.setItem(storageKey, "seen");
    setWelcomeOpen(false);
  }, [storageKey]);

  const startSteps = useCallback((kind: ActiveTour["kind"], steps: TourStep[]) => {
    markSeen();
    setActiveTour({ kind, steps });
    setStepIndex(0);
  }, [markSeen]);

  const startTour = useCallback(() => startSteps("store", storeSteps), [startSteps]);
  const startPageTour = useCallback((page: PageTour) => startSteps(page, pageSteps[page]), [startSteps]);
  const closeTour = useCallback(() => setActiveTour(null), []);
  const goToStep = useCallback((index: number) => {
    setStepIndex(index);
    const step = activeTour?.steps[index];
    if (step && location.pathname !== step.path) navigate(step.path);
  }, [activeTour, location.pathname, navigate]);
  const dismissWelcome = useCallback(() => {
    markSeen();
    setActiveTour(null);
  }, [markSeen]);

  const contextValue = useMemo(() => ({ startTour, startPageTour }), [startPageTour, startTour]);
  return (
    <StoreTourContext.Provider value={contextValue}>
      {children}
      <TourExperience
        activeTour={activeTour}
        stepIndex={stepIndex}
        welcomeOpen={welcomeOpen}
        dismissWelcome={dismissWelcome}
        beginStoreTour={startTour}
        closeTour={closeTour}
        goToStep={goToStep}
      />
    </StoreTourContext.Provider>
  );
}

export function useStoreTour() {
  const context = useContext(StoreTourContext);
  if (!context) throw new Error("useStoreTour must be used within a StoreTourProvider");
  return context;
}
