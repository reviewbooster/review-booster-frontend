var DEFAULT_REVIEW_TEMPLATE = 'Hi {{name}}, please take a moment to share your feedback. It only takes 30 seconds!\n\n{{link}}';
/**
 * pages/dashboard/customers.jsx
 * Customers page  --  Phase 2 + CSV import (S16) + Edit customer + details nav (S17).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/DashboardLayout';
import withAuth from '../../components/withAuth';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import StaffPicker from '../../components/StaffPicker';
import InfoButton from '../../components/InfoButton';
import { getDefaultTemplates } from '../../lib/defaultMessageTemplates';
import { waLinkProps } from '../../lib/waLink';
import { getNotesLabel } from '../../lib/industryFieldLabels';

const AVATAR_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#0EA5E9'];
function avatarBg(idx) { return AVATAR_COLORS[idx % AVATAR_COLORS.length]; }

// Fixed segment tags an owner can toggle on a customer. 'referral' is set
// automatically elsewhere and is not user-toggleable here.
var TAG_OPTIONS = [
  { key: 'vip',       label: 'VIP',       style: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'frequent',  label: 'Frequent',  style: 'bg-blue-50 text-blue-700 border-blue-200' },
];
function tagLabel(key) {
  var found = TAG_OPTIONS.filter(function(t) { return t.key === key; })[0];
  return found ? found.label : key;
}
function tagStyle(key) {
  var found = TAG_OPTIONS.filter(function(t) { return t.key === key; })[0];
  return found ? found.style : 'bg-gray-50 text-gray-500 border-gray-200';
}

function fmtDate(d) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeAgo(d) {
  if (!d) return '\u2014';
  var then = new Date(d);
  var now  = new Date();
  var diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 0) diffSec = 0;

  if (diffSec < 60) {
    return diffSec + (diffSec === 1 ? ' second ago' : ' seconds ago');
  }
  var diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return diffMin + (diffMin === 1 ? ' min ago' : ' mins ago');
  }
  var diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) {
    return diffHr + (diffHr === 1 ? ' hour ago' : ' hours ago');
  }
  var time = then.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  var date = then.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });
  return time + ' ' + date;
}

function buildPages(page, total) {
  if (total <= 6) return Array.from({ length: total }, (_, i) => i + 1);
  if (page <= 3)       return [1, 2, 3, '_d1', total];
  if (page >= total-2) return [1, '_d1', total-2, total-1, total];
  return [1, '_d1', page-1, page, page+1, '_d2', total];
}

// -- Add Customer Modal --------------------------------------------------------
var COUNTRY_CODES = [
  { code: '+91',  flag: '\uD83C\uDDEE\uD83C\uDDF3' },
  { code: '+1',   flag: '\uD83C\uDDFA\uD83C\uDDF8' },
  { code: '+44',  flag: '\uD83C\uDDEC\uD83C\uDDE7' },
  { code: '+971', flag: '\uD83C\uDDE6\uD83C\uDDEA' },
  { code: '+65',  flag: '\uD83C\uDDF8\uD83C\uDDEC' },
  { code: '+61',  flag: '\uD83C\uDDE6\uD83C\uDDFA' },
  { code: '+966', flag: '\uD83C\uDDF8\uD83C\uDDE6' },
  { code: '+974', flag: '\uD83C\uDDF6\uD83C\uDDE6' },
];

function AddCustomerModal({ onClose, onCreated }) {
  const [form,    setForm]    = useState({ name: '', phoneCode: '+91', phoneNumber: '', email: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [duplicate,        setDuplicate]        = useState(null);
  const [checkingDup,      setCheckingDup]      = useState(false);
  const [confirmedAnyway,  setConfirmedAnyway]  = useState(false);

  const checkDuplicate = async () => {
    const term = form.phoneNumber ? (form.phoneCode + form.phoneNumber) : form.email;
    if (!term) return null;
    try {
      const { data } = await api.get('/customers?search=' + encodeURIComponent(term) + '&limit=5');
      const list = data.data ?? [];
      return list.find(c =>
        (form.phoneNumber && c.phone === (form.phoneCode + form.phoneNumber)) ||
        (form.email && c.email && c.email.toLowerCase() === form.email.toLowerCase())
      ) || null;
    } catch {
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!confirmedAnyway) {
      setCheckingDup(true);
      const match = await checkDuplicate();
      setCheckingDup(false);
      if (match) {
        setDuplicate(match);
        return;
      }
    }

    setLoading(true);
    try {
      const payload = { name: form.name, phone: form.phoneNumber ? (form.phoneCode + form.phoneNumber) : '', email: form.email };
      const { data } = await api.post('/customers', payload);
      onCreated(data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add customer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Add Customer</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">{'\u2715'}</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="alert-error"><span>{'\u26A0'}</span><span>{error}</span></div>}
          <div>
            <label className="label">Full Name *</label>
            <input className="input" required placeholder="e.g. Priya Sharma"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Phone</label>
            <div className="flex gap-2">
              <select
                className="input w-28 shrink-0"
                value={form.phoneCode}
                onChange={e => setForm(f => ({ ...f, phoneCode: e.target.value }))}
              >
                {COUNTRY_CODES.map(function(c) {
                  return <option key={c.code} value={c.code}>{c.code + '  ' + c.flag}</option>;
                })}
              </select>
              <input className="input flex-1" placeholder="98765 43210"
                value={form.phoneNumber} onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value.replace(/[^0-9]/g, '') }))} />
            </div>
            <p className="text-xs text-gray-400 mt-1">Select the country code, then enter the number without it.</p>
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="customer@gmail.com"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          {duplicate && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-700">
              <p className="font-semibold mb-1">{'Possible duplicate: ' + duplicate.name}</p>
              <p className="text-xs text-amber-600 mb-2">This phone or email already belongs to an existing customer.</p>
              <button type="button"
                onClick={() => { setConfirmedAnyway(true); setDuplicate(null); }}
                className="text-xs font-semibold text-amber-800 underline">
                Add anyway
              </button>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading || checkingDup} className="btn-primary flex-1 justify-center">
              {loading ? <><span className="spinner" />{' Adding\u2026'}</> : checkingDup ? <><span className="spinner" />{' Checking\u2026'}</> : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -- Edit Customer Modal -------------------------------------------------------
function EditCustomerModal({ customer, businessType, onClose, onUpdated }) {
  const [form, setForm] = useState({
    name:      customer.name      || '',
    phone:     customer.phone     || '',
    email:     customer.email     || '',
    notes:     customer.notes     || '',
    tags:      customer.tags      || [],
    opted_out: customer.opted_out || false,
  });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const toggleTag = (key) => {
    setForm(f => ({
      ...f,
      tags: f.tags.indexOf(key) !== -1 ? f.tags.filter(t => t !== key) : [...f.tags, key],
    }));
  };

  const [customTagInput, setCustomTagInput] = useState('');
  const addCustomTag = () => {
    var val = customTagInput.trim().toLowerCase();
    if (!val) return;
    if (form.tags.indexOf(val) === -1) {
      setForm(f => ({ ...f, tags: [...f.tags, val] }));
    }
    setCustomTagInput('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        name:      form.name,
        phone:     form.phone  || null,
        email:     form.email  || null,
        notes:     form.notes  || null,
        tags:      form.tags,
        opted_out: form.opted_out,
      };
      const { data } = await api.put('/customers/' + customer._id, payload);
      onUpdated(data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update customer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-slide-up overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Edit Customer</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">{'\u2715'}</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="alert-error"><span>{'\u26A0'}</span><span>{error}</span></div>}
          <div>
            <label className="label">Full Name *</label>
            <input className="input" required placeholder="e.g. Priya Sharma"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Phone (E.164 format)</label>
            <input className="input" placeholder="+919876543210"
              value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            <p className="text-xs text-gray-400 mt-1">Include country code, e.g. +919876543210</p>
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="customer@gmail.com"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="label">{getNotesLabel(businessType).label}</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder={getNotesLabel(businessType).placeholder}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            ></textarea>
          </div>
          <div>
            <label className="label">Segments</label>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map(function(t) {
                var active = form.tags.indexOf(t.key) !== -1;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => toggleTag(t.key)}
                    className={'text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ' +
                      (active ? t.style : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300')}
                  >
                    {t.label}
                  </button>
                );
              })}
              {form.tags.filter(function(t) {
                return t !== 'referral' && TAG_OPTIONS.filter(function(o) { return o.key === t; }).length === 0;
              }).map(function(t) {
                return (
                  <span key={t} className="flex items-center gap-1.5 text-xs font-semibold pl-3 pr-2 py-1.5 rounded-full border bg-gray-50 text-gray-600 border-gray-200">
                    {t}
                    <button type="button" onClick={() => toggleTag(t)} className="text-gray-400 hover:text-gray-600 leading-none">
                      {'\u2715'}
                    </button>
                  </span>
                );
              })}
            </div>
            <div className="flex gap-2 mt-2">
              <input
                className="input flex-1"
                placeholder="Add a custom segment..."
                value={customTagInput}
                onChange={e => setCustomTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); } }}
              />
              <button
                type="button"
                onClick={addCustomTag}
                className="shrink-0 text-xs font-semibold px-4 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-gray-700">Customer Status</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {form.opted_out
                  ? 'Inactive \u2014 will not receive requests'
                  : 'Active \u2014 can receive requests'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, opted_out: !f.opted_out }))}
              className={'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ' +
                (form.opted_out ? 'bg-gray-300' : 'bg-purple-600')}
            >
              <span
                className={'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ' +
                  (form.opted_out ? 'translate-x-1' : 'translate-x-6')}
              />
            </button>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? <><span className="spinner" />{' Saving\u2026'}</> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -- Delete Confirm Modal ------------------------------------------------------
function DeleteConfirmModal({ customer, onClose, onDeleted }) {
  // The actual API delete is delayed by the parent (undo window)  --  this modal
  // just confirms intent and hands the customer back immediately.
  const handleDelete = () => {
    onDeleted(customer);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-slide-up">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-red-500 font-bold text-lg">
              {'!'}
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Delete Customer</h2>
              <p className="text-xs text-gray-400 mt-0.5">You can undo this for a few seconds after</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-5">
            {'Are you sure you want to delete '}
            <span className="font-semibold text-gray-900">{customer.name}</span>
            {'?'}
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button onClick={handleDelete}
              className="flex-1 justify-center flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors duration-150">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Pre-filled link builder ---------------------------------------------------
function fillTemplate(template, vars) {
  var result = template;
  Object.keys(vars).forEach(function(k) {
    result = result.split('{{' + k + '}}').join(vars[k] == null ? '' : vars[k]);
  });
  return result;
}

function buildPrefilledLink(channel, customer, reviewUrl, template) {
  var msg = fillTemplate(template || DEFAULT_REVIEW_TEMPLATE, { name: customer.name, link: reviewUrl });
  if (channel === 'whatsapp') {
    var phone = customer.phone.replace(/^\+/, '');
    return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(msg);
  }
  if (channel === 'sms') {
    return 'sms:' + customer.phone + '?body=' + encodeURIComponent(msg);
  }
  if (channel === 'email') {
    return 'mailto:' + customer.email +
      '?subject=' + encodeURIComponent('We would love your feedback!') +
      '&body='    + encodeURIComponent(msg);
  }
  return reviewUrl;
}

// -- Send Request Modal --------------------------------------------------------
function SendRequestModal({ customer, onClose, onSent }) {
  const [loadingCh, setLoadingCh] = useState(null);
  const [error,     setError]     = useState('');
  const [servedBy,  setServedBy]  = useState(null);
  const [template,  setTemplate]  = useState(DEFAULT_REVIEW_TEMPLATE);

  useEffect(function() {
    api.get('/business/my-settings').then(function(res) {
      var biz = res.data && res.data.data;
      var mt = biz && biz.message_templates;
      if (mt && mt.review_request) {
        setTemplate(mt.review_request);
      } else if (biz && biz.type) {
        setTemplate(getDefaultTemplates(biz.type).review_request);
      }
    }).catch(function() {});
  }, []);

  const CHANNEL_META = {
    whatsapp: { label: 'WhatsApp', color: 'bg-green-500 hover:bg-green-600',   needs: 'phone' },
    sms:      { label: 'SMS',      color: 'bg-blue-500 hover:bg-blue-600',     needs: 'phone' },
    email:    { label: 'Email',    color: 'bg-purple-500 hover:bg-purple-600', needs: 'email' },
  };

  const handleSend = async (channel) => {
    setError('');
    setLoadingCh(channel);
    try {
      const { data } = await api.post('/requests', { customer_id: customer._id, channel, served_by: servedBy });
      const link = buildPrefilledLink(channel, customer, data.review_url, template);
      onSent();
      // Navigating the current tab (not opening a new window) is what
      // reliably hands off to WhatsApp/Messages/Mail on mobile -- a
      // wa.me/sms/mailto URL doesn't actually leave the page, the OS just
      // intercepts it, so this works the same as a real click would.
      window.location.href = link;
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate link.');
      setLoadingCh(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">
              {'Send Review Request'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{customer.name}</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">{'\u2715'}</button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="alert-error"><span>{'!'}</span><span>{error}</span></div>}
          <p className="text-sm text-gray-500">Tap a channel to send the review request.</p>
          <StaffPicker value={servedBy} onChange={setServedBy} label="Who served this customer? (optional)" />
          <div className="space-y-3">
            {['whatsapp', 'sms', 'email'].map(ch => {
              const meta   = CHANNEL_META[ch];
              const noData = meta.needs === 'phone' ? !customer.phone : !customer.email;
              return (
                <button key={ch} onClick={() => handleSend(ch)} disabled={!!loadingCh || noData}
                  className={'w-full flex items-center justify-between px-4 py-3 rounded-xl text-white text-sm font-semibold transition-colors duration-150 ' + meta.color + ' disabled:opacity-40 disabled:cursor-not-allowed'}>
                  <span>{meta.label}</span>
                  {loadingCh === ch
                    ? <span className="spinner border-white/30 border-t-white" />
                    : noData
                      ? <span className="text-xs font-normal opacity-70">{'No ' + meta.needs}</span>
                      : <span className="opacity-60">{'\u2192'}</span>}
                </button>
              );
            })}
          </div>
          <button onClick={onClose} className="btn-secondary w-full justify-center">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// -- Import Modal --------------------------------------------------------------
function ImportModal({ onClose, onImported }) {
  const [step,       setStep]       = useState(1);
  const [file,       setFile]       = useState(null);
  const [preview,    setPreview]    = useState(null);
  const [uploading,  setUploading]  = useState(false);
  const [result,     setResult]     = useState(null);
  const [parseError, setParseError] = useState('');
  const [dragging,   setDragging]   = useState(false);

  const parseCSVPreview = (text) => {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
    if (lines.length < 1) return null;
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const dataRows = lines.slice(1).map(line => line.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
    const preview5 = dataRows.slice(0, 5).map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i] || ''; });
      return obj;
    });
    return { headers, rows: preview5, totalDataRows: dataRows.length };
  };

  const handleFile = (f) => {
    setParseError('');
    if (!f) return;
    const parts = f.name.split('.');
    const ext   = parts[parts.length - 1].toLowerCase();
    if (ext !== 'csv' && ext !== 'xlsx') {
      setParseError('Only .csv and .xlsx files are supported.');
      return;
    }
    setFile(f);
    if (ext === 'csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const p = parseCSVPreview(e.target.result);
        if (!p) { setParseError('Could not parse CSV file.'); return; }
        setPreview(p);
        setStep(2);
      };
      reader.readAsText(f);
    } else {
      setPreview({ isXlsx: true, fileName: f.name, fileSize: f.size });
      setStep(2);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setUploading(true);
    setParseError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/customers/import', formData);
      setResult(data);
      setStep(3);
      if (data.created > 0) onImported();
    } catch (err) {
      setParseError(err.response?.data?.error || 'Import failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csv  = 'name,phone,email\nPriya Sharma,9876543210,priya@example.com\nRaj Patel,9123456789,raj@example.com';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'customers_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const stepLabel = step === 1 ? 'Select file' : step === 2 ? 'Confirm import' : 'Done';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">Import Customers</h2>
            <p className="text-xs text-gray-400 mt-0.5">{'Step ' + step + ' of 3 \u2014 ' + stepLabel}</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">{'\u2715'}</button>
        </div>
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('rb-import-input').click()}
                className={'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ' +
                  (dragging ? 'border-purple-400 bg-purple-50' : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50')}
              >
                <p className="text-3xl mb-2">{'\uD83D\uDCC4'}</p>
                <p className="text-sm font-semibold text-gray-700">Drop your file here, or click to browse</p>
                <p className="text-xs text-gray-400 mt-1">Supports .csv and .xlsx files up to 500 KB</p>
                <input
                  id="rb-import-input"
                  type="file"
                  accept=".csv,.xlsx"
                  className="hidden"
                  onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); }}
                />
              </div>
              {parseError && (
                <div className="alert-error"><span>{'\u26A0'}</span><span>{parseError}</span></div>
              )}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-600 mb-2">Required columns</p>
                <div className="overflow-x-auto">
                  <table className="text-xs w-full">
                    <thead>
                      <tr>
                        <th className="text-left font-semibold text-gray-700 pr-6 pb-1.5">name *</th>
                        <th className="text-left font-semibold text-gray-700 pr-6 pb-1.5">phone *</th>
                        <th className="text-left font-semibold text-gray-400 pb-1.5">email</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="text-gray-500">
                        <td className="pr-6 py-0.5">Priya Sharma</td>
                        <td className="pr-6 py-0.5">9876543210</td>
                        <td className="py-0.5">priya@gmail.com</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-gray-400 mt-2">Phone: 10 digits (auto +91) or full E.164. Column headers like "Mobile", "Phone Number", "Full Name" are auto-recognised.</p>
              </div>
              <button onClick={downloadTemplate} className="btn-secondary w-full justify-center text-sm">
                {'\u2B07 Download template (.csv)'}
              </button>
            </div>
          )}
          {step === 2 && preview && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-purple-50 border border-purple-100 rounded-xl p-3">
                <p className="text-2xl leading-none">{'\uD83D\uDCC4'}</p>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{file.name}</p>
                  <p className="text-xs text-gray-400">
                    {(file.size / 1024).toFixed(1) + ' KB' +
                      (preview.totalDataRows != null ? '\u00A0\u2014\u00A0' + preview.totalDataRows + ' data rows detected' : '')}
                  </p>
                </div>
                <button
                  onClick={() => { setFile(null); setPreview(null); setParseError(''); setStep(1); }}
                  className="text-xs text-purple-600 hover:underline shrink-0"
                >
                  Change
                </button>
              </div>
              {preview.rows && preview.rows.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">
                    {'Preview (' + preview.rows.length + ' of ' + preview.totalDataRows + ' rows)'}
                  </p>
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="text-xs w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          {preview.headers.map(h => (
                            <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.map((row, i) => (
                          <tr key={i} className="border-b border-gray-50 last:border-0">
                            {preview.headers.map(h => (
                              <td key={h} className="px-3 py-2 text-gray-500 max-w-[140px] truncate">{row[h] || '\u2014'}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {preview.isXlsx && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                  {'\u2139  Excel file selected. All rows will be validated during import.'}
                </div>
              )}
              {parseError && (
                <div className="alert-error"><span>{'\u26A0'}</span><span>{parseError}</span></div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setStep(1); setParseError(''); }} className="btn-secondary flex-1 justify-center">Back</button>
                <button onClick={handleImport} disabled={uploading} className="btn-primary flex-1 justify-center">
                  {uploading
                    ? <><span className="spinner" />{' Importing\u2026'}</>
                    : 'Import' + (preview.totalDataRows != null ? ' ' + preview.totalDataRows + ' rows' : '')}
                </button>
              </div>
            </div>
          )}
          {step === 3 && result && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{result.created}</p>
                  <p className="text-xs text-green-700 mt-1">Added</p>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-400">{result.skipped}</p>
                  <p className="text-xs text-gray-500 mt-1">Skipped (duplicates)</p>
                </div>
              </div>
              {result.errors && result.errors.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-500 mb-2">
                    {result.errors.length + (result.errors.length === 1 ? ' row had issues' : ' rows had issues')}
                  </p>
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-red-100 divide-y divide-red-50">
                    {result.errors.map((e, i) => (
                      <div key={i} className="flex items-start gap-2 px-3 py-2 text-xs">
                        <span className="font-semibold text-red-400 shrink-0">{'Row ' + e.row}</span>
                        <span className="text-gray-500">{e.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={onClose} className="btn-primary w-full justify-center">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// -- Customers Page ------------------------------------------------------------
function CustomersPage() {
  const router = useRouter();
  const { user } = useAuth();
  useEffect(function() { localStorage.setItem('rb_visited_customers', '1'); }, []);
  useEffect(function() {
    try {
      if (localStorage.getItem('rb_deep_dive_seen_customers') !== '1') {
        setTimeout(function() {
          if (window.__rbStartDeepDive) window.__rbStartDeepDive('customers');
        }, 50);
      }
    } catch (e) {}
  }, []);
  const isStaff = user?.role === 'staff';

  const [customers,    setCustomers]    = useState([]);
  const [total,        setTotal]        = useState(0);
  const [page,         setPage]         = useState(1);
  const [search,       setSearch]       = useState('');
  const [activeTab,    setActiveTab]    = useState('all');
  const [sort,         setSort]         = useState('newest');
  const [sortMenuOpen,  setSortMenuOpen]  = useState(false);
  const [sortMenuView,  setSortMenuView]  = useState('main'); // 'main' | 'segments'
  const [tagFilter,     setTagFilter]     = useState('');
  const [followupFilter, setFollowupFilter] = useState(false);
  const [businessType,  setBusinessType]  = useState(null);
  const [customTags,        setCustomTags]        = useState([]);
  const [customTagsLoaded,  setCustomTagsLoaded]   = useState(false);
  const [customTagsLoading, setCustomTagsLoading]  = useState(false);
  const [tabCounts,    setTabCounts]    = useState({ all: 0, vip: 0, followup: 0, inactive: 0 });
  const [countsReady,  setCountsReady]  = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [toast,        setToast]        = useState('');
  const [showAdd,      setShowAdd]      = useState(false);
  const [showImport,   setShowImport]   = useState(false);
  const [sendTarget,   setSendTarget]   = useState(null);
  const [editTarget,   setEditTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null); // { customer, timerId }
  const [, setTimeTick] = useState(0);

  // Force a re-render every few seconds so the relative "time ago" labels tick upward live
  useEffect(() => {
    const id = setInterval(() => setTimeTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);
  const [menuOpenId,   setMenuOpenId]   = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [dataMenuOpen, setDataMenuOpen] = useState(false);

  var handleExportCustomers = async function(format) {
    var fmt = format || 'csv';
    setExportLoading(true);
    try {
      var res = await api.get('/customers/export?format=' + fmt, { responseType: 'blob' });
      var url = URL.createObjectURL(res.data);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'customers-export.' + fmt;
      a.click();
      URL.revokeObjectURL(url);
    } catch (_) {}
    setExportLoading(false);
  };
  const LIMIT = 10;

  useEffect(() => {
    const close = () => setMenuOpenId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const refreshCounts = useCallback(() => {
    Promise.all([
      api.get('/customers?limit=1'),
      api.get('/customers?limit=1&tag=vip'),
      api.get('/customers?limit=1&due_followup=true'),
      api.get('/customers?limit=1&status=inactive'),
    ]).then(([a, b, c, d]) => {
      setTabCounts({ all: a.data.total || 0, vip: b.data.total || 0, followup: c.data.total || 0, inactive: d.data.total || 0 });
      setCountsReady(true);
    }).catch(() => { setCountsReady(true); });
  }, []);

  useEffect(() => { refreshCounts(); }, [refreshCounts]);

  useEffect(() => {
    api.get('/business/my-settings').then(function(res) {
      var biz = res.data && res.data.data;
      if (biz && biz.type) setBusinessType(biz.type);
    }).catch(function() {});
  }, []);

  const loadRequestId = useRef(0);

  const load = useCallback(async () => {
    const thisRequestId = ++loadRequestId.current;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit: LIMIT, sort });
      if (search)              params.set('search', search);
      if (activeTab !== 'all') params.set('status', activeTab);
      if (tagFilter)           params.set('tag', tagFilter);
      if (followupFilter)      params.set('due_followup', 'true');
      const { data } = await api.get('/customers?' + params.toString());
      if (thisRequestId !== loadRequestId.current) return; // a newer request has already fired -- discard this stale response
      setCustomers(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch {
      if (thisRequestId === loadRequestId.current) setError('Failed to load customers.');
    } finally {
      if (thisRequestId === loadRequestId.current) setLoading(false);
    }
  }, [page, search, activeTab, sort, tagFilter, followupFilter]);

  useEffect(() => { load(); }, [load]);

  const handleTabChange = (key) => {
    if (key === 'all')      { setActiveTab('all');      setTagFilter(''); setFollowupFilter(false); }
    else if (key === 'vip') { setActiveTab('all');       setTagFilter('vip'); setFollowupFilter(false); }
    else if (key === 'followup') { setActiveTab('all');  setTagFilter(''); setFollowupFilter(true); }
    else if (key === 'inactive') { setActiveTab('inactive'); setTagFilter(''); setFollowupFilter(false); }
    setPage(1);
  };
  const handleSearch    = (val) => { setSearch(val);    setPage(1); };

  const openSegmentsView = async () => {
    setSortMenuView('segments');
    if (customTagsLoaded) return;
    setCustomTagsLoading(true);
    try {
      const { data } = await api.get('/customers/tags');
      setCustomTags(data.data || []);
    } catch {
      setCustomTags([]);
    } finally {
      setCustomTagsLoading(false);
      setCustomTagsLoaded(true);
    }
  };

  const handleDeleted = (customer) => {
    setCustomers(prev => prev.filter(c => c._id !== customer._id));
    setTotal(t => t - 1);
    setTabCounts(prev => {
      const key = customer?.opted_out ? 'inactive' : 'active';
      return {
        all:      Math.max(0, prev.all - 1),
        active:   key === 'active'   ? Math.max(0, prev.active - 1)   : prev.active,
        inactive: key === 'inactive' ? Math.max(0, prev.inactive - 1) : prev.inactive,
      };
    });

    const timerId = setTimeout(() => {
      api.delete('/customers/' + customer._id).catch(() => { /* already removed from view either way */ });
      setPendingDelete((cur) => (cur && cur.customer._id === customer._id ? null : cur));
    }, 5000);

    setPendingDelete({ customer, timerId });
  };

  const handleUndoDelete = () => {
    if (!pendingDelete) return;
    clearTimeout(pendingDelete.timerId);
    const { customer } = pendingDelete;
    setCustomers(prev => [customer, ...prev]);
    setTotal(t => t + 1);
    setTabCounts(prev => {
      const key = customer?.opted_out ? 'inactive' : 'active';
      return {
        all:      prev.all + 1,
        active:   key === 'active'   ? prev.active + 1   : prev.active,
        inactive: key === 'inactive' ? prev.inactive + 1 : prev.inactive,
      };
    });
    setPendingDelete(null);
  };

  const handleUpdated = () => {
    load();
    refreshCounts();
    showToast('Customer updated!');
  };

  const totalPages = Math.ceil(total / LIMIT);

  const TABS = [
    { key: 'all',      label: 'All',       count: tabCounts.all },
    { key: 'vip',      label: 'VIP',       count: tabCounts.vip },
    { key: 'followup', label: 'Follow-up', count: tabCounts.followup },
    { key: 'inactive', label: 'Inactive',  count: tabCounts.inactive },
  ];
  const activeTabKey = tagFilter === 'vip' ? 'vip' : followupFilter ? 'followup' : activeTab === 'inactive' ? 'inactive' : 'all';

  return (
    <DashboardLayout>

      {toast && (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-50 alert-success shadow-lg animate-slide-up">
          <span>{'\u2713'}</span><span>{toast}</span>
        </div>
      )}

      {pendingDelete && (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-50 bg-gray-900 text-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-4 animate-slide-up">
          <span className="text-sm">
            {'Customer deleted \u2014 '}<span className="font-semibold">{pendingDelete.customer.name}</span>
          </span>
          <button
            onClick={handleUndoDelete}
            className="text-purple-300 hover:text-purple-200 text-sm font-bold shrink-0"
          >
            Undo
          </button>
        </div>
      )}

      {showAdd && (
        <AddCustomerModal
          onClose={() => setShowAdd(false)}
          onCreated={(c) => {
            setCustomers(prev => [c, ...prev]);
            setTotal(t => t + 1);
            setTabCounts(prev => ({ ...prev, all: prev.all + 1, active: prev.active + 1 }));
            showToast('Customer added!');
          }} />
      )}
      {editTarget && (
        <EditCustomerModal
          customer={editTarget}
          businessType={businessType}
          onClose={() => setEditTarget(null)}
          onUpdated={handleUpdated} />
      )}
      {sendTarget && (
        <SendRequestModal
          customer={sendTarget}
          onClose={() => setSendTarget(null)}
          onSent={() => showToast('Review link ready for ' + sendTarget.name + '!')} />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          customer={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted} />
      )}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={() => { load(); refreshCounts(); showToast('Import complete!'); }} />
      )}

      <div className="mb-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 shrink-0">
            <h1 className="text-xl font-bold text-gray-900">Customers</h1>
            <InfoButton title="Customers">
              Keep customer activity, feedback, and follow-ups organized in one place. Every customer who scans your QR code or gets added manually shows up here, along with their review history, any private feedback they've left, and whether they need a follow-up.
            </InfoButton>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <button
                onClick={function() { setDataMenuOpen(function(v) { return !v; }); }}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-600 transition-colors"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                <span className="hidden sm:inline">{'Import / Export'}</span>
                <span className="sm:hidden">{'Import/Export'}</span>
              </button>
              {dataMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={function() { setDataMenuOpen(false); }} />
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden z-20">
                    <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Export</p>
                    <button
                      onClick={function() { setDataMenuOpen(false); handleExportCustomers('csv'); }}
                      disabled={exportLoading}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
                      {exportLoading ? 'Exporting\u2026' : 'Export as CSV'}
                    </button>
                    <button
                      onClick={function() { setDataMenuOpen(false); handleExportCustomers('pdf'); }}
                      disabled={exportLoading}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
                      {'Export as PDF'}
                    </button>
                    {!isStaff && (
                      <>
                        <div className="h-px bg-gray-100 my-1" />
                        <p className="px-4 pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Import</p>
                        <button
                          onClick={function() { setDataMenuOpen(false); setShowImport(true); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                          {'Import from CSV'}
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
            {!isStaff && (
              <button
                id="tour-add-customer"
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#7C3AED' }}
              >
                <span className="hidden sm:inline">{'+ Add Customer'}</span>
                <span className="sm:hidden">{'+ Add'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 px-1">
        <div>
          <p className="text-2xl font-bold text-gray-900">{countsReady ? tabCounts.all.toLocaleString() : '\u2014'}</p>
          <p className="text-xs text-gray-400">Total customers</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/follow-ups')}
          className="text-right hover:opacity-70 transition-opacity">
          <p className="text-2xl font-bold text-orange-500">{countsReady ? tabCounts.followup.toLocaleString() : '\u2014'}</p>
          <p className="text-xs text-gray-400 underline decoration-dotted">Need follow-up</p>
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
            </svg>
          </span>
          <input
            className="w-full bg-gray-100 rounded-xl pl-10 pr-10 py-3 text-base sm:text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-200 transition"
            placeholder="Search by name, phone or email..."
            value={search}
            onChange={e => handleSearch(e.target.value)} />
          <button
            type="button"
            onClick={() => setSortMenuOpen(function(v) { return !v; })}
            aria-label="Sort customers"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-600 transition-colors p-1"
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 9h10M11 14h2" />
            </svg>
          </button>
          {sortMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => { setSortMenuOpen(false); setSortMenuView('main'); }} />
              <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden z-20">
                {sortMenuView === 'main' ? (
                  <>
                    {[
                      { key: 'newest',    label: 'Newest first' },
                      { key: 'qr',        label: 'QR Signups First' },
                      { key: 'oldest',    label: 'Oldest first' },
                      { key: 'name_asc',  label: 'Name A-Z' },
                      { key: 'name_desc', label: 'Name Z-A' },
                    ].map(function(opt) {
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => { setSort(opt.key); setTagFilter(''); setPage(1); setSortMenuOpen(false); }}
                          className={'w-full text-left px-4 py-2.5 text-sm transition-colors ' +
                            (sort === opt.key && !tagFilter ? 'bg-purple-50 text-purple-700 font-semibold' : 'text-gray-600 hover:bg-gray-50')}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={function() { openSegmentsView(); }}
                      className={'w-full flex items-center justify-between px-4 py-2.5 text-sm border-t border-gray-100 transition-colors ' +
                        (tagFilter ? 'bg-purple-50 text-purple-700 font-semibold' : 'text-gray-600 hover:bg-gray-50')}
                    >
                      <span>{tagFilter ? 'Segment: ' + tagLabel(tagFilter) : 'Segment'}</span>
                      <span className="text-gray-400">{'\u203A'}</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setSortMenuView('main')}
                      className="w-full flex items-center gap-1.5 text-left px-4 py-2.5 text-xs font-semibold text-gray-400 hover:text-gray-600 border-b border-gray-100 transition-colors"
                    >
                      <span>{'\u2039'}</span><span>Back</span>
                    </button>
                    {TAG_OPTIONS.map(function(t) {
                      return (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => { setTagFilter(t.key); setPage(1); setSortMenuOpen(false); setSortMenuView('main'); }}
                          className={'w-full text-left px-4 py-2.5 text-sm transition-colors ' +
                            (tagFilter === t.key ? 'bg-purple-50 text-purple-700 font-semibold' : 'text-gray-600 hover:bg-gray-50')}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                    {customTagsLoading && (
                      <p className="px-4 py-2.5 text-xs text-gray-400">Loading...</p>
                    )}
                    {!customTagsLoading && customTags.length > 0 && (
                      <div className="border-t border-gray-100">
                        {customTags.map(function(ct) {
                          return (
                            <button
                              key={ct}
                              type="button"
                              onClick={() => { setTagFilter(ct); setPage(1); setSortMenuOpen(false); setSortMenuView('main'); }}
                              className={'w-full text-left px-4 py-2.5 text-sm transition-colors ' +
                                (tagFilter === ct ? 'bg-purple-50 text-purple-700 font-semibold' : 'text-gray-600 hover:bg-gray-50')}
                            >
                              {ct}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {tagFilter && tagFilter !== 'vip' && tagFilter !== 'follow-up' && (
        <div className="flex items-center gap-2 mb-3">
          <span className={'inline-flex items-center gap-1.5 text-xs font-semibold pl-3 pr-2 py-1 rounded-full border ' + tagStyle(tagFilter)}>
            {'Showing: ' + tagLabel(tagFilter)}
            <button type="button" onClick={() => { setTagFilter(''); setPage(1); }} className="hover:opacity-60">
              {'\u2715'}
            </button>
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={'shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors duration-150 border ' +
              (activeTabKey === tab.key
                ? 'bg-purple-600 border-purple-600 text-white'
                : 'bg-white border-gray-200 text-gray-500 hover:border-purple-300 hover:text-purple-600')}
          >
            {tab.label + (countsReady ? ' ' + tab.count.toLocaleString() : '')}
          </button>
        ))}
      </div>

      {error && <div className="alert-error mb-4"><span>{'\u26A0'}</span><span>{error}</span></div>}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 last:border-0">
              <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-gray-200 rounded-full animate-pulse w-28" />
                <div className="h-3 bg-gray-100 rounded-full animate-pulse w-36" />
                <div className="h-3 bg-gray-100 rounded-full animate-pulse w-24" />
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <div className="h-4 w-14 bg-gray-100 rounded-full animate-pulse" />
                <div className="h-3 w-16 bg-gray-100 rounded-full animate-pulse" />
              </div>
            </div>
          ))
        ) : customers.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-center px-6">
            <p className="text-4xl mb-3">{'\uD83D\uDC65'}</p>
            <p className="text-sm font-semibold text-gray-700 mb-1">
              {search ? 'No customers match your search' : 'No customers yet'}
            </p>
            <p className="text-xs text-gray-400">Add your first customer to start sending review requests.</p>
          </div>
        ) : (
          customers.map((c, i) => (
            <div
              key={c._id}
              id={i === 0 ? 'tour-customers-list' : undefined}
              onClick={() => router.push('/dashboard/customers/' + c._id)}
              className="flex flex-col gap-1.5 px-4 py-3.5 border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors duration-100 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ backgroundColor: avatarBg((page - 1) * LIMIT + i) }}
                >
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                    {c.tags && c.tags.indexOf('referral') !== -1 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 shrink-0">
                        Referred
                      </span>
                    )}
                    {c.tags && c.tags.filter(function(t) { return t !== 'referral'; }).map(function(t) {
                      return (
                        <span key={t} className={'text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ' + tagStyle(t)}>
                          {tagLabel(t)}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={e => { e.stopPropagation(); setSendTarget(c); }}
                  disabled={c.opted_out}
                  title={c.opted_out ? 'Opted out -- will not receive review requests' : 'Send Review Request'}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-purple-500 hover:bg-purple-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </button>
                {!isStaff && (
                  <div className="relative">
                    <button
                      onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === c._id ? null : c._id); }}
                      className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors text-xl leading-none pb-0.5"
                    >
                      {'\u22EE'}
                    </button>
                    {menuOpenId === c._id && (
                      <div className="absolute right-0 top-9 z-30 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-32 overflow-hidden">
                        <button
                          onClick={e => { e.stopPropagation(); setEditTarget(c); setMenuOpenId(null); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteTarget(c); setMenuOpenId(null); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 pl-[52px]">
                <p className="text-[11px] text-gray-400 truncate min-w-0">
                  {[c.phone, c.email].filter(Boolean).join('  \u00b7  ')}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    title={c.opted_out ? 'Opted out -- will not receive review requests' : undefined}
                    className={'text-[10px] font-semibold px-2 py-0.5 rounded-full ' +
                    (c.opted_out ? 'bg-gray-100 text-gray-400' : 'bg-green-50 text-green-600')}>
                    {c.opted_out ? 'Inactive' : 'Active'}
                  </span>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">{timeAgo(c.added_at)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400 order-2 sm:order-1">
            {'Showing ' + ((page - 1) * LIMIT + 1) + ' to ' + Math.min(page * LIMIT, total) + ' of ' + total.toLocaleString()}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-0.5 order-1 sm:order-2">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors"
              >
                {'\u2039'}
              </button>
              {buildPages(page, totalPages).map(p =>
                p === '_d1' || p === '_d2' ? (
                  <span key={p} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm select-none">{'\u2026'}</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={'w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-colors ' +
                      (p === page ? 'text-white' : 'text-gray-500 hover:bg-gray-100')}
                    style={p === page ? { backgroundColor: '#7C3AED' } : {}}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors"
              >
                {'\u203A'}
              </button>
            </div>
          )}
        </div>
      )}

    </DashboardLayout>
  );
}

export default withAuth(CustomersPage);