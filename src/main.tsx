import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import './index.css';
import { router } from './router';
import { CartProvider } from './state/cart';
import { SiteProvider } from './state/site';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <SiteProvider>
      <CartProvider>
        <RouterProvider router={router} />
      </CartProvider>
    </SiteProvider>
  </StrictMode>,
);
