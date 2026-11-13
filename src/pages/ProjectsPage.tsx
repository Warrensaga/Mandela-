import { PageBand } from '../components/layout/PageBand';
import { ProjectCard } from '../components/projects/ProjectCard';
import { ButtonAnchor, ButtonLink } from '../components/ui/Button';
import { WhatsAppIcon } from '../components/ui/Icon';
import { Reveal } from '../components/ui/Reveal';
import { Seo } from '../components/ui/Seo';
import { Skeleton } from '../components/ui/Skeleton';
import { useAsync } from '../hooks/useAsync';
import { fetchProjects } from '../lib/api';
import { projectListLd } from '../lib/seo';
import { PAGE_KEYWORDS } from '../lib/seoKeywords';
import { whatsappLink } from '../lib/whatsapp';
import { useSite } from '../state/site';

const STEPS = [
  { title: 'Tell us about the space', body: 'Rooms, sizes, photos if you have them, your budget and when you need it ready.' },
  { title: 'We quote for the whole job', body: 'One quote for every piece, with fabrics and finishes chosen with you.' },
  { title: 'We make, deliver and set up', body: 'Pieces are made in our Nairobi workshop, delivered and placed in each room.' },
];

/** Furnishing service and the owner's published projects (homes, offices, rentals). */
export default function ProjectsPage() {
  const { settings } = useSite();
  const projects = useAsync(() => fetchProjects(), []);
  const list = projects.data ?? [];
  const waText = `Hello ${settings.storeName}, I would like a quote to furnish a space.`;

  return (
    <>
      <Seo
        title={PAGE_KEYWORDS.projects.title}
        description={PAGE_KEYWORDS.projects.description}
        path="/projects"
        image={list[0]?.coverImageUrl ?? undefined}
        jsonLd={list.length ? projectListLd(list) : undefined}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Projects', path: '/projects' },
        ]}
      />
      <PageBand
        title="Projects"
        description="Homes, apartments, rentals and offices we have furnished. Besides single pieces, we furnish whole spaces."
        crumbs={[{ to: '/', label: 'Home' }, { label: 'Projects' }]}
      />

      <div className="container-page py-12 sm:py-16">
        {projects.loading && !projects.data ? (
          <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading projects">
            {[0, 1, 2].map((i) => (
              <li key={i}>
                <Skeleton className="aspect-[4/3] w-full" />
                <Skeleton className="mt-4 h-6 w-2/3" />
                <Skeleton className="mt-2 h-4 w-1/2" />
              </li>
            ))}
          </ul>
        ) : projects.error ? (
          <p className="text-terracotta-600" role="alert">{projects.error.message}</p>
        ) : list.length > 0 ? (
          <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p, i) => (
              <Reveal as="li" key={p.id} delay={(i % 3) * 0.06}>
                <ProjectCard project={p} priority={i < 2} />
              </Reveal>
            ))}
          </ul>
        ) : (
          <Reveal className="border border-paper-200 bg-paper-100 px-6 py-12 text-center">
            <p className="font-serif text-2xl text-navy-800">Project photos are on the way</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              We are putting together photos of spaces we have furnished. Ask us on WhatsApp and we can share recent work.
            </p>
          </Reveal>
        )}
      </div>

      <section aria-labelledby="furnish-heading" className="section-y border-t border-paper-200 bg-paper-50">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
          <Reveal>
            <h2 id="furnish-heading" className="text-3xl sm:text-4xl">Furnish a whole space</h2>
            <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-muted">
              A new home, an apartment you rent out, or an office. Send us the details and we will quote for everything it needs.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {settings.whatsappNumber && (
                <ButtonAnchor variant="whatsapp" size="md" href={whatsappLink(settings.whatsappNumber, waText)} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon className="h-4 w-4" /> Ask for a quote
                </ButtonAnchor>
              )}
              <ButtonLink to="/custom-request" variant="outline" size="md">Send details and photos</ButtonLink>
            </div>
          </Reveal>
          <ol className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal as="li" key={s.title} delay={i * 0.06} className="border-t-2 border-navy-800 pt-4">
                <p className="font-label text-xs font-semibold text-gold-ink">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="mt-2 text-xl">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
