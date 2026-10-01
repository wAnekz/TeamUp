import { Send, Github, Globe, Instagram } from 'lucide-react';
import type { UserContacts } from '@/types';
import { useT } from '@/i18n';
import { safeUrl } from '@/utils/safeUrl';

function normalizeHandle(value: string) {
  return value.replace(/^@/, '').trim();
}

export function ContactLinks({ contacts }: { contacts: UserContacts | undefined }) {
  const t = useT().profile;
  if (!contacts) return null;
  const links: { key: string; href: string; label: string; icon: typeof Send }[] = [];

  if (contacts.telegram) {
    links.push({ key: 'telegram', href: `https://t.me/${normalizeHandle(contacts.telegram)}`, label: `@${normalizeHandle(contacts.telegram)}`, icon: Send });
  }
  if (contacts.github) {
    links.push({ key: 'github', href: `https://github.com/${normalizeHandle(contacts.github)}`, label: contacts.github, icon: Github });
  }
  if (contacts.instagram) {
    links.push({ key: 'instagram', href: `https://instagram.com/${normalizeHandle(contacts.instagram)}`, label: `@${normalizeHandle(contacts.instagram)}`, icon: Instagram });
  }
  // Older profiles stored "mysite.dev" without a scheme.
  const portfolio = contacts.portfolio && safeUrl(/^[a-z][a-z0-9+.-]*:/i.test(contacts.portfolio) ? contacts.portfolio : `https://${contacts.portfolio}`);
  if (portfolio) {
    links.push({ key: 'portfolio', href: portfolio, label: t.portfolio, icon: Globe });
  }

  if (links.length === 0) return <p className="text-xs text-surface-400">{t.noContacts}</p>;

  return (
    <div className="flex flex-wrap gap-2">
      {links.map(({ key, href, label, icon: Icon }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-surface-200 bg-white px-2.5 py-1.5 text-xs font-medium text-surface-700 hover:border-accent-300 hover:text-accent-700"
        >
          <Icon size={13} />
          {label}
        </a>
      ))}
    </div>
  );
}
