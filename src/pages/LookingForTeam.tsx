import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useCreateLookingForTeamPost,
  useDeactivateLookingForTeamPost,
  useLookingForTeamFeed,
} from '@/hooks/useLookingForTeam';
import { Card, Badge, Avatar, Skeleton, ErrorState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { CategorizedTagPicker } from '@/components/ui/CategorizedTagPicker';
import { LevelPill } from '@/components/gamification/Gamification';
import { interestLabel, skillLabel, translateError, useT } from '@/i18n';
import { SKILL_CATEGORIES, INTEREST_CATEGORIES } from '@/constants/options';
import { lookingForTeamSchema, type LookingForTeamFormValues } from '@/utils/validation';
import { formatDeadline, isDeadlinePassed, isStale, timeAgo } from '@/utils/dates';
import { scrollToFirstError } from '@/utils/formErrors';
import type { Skill, SkillLevel, Interest } from '@/types';

export default function LookingForTeam() {
  const { user } = useAuth();
  const { data: posts, isLoading, isError, error, refetch } = useLookingForTeamFeed();
  const [open, setOpen] = useState(false);
  const deactivateMutation = useDeactivateLookingForTeamPost();
  const tAll = useT();
  const t = tAll.lft;
  const [searchParams, setSearchParams] = useSearchParams();
  // Set when arriving from an event's "Find a team" button (see
  // EventDetail.tsx). Filters the feed to that competition and pre-fills
  // the create-post modal so posting for this event takes one tap.
  const eventTag = searchParams.get('event');

  const filteredPosts = useMemo(() => {
    if (!eventTag || !posts) return posts;
    return posts.filter((p) => p.desiredCompetitions.some((c) => c.toLowerCase() === eventTag.toLowerCase()));
  }, [posts, eventTag]);

  const clearEventFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('event');
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-surface-900">{t.title}</h1>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus size={14} /> {t.post}
        </Button>
      </div>

      {eventTag && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-accent-200 bg-accent-50 px-3.5 py-2.5 text-sm text-accent-800">
          <span>
            {t.showingFor} <strong>{eventTag}</strong>
          </span>
          <button type="button" onClick={clearEventFilter} className="shrink-0 rounded-lg p-1 hover:bg-accent-100" aria-label={t.clear}>
            <X size={14} />
          </button>
        </div>
      )}

      {isError && <ErrorState error={error} onRetry={() => refetch()} />}

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      )}

      {!isLoading && !isError && filteredPosts?.length === 0 && (
        <div className="rounded-2xl border border-dashed border-surface-300 py-16 text-center text-surface-500">
          {eventTag ? t.emptyEvent : t.empty}
        </div>
      )}

      <div className="space-y-3">
        {filteredPosts?.map((post) => {
          const expired = post.availableUntil ? isDeadlinePassed(post.availableUntil) : false;
          const stale = isStale(post.createdAt);
          const isMine = user?.uid === post.authorId;
          return (
            <Card key={post.id}>
              <div className="flex items-center justify-between gap-2">
                <Link to={`/users/${post.authorId}`} className="flex items-center gap-2.5 hover:underline">
                  <Avatar src={post.authorAvatarUrl} name={post.authorName} size={32} />
                  <span className="font-medium text-surface-900">{post.authorName}</span>
                </Link>
                <LevelPill uid={post.authorId} className="mr-auto" />
                <span className="text-xs text-surface-400">{timeAgo(post.createdAt, 'Created')}</span>
              </div>
              <p className="mt-2.5 text-sm text-surface-700">{post.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {post.skills.map((s) => (
                  <Badge key={s.skill} tone="accent">
                    {skillLabel(tAll, s.skill)} · {tAll.skillLevel[s.level]}
                  </Badge>
                ))}
                {post.interests.map((i) => (
                  <Badge key={i} tone="gray">
                    {interestLabel(tAll, i)}
                  </Badge>
                ))}
              </div>
              {post.desiredCompetitions.length > 0 && (
                <p className="mt-2 text-xs text-surface-500">{t.lookingFor(post.desiredCompetitions.join(', '))}</p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-surface-100 pt-3">
                {post.availableUntil && !expired && (
                  <Badge tone="gray">{t.availableUntil(formatDeadline(post.availableUntil))}</Badge>
                )}
                {expired && <Badge tone="red">{t.expired}</Badge>}
                {!expired && stale && <Badge tone="yellow">{t.stale}</Badge>}
                {isMine && (
                  <Button size="sm" variant="secondary" onClick={() => deactivateMutation.mutate(post.id)}>
                    {t.foundTeam}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <CreatePostModal open={open} onClose={() => setOpen(false)} prefillCompetition={eventTag ?? undefined} />
    </div>
  );
}

function CreatePostModal({
  open,
  onClose,
  prefillCompetition,
}: {
  open: boolean;
  onClose: () => void;
  prefillCompetition?: string;
}) {
  const { user, profile } = useAuth();
  const createMutation = useCreateLookingForTeamPost();
  const [competitionInput, setCompetitionInput] = useState('');
  const tAll = useT();
  const t = tAll.lft;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LookingForTeamFormValues>({
    resolver: zodResolver(lookingForTeamSchema),
    defaultValues: {
      skills: [],
      interests: [],
      desiredCompetitions: prefillCompetition ? [prefillCompetition] : [],
    },
  });

  const skills = watch('skills') ?? [];
  const interests = watch('interests') ?? [];
  const competitions = watch('desiredCompetitions') ?? [];
  const description = watch('description') ?? '';

  const toggleSkill = (skill: Skill) => {
    const exists = skills.find((s) => s.skill === skill);
    setValue(
      'skills',
      exists ? skills.filter((s) => s.skill !== skill) : [...skills, { skill, level: 'intermediate' as SkillLevel }],
      { shouldValidate: true },
    );
  };

  const toggleInterest = (interest: Interest) => {
    setValue('interests', interests.includes(interest) ? interests.filter((i) => i !== interest) : [...interests, interest], {
      shouldValidate: true,
    });
  };

  const addCompetition = () => {
    if (!competitionInput.trim()) return;
    setValue('desiredCompetitions', [...competitions, competitionInput.trim()], { shouldValidate: true });
    setCompetitionInput('');
  };

  const submit = async (values: LookingForTeamFormValues) => {
    if (!user || !profile) return;
    await createMutation.mutateAsync({
      authorId: user.uid,
      authorName: profile.name,
      authorAvatarUrl: profile.avatarUrl ?? null,
      description: values.description,
      skills: values.skills,
      desiredCompetitions: values.desiredCompetitions,
      interests: values.interests as Interest[],
      availableUntil: values.availableUntil,
    });
    reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={t.modalTitle}>
      <form onSubmit={handleSubmit(submit, scrollToFirstError)} className="space-y-4">
        <Textarea
          label={t.description}
          placeholder={t.descPlaceholder}
          maxLength={400}
          value={description}
          {...register('description')}
          error={errors.description?.message}
        />
        <CategorizedTagPicker
          label={t.skills}
          kind="skill"
          categories={SKILL_CATEGORIES}
          selected={skills.map((s) => s.skill)}
          onToggle={toggleSkill}
          error={errors.skills?.message as string}
        />
        <CategorizedTagPicker label={t.interests} categories={INTEREST_CATEGORIES} selected={interests} onToggle={toggleInterest} error={errors.interests?.message as string} />

        <Input
          label={t.availableUntilLabel}
          type="date"
          {...register('availableUntil')}
        />
        <p className="-mt-3 text-xs text-surface-400">{t.availableHint}</p>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-surface-700">{t.competitions}</span>
          <div className="flex gap-2">
            <input
              value={competitionInput}
              onChange={(e) => setCompetitionInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCompetition())}
              placeholder="AI Hackathon 2026"
              className="flex-1 rounded-xl border border-surface-200 px-3.5 py-2 text-sm focus:border-accent-500"
            />
            <Button type="button" variant="secondary" onClick={addCompetition}>
              {tAll.common.add}
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {competitions.map((c, i) => (
              <Badge key={i} tone="accent">
                {c}
              </Badge>
            ))}
          </div>
          {errors.desiredCompetitions && (
            <p className="mt-1 text-xs text-red-600">{translateError(tAll, errors.desiredCompetitions.message)}</p>
          )}
        </div>

        <Button type="submit" className="w-full" loading={isSubmitting}>
          {t.post}
        </Button>
      </form>
    </Modal>
  );
}
