import { useState } from 'react';
import { Link } from 'react-router';
import { useSite } from '../../state/site';
import { Drawer } from '../ui/Drawer';
import { SocialLinks } from './SocialLinks';
import { Icon } from '../ui/Icon';

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

/** Mobile navigation with collapsible categories. */
export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const { categories } = useSite();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <Drawer open={open} onClose={onClose} title="Menu" side="left">
      <nav aria-label="Mobile">
        <ul className="space-y-1">
          {[
            { to: '/shop', label: 'Shop all' },
            { to: '/shop?offers=1', label: 'Offers' },
            { to: '/categories', label: 'All collections' },
            { to: '/contact', label: 'Contact' },
          ].map((l) => (
            <li key={l.to}>
              <Link to={l.to} onClick={onClose} className="label-mono block py-2.5 text-navy-800 hover:text-brand-600">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <p className="eyebrow mt-6 mb-2">Categories</p>
        <ul className="divide-y divide-paper-200 border-y border-paper-200">
          {categories.map((cat) => {
            const isOpen = expanded === cat.id;
            const panelId = `mobile-cat-${cat.id}`;
            return (
              <li key={cat.id}>
                <div className="flex items-center">
                  <Link to={`/category/${cat.slug}`} onClick={onClose} className="flex-1 py-3 text-base text-navy-800">
                    {cat.name}
                  </Link>
                  {cat.children.length > 0 && (
                    <button
                      type="button"
                      className="rounded-full p-2 text-navy-800 hover:bg-navy-50"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      aria-label={`${isOpen ? 'Hide' : 'Show'} ${cat.name} sub-categories`}
                      onClick={() => setExpanded(isOpen ? null : cat.id)}
                    >
                      <Icon name="chevronDown" className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>
                {cat.children.length > 0 && (
                  <ul id={panelId} hidden={!isOpen} className="pb-3 pl-4">
                    {cat.children.map((child) => (
                      <li key={child.id}>
                        <Link to={`/category/${child.slug}`} onClick={onClose} className="block py-2 text-sm text-muted">
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
        <ul className="mt-6 space-y-1 text-base">
          <li>
            <Link to="/custom-request" onClick={onClose} className="block py-2 text-navy-800">
              Request a custom piece
            </Link>
          </li>
          <li>
            <Link to="/track-order" onClick={onClose} className="block py-2 text-navy-800">
              Track your order
            </Link>
          </li>
          <li>
            <Link to="/cart" onClick={onClose} className="block py-2 text-navy-800">
              Cart
            </Link>
          </li>
          <li>
            <Link to="/contact" onClick={onClose} className="block py-2 text-navy-800">
              Contact us
            </Link>
          </li>
        </ul>
        <p className="label-mono mt-6 text-muted">Follow us</p>
        <SocialLinks className="mt-3" />
      </nav>
    </Drawer>
  );
}
