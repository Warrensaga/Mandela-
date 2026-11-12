import { NavLink, useParams } from 'react-router';
import { PageBand } from '../components/layout/PageBand';
import { chipClass, ShopView } from '../components/shop/ShopView';
import { Seo } from '../components/ui/Seo';
import { Skeleton } from '../components/ui/Skeleton';
import type { CategoryNode } from '../lib/api';
import { useSite } from '../state/site';
import NotFoundPage from './NotFoundPage';

export default function CategoryPage() {
  const { slug = '' } = useParams();
  const { findCategory, ready } = useSite();
  const found = findCategory(slug);

  if (!ready) {
    return (
      <div className="theme-dark">
        <div className="container-page py-14">
          <Skeleton className="h-14 w-72 rounded-none" />
        </div>
      </div>
    );
  }
  if (!found) return <NotFoundPage />;

  const { category, parent } = found;
  // With no parent, the category itself is a top-level node (it carries its children).
  const top: CategoryNode = parent ?? (category as CategoryNode);

  const chips = top.children.length ? (
    <>
      <NavLink to={`/category/${top.slug}`} end className={({ isActive }) => chipClass(isActive)}>
        All {top.name}
      </NavLink>
      {top.children.map((c) => (
        <NavLink key={c.id} to={`/category/${c.slug}`} className={({ isActive }) => chipClass(isActive)}>
          {c.name}
        </NavLink>
      ))}
    </>
  ) : (
    <span className={chipClass(true)}>{top.name}</span>
  );

  return (
    <div className="theme-dark">
      <Seo
        title={category.name}
        description={category.description ?? `Shop ${category.name.toLowerCase()} at Mandela Heritage Furniture. Delivered across Kenya.`}
        image={category.imageUrl}
      />
      <PageBand
        eyebrow={parent ? parent.name : 'Collection'}
        title={category.name}
        description={category.description}
        crumbs={[
          { to: '/', label: 'Home' },
          { to: '/categories', label: 'Collections' },
          ...(parent ? [{ to: `/category/${parent.slug}`, label: parent.name }] : []),
          { label: category.name },
        ]}
      />
      <div className="container-page pb-16">
        <ShopView key={category.slug} categorySlug={category.slug} chips={chips} />
      </div>
    </div>
  );
}
