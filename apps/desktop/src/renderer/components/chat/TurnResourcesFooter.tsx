import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { readTurnResources, type TurnResourceReceipt } from '@cindy/maker-shared/turn-resources';

/** Host-stamped usage only; reading a Skill or browsing plugins is not adoption. */
export const TurnResourcesFooter = memo(function TurnResourcesFooter({
  resources,
}: {
  resources?: readonly TurnResourceReceipt[];
}) {
  const { t } = useTranslation();
  const receipts = readTurnResources(resources);
  if (!receipts.length) return null;

  return (
    <section
      aria-label={t('chat.turnResources.title')}
      className="mt-3 min-w-0 select-text space-y-1 text-12 leading-5"
      style={{ color: 'var(--text-secondary)' }}
    >
      <div style={{ color: 'var(--text-tertiary)' }}>{t('chat.turnResources.title')}</div>
      {(['workflow', 'skill', 'plugin'] as const).map((kind) => {
        const names = receipts.filter((receipt) => receipt.kind === kind).map((receipt) => receipt.name);
        return names.length ? (
          <div key={kind} className="min-w-0 break-words [overflow-wrap:anywhere]">
            {t(`chat.turnResources.${kind}`, { names: names.join(' · ') })}
          </div>
        ) : null;
      })}
    </section>
  );
});
