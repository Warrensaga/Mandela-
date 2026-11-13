import { NavLink, useParams } from 'react-router';
import { PageBand } from '../components/layout/PageBand';
import { chipClass, ShopView } from '../components/shop/ShopView';
import { Seo } from '../components/ui/Seo';
import { Skeleton } from '../components/ui/Skeleton';
import { CategoryIntro } from '../components/shop/CategoryIntro';
import { useAsync } from '../hooks/useAsync';
import { fetchCatalog } from '../lib/api';
import { categoryDescription, categoryKeywords, priceFacts } from '../lib/seoKeywords';
import type { CategoryNode } from '../lib/api';
import { useSite } from '../state/site';
import NotFoundPage from './NotFoundPage';

export default function CategoryPage() {
  const { slug = '' } = useParams();
  const { findCategory, ready } = useSite();
  const found = findCategory(slug);
  // Cached catalogue: live "from" price and count for the title, description and intro.
  const catalog = useAsync(() => fetchCatalog(), []);

  if (!ready) {
    return (
      <div>
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
  const subtree = new Set([category.id, ...(parent ? [] : (category as CategoryNode).children.map((c) => c.id))]);
  const facts = priceFacts((catalog.data ?? []).filter((p) => subtree.has(p.categoryId)));
  const kw = categoryKeywords(category);

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
    <div>
      <Seo
        title={kw.title}
        description={categoryDescription(kw, facts)}
        image={category.imageUrl}
        path={`/category/${category.slug}`}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Collections', path: '/categories' },
          ...(parent ? [{ name: parent.name, path: `/category/${parent.slug}` }] : []),
          { name: category.name, path: `/category/${category.slug}` },
        ]}
      />
      <PageBand
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
        <CategoryIntro category={category} parent={parent} subcategories={parent ? [] : (category as CategoryNode).children} keywords={kw} facts={facts} />
      </div>
    </div>
  );
}
