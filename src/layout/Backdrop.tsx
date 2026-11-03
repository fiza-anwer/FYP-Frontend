import { useSidebar } from "../context/SidebarContext";

const Backdrop: React.FC = () => {
  const { isMobileOpen, closeMobileSidebar } = useSidebar();

  if (!isMobileOpen) return null;

  return (
    <button
      type="button"
      className="fixed inset-x-0 bottom-0 top-[76px] z-40 cursor-default bg-gray-950/75 lg:hidden"
      aria-label="Close navigation"
      onClick={closeMobileSidebar}
    />
  );
};

export default Backdrop;
