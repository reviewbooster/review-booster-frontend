import { useState, useEffect } from 'react';

export default function InfoButton({ title, children, autoShowKey }) {
  const [open, setOpen] = useState(false);

  // Progressive disclosure: on a feature's first-ever visit, show this
  // explanation automatically once, then never again -- the button stays
  // available for anyone who wants to reopen it later.
  useEffect(function() {
    if (!autoShowKey) return;
    try {
      var seenKey = 'rb_feature_seen_' + autoShowKey;
      if (localStorage.getItem(seenKey) !== '1') {
        setOpen(true);
        localStorage.setItem(seenKey, '1');
      }
    } catch (e) {}
  }, [autoShowKey]);

  return (
    <>
      <button
        type="button"
        onClick={function() { setOpen(true); }}
        aria-label={'What is ' + title + '?'}
        className="w-5 h-5 rounded-full flex items-center justify-center text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors border border-gray-200 shrink-0"
      >
        <span className="text-[10px] font-bold italic" style={{ fontFamily: 'Georgia, serif' }}>i</span>
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
          onClick={function() { setOpen(false); }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm my-8 animate-slide-up"
            onClick={function(e) { e.stopPropagation(); }}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-[15px] font-bold text-gray-900">{title}</h2>
              <button
                onClick={function() { setOpen(false); }}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 text-sm text-gray-600 leading-relaxed">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}