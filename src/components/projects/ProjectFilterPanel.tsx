import { Search } from 'lucide-react';
import { CategorizedTagPicker } from '@/components/ui/CategorizedTagPicker';
import { SKILL_CATEGORIES, INTEREST_CATEGORIES } from '@/constants/options';
import type { ProjectFilters, ProjectType } from '@/types';
import { useT } from '@/i18n';

export function ProjectFilterPanel({
  filters,
  onChange,
}: {
  filters: ProjectFilters;
  onChange: (next: ProjectFilters) => void;
}) {
  const t = useT();
  return (
    <div className="space-y-5 rounded-2xl border border-surface-200 bg-white p-4">
      <label className="relative block">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
        <input
          value={filters.search ?? ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder={t.feed.searchProjects}
          className="w-full rounded-xl border border-surface-400 bg-surface-50 py-2.5 pl-9 pr-3 text-sm focus:border-accent-500"
        />
      </label>

      {/* Wraps: "Только со свободными местами" alone is wider than a 320px phone row. */}
      <div className="flex flex-wrap gap-2">
        {(['event', 'ongoing'] as ProjectType[]).map((type) => (
          <button
            key={type}
            onClick={() => onChange({ ...filters, type: filters.type === type ? undefined : type })}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              filters.type === type ? 'bg-accent-600 text-white' : 'bg-surface-100 text-surface-600'
            }`}
          >
            {type === 'event' ? t.status.event : t.status.ongoing}
          </button>
        ))}
        <button
          onClick={() => onChange({ ...filters, onlyOpenSlots: !filters.onlyOpenSlots })}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
            filters.onlyOpenSlots ? 'bg-accent-600 text-white' : 'bg-surface-100 text-surface-600'
          }`}
        >
          {t.feed.openSlotsOnly}
        </button>
      </div>

      <CategorizedTagPicker
        label={t.feed.skills}
        kind="skill"
        categories={SKILL_CATEGORIES}
        selected={filters.skills}
        onToggle={(skill) =>
          onChange({
            ...filters,
            skills: filters.skills.includes(skill) ? filters.skills.filter((s) => s !== skill) : [...filters.skills, skill],
          })
        }
      />

      <CategorizedTagPicker
        label={t.feed.interests}
        categories={INTEREST_CATEGORIES}
        selected={filters.interests}
        onToggle={(interest) =>
          onChange({
            ...filters,
            interests: filters.interests.includes(interest)
              ? filters.interests.filter((i) => i !== interest)
              : [...filters.interests, interest],
          })
        }
      />
    </div>
  );
}
