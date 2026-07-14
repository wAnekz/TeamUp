import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Link2, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, Badge, Avatar } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { TagPicker } from '@/components/ui/TagPicker';
import { ContactLinks } from '@/components/profile/ContactLinks';
import { FeedbackButton } from '@/components/FeedbackButton';
import { useUpdateProfile, uploadAvatar } from '@/hooks/useProfile';
import { lastActiveLabel } from '@/utils/dates';
import { SKILL_OPTIONS, SKILL_LEVEL_OPTIONS, INTEREST_OPTIONS, GRADE_OPTIONS } from '@/constants/options';
import { profileSchema, type ProfileFormValues } from '@/utils/validation';
import { scrollToFirstError } from '@/utils/formErrors';
import type { Skill, SkillLevel, Interest, Grade } from '@/types';

export default function MyProfile() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const updateMutation = useUpdateProfile(user?.uid);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });

  const skills = watch('skills') ?? [];
  const interests = watch('interests') ?? [];
  const bio = watch('bio') ?? '';

  if (!profile) return null;

  const startEditing = () => {
    reset({
      name: profile.name,
      age: profile.age,
      grade: profile.grade,
      city: profile.city,
      school: profile.school ?? '',
      bio: profile.bio ?? '',
      skills: profile.skills,
      interests: profile.interests,
      telegram: profile.contacts?.telegram ?? '',
      github: profile.contacts?.github ?? '',
      portfolio: profile.contacts?.portfolio ?? '',
      instagram: profile.contacts?.instagram ?? '',
    });
    setServerError(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setServerError(null);
    setEditing(false);
  };

  const toggleSkill = (skill: Skill) => {
    const exists = skills.find((s) => s.skill === skill);
    if (exists) setValue('skills', skills.filter((s) => s.skill !== skill), { shouldValidate: true });
    else setValue('skills', [...skills, { skill, level: 'beginner' as SkillLevel }], { shouldValidate: true });
  };

  const setSkillLevel = (skill: Skill, level: SkillLevel) => {
    setValue(
      'skills',
      skills.map((s) => (s.skill === skill ? { ...s, level } : s)),
      { shouldValidate: true },
    );
  };

  const toggleInterest = (interest: Interest) => {
    setValue(
      'interests',
      interests.includes(interest) ? interests.filter((i) => i !== interest) : [...interests, interest],
      { shouldValidate: true },
    );
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const url = await uploadAvatar(user.uid, file);
      await updateMutation.mutateAsync({ avatarUrl: url });
      await refreshProfile();
    } finally {
      setUploading(false);
    }
  };

  const copyProfileLink = async () => {
    const url = `${window.location.origin}/users/${profile.uid}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // clipboard access can be denied by the browser; fail silently rather
      // than throwing an error for a non-critical convenience action.
    }
  };

  const onSubmit = async (values: ProfileFormValues) => {
    if (!user) return;
    setServerError(null);
    try {
      await updateMutation.mutateAsync({
        name: values.name,
        age: values.age,
        grade: values.grade as Grade,
        city: values.city,
        school: values.school || null,
        bio: values.bio || '',
        skills: values.skills,
        interests: values.interests,
        contacts: {
          telegram: values.telegram || null,
          github: values.github || null,
          portfolio: values.portfolio || null,
          instagram: values.instagram || null,
        },
      });
      await refreshProfile();
      setEditing(false);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Could not save your profile');
    }
  };

  const AvatarPicker = (
    <button onClick={() => fileRef.current?.click()} className="relative shrink-0" type="button">
      <Avatar src={profile.avatarUrl} name={profile.name} size={72} />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
    </button>
  );

  if (editing) {
    return (
      <form onSubmit={handleSubmit(onSubmit, scrollToFirstError)} className="mx-auto max-w-xl space-y-5">
        <Card>
          <div className="flex items-center gap-4">
            {AvatarPicker}
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-surface-900">Edit profile</h2>
              {uploading && <p className="text-xs text-surface-400">Uploading photo...</p>}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <Input label="Full name" {...register('name')} error={errors.name?.message} />
            <Input label="Age" type="number" {...register('age')} error={errors.age?.message} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-surface-700">Grade</span>
              <select
                {...register('grade')}
                className="w-full rounded-xl border border-surface-200 bg-white px-3.5 py-2.5 text-sm focus:border-accent-500"
              >
                {GRADE_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
            </label>
            <Input label="City" placeholder="Almaty" {...register('city')} error={errors.city?.message} />
          </div>

          <div className="mt-4">
            <Input label="School (optional)" {...register('school')} />
          </div>
        </Card>

        <Card>
          <Textarea label="Bio" maxLength={200} value={bio} {...register('bio')} error={errors.bio?.message} />
        </Card>

        <Card>
          <TagPicker
            label="Skills"
            options={SKILL_OPTIONS}
            selected={skills.map((s) => s.skill)}
            onToggle={toggleSkill}
            error={errors.skills?.message as string}
          />
          {skills.length > 0 && (
            <div className="mt-3 space-y-2 rounded-xl bg-surface-100 p-3">
              {skills.map((s) => (
                <div key={s.skill} className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-surface-700">{s.skill}</span>
                  <div className="flex gap-1">
                    {SKILL_LEVEL_OPTIONS.map((lvl) => (
                      <button
                        type="button"
                        key={lvl.value}
                        onClick={() => setSkillLevel(s.skill, lvl.value)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                          s.level === lvl.value ? 'bg-accent-600 text-white' : 'bg-white text-surface-500 border border-surface-200'
                        }`}
                      >
                        {lvl.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <TagPicker
            label="Interests"
            options={INTEREST_OPTIONS}
            selected={interests}
            onToggle={toggleInterest}
            error={errors.interests?.message as string}
          />
        </Card>

        <Card>
          <p className="mb-1.5 text-sm font-medium text-surface-700">
            How can teammates reach you? <span className="font-normal text-surface-400">(at least one required)</span>
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Telegram" placeholder="@username" {...register('telegram')} error={errors.telegram?.message} />
            <Input label="GitHub" placeholder="username" {...register('github')} />
            <Input label="Portfolio" placeholder="https://" {...register('portfolio')} />
            <Input label="Instagram" placeholder="@username" {...register('instagram')} />
          </div>
        </Card>

        {serverError && <p className="text-sm text-red-600">{serverError}</p>}

        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={cancelEditing} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" loading={isSubmitting}>
            Save changes
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-surface-900">My Profile</h1>
        <Button variant="secondary" size="sm" onClick={startEditing} type="button">
          <Pencil size={14} />
          Edit profile
        </Button>
      </div>

      <Card>
        <div className="flex items-start gap-4">
          {AvatarPicker}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-surface-900">{profile.name}</h2>
            <p className="text-sm text-surface-500">
              {profile.city} · Grade {profile.grade}
              {profile.school ? ` · ${profile.school}` : ''}
            </p>
            {(profile.email ?? user?.email) && (
              <p className="text-xs text-surface-400">{profile.email ?? user?.email}</p>
            )}
            <p className="text-xs text-surface-400">{lastActiveLabel(profile.lastActiveAt)}</p>
            {profile.bio && <p className="mt-3 whitespace-pre-wrap text-sm text-surface-700">{profile.bio}</p>}
          </div>
        </div>
        {uploading && <p className="mt-2 text-xs text-surface-400">Uploading photo...</p>}
      </Card>

      <Card>
        <p className="mb-2 text-sm font-medium text-surface-700">Skills</p>
        {profile.skills.length === 0 ? (
          <p className="text-xs text-surface-400">No skills added yet.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {profile.skills.map((s) => (
              <Badge key={s.skill} tone="accent">
                {s.skill} · {s.level}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <p className="mb-2 text-sm font-medium text-surface-700">Interests</p>
        {profile.interests.length === 0 ? (
          <p className="text-xs text-surface-400">No interests added yet.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {profile.interests.map((i) => (
              <Badge key={i} tone="gray">
                {i}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-surface-700">Contacts</p>
          <span className="text-xs text-surface-400">Only visible to teammates you accept</span>
        </div>
        <ContactLinks contacts={profile.contacts} />
      </Card>

      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={copyProfileLink} type="button">
          {linkCopied ? <Check size={14} /> : <Link2 size={14} />}
          {linkCopied ? 'Link copied' : 'Copy profile link'}
        </Button>
        <Link to={`/users/${profile.uid}`} className="flex-1">
          <Button variant="secondary" className="w-full" type="button">
            View as others see it
          </Button>
        </Link>
      </div>

      <FeedbackButton label="Report a bug or issue" variant="secondary" className="w-full" />

      <Button variant="secondary" className="w-full" onClick={() => signOut()}>
        Sign out
      </Button>
    </div>
  );
}