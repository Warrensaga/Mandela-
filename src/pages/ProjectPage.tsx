import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Lightbox } from '../components/product/Lightbox';
import { ProjectCard, projectMeta } from '../components/projects/ProjectCard';
import { Button, ButtonAnchor, ButtonLink } from '../components/ui/Button';
import { WhatsAppIcon } from '../components/ui/Icon';
import { Img } from '../components/ui/Img';
import { Reveal } from '../components/ui/Reveal';
import { Seo } from '../components/ui/Seo';
import { Skeleton } from '../components/ui/Skeleton';
import { useAsync } from '../hooks/useAsync';
import { fetchProject, fetchProjects, type Project } from '../lib/api';
import { absUrl, projectLd } from '../lib/seo';
import { whatsappLink } from '../lib/whatsapp';
import { useSite } from '../state/site';
import NotFoundPage from './NotFoundPage';

const monthYear = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });

export default function ProjectPage() {
  const { slug = '' } = useParams();
  const project = useAsync(() => fetchProject(slug), [slug]);

  if (project.error) {
    return (
      <div className="container-page py-20 text-center">
        <p className="text-navy-800">{project.error.message}</p>
        <Button variant="outline" className="mt-4" onClick={project.reload}>Try again</Button>
      </div>
    );
  }
  if (project.loading || project.data === undefined) return <ProjectSkeleton />;
  if (project.data === null) return <NotFoundPage />;
  return <ProjectView key={project.data.id} project={project.data} />;
}

function ProjectSkeleton() {
  return (
    <div className="container-page py-10 sm:py-14" aria-busy="true">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="mt-6 h-12 w-2/3" />
      <Skeleton className="mt-8 aspect-[16/9] w-full" />
    </div>
  );
}

function ProjectView({ project }: { project: Project }) {
  const { settings } = useSite();
  const [viewer, setViewer] = useState<number | null>(null);
  const others = useAsync(() => fetchProjects(4).catch(() => [] as Project[]), []);

  // Cover first, then the gallery, without repeating the cover.
  const photos = useMemo(() => {
    const urls = [project.coverImageUrl, ...project.gallery].filter((u): u is string => Boolean(u));
    return [...new Set(urls)].map((url, i) => ({ id: String(i), url, alt: `${project.title}, photo ${i + 1}` }));
  }, [project]);
  const [hero, ...rest] = photos;
  const paragraphs = (project.body ?? '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const meta = projectMeta(project);
  const more = (others.data ?? []).filter((p) => p.id !== project.id).slice(0, 3);
  const waText = `Hello ${settings.storeName}, I saw your project "${project.title}" (${absUrl(`/projects/${project.slug}`)}). I would like something similar.`;

  return (
    <>
      <Seo
        title={`${project.title}: Furnishing Project`}
        description={project.summary ?? `${project.title}${meta ? `, ${meta}` : ''}: a space furnished by ${settings.storeName}.`}
        image={hero?.url}
        path={`/projects/${project.slug}`}
        jsonLd={projectLd(project, settings)}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Projects', path: '/projects' },
          { name: project.title, path: `/projects/${project.slug}` },
        ]}
      />
      <div className="container-page py-8 sm:py-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-[13px] text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link to="/" className="tap hover:text-brand-600">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link to="/projects" className="tap hover:text-brand-600">Projects</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-navy-800">{project.title}</li>
          </ol>
        </nav>

        <Reveal className="max-w-3xl">
          <h1 className="text-4xl leading-tight sm:text-5xl">{project.title}</h1>
          {(meta || project.completedOn) && (
            <p className="mt-3 text-muted">
              {meta}
              {meta && project.completedOn ? ' · ' : ''}
              {project.completedOn ? `Completed ${monthYear(project.completedOn)}` : ''}
            </p>
          )}
        </Reveal>

        {hero && (
          <Reveal delay={0.06} className="mt-8">
            <button type="button" onClick={() => setViewer(0)} className="group relative block w-full overflow-hidden bg-paper-200" aria-label="Open photos full screen">
              <Img src={hero.url} alt={hero.alt} priority sizes="(min-width: 1280px) 1216px, 100vw" className="aspect-[16/10] w-full object-cover sm:aspect-[16/9]" />
            </button>
          </Reveal>
        )}

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-16">
          <Reveal className="space-y-4 text-base leading-relaxed text-ink/85">
            {project.summary && <p className="text-lg text-navy-800">{project.summary}</p>}
            {paragraphs.map((p, i) => (
              <p key={i} className="whitespace-pre-line">{p}</p>
            ))}
          </Reveal>
          <Reveal delay={0.08} as="aside" className="h-fit border border-paper-200 bg-paper-100 p-6">
            {project.scope.length > 0 && (
              <>
                <h2 className="text-xl">What we supplied</h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {project.scope.map((s) => (
                    <li key={s} className="rounded-full border border-paper-300 bg-paper-50 px-3 py-1 text-sm text-navy-800">{s}</li>
                  ))}
                </ul>
              </>
            )}
            <p className={`text-sm text-muted ${project.scope.length ? 'mt-6' : ''}`}>Want something similar for your space? Send us the rooms and your budget for a quote.</p>
            <div className="mt-4 flex flex-col gap-2">
              {settings.whatsappNumber && (
                <ButtonAnchor variant="whatsapp" size="md" href={whatsappLink(settings.whatsappNumber, waText)} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon className="h-4 w-4" /> Ask about a project like this
                </ButtonAnchor>
              )}
              <ButtonLink to="/custom-request" variant="outline" size="md">Send details and photos</ButtonLink>
            </div>
          </Reveal>
        </div>

        {rest.length > 0 && (
          <section aria-labelledby="photos-heading" className="mt-16">
            <h2 id="photos-heading" className="text-3xl">Photos</h2>
            <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {rest.map((ph, i) => (
                <Reveal as="li" key={ph.url} delay={(i % 3) * 0.05}>
                  <button type="button" onClick={() => setViewer(i + 1)} className="block w-full overflow-hidden bg-paper-200" aria-label={`Open ${ph.alt} full screen`}>
                    <Img src={ph.url} alt={ph.alt} sizes="(min-width: 1024px) 33vw, 50vw" className="aspect-[4/3] w-full object-cover transition-transform duration-500 hover:scale-[1.03] motion-reduce:transition-none" />
                  </button>
                </Reveal>
              ))}
            </ul>
          </section>
        )}

        {more.length > 0 && (
          <section aria-labelledby="more-projects" className="mt-20 border-t border-paper-200 pt-12">
            <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <h2 id="more-projects" className="text-3xl sm:text-4xl">More projects</h2>
              <Link to="/projects" className="tap text-sm font-semibold text-navy-800 underline decoration-paper-300 underline-offset-[6px] hover:text-brand-600">All projects</Link>
            </Reveal>
            <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {more.map((p, i) => (
                <Reveal as="li" key={p.id} delay={i * 0.06}>
                  <ProjectCard project={p} />
                </Reveal>
              ))}
            </ul>
          </section>
        )}
      </div>
      {viewer !== null && photos.length > 0 && (
        <Lightbox images={photos} productName={project.title} startIndex={viewer} onClose={() => setViewer(null)} />
      )}
    </>
  );
}
