import { useParams } from 'react-router-dom';
import { Download, School } from 'lucide-react';
import { Card, Badge, Avatar, Skeleton } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { usePublicProfile } from '@/hooks/useProfile';
import { lastActiveLabel } from '@/utils/dates';
import { ReportButton } from '@/components/ReportButton';
import { ContactLinks } from '@/components/profile/ContactLinks';
import { TeamsSection } from '@/components/profile/TeamsSection';
import { AchievementsSection } from '@/components/profile/AchievementsSection';
import { BadgesCard, LevelPill } from '@/components/gamification/Gamification';
import { useAuth } from '@/contexts/useAuth';
import { useContacts } from '@/hooks/useProfile';
import { interestLabel, skillLabel, useT } from '@/i18n';

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const { user, emailVerified } = useAuth();
  // Rules only show other students' profiles to confirmed emails; say so
  // instead of a misleading "not found".
  const blocked = !emailVerified && !!user && user.uid !== id;
  const { data: profile, isLoading } = usePublicProfile(blocked ? undefined : id);
  const tAll = useT();
  const t = tAll.profile;

  if (blocked) return <p className="mx-auto max-w-md text-center text-surface-600">{t.verifyToView}</p>;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  if (!profile) return <p className="text-center text-surface-500">{t.notFound}</p>;

  const isMe = user?.uid === profile.uid;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Card className="print:shadow-none">
        <div className="flex items-center gap-4">
          <Avatar src={profile.avatarUrl} name={profile.name} size={72} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-surface-900">{profile.name}</h1>
              <LevelPill uid={profile.uid} />
            </div>
            <p className="text-sm text-surface-500">
              {profile.city} · {t.grade(profile.grade)}
            </p>
            {profile.school && (
              <p className="mt-0.5 flex items-center gap-1 text-sm text-surface-500">
                <School size={13} /> {profile.school}
              </p>
            )}
            <p className="text-xs text-surface-400 print:hidden">{lastActiveLabel(profile.lastActiveAt)}</p>
          </div>
        </div>
        {profile.bio && <p className="mt-4 whitespace-pre-wrap text-sm text-surface-700">{profile.bio}</p>}
        <div className="mt-4 border-t border-surface-100 pt-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-surface-400">{t.contact}</p>
          <ProfileContacts uid={profile.uid} />
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 print:hidden">
          {/* Browser print → "Save as PDF" gives a clean one-file portfolio
              (nav and buttons are print:hidden) for university/grant
              applications, without a PDF library in the bundle. */}
          <Button size="sm" variant="secondary" onClick={() => window.print()}>
            <Download size={14} /> {t.savePdf}
          </Button>
          {!isMe && <ReportButton targetType="profile" targetId={profile.uid} />}
        </div>
      </Card>

      {profile.skills.length > 0 && (
        <Card className="print:break-inside-avoid print:shadow-none">
          <p className="mb-2 text-sm font-medium text-surface-700">{t.skills}</p>
          <div className="flex flex-wrap gap-1.5">
            {profile.skills.map((s) => (
              <Badge key={s.skill} tone="accent">
                {skillLabel(tAll, s.skill)} · {tAll.skillLevel[s.level]}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      <BadgesCard uid={profile.uid} />

      <AchievementsSection uid={profile.uid} />

      <TeamsSection uid={profile.uid} emptyText={tAll.teams.emptyOther} />

      {profile.interests.length > 0 && (
        <Card className="print:break-inside-avoid print:shadow-none">
          <p className="mb-2 text-sm font-medium text-surface-700">{t.interests}</p>
          <div className="flex flex-wrap gap-1.5">
            {profile.interests.map((i) => (
              <Badge key={i} tone="gray">
                {interestLabel(tAll, i)}
              </Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/** Teammates (and the student themselves) see the links; everyone else a note. */
function ProfileContacts({ uid }: { uid: string }) {
  const { data: contacts, isLoading } = useContacts(uid);
  const t = useT().profile;
  if (isLoading) return <Skeleton className="h-7 w-40" />;
  if (!contacts) return <p className="text-xs text-surface-400">{t.contactsHidden}</p>;
  return <ContactLinks contacts={contacts} />;
}
