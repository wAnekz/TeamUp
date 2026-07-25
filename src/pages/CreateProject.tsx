import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CategorizedTagPicker } from '@/components/ui/CategorizedTagPicker';
import { Card, Skeleton } from '@/components/ui/primitives';
import { SKILL_CATEGORIES, INTEREST_CATEGORIES } from '@/constants/options';
import { projectSchema, type ProjectFormValues } from '@/utils/validation';
import { useCreateProject, useProject, useUpdateProject } from '@/hooks/useProjects';
import { useAuth } from '@/contexts/AuthContext';
import { Timestamp, deleteField } from 'firebase/firestore';
import type { Skill, Interest, ProjectRole } from '@/types';
import { nanoid } from '@/utils/id';
import { scrollToFirstError } from '@/utils/formErrors';
import { toast } from '@/lib/toast';

export default function CreateProject() {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();
  const { data: existing, isLoading: loadingExisting } = useProject(id);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      type: 'ongoing',
      interests: [],
      roles: [{ title: '', requiredSkills: [], slotsTotal: 1 }],
    },
  });

  // Prefill the form once the existing project loads (edit mode only).
  useEffect(() => {
    if (!existing) return;
    reset({
      title: existing.title,
      description: existing.description,
      additionalRequirements: existing.additionalRequirements ?? '',
      type: existing.type,
      deadline: existing.deadline ? existing.deadline.toDate().toISOString().slice(0, 10) : undefined,
      interests: existing.interests,
      roles: existing.roles.map((r) => ({ title: r.title, requiredSkills: r.requiredSkills, slotsTotal: r.slotsTotal })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing]);

  const { fields, append, remove } = useFieldArray({ control, name: 'roles' });
  const type = watch('type');
  const interests = watch('interests') ?? [];
  const description = watch('description') ?? '';
  const additionalRequirements = watch('additionalRequirements') ?? '';
  const [serverError, setServerError] = useState<string | null>(null);

  const submit = async (values: ProjectFormValues, isDraft: boolean) => {
    if (!user || !profile) return;
    setServerError(null);

    try {
      if (isEditing && existing) {
      // Preserve role ids and slotsFilled for roles that already existed;
      // only genuinely new rows (added in this edit) get a fresh id.
      const roles: ProjectRole[] = values.roles.map((r, index) => {
        const original = existing.roles[index];
        const slotsFilled = original?.slotsFilled ?? 0;
        return {
          id: original?.id ?? nanoid(),
          title: r.title,
          requiredSkills: r.requiredSkills as Skill[],
          slotsTotal: Math.max(r.slotsTotal, slotsFilled),
          slotsFilled,
        };
      });
      await updateMutation.mutateAsync({
        id: existing.id,
        patch: {
          title: values.title,
          description: values.description,
          additionalRequirements: values.additionalRequirements ? values.additionalRequirements : deleteField(),
          type: values.type,
          deadline: values.deadline ? Timestamp.fromDate(new Date(values.deadline)) : deleteField(),
          roles,
          teamSizeMax: roles.reduce((sum, r) => sum + r.slotsTotal, 0) + 1,
          interests: values.interests as Interest[],
          isDraft,
        },
      });
      toast.success('Changes saved');
      navigate(`/projects/${existing.id}`);
      return;
      }

      const roles: ProjectRole[] = values.roles.map((r) => ({
        id: nanoid(),
        title: r.title,
        requiredSkills: r.requiredSkills as Skill[],
        slotsTotal: r.slotsTotal,
        slotsFilled: 0,
      }));

      const newId = await createMutation.mutateAsync({
        title: values.title,
        description: values.description,
        ...(values.additionalRequirements ? { additionalRequirements: values.additionalRequirements } : {}),
        type: values.type,
        ...(values.deadline ? { deadline: Timestamp.fromDate(new Date(values.deadline)) } : {}),
        roles,
        teamSizeMax: roles.reduce((sum, r) => sum + r.slotsTotal, 0) + 1,
        interests: values.interests as Interest[],
        status: 'open',
        authorId: user.uid,
        authorName: profile.name,
        authorAvatarUrl: profile.avatarUrl ?? null,
        isDraft,
      });
      toast.success(isDraft ? 'Saved as draft' : 'Project published');
      navigate(isDraft ? '/dashboard?tab=drafts' : `/projects/${newId}`);
    } catch (e) {
      // Previously this threw silently past handleSubmit with no feedback —
      // button just stopped spinning and nothing happened. Now it's visible.
      setServerError(e instanceof Error ? e.message : 'Could not save your project. Please try again.');
    }
  };

  if (isEditing && loadingExisting) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (isEditing && existing && user?.uid !== existing.authorId) {
    return <p className="text-center text-surface-500">You can only edit your own projects.</p>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-surface-900">{isEditing ? 'Edit project' : 'Create a project'}</h1>

      <form className="space-y-5">
        <Input label="Title" placeholder="AI-powered study planner" {...register('title')} error={errors.title?.message} />
        <Textarea
          label="Description"
          placeholder="What are you building, and what does the team look like?"
          maxLength={500}
          value={description}
          {...register('description')}
          error={errors.description?.message}
        />

        <Textarea
          label="Additional requirements (optional)"
          placeholder="Anything the skill tags don't cover — e.g. availability, prior experience, willingness to meet in person, language..."
          maxLength={300}
          value={additionalRequirements}
          {...register('additionalRequirements')}
          error={errors.additionalRequirements?.message}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-surface-700">Type</span>
            <select
              {...register('type')}
              className="w-full rounded-xl border border-surface-200 bg-white px-3.5 py-2.5 text-sm focus:border-accent-500"
            >
              <option value="ongoing">Ongoing</option>
              <option value="event">Event (has a deadline)</option>
            </select>
          </label>
          {type === 'event' && (
            <Input label="Deadline" type="date" {...register('deadline')} error={errors.deadline?.message} />
          )}
        </div>

        <CategorizedTagPicker
          label="Interests"
          name="interests"
          categories={INTEREST_CATEGORIES}
          selected={interests}
          onToggle={(i) =>
            setValue('interests', interests.includes(i) ? interests.filter((x) => x !== i) : [...interests, i], {
              shouldValidate: true,
            })
          }
          error={errors.interests?.message as string}
        />

        <div data-field="roles">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-surface-700">Roles</span>
            <button
              type="button"
              onClick={() => append({ title: '', requiredSkills: [], slotsTotal: 1 })}
              className="flex items-center gap-1 text-sm font-medium text-accent-600"
            >
              <Plus size={14} /> Add role
            </button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => {
              const roleSkills = watch(`roles.${index}.requiredSkills`) ?? [];
              const minSlots = isEditing ? existing?.roles[index]?.slotsFilled ?? 1 : 1;
              return (
                <Card key={field.id}>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-surface-500">Role {index + 1}</span>
                    {fields.length > 1 && (
                      <button type="button" onClick={() => remove(index)} className="text-surface-400 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Title"
                      placeholder="Frontend Developer"
                      {...register(`roles.${index}.title` as const)}
                      error={errors.roles?.[index]?.title?.message}
                    />
                    <Input
                      label={`Slots${minSlots > 1 ? ` (min ${minSlots} — already filled)` : ''}`}
                      type="number"
                      min={minSlots}
                      {...register(`roles.${index}.slotsTotal` as const)}
                      error={errors.roles?.[index]?.slotsTotal?.message}
                    />
                  </div>
                  <div className="mt-3">
                    <CategorizedTagPicker
                      label="Required skills"
                      name={`roles.${index}.requiredSkills`}
                      categories={SKILL_CATEGORIES}
                      searchPlaceholder="Search skills..."
                      selected={roleSkills as Skill[]}
                      onToggle={(skill) =>
                        setValue(
                          `roles.${index}.requiredSkills`,
                          roleSkills.includes(skill) ? roleSkills.filter((s: Skill) => s !== skill) : [...roleSkills, skill],
                          { shouldValidate: true },
                        )
                      }
                      error={errors.roles?.[index]?.requiredSkills?.message as string}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
          {errors.roles?.message && <p className="mt-1 text-xs text-red-600">{errors.roles.message}</p>}
        </div>

        {serverError && (
          <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-600">{serverError}</p>
        )}

        <div className="flex gap-3">
          {!isEditing && (
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              loading={isSubmitting}
              onClick={handleSubmit((v) => submit(v, true), scrollToFirstError)}
            >
              Save as draft
            </Button>
          )}
          <Button
            type="button"
            className="flex-1"
            loading={isSubmitting}
            onClick={handleSubmit((v) => submit(v, false), scrollToFirstError)}
          >
            {isEditing ? 'Save changes' : 'Publish'}
          </Button>
        </div>
      </form>
    </div>
  );
}
