import {
  Activity,
  BarChart3,
  ChevronRight,
  Dumbbell,
  Home,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";

import "./Sidebar.css";

interface SidebarProps {
  onLogout?: () => void;
}

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const mainLinks: SidebarItem[] = [
  {
    label: "Dashboard",
    href: "/app",
    icon: <Home size={18} />,
  },
  {
    label: "Habits",
    href: "/app/habits",
    icon: <Dumbbell size={18} />,
  },
  {
    label: "Activity",
    href: "/app/activity",
    icon: <Activity size={18} />,
  },
  {
    label: "Progress",
    href: "/app/progress",
    icon: <BarChart3 size={18} />,
  },
];

const secondaryLinks: SidebarItem[] = [
  {
    label: "Catalog",
    href: "/app/habits/catalog",
    icon: <Sparkles size={18} />,
  },
  {
    label: "Settings",
    href: "/app/settings",
    icon: <Settings size={18} />,
  },
];

function SidebarLink({
  link,
  expanded,
  onNavigate,
}: {
  link: SidebarItem;
  expanded: boolean;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={link.href}
      end={link.href === "/app"}
      onClick={onNavigate}
      className={({ isActive }) =>
        `sidebar-link ${isActive ? "sidebar-link-active" : ""}`
      }
    >
      <span className="sidebar-link-icon">
        {link.icon}
      </span>

      <span
        className={`sidebar-link-label ${
          expanded ? "sidebar-link-label-visible" : ""
        }`}
      >
        {link.label}
      </span>
    </NavLink>
  );
}

export default function Sidebar({ onLogout }: SidebarProps) {
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => {
    setMobileOpen(false);
  };

  return (
    <>
      {/* Desktop */}
      <aside
        className={`sidebar sidebar-desktop ${
          expanded ? "sidebar-expanded" : "sidebar-collapsed"
        }`}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        <div className="sidebar-inner">
          {/* Brand */}
          <div className="sidebar-brand">
            <img
              src="/happit%20logo.png"
              alt="Happit"
              className="sidebar-brand-mark"
            />

            <span
              className={`sidebar-brand-name ${
                expanded ? "sidebar-brand-name-visible" : ""
              }`}
            >
              Happit
            </span>
          </div>

          {/* Navigation */}
          <nav className="sidebar-nav" aria-label="Main navigation">
            <div className="sidebar-nav-group">
              {mainLinks.map((link) => (
                <SidebarLink
                  key={link.href}
                  link={link}
                  expanded={expanded}
                />
              ))}
            </div>

            <div className="sidebar-divider" />

            <div className="sidebar-nav-group">
              {secondaryLinks.map((link) => (
                <SidebarLink
                  key={link.href}
                  link={link}
                  expanded={expanded}
                />
              ))}
            </div>
          </nav>

          {/* Bottom */}
          <div className="sidebar-bottom">
            <button
              type="button"
              className="sidebar-link sidebar-logout"
              onClick={onLogout}
            >
              <span className="sidebar-link-icon">
                <LogOut size={18} />
              </span>

              <span
                className={`sidebar-link-label ${
                  expanded ? "sidebar-link-label-visible" : ""
                }`}
              >
                Log out
              </span>
            </button>

            <div className="sidebar-profile">
              <div className="sidebar-avatar">
                S
              </div>

              <div
                className={`sidebar-profile-info ${
                  expanded ? "sidebar-profile-info-visible" : ""
                }`}
              >
                <span className="sidebar-profile-name">
                  Account
                </span>

                <span className="sidebar-profile-status">
                  Personal
                </span>
              </div>

              {expanded && (
                <ChevronRight
                  size={16}
                  className="sidebar-profile-chevron"
                />
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile */}
      <div className="mobile-sidebar">
        <button
          type="button"
          className="mobile-sidebar-trigger"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
          aria-expanded={mobileOpen}
        >
          <Menu size={21} />
        </button>

        {mobileOpen && (
          <div className="mobile-sidebar-overlay">
            <aside className="mobile-sidebar-panel">
              <div className="mobile-sidebar-header">
                <div className="sidebar-brand">
                  <img
                    src="/happit%20logo.png"
                    alt="Happit"
                    className="sidebar-brand-mark"
                  />

                  <span className="sidebar-brand-name-visible">
                    Happit
                  </span>
                </div>

                <button
                  type="button"
                  className="mobile-sidebar-close"
                  onClick={closeMobile}
                  aria-label="Close navigation"
                >
                  <X size={21} />
                </button>
              </div>

              <nav
                className="sidebar-nav mobile-sidebar-nav"
                aria-label="Mobile navigation"
              >
                <div className="sidebar-nav-group">
                  {mainLinks.map((link) => (
                    <SidebarLink
                      key={link.href}
                      link={link}
                      expanded
                      onNavigate={closeMobile}
                    />
                  ))}
                </div>

                <div className="sidebar-divider" />

                <div className="sidebar-nav-group">
                  {secondaryLinks.map((link) => (
                    <SidebarLink
                      key={link.href}
                      link={link}
                      expanded
                      onNavigate={closeMobile}
                    />
                  ))}
                </div>
              </nav>

              <div className="sidebar-bottom">
                <button
                  type="button"
                  className="sidebar-link sidebar-logout"
                  onClick={() => {
                    closeMobile();
                    onLogout?.();
                  }}
                >
                  <span className="sidebar-link-icon">
                    <LogOut size={18} />
                  </span>

                  <span className="sidebar-link-label-visible">
                    Log out
                  </span>
                </button>
              </div>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}