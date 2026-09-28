/**
 * components/PlanLockedPanel.jsx
 * Inline notice shown in place of anything the current plan can't load --
 * says exactly what happened (plan expired, trial ended, limit reached, or
 * not included) and links straight to the plans. The wording comes from the
 * server, so it is identical everywhere in the tool.
 */
import Link from 'next/link';

export function lockedTitle(reason) {
  if (reason === 'lapsed') return 'Your plan has expired';
  if (reason === 'trial_ended') return 'Your free trial has ended';
  if (reason === 'quota') return 'Monthly limit reached';
  if (reason === 'cap') return 'Plan limit reached';
  return 'Not included in your plan';
}

export default function PlanLockedPanel({ message, locked }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-3">
      <span className="text-xl leading-none mt-0.5">{'\uD83D\uDD12'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800">{lockedTitle(locked && locked.reason)}</p>
        <p className="text-sm text-amber-700 mt-1">{message}</p>
        <Link href="/dashboard/settings/billing" className="btn-primary inline-flex mt-3 text-xs">See plans</Link>
      </div>
    </div>
  );
}