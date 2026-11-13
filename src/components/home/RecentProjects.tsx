import { useAsync } from '../../hooks/useAsync';
import { fetchProjects, type Project } from '../../lib/api';
import { ProjectCard } from '../projects/ProjectCard';
import { Reveal } from '../ui/Reveal';
import { SectionHeading } from './HomeSections';

/**
 * Up to three published furnishing projects. Left out entirely until the
 * owner publishes one, and never breaks the page if loading fails.
 */
export function RecentProjects() {
  const projects = useAsync(() => fetchProjects(3).catch(() => [] as Project[]), []);
  const list = projects.data ?? [];
  if (!list.length) return null;

  return (
    <section aria-labelledby="projects-heading" className="section-y bg-paper-50">
      <div className="container-page">
        <SectionHeading
          id="projects-heading"
          title="Spaces we have furnished"
          intro="Homes, rentals and offices, from single rooms to whole floors."
          link={{ to: '/projects', label: 'See all projects' }}
        />
        <ul className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p, i) => (
            <Reveal as="li" key={p.id} delay={i * 0.06}>
              <ProjectCard project={p} />
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
