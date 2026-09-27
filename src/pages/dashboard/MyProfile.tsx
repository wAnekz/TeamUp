import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Link2, Check, Bell, BellOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, Badge, Avatar } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { CategorizedTagPicker } from '@/components/ui/CategorizedTagPicker';
import { ContactLinks } from '@/components/profile/ContactLinks';
import { FeedbackButton } from '@/components/FeedbackButton';
import { AchievementsSection } from '@/components/profile/AchievementsSection';
import { TeamsSection } from '@/components/profile/TeamsSection';
import { TelegramSettingsRow } from '@/components/profile/TelegramSettingsRow';
import { SchoolPicker } from '@/components/profile/SchoolPicker';
import { XpCard } from '@/components/gamification/Gamification';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { interestLabel, skillLabel, useT } from '@/i18n';
import { saveContacts, useUpdateProfile, uploadAvatar } from '@/hooks/useProfile';
import { deleteField } from 'firebase/firestore';
import { useNotifications } from '@/hooks/useNotifications';
import { lastActiveLabel } from '@/utils/dates';
import { computeProfileCompleteness } from '@/utils/profileCompleteness';
import { SKILL_CATEGORIES, SKILL_LEVEL_OPTIONS, INTEREST_CATEGORIES, GRADE_OPTIONS } from '@/constants/options';
import { profileSchema, type ProfileFormValues } from '@/utils/validation';
import { scrollToFirstError } from '@/utils/formErrors';
import type { Skill, SkillLevel, Interest, Grade } from '@/types';

export default function MyProfile() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const updateMutation = useUpdateProfile(user?.uid);
  const { status: pushStatus, enable: enablePush } = useNotifications(user?.uid);
  const tAll = useT();
  const t = tAll.profile;
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
  const schoolId = watch('schoolId');
  const schoolName = watch('school');
  const formCity = watch('city');

  if (!profile) return null;

  const startEditing = () => {
    reset({
      name: profile.name,
      age: profile.age,
      grade: profile.grade,
      city: profile.city,
      school: profile.school ?? '',
      schoolId: profile.schoolId ?? '',
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
        schoolId: values.schoolId || null,
        bio: values.bio || '',
        skills: values.skills,
        interests: values.interests,
        // Removes the legacy public copy; the real one is private/contacts.
        contacts: deleteField() as unknown as undefined,
      });
      await saveContacts(user.uid, {
        telegram: values.telegram || null,
        github: values.github || null,
        portfolio: values.portfolio || null,
        instagram: values.instagram || null,
      });
      await refreshProfile();
      setEditing(false);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : t.couldNotSave);
    }
  };

  const AvatarPicker = (
    <button
      onClick={() => fileRef.current?.click()}
      className="group relative shrink-0 rounded-full"
      type="button"
      aria-label={t.changePhoto}
      title={t.changePhoto}
    >
      <Avatar src={profile.avatarUrl} name={profile.name} size={72} />
      {/* Always-visible affordance so it's obvious the avatar is clickable,
          not just a static picture — a plain <button> around an <img> gave
          no visual cue at all. */}
      <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
        <Pencil size={20} className="text-white" />
      </span>
      <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-accent-600 text-white shadow-sm">
        <Pencil size={12} />
      </span>
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
              <h2 className="text-lg font-semibold text-surface-900">{t.editProfile}</h2>
              {uploading && <p className="text-xs text-surface-400">{t.uploadingPhoto}</p>}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <Input label={t.fullName} {...register('name')} error={errors.name?.message} />
            <Input label={t.age} type="number" {...register('age')} error={errors.age?.message} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-surface-700">{t.grade_}</span>
              <select
                {...register('grade')}
                className="w-full rounded-xl border border-surface-200 bg-white px-3.5 py-2.5 text-sm focus:border-accent-500"
              >
                {GRADE_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {t.grade(g)}
                  </option>
                ))}
              </select>
            </label>
            <Input label={t.city} placeholder="Алматы" {...register('city')} error={errors.city?.message} />
          </div>

          <div className="mt-4">
            <SchoolPicker
              uid={profile.uid}
              city={formCity}
              value={schoolId && schoolName ? { id: schoolId, name: schoolName } : null}
              onChange={(s) => {
                setValue('schoolId', s?.id ?? '');
                setValue('school', s?.name ?? '');
              }}
              hint={tAll.school.hint}
            />
          </div>
        </Card>

        <Card>
          <Textarea label={t.bio} maxLength={200} value={bio} {...register('bio')} error={errors.bio?.message} />
        </Card>

        <Card>
          <CategorizedTagPicker
            label={t.skills}
            kind="skill"
            categories={SKILL_CATEGORIES}
            selected={skills.map((s) => s.skill)}
            onToggle={toggleSkill}
            error={errors.skills?.message as string}
          />
          {skills.length > 0 && (
            <div className="mt-3 space-y-2 rounded-xl bg-surface-100 p-3">
              {skills.map((s) => (
                <div key={s.skill} className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-surface-700">{skillLabel(tAll, s.skill)}</span>
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
                        {tAll.skillLevel[lvl.value]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CategorizedTagPicker
            label={t.interests}
            categories={INTEREST_CATEGORIES}
            selected={interests}
            onToggle={toggleInterest}
            error={errors.interests?.message as string}
          />
        </Card>

        <Card>
          <p className="mb-1.5 text-sm font-medium text-surface-700">
            {t.howReach} <span className="font-normal text-surface-400">{t.atLeastOne}</span>
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Telegram" placeholder="@username" {...register('telegram')} error={errors.telegram?.message} />
            <Input label="GitHub" placeholder="username" {...register('github')} />
            <Input label={t.portfolio} placeholder="https://" {...register('portfolio')} />
            <Input label="Instagram" placeholder="@username" {...register('instagram')} />
          </div>
        </Card>

        {serverError && <p className="text-sm text-red-600">{serverError}</p>}

        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={cancelEditing} disabled={isSubmitting}>
            {tAll.common.cancel}
          </Button>
          <Button type="submit" className="flex-1" loading={isSubmitting}>
            {tAll.common.saveChanges}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-surface-900">{t.myProfile}</h1>
        <Button variant="secondary" size="sm" onClick={startEditing} type="button">
          <Pencil size={14} />
          {t.editProfile}
        </Button>
      </div>

      {(() => {
        const { percent, missing } = computeProfileCompleteness(profile);
        if (percent >= 100) return null;
        return (
          <Card>
            <div className="flex items-center justify-between text-sm">
              <p className="font-medium text-surface-700">{t.strength}</p>
              <p className="text-surface-500">{percent}%</p>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-100">
              <div className="h-full rounded-full bg-accent-600 transition-all" style={{ width: `${percent}%` }} />
            </div>
            <p className="mt-2 text-xs text-surface-500">
              {missing.slice(0, 2).join(' · ')}
              {missing.length > 2 ? ` · ${t.more(missing.length - 2)}` : ''}
            </p>
          </Card>
        );
      })()}

      <Card>
        <div className="flex items-start gap-4">
          {AvatarPicker}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-surface-900">{profile.name}</h2>
            <p className="text-sm text-surface-500">
              {profile.city} · {t.grade(profile.grade)}
              {profile.school ? ` · ${profile.school}` : ''}
            </p>
            {(profile.email ?? user?.email) && (
              <p className="text-xs text-surface-400">{profile.email ?? user?.email}</p>
            )}
            <p className="text-xs text-surface-400">{lastActiveLabel(profile.lastActiveAt)}</p>
            {profile.bio && <p className="mt-3 whitespace-pre-wrap text-sm text-surface-700">{profile.bio}</p>}
          </div>
        </div>
        {uploading && <p className="mt-2 text-xs text-surface-400">{t.uploadingPhoto}</p>}
      </Card>

      <Card>
        <p className="mb-2 text-sm font-medium text-surface-700">{t.skills}</p>
        {profile.skills.length === 0 ? (
          <p className="text-xs text-surface-400">{t.noSkills}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {profile.skills.map((s) => (
              <Badge key={s.skill} tone="accent">
                {skillLabel(tAll, s.skill)} · {tAll.skillLevel[s.level]}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <p className="mb-2 text-sm font-medium text-surface-700">{t.interests}</p>
        {profile.interests.length === 0 ? (
          <p className="text-xs text-surface-400">{t.noInterests}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {profile.interests.map((i) => (
              <Badge key={i} tone="gray">
                {interestLabel(tAll, i)}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      <XpCard uid={profile.uid} />

      <AchievementsSection uid={profile.uid} editable />

      <TeamsSection uid={profile.uid} emptyText={tAll.teams.emptyOwn} />

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-surface-700">{t.contacts}</p>
          <span className="text-xs text-surface-400">{t.contactsHint}</span>
        </div>
        <ContactLinks contacts={profile.contacts} />
      </Card>

      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={copyProfileLink} type="button">
          {linkCopied ? <Check size={14} /> : <Link2 size={14} />}
          {linkCopied ? t.linkCopied : t.copyLink}
        </Button>
        <Link to={`/users/${profile.uid}`} className="flex-1">
          <Button variant="secondary" className="w-full" type="button">
            {t.viewAsOthers}
          </Button>
        </Link>
      </div>

      <Card>
        <p className="mb-3 text-sm font-medium text-surface-700">{t.settings}</p>

        <div className="mb-4 flex items-center justify-between gap-3 border-b border-surface-100 pb-3.5">
          <p className="text-sm text-surface-800">{t.language}</p>
          <LanguageSwitcher compact />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            {pushStatus === 'denied' ? (
              <BellOff size={16} className="mt-0.5 shrink-0 text-surface-400" />
            ) : (
              <Bell size={16} className="mt-0.5 shrink-0 text-surface-400" />
            )}
            <div>
              <p className="text-sm text-surface-800">{t.push}</p>
              <p className="text-xs text-surface-400">
                {pushStatus === 'unsupported' && t.pushUnsupported}
                {pushStatus === 'checking' && t.pushChecking}
                {pushStatus === 'default' && t.pushDefault}
                {pushStatus === 'enabling' && t.pushEnabling}
                {pushStatus === 'granted' && t.pushGranted}
                {pushStatus === 'denied' && t.pushDenied}
              </p>
            </div>
          </div>
          {(pushStatus === 'default' || pushStatus === 'enabling') && (
            <Button size="sm" variant="secondary" onClick={enablePush} loading={pushStatus === 'enabling'} type="button">
              {t.enable}
            </Button>
          )}
        </div>

        <TelegramSettingsRow uid={profile.uid} />

        <Link
          to="/privacy"
          className="mt-4 flex items-center gap-2.5 border-t border-surface-100 pt-3.5 text-sm text-surface-600 hover:text-surface-900"
        >
          <ShieldCheck size={16} className="shrink-0 text-surface-400" />
          {t.privacy}
        </Link>
      </Card>

      <FeedbackButton label={t.reportBug} variant="secondary" className="w-full" />

      <Button variant="secondary" className="w-full" onClick={() => signOut()}>
        {tAll.common.signOut}
      </Button>
    </div>
  );
}
