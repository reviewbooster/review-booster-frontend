import { useState, useEffect } from 'react';
import api from '../lib/api';

export default function AiReplyModal({ review, onClose }) {
  const [draft,   setDraft]   = useState('');
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [copied,  setCopied]  = useState(false);

  useEffect(function() {
    if (!review) return;
    setLoading(true);
    setError('');
    setCopied(false);
    api.post('/reviews/' + review._id + '/generate-reply')
      .then(function(res) { setDraft(res.data?.data?.draft || ''); })
      .catch(function() { setError('Could not generate a reply right now. Please try again.'); })
      .finally(function() { setLoading(false); });
  }, [review]);

  function handleCopy() {
    if (!draft) return;
    navigator.clipboard.writeText(draft).then(function() {
      setCopied(true);
      setTimeout(function() { setCopied(false); }, 2000);
    });
  }

  if (!review) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 px-0 md:px-4">
      <div className="w-full md:max-w-md bg-white rounded-t-2xl md:rounded-2xl shadow-xl p-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
            <span>{'\u2736'}</span> AI Reply Draft
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-10 text-sm text-gray-400">
            <span className="spinner mr-2" /> Generating draft...
          </div>
        )}

        {!loading && error && (
          <p className="text-sm text-red-500 py-6 text-center">{error}</p>
        )}

        {!loading && !error && (
          <>
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{draft}</p>
            </div>
            <button
              onClick={handleCopy}
              className={'w-full flex items-center justify-center gap-2 text-sm font-semibold py-3 rounded-xl transition-colors ' +
                (copied ? 'bg-green-500 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white')}
            >
              {copied ? '\u2713 Copied to clipboard!' : 'Copy Reply'}
            </button>
            <p className="text-[10px] text-gray-400 mt-2 text-center">
              {review.is_public
                ? 'Paste this as your reply on Google Maps.'
                : 'Paste and send via WhatsApp, SMS, or Email.'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}