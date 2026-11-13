import { Link } from 'react-router';
import type { Project } from '../../lib/api';
import { Img } from '../ui/Img';

/** "Office · Westlands, Nairobi" style line under a project title. */
export function projectMeta(p: Pick<Project, 'spaceType' | 'location'>): string {
  return [p.spaceType, p.location].filter(Boolean).join(' · ');
}

/** Cover photo, title and where it is. The whole card links to the project. */
export function ProjectCard({ project, priority = false }: { project: Project; priority?: boolean }) {
  const cover = project.coverImageUrl ?? project.gallery[0] ?? null;
  const meta = projectMeta(project);
  return (
    <Link to={`/projects/${project.slug}`} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden bg-paper-200">
        <Img
          src={cover}
          alt=""
          priority={priority}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="h-full w-full object-cover transition-[opacity,transform] duration-700 ease-out group-hover:scale-[1.03] motion-reduce:transition-none"
        />
        {project.gallery.length > 1 && (
          <span className="absolute right-3 bottom-3 bg-[#0a1530]/80 px-2 py-1 text-[11px] font-medium text-white">
            {project.gallery.length} photos
          </span>
        )}
      </div>
      <h3 className="mt-4 font-serif text-xl leading-snug text-navy-800 group-hover:text-brand-600">{project.title}</h3>
      {meta && <p className="mt-1 text-sm text-muted">{meta}</p>}
      {project.summary && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink/80">{project.summary}</p>}
    </Link>
  );
}
