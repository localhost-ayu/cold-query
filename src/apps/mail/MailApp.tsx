import {
  ArrowCounterClockwise,
  ArrowBendUpLeft,
  CheckCircle,
  Database,
  EnvelopeSimpleOpen,
  Star,
} from '@phosphor-icons/react';
import { useState } from 'react';

import { caseById, gameStore, useGameState } from '@/apps/shared/game';
import { sanitizeCaseHtml } from '@/apps/shared/sanitize';
import { completeness } from '@/core/resolution';
import { play } from '@/os/audio';
import { useLocale, useT } from '@/os/i18n';
import { WindowHeaderItems } from '@/os/windows/header-slots';
import { findEmail, type InboxItem } from '@/store/game-store';
import { windowStore } from '@/store/window-store';

import { ReportDialog } from './ReportDialog';

// As datas do jogo são fictícias e ficam no fuso da história.
const STORY_TIME_ZONE = 'America/Sao_Paulo';

function openTerminal() {
  windowStore.getState().openApp('terminal', {
    width: window.innerWidth,
    height: window.innerHeight,
  });
  play('open');
}

function VerdictCard({ item }: { item: InboxItem }) {
  const t = useT();
  const progress = useGameState((state) => state.cases[item.caseId]);
  const bundle = caseById.get(item.caseId);
  if (!item.verdict || !progress || !bundle) return null;

  if (item.verdict === 'correct') {
    const earned = progress.stars ?? 1;
    return (
      <div className="verdict verdict--correct">
        <CheckCircle weight="fill" aria-hidden className="verdict__icon" />
        <div>
          <strong>{t('verdict.correct')}</strong>
          <span
            className="verdict__stars"
            aria-label={t('verdict.stars', { count: earned })}
          >
            {[1, 2, 3].map((n) => (
              <Star
                key={n}
                weight={n <= earned ? 'fill' : 'regular'}
                aria-hidden
              />
            ))}
          </span>
          <span>
            {t('verdict.completeness', {
              percent: completeness(
                bundle.resolution.facts,
                progress.discoveredFacts,
              ),
            })}
          </span>
        </div>
      </div>
    );
  }

  const left = Math.max(0, bundle.manifest.maxAttempts - progress.attempts);
  return (
    <div className={`verdict verdict--${item.verdict}`}>
      <div>
        <strong>{t(`verdict.${item.verdict}`)}</strong>
        {item.verdict !== 'failed' ? (
          <span>{t('verdict.attemptsLeft', { count: left })}</span>
        ) : null}
      </div>
    </div>
  );
}

function MessageView({
  item,
  onReply,
}: {
  item: InboxItem;
  onReply: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const bundle = caseById.get(item.caseId);
  const progress = useGameState((state) => state.cases[item.caseId]);
  const email = bundle ? findEmail(bundle, item.emailId, locale) : undefined;
  if (!bundle || !email || !progress) return null;

  const isBrief = email.kind === 'brief';
  const accepted = progress.status !== 'available';

  return (
    <article className="message" aria-labelledby={`subject-${item.id}`}>
      <VerdictCard item={item} />
      <header className="message__header">
        <h2 id={`subject-${item.id}`}>{email.subject}</h2>
        <div className="message__meta">
          <span className="message__avatar" aria-hidden>
            {email.from.name.charAt(0)}
          </span>
          <div>
            <strong>{email.from.name}</strong>
            <span className="message__address">
              {email.from.role} · {email.from.address}
            </span>
          </div>
          <time dateTime={email.date}>
            {new Date(email.date).toLocaleString(locale, {
              dateStyle: 'medium',
              timeStyle: 'short',
              timeZone: STORY_TIME_ZONE,
            })}
          </time>
        </div>
      </header>

      <div
        className="message__body"
        // O HTML do caso passa pelo DOMPurify antes de entrar na página.
        dangerouslySetInnerHTML={{ __html: sanitizeCaseHtml(email.html) }}
      />

      {email.attachments.length > 0 ? (
        <section
          className="message__attachments"
          aria-label={t('mail.attachments')}
        >
          <h3>{t('mail.attachments')}</h3>
          {email.attachments.map((file) => (
            <div key={file} className="attachment">
              <Database weight="duotone" aria-hidden />
              <div>
                <code>{file.split('/').pop()}</code>
                <span>
                  {accepted
                    ? t('mail.attachmentReady')
                    : t('mail.attachmentLocked')}
                </span>
              </div>
              {accepted ? (
                <button
                  type="button"
                  className="pill-button pill-button--small"
                  onClick={openTerminal}
                >
                  {t('mail.openTerminal')}
                </button>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      <div className="message__actions">
        {isBrief && !accepted ? (
          <button
            type="button"
            className="pill-button pill-button--suggested"
            onClick={() => {
              gameStore.getState().acceptCase(item.caseId);
              play('success');
            }}
          >
            {t('mail.accept')}
          </button>
        ) : null}
        {isBrief && accepted ? (
          <span className="message__accepted">
            <CheckCircle weight="fill" aria-hidden />
            {t('mail.accepted')}
          </span>
        ) : null}
        {isBrief && progress.status === 'active' ? (
          <button type="button" className="pill-button" onClick={onReply}>
            <ArrowBendUpLeft weight="bold" aria-hidden />
            {t('mail.reply')}
          </button>
        ) : null}
        {item.verdict === 'failed' && progress.status === 'failed' ? (
          <button
            type="button"
            className="pill-button"
            onClick={() => gameStore.getState().reopenCase(item.caseId)}
          >
            <ArrowCounterClockwise weight="bold" aria-hidden />
            {t('mail.reopen')}
          </button>
        ) : null}
      </div>
    </article>
  );
}

/** Mail no jeito do Geary: lista à esquerda, mensagem à direita. */
export function MailApp() {
  const t = useT();
  const locale = useLocale();
  const inbox = useGameState((state) => state.inbox);
  const cases = useGameState((state) => state.cases);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reportCase, setReportCase] = useState<string | null>(null);
  const current = inbox.find((item) => item.id === selectedId) ?? null;

  function select(item: InboxItem) {
    setSelectedId(item.id);
    gameStore.getState().readEmail(item.id);
  }

  const replyCase =
    current && cases[current.caseId]?.status === 'active'
      ? current.caseId
      : null;

  return (
    <div className="mail">
      {replyCase ? (
        <WindowHeaderItems side="end">
          <button
            type="button"
            className="pill-button pill-button--suggested"
            onClick={() => setReportCase(replyCase)}
          >
            <ArrowBendUpLeft weight="bold" aria-hidden />
            {t('mail.reply')}
          </button>
        </WindowHeaderItems>
      ) : null}

      <nav className="mail__list" aria-label={t('mail.inbox')}>
        {inbox.length === 0 ? (
          <p className="mail__empty">{t('mail.empty')}</p>
        ) : (
          <ul>
            {inbox.map((item) => {
              const bundle = caseById.get(item.caseId);
              const email = bundle
                ? findEmail(bundle, item.emailId, locale)
                : undefined;
              if (!email) return null;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className="mail__item"
                    aria-current={item.id === selectedId || undefined}
                    data-unread={!item.read || undefined}
                    onClick={() => select(item)}
                  >
                    <span className="mail__item-top">
                      <span className="mail__sender">{email.from.name}</span>
                      <time dateTime={email.date}>
                        {new Date(email.date).toLocaleDateString(locale, {
                          day: 'numeric',
                          month: 'short',
                          timeZone: STORY_TIME_ZONE,
                        })}
                      </time>
                    </span>
                    <span className="mail__subject">
                      {!item.read ? (
                        <span
                          className="mail__dot"
                          aria-label={t('mail.unread')}
                        />
                      ) : null}
                      {email.subject}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      <div className="mail__reader">
        {current ? (
          <MessageView
            item={current}
            onReply={() => setReportCase(current.caseId)}
          />
        ) : (
          <div className="mail__placeholder">
            <EnvelopeSimpleOpen weight="duotone" aria-hidden />
            <p>{t('mail.select')}</p>
          </div>
        )}
      </div>

      {reportCase ? (
        <ReportDialog
          caseId={reportCase}
          open
          onClose={(sent) => {
            setReportCase(null);
            // Depois de enviar, a resposta da Helena ao relatório abre sozinha.
            if (sent) {
              const answer = gameStore
                .getState()
                .inbox.find((item) => item.verdict !== undefined);
              if (answer) select(answer);
            }
          }}
        />
      ) : null}
    </div>
  );
}
