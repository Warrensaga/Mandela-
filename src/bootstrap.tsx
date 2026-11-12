import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './router';
import { CartProvider } from './state/cart';
import { SavedProvider } from './state/saved';
import { SiteProvider } from './state/site';

export function mount(root: HTMLElement) {
  createRoot(root).render(
    <StrictMode>
      <SiteProvider>
        <CartProvider>
          <SavedProvider>
            <RouterProvider router={router} />
          </SavedProvider>
        </CartProvider>
      </SiteProvider>
    </StrictMode>,
  );
}
