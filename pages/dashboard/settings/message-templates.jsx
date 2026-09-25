/**
 * pages/dashboard/settings/message-templates.jsx
 * Message Templates -- the 3 editable message templates.
 * Split out of the old monolithic settings.jsx into its own category page.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../../components/DashboardLayout';
import withAuth from '../../../components/withAuth';
import api from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { getDefaultTemplates } from '../../../lib/defaultMessageTemplates';

function stripGreetingToken(template) {
  if (!template) return '';
  return template.replace(/^\s*Hi\s*\{\{name\}\}\s*,?\s*/i, '').trim();
}

function stripLinkToken(template) {
  if (!template) return '';
  return template.replace(/\n*\{\{link\}\}\s*$/, '').trim();
}

function stripReferralInfoAndLinkToken(template) {
  if (!template) return '';
  return template
    .replace(/\n*\uD83C\uDF81 Refer \{\{referral_threshold\}\} friends and get \{\{referral_reward\}\}\nYour friend gets: \{\{referral_offer\}\}\n*\{\{link\}\}\s*$/, '')
    .trim();
}

function MessageTemplatesPage() {
  const { user } = useAuth();
  const isStaff = user?.role === 'staff';

  useEffect(function() {
    try {
      if (localStorage.getItem('rb_deep_dive_seen_templates') !== '1') {
        setTimeout(function() {
          if (window.__rbStartDeepDive) window.__rbStartDeepDive('templates');
        }, 50);
      }
    } catch (e) {}
  }, []);

  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState({ review_request: '', thank_refer: '', resolved_followup: '' });
  const [templatesError, setTemplatesError] = useState('');
  const [templatesSaving, setTemplatesSaving] = useState(false);
  const [templatesSaved, setTemplatesSaved] = useState(false);

  useEffect(function() {
    var load = async function() {
      try {
        var res = await api.get('/business/my-settings');
        var b = res.data.data;
        var defaults = getDefaultTemplates(b.type);
        setTemplates({
          review_request: (b.message_templates && b.message_templates.review_request) || defaults.review_request,
          thank_refer:    (b.message_templates && b.message_templates.thank_refer) || defaults.thank_refer,
          resolved_followup: (b.message_templates && b.message_templates.resolved_followup) || defaults.resolved_followup,
        });
      } catch (e) {
        setTemplatesError('Could not load templates. Please refresh and try again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  var handleSaveTemplates = async function() {
    setTemplatesError('');
    setTemplatesSaving(true);
    try {
      await api.patch('/business/my-settings', { message_templates: templates });
      setTemplatesSaved(true);
      setTimeout(function() { setTemplatesSaved(false); }, 3000);
    } catch (err) {
      setTemplatesError(err.response?.data?.error || 'Failed to save templates.');
    } finally {
      setTemplatesSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-2xl">
        <Link href="/dashboard/settings-hub" className="text-xs font-semibold text-purple-600 hover:text-purple-700 mb-2 inline-block">
          {'\u2190 Settings'}
        </Link>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Message Templates</h1>
        <p className="text-xs text-gray-400 mb-6">
          {'Just write the middle part of your message below \u2014 the greeting and the link are added automatically, so you never have to type or worry about them.'}
        </p>

        {isStaff ? (
          <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
            <span className="text-purple-500 text-lg shrink-0">{'\u2139\uFE0F'}</span>
            <p className="text-xs text-purple-700">
              {'You have view-only access to Settings. Contact your business owner to make changes.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            {templatesError && <div className='alert-error'><span>{'\u26A0'}</span><span>{templatesError}</span></div>}
            <div id="tour-template-review-request">
              <label className="label">Review Request Message</label>
              <div className="flex items-center gap-1.5 mb-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100 w-fit">
                <span className='text-gray-400'>{'\uD83D\uDD12'}</span>
                <span className='text-[11px] text-gray-500 font-medium'>{'Hi [Customer\u2019s Name], \u2014 added automatically'}</span>
              </div>
              <textarea
                className="input" rows={3}
                placeholder="please take a moment to share your feedback. It only takes 30 seconds!"
                value={stripGreetingToken(stripLinkToken(templates.review_request))}
                onChange={function(e) { setTemplates(function(t) { return Object.assign({}, t, { review_request: 'Hi {{name}}, ' + e.target.value.trim() + '\n\n{{link}}' }); }); }}
              />
              <div className="flex items-center gap-1.5 mt-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100 w-fit">
                <span className='text-gray-400'>{'\uD83D\uDD12'}</span>
                <span className='text-[11px] text-gray-500 font-medium'>{'Review link \u2014 added automatically at the end'}</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">Sent when requesting a review from a customer.</p>
            </div>
            <div>
              <label className="label">Thank + Refer Message</label>
              <div className="flex items-center gap-1.5 mb-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100 w-fit">
                <span className='text-gray-400'>{'\uD83D\uDD12'}</span>
                <span className='text-[11px] text-gray-500 font-medium'>{'Hi [Customer\u2019s Name], \u2014 added automatically'}</span>
              </div>
              <textarea
                className="input" rows={4}
                placeholder="thank you so much for the {{rating}}-star rating! Here is your referral link to share:"
                value={stripGreetingToken(stripReferralInfoAndLinkToken(templates.thank_refer))}
                onChange={function(e) { setTemplates(function(t) { return Object.assign({}, t, { thank_refer: 'Hi {{name}}, ' + e.target.value.trim() + '\n\n\uD83C\uDF81 Refer {{referral_threshold}} friends and get {{referral_reward}}\nYour friend gets: {{referral_offer}}\n\n{{link}}' }); }); }}
              />
              <div className="flex items-center gap-1.5 mt-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100 w-fit">
                <span className='text-gray-400'>{'\uD83D\uDD12'}</span>
                <span className='text-[11px] text-gray-500 font-medium'>{'Referral link \u2014 added automatically at the end'}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100 w-fit">
                <span className='text-gray-400'>{'\uD83D\uDD12'}</span>
                <span className='text-[11px] text-gray-500 font-medium'>{'Referral count, reward & offer \u2014 pulled automatically from Referral Program Settings'}</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">{'Sent to happy reviewers, thanking them and sharing their referral link. The referral count, reward, and offer shown in the message always reflect your current Referral Program Settings \u2014 edit them there, not here.'}</p>
            </div>
            <div>
              <label className="label">Resolved Follow-Up Message</label>
              <div className="flex items-center gap-1.5 mb-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100 w-fit">
                <span className='text-gray-400'>{'\uD83D\uDD12'}</span>
                <span className='text-[11px] text-gray-500 font-medium'>{'Hi [Customer\u2019s Name], \u2014 added automatically'}</span>
              </div>
              <textarea
                className="input" rows={3}
                placeholder="we have resolved the issue you mentioned earlier and hope things are looking better now."
                value={stripGreetingToken(stripLinkToken(templates.resolved_followup))}
                onChange={function(e) { setTemplates(function(t) { return Object.assign({}, t, { resolved_followup: 'Hi {{name}}, ' + e.target.value.trim() + '\n\n{{link}}' }); }); }}
              />
              <div className="flex items-center gap-1.5 mt-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100 w-fit">
                <span className='text-gray-400'>{'\uD83D\uDD12'}</span>
                <span className='text-[11px] text-gray-500 font-medium'>{'Review link \u2014 added automatically at the end'}</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">Sent when you tap Resend Request on feedback you have already resolved \u2014 nudges them to consider updating their rating.</p>
            </div>
            <div id="tour-template-save" className="flex items-center gap-3">
              <button type="button" onClick={handleSaveTemplates} disabled={templatesSaving}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl px-6 py-2.5 transition-colors">
                {templatesSaving ? 'Saving...' : 'Save Templates'}</button>
              {templatesSaved && <span className="text-sm text-green-600 font-medium">{'\u2713 Saved'}</span>}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default withAuth(MessageTemplatesPage);