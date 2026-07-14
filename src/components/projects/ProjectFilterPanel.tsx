import { Search } from 'lucide-react';
import { TagPicker } from '@/components/ui/TagPicker';
import { SKILL_OPTIONS, INTEREST_OPTIONS } from '@/constants/options';
import type { ProjectFilters, ProjectType } from '@/types';

export function ProjectFilterPanel({
  filters,
  onChange,
}: {
  filters: ProjectFilters;
  onChange: (next: ProjectFilters) => void;
}) {
  return (
    <div className="space-y-5 rounded-2xl border border-surface-200 bg-white p-4">
      <label className="relative block">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
        <input
          value={filters.search ?? ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search projects..."
          className="w-full rounded-xl border border-surface-200 bg-surface-50 py-2.5 pl-9 pr-3 text-sm focus:border-accent-500"
        />
      </label>

      <div className="flex gap-2">
        {(['event', 'ongoing'] as ProjectType[]).map((t) => (
          <button
            key={t}
            onClick={() => onChange({ ...filters, type: filters.type === t ? undefined : t })}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              filters.type === t ? 'bg-accent-600 text-white' : 'bg-surface-100 text-surface-600'
            }`}
          >
            {t === 'event' ? 'Event' : 'Ongoing'}
          </button>
        ))}
        <button
          onClick={() => onChange({ ...filters, onlyOpenSlots: !filters.onlyOpenSlots })}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
            filters.onlyOpenSlots ? 'bg-accent-600 text-white' : 'bg-surface-100 text-surface-600'
          }`}
        >
          Open slots only
        </button>
      </div>

      <TagPicker
        label="Skills"
        options={SKILL_OPTIONS}
        selected={filters.skills}
        onToggle={(skill) =>
          onChange({
            ...filters,
            skills: filters.skills.includes(skill) ? filters.skills.filter((s) => s !== skill) : [...filters.skills, skill],
          })
        }
      />

      <TagPicker
        label="Interests"
        options={INTEREST_OPTIONS}
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
