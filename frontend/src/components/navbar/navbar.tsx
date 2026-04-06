import React, { useState, useEffect, useRef } from 'react';
import './Navbar.css';

// ── Replace these with your actual image imports ──────────────────────────
import lensIcon from '../../assets/images/lens_analytics_icon.png';
import socialIcon from '../../assets/images/social_media_icon.png';
import compIcon from '../../assets/images/competitor_icon.png'

// ── Types ─────────────────────────────────────────────────────────────────

interface NavLink {
  icon: string;
  label: string;
  href: string;
}

interface NavItem {
  id: string;
  title: string;
  iconSrc: string; // image path  –or–  swap for a React SVG component
  links: NavLink[];
}

// ── Constants ─────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  {
    id: 'lens',
    title: 'Lens Analytics',
    iconSrc: lensIcon, // ← update path
    links: [
      { icon: 'O', label: 'Overview', href: '/LensAnalytics/Overview' },
      { icon: 'F', label: 'Feedback', href: '/LensAnalytics/Feedback' },
    ],
  },
  {
    id: 'social',
    title: 'Social Media',
    iconSrc: socialIcon,   // ← update path
    links: [
      { icon: 'D', label: 'Dashboard', href: '/social_media' },
    ],
  },
    {
    id: 'competitors',
    title: 'Competitors',
    iconSrc: compIcon,   // ← update path
    links: [
      { icon: 'P', label: 'Plans', href: '/competitors-plan' },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────

const Navbar: React.FC = () => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isExpanded,   setIsExpanded]   = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  const expanded = isExpanded || isMobileOpen;

  // Toggle dropdown — only when sidebar is expanded
  const toggleDropdown = (id: string) => {
    if (!expanded) return;
    setOpenDropdown(prev => (prev === id ? null : id));
  };

  const handleNavigation = (href: string) => {
    window.location.href = href;
    setOpenDropdown(null);
    setIsMobileOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
        if (window.innerWidth <= 768) setIsMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsMobileOpen(false); setOpenDropdown(null); }
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, []);

  // Close dropdowns when sidebar collapses
  useEffect(() => {
    if (!expanded) setOpenDropdown(null);
  }, [expanded]);

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`nb-overlay ${isMobileOpen ? 'show' : ''}`}
        onClick={() => setIsMobileOpen(false)}
      />

      {/* Mobile hamburger button */}
      <button
        className="nb-mobile-btn"
        onClick={() => setIsMobileOpen(v => !v)}
        aria-label="Toggle navigation"
      >
        {isMobileOpen ? '✕' : '☰'}
      </button>

      {/* Sidebar */}
      <nav
        ref={navRef}
        className={`nb-nav ${expanded ? 'expanded' : ''}`}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        aria-label="Main navigation"
      >
        <div className="nb-menu">
          {NAV_ITEMS.map(item => {
            const isOpen = openDropdown === item.id;

            return (
              <div key={item.id}>

                {/* Nav row button */}
                <button
                  className={`nb-btn ${isOpen ? 'open' : ''}`}
                  onClick={() => toggleDropdown(item.id)}
                  aria-expanded={isOpen}
                  aria-controls={`${item.id}-dropdown`}
                >
                  {/* Icon circle — always fully visible */}
                  <div className="nb-icon">
                    <img
                      src={item.iconSrc}
                      alt={item.title}
                      width={24}
                      height={24}
                      loading="lazy"
                    />
                  </div>

                  {/* Title — fades + slides in on expand */}
                  <span className="nb-title">{item.title}</span>

                  {/* Arrow — fades in on expand, rotates when open */}
                  <span className="nb-arrow" aria-hidden="true">›</span>
                </button>

                {/* Dropdown links */}
                <div
                  id={`${item.id}-dropdown`}
                  className={`nb-dropdown ${isOpen ? 'open' : ''}`}
                  role="menu"
                  aria-label={`${item.title} submenu`}
                >
                  {item.links.map(link => (
                    <a
                      key={link.label}
                      className="nb-link"
                      href={link.href}
                      role="menuitem"
                      onClick={e => { e.preventDefault(); handleNavigation(link.href); }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleNavigation(link.href);
                        }
                      }}
                    >
                      <div className="nb-link-icon" aria-hidden="true">{link.icon}</div>
                      <span>{link.label}</span>
                    </a>
                  ))}
                </div>

              </div>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default Navbar;