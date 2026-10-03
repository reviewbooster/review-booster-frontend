/**
 * pages/dashboard/admin/tasks.jsx
 * Plain admin to-do list. Nothing here is auto-created yet -- every task is
 * added by hand. Open / Completed tabs, priority levels, quick-add.
 */
import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import withAuth from '../../../components/withAuth';
import api from '../../../lib/api';

var PRIORITY_PILL = {
  low:    'bg-gray-100 text-gray-500',
  medium: 'bg-blue-50 text-blue-600',
  high:   'bg-red-50 text-red-600',
};

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function TasksPage() {
  const [tasks,   setTasks]   = useState([]);
  const [counts,  setCounts]  = useState({ open: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [tab,     setTab]     = useState('open');
  const [title,   setTitle]   = useState('');
  const [priority, setPriority] = useState('medium');
  const [adding,  setAdding]  = useState(false);
  const [showPriority, setShowPriority] = useState(false);

  const load = useCallback(function() {
    setLoading(true);
    api.get('/admin/tasks?status=' + tab)
      .then(function(res) {
        setTasks(res.data.data.tasks || []);
        setCounts(res.data.data.counts || { open: 0, completed: 0 });
      })
      .catch(function() { setError('Failed to load tasks.'); })
      .finally(function() { setLoading(false); });
  }, [tab]);

  useEffect(function() { load(); }, [load]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setAdding(true);
    try {
      await api.post('/admin/tasks', { title: title.trim(), priority: priority });
      setTitle('');
      setPriority('medium');
      setShowPriority(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add task.');
    } finally {
      setAdding(false);
    }
  }

  async function toggleComplete(task) {
    var nextStatus = task.status === 'open' ? 'completed' : 'open';
    setTasks(function(prev) { return prev.filter(function(t) { return t._id !== task._id; }); });
    try {
      await api.patch('/admin/tasks/' + task._id, { status: nextStatus });
      await load();
    } catch (err) {
      await load();
    }
  }

  async function handleDelete(id) {
    setTasks(function(prev) { return prev.filter(function(t) { return t._id !== id; }); });
    try {
      await api.delete('/admin/tasks/' + id);
    } catch (err) {
      await load();
    }
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Tasks</h1>
        <p className="page-subtitle">Your own to-do list. Nothing here is created automatically.</p>
      </div>

      {error && <div className="alert-error mb-5"><span>!</span><span>{error}</span></div>}

      <form onSubmit={handleAdd} className="mb-2">
        <div className="flex items-center gap-2">
          <input
            value={title}
            onChange={function(e) { setTitle(e.target.value); }}
            placeholder="Add a task..."
            className="input flex-1 min-w-0"
          />
          <button type="submit" disabled={adding || !title.trim()} className="btn-primary shrink-0 px-4 disabled:opacity-50">
            {adding ? '...' : 'Add'}
          </button>
        </div>
      </form>

      <div className="mb-5">
        {showPriority ? (
          <div className="flex items-center gap-1.5">
            {['low', 'medium', 'high'].map(function(p) {
              var selected = priority === p;
              return (
                <button key={p} type="button" onClick={function() { setPriority(p); setShowPriority(false); }}
                  className={'text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize transition-colors ' +
                    (selected ? PRIORITY_PILL[p] : 'bg-white text-gray-400 border border-gray-200 hover:border-gray-300')}>
                  {p}
                </button>
              );
            })}
            <button type="button" onClick={function() { setShowPriority(false); }} aria-label="Close"
              className="text-gray-300 hover:text-gray-500 transition-colors px-1">
              {'\u2715'}
            </button>
          </div>
        ) : (
          <button type="button" onClick={function() { setShowPriority(true); }}
            className={'text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize inline-flex items-center gap-1 ' + (PRIORITY_PILL[priority] || PRIORITY_PILL.medium)}>
            {priority} priority {'\u25BE'}
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-5">
        {['open', 'completed'].map(function(t) {
          var active = tab === t;
          var label = t === 'open' ? 'Open (' + counts.open + ')' : 'Completed (' + counts.completed + ')';
          return (
            <button key={t} type="button" onClick={function() { setTab(t); }}
              className={'text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors capitalize ' +
                (active ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300')}>
              {label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map(function(_, i) {
            return <div key={i} className="h-14 bg-white rounded-xl border border-gray-100 animate-pulse" />;
          })}
        </div>
      ) : tasks.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <p className="empty-icon">{'\u2713'}</p>
            <p className="empty-title">{tab === 'open' ? 'Nothing open' : 'Nothing completed yet'}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(function(t) {
            return (
              <div key={t._id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
                <input type="checkbox" checked={t.status === 'completed'} onChange={function() { toggleComplete(t); }}
                  className="w-4 h-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className={'text-sm ' + (t.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900')}>{t.title}</p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {fmtDate(t.created_at) + (t.related_business_name ? ' \u00b7 ' + t.related_business_name : '')}
                  </p>
                </div>
                <span className={'text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize shrink-0 ' + (PRIORITY_PILL[t.priority] || PRIORITY_PILL.medium)}>
                  {t.priority}
                </span>
                <button onClick={function() { handleDelete(t._id); }} aria-label="Delete"
                  className="shrink-0 text-gray-300 hover:text-red-500 transition-colors">
                  {'\u2715'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}

export default withAuth(TasksPage);