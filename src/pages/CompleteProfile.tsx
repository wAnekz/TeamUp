import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { TagPicker } from '@/components/ui/TagPicker';
import { SKILL_OPTIONS, SKILL_LEVEL_OPTIONS, INTEREST_OPTIONS, GRADE_OPTIONS } from '@/constants/options';
import { profileSchema, type ProfileFormValues } from '@/utils/validation';
import type { Skill, SkillLevel, Interest } from '@/types';
import { useState } from 'react';
import { scrollToFirstError } from '@/utils/formErrors';

export default function CompleteProfile() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { skills: [], interests: [], grade: 10 as unknown as ProfileFormValues['grade'] },
  });

  const skills = watch('skills') ?? [];
  const interests = watch('interests') ?? [];
  const bio = watch('bio') ?? '';

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

  const onSubmit = async (values: ProfileFormValues) => {
    if (!user) return;
    setServerError(null);
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          uid: user.uid,
          name: values.name,
          age: values.age,
          grade: values.grade,
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
          isStudentConfirmed: true,
          verified: false,
          profileComplete: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      await refreshProfile();
      navigate('/feed');
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Could not save your profile');
    }
  };

  return (
    <div className="mx-auto min-h-dvh max-w-xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-bold text-surface-900">Complete your profile</h1>
      <p className="mt-1 text-sm text-surface-500">This helps other students find you and understand what you bring to a team.</p>

      <form onSubmit={handleSubmit(onSubmit, scrollToFirstError)} className="mt-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Full name" {...register('name')} error={errors.name?.message} />
          <Input label="Age" type="number" {...register('age')} error={errors.age?.message} />
        </div>

        <div className="grid grid-cols-2 gap-4">
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

        <Input label="School (optional)" {...register('school')} />

        <Textarea label="Bio" placeholder="What are you working on?" maxLength={200} value={bio} {...register('bio')} />

        <TagPicker label="Skills" options={SKILL_OPTIONS} selected={skills.map((s) => s.skill)} onToggle={toggleSkill} error={errors.skills?.message as string} />

        {skills.length > 0 && (
          <div className="space-y-2 rounded-xl bg-surface-100 p-3">
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

        <TagPicker label="Interests" options={INTEREST_OPTIONS} selected={interests} onToggle={toggleInterest} error={errors.interests?.message as string} />

        <div>
          <p className="mb-1.5 text-sm font-medium text-surface-700">
            How can teammates reach you? <span className="font-normal text-surface-400">(at least one required)</span>
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Telegram" placeholder="@username" {...register('telegram')} error={errors.telegram?.message} />
            <Input label="GitHub" placeholder="username" {...register('github')} />
            <Input label="Portfolio" placeholder="https://" {...register('portfolio')} />
            <Input label="Instagram" placeholder="@username" {...register('instagram')} />
          </div>
        </div>

        {serverError && <p className="text-sm text-red-600">{serverError}</p>}

        <Button type="submit" className="w-full" loading={isSubmitting}>
          Finish setup
        </Button>
      </form>
    </div>
  );
}
