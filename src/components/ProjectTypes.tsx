import { PROJECT_TYPES } from "@/lib/project-types";

/** Checkbox tiles for the four project types. Any combination; posts as repeated `project_types` fields. */
export function ProjectTypePicker({ value = [] }: { value?: string[] }) {
  return (
    <fieldset className="typepick">
      <legend>Project type</legend>
      <div className="typegrid">
        {PROJECT_TYPES.map((t) => (
          <label key={t} className="typeopt">
            <input type="checkbox" name="project_types" value={t} defaultChecked={value.includes(t)} />
            <span className="box" aria-hidden="true" />
            <span>{t}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Small tags for headers and project cards. */
export function ProjectTypeTags({ types }: { types?: string[] | null }) {
  const list = PROJECT_TYPES.filter((t) => types?.includes(t));
  if (!list.length) return null;
  return <div className="typetags">{list.map((t) => <span key={t} className="pill info">{t}</span>)}</div>;
}
