import { ButtonLink } from '../components/ui/Button';
import { Seo } from '../components/ui/Seo';

export default function NotFoundPage() {
  return (
    <div className="container-page max-w-xl py-24 text-center">
      <Seo title="Page not found" noindex />
      <p className="eyebrow">404</p>
      <h1 className="mt-2 text-4xl sm:text-5xl">We could not find that page</h1>
      <p className="mt-3 text-muted">It may have moved, or the product may no longer be available.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink to="/shop">Browse the shop</ButtonLink>
        <ButtonLink to="/" variant="outline">
          Go home
        </ButtonLink>
      </div>
    </div>
  );
}
