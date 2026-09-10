/**
 * pages/dashboard/admin/support-chats.jsx
 * Super Admin — replies to pre-login Help & Support chat threads
 * (visitors on the login page who aren't authenticated yet).
 */
import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import withAuth from '../../../components/withAuth';
import api from '../../../lib/api';

function fmtDateTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function SupportChatsPage() {
  const [chats,      setChats]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [detail,     setDetail]     = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply,      setReply]      = useState('');
  const [sending,    setSending]    = useState(false);

  const loadList = useCallback(function() {
    api.get('/admin/support-chats')
      .then(function(res) { setChats(res.data?.data || []); })
      .catch(function() { setError('Failed to load chats.'); })
      .finally(function() { setLoading(false); });
  }, []);

  useEffect(function() {
    loadList();
    var interval = setInterval(loadList, 20000);
    return function() { clearInterval(interval); };
  }, [loadList]);

  var openChat = function(id) {
    setSelectedId(id);
    setDetailLoading(true);
    api.get('/admin/support-chats/' + id)
      .then(function(res) {
        setDetail(res.data?.data || null);
        loadList(); // refresh unread state in the list
      })
      .catch(function() {})
      .finally(function() { setDetailLoading(false); });
  };

  var handleReply = function(e) {
    e.preventDefault();
    if (!reply.trim() || !selectedId) return;
    setSending(true);
    api.post('/admin/support-chats/' + selectedId + '/messages', { message: reply.trim() })
      .then(function(res) {
        setDetail(res.data?.data || null);
        setReply('');
        loadList();
      })
      .catch(function() {})
      .finally(function() { setSending(false); });
  };

  var toggleStatus = function() {
    if (!detail) return;
    var next = detail.status === 'closed' ? 'open' : 'closed';
    api.patch('/admin/support-chats/' + selectedId, { status: next })
      .then(function(res) { setDetail(res.data?.data || null); loadList(); })
      .catch(function() {});
  };

  return (
    <DashboardLayout>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Support Chats</h1>
      <p className="text-xs text-gray-400 mb-5">Pre-login Help & Support messages from your website visitors.</p>

      {error && <div className="alert-error mb-4"><span>{'\u26A0'}</span><span>{error}</span></div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Thread list */}
        <div className="md:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6"><p className="text-gray-400 text-sm">Loading...</p></div>
          ) : chats.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-center px-6">
              <p className="text-3xl mb-2">{'\uD83D\uDCAC'}</p>
              <p className="text-sm font-semibold text-gray-700">No support chats yet</p>
            </div>
          ) : (
            chats.map(function(c) {
              var isActive = c._id === selectedId;
              return (
                <button
                  key={c._id}
                  onClick={function() { openChat(c._id); }}
                  className={'w-full text-left px-4 py-3 border-b border-gray-100 last:border-0 transition-colors ' +
                    (isActive ? 'bg-purple-50' : 'hover:bg-gray-50')}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.guest_name}</p>
                    {c.unread_by_admin && <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{c.guest_email}</p>
                  <p className="text-xs text-gray-500 truncate mt-1">{c.last_message_preview}</p>
                  <p className="text-[10px] text-gray-300 mt-1">{fmtDateTime(c.last_message_at)}</p>
                </button>
              );
            })
          )}
        </div>

        {/* Thread detail */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col min-h-[400px]">
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400 p-6">
              Select a chat to view the conversation.
            </div>
          ) : detailLoading || !detail ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400 p-6">Loading...</div>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{detail.guest_name}</p>
                  <p className="text-xs text-gray-400">{detail.guest_email}</p>
                </div>
                <button
                  onClick={toggleStatus}
                  className={'text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ' +
                    (detail.status === 'closed' ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-green-50 text-green-600 hover:bg-green-100')}
                >
                  {detail.status === 'closed' ? 'Reopen' : 'Mark Closed'}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[400px]">
                {(detail.messages || []).map(function(m, i) {
                  var isAdmin = m.sender === 'admin';
                  return (
                    <div key={i} className={'flex ' + (isAdmin ? 'justify-end' : 'justify-start')}>
                      <div className={'max-w-[75%] rounded-xl px-3 py-2 ' +
                        (isAdmin ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700')}>
                        <p className="text-sm">{m.text}</p>
                        <p className={'text-[10px] mt-1 ' + (isAdmin ? 'text-purple-200' : 'text-gray-400')}>
                          {fmtDateTime(m.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleReply} className="flex gap-2 p-4 border-t border-gray-100">
                <input
                  className="flex-1 bg-gray-100 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-200"
                  placeholder="Type a reply..."
                  value={reply}
                  onChange={function(e) { setReply(e.target.value); }}
                />
                <button
                  type="submit"
                  disabled={sending || !reply.trim()}
                  className="btn-primary shrink-0"
                >
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default withAuth(SupportChatsPage);