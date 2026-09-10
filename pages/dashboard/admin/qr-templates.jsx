import { useState, useEffect } from 'react';
import Head from 'next/head';
import DashboardLayout from '../../../components/DashboardLayout';
import withAuth from '../../../components/withAuth';
import api from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/router';

function EditTemplateModal({ template, onClose, onUpdated }) {
  const [title,       setTitle]       = useState(template.title || '');
  const [description, setDescription] = useState(template.description || '');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  const handleSave = async function() {
    if (!title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await api.patch('/qr-templates/' + template._id, {
        title: title.trim(),
        description: description.trim(),
      });
      onUpdated(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update template.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-slide-up">
        <div className="p-6">
          <h2 className="font-bold text-gray-900 mb-4">Edit Template</h2>
          <div className="mb-3">
            <label className="label">Template Title *</label>
            <input
              className="input"
              value={title}
              onChange={function(e) { setTitle(e.target.value); }}
            />
          </div>
          <div className="mb-4">
            <label className="label">Description (optional)</label>
            <input
              className="input"
              value={description}
              onChange={function(e) { setDescription(e.target.value); }}
            />
          </div>
          {error && <div className="alert-error mb-4"><span>{'\u26A0'}</span><span>{error}</span></div>}
          <div className="flex gap-3">
            <button onClick={onClose} disabled={saving} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? <><span className="spinner" />{' Saving\u2026'}</> : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QrTemplatesPage() {
  const { user } = useAuth();
  const router   = useRouter();

  const [templates,    setTemplates]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [toast,        setToast]        = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  const [title,        setTitle]        = useState('');
  const [description,  setDescription]  = useState('');
  const [file,         setFile]         = useState(null);
  const [preview,      setPreview]      = useState(null);
  const [uploading,    setUploading]    = useState(false);
  const [uploadError,  setUploadError]  = useState('');
  const [searchQuery,  setSearchQuery]  = useState('');
  const [editTarget,   setEditTarget]   = useState(null);

  const filteredTemplates = templates.filter(function(t) {
    var q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (t.title || '').toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q);
  });

  useEffect(function() {
    if (user && user.role !== 'super_admin') router.replace('/dashboard');
  }, [user, router]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(function() { setToast(''); }, 3000);
  }

  async function load() {
    setLoading(true);
    setError('');
    try {
      var res = await api.get('/qr-templates');
      setTemplates(res.data.data || []);
    } catch (e) {
      setError('Failed to load templates.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(function() { load(); }, []);

  function handleFileChange(e) {
    var f = e.target.files[0];
    if (!f) return;
    setFile(f);
    var reader = new FileReader();
    reader.onload = function(ev) { setPreview(ev.target.result); };
    reader.readAsDataURL(f);
  }

  async function handleUpload() {
    setUploadError('');
    if (!title.trim()) { setUploadError('Title is required.'); return; }
    if (!file)         { setUploadError('Please select an image.'); return; }
    setUploading(true);
    try {
      var fd = new FormData();
      fd.append('title',       title.trim());
      fd.append('description', description.trim());
      fd.append('image',       file);
      var res = await api.post('/qr-templates', fd);
      setTemplates(function(prev) { return [res.data.data, ...prev]; });
      setTitle('');
      setDescription('');
      setFile(null);
      setPreview(null);
      showToast('Template uploaded!');
    } catch (e) {
      setUploadError(e.response?.data?.error || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete('/qr-templates/' + deleteTarget._id);
      setTemplates(function(prev) {
        return prev.filter(function(t) { return t._id !== deleteTarget._id; });
      });
      setDeleteTarget(null);
      showToast('Template deleted.');
    } catch (e) {
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  if (user?.role !== 'super_admin') return null;

  return (
    <>
      <Head><title>QR Templates | ReviewBooster</title></Head>
      <DashboardLayout>

        {editTarget && (
          <EditTemplateModal
            template={editTarget}
            onClose={function() { setEditTarget(null); }}
            onUpdated={function(updated) {
              setTemplates(function(prev) { return prev.map(function(t) { return t._id === updated._id ? updated : t; }); });
              setEditTarget(null);
              showToast('Template updated!');
            }}
          />
        )}

        {toast && (
          <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 alert-success shadow-lg animate-slide-up">
            <span>{'\u2713'}</span><span>{toast}</span>
          </div>
        )}

        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-slide-up">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-lg flex-shrink-0">!</div>
                <div>
                  <h2 className="font-bold text-gray-900">Delete Template</h2>
                  <p className="text-xs text-gray-400 mt-0.5">This cannot be undone</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-5">
                Delete <span className="font-semibold text-gray-900">{deleteTarget.title}</span>? Businesses will no longer see this template.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={function() { setDeleteTarget(null); }}
                  disabled={deleting}
                  className="btn-secondary flex-1 justify-center"
                >Cancel</button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 justify-center flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="page-header">
          <h1 className="page-title">QR Templates</h1>
          <p className="page-subtitle">Upload custom background templates for business QR codes</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Upload New Template</h2>
          {uploadError && (
            <div className="alert-error mb-4"><span>!</span><span>{uploadError}</span></div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <div className="mb-3">
                <label className="label">Template Title *</label>
                <input
                  className="input"
                  placeholder="e.g. Diwali Special"
                  value={title}
                  onChange={function(e) { setTitle(e.target.value); }}
                />
              </div>
              <div className="mb-3">
                <label className="label">Description (optional)</label>
                <input
                  className="input"
                  placeholder="e.g. Festive template for seasonal campaigns"
                  value={description}
                  onChange={function(e) { setDescription(e.target.value); }}
                />
              </div>
              <div className="mb-4">
                <label className="label">Image (JPEG / PNG / WebP, max 2 MB) *</label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="flex-1 px-3 py-2 rounded-xl border border-dashed border-gray-200 hover:border-purple-400 transition-colors text-sm text-gray-400 truncate">
                    {file ? file.name : 'No file selected'}
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <span className="shrink-0 px-4 py-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 text-sm font-semibold hover:bg-purple-100 transition-colors">
                    Browse
                  </span>
                </label>
              </div>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="btn-primary w-full justify-center"
              >
                {uploading ? 'Uploading...' : 'Upload Template'}
              </button>
            </div>
            <div className="flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-gray-100 min-h-[180px] p-4">
              {preview ? (
                <img src={preview} alt="Preview" className="max-h-48 max-w-full rounded-lg object-contain" />
              ) : (
                <div className="text-center">
                  <div className="text-4xl mb-2">{'\uD83D\uDCF8'}</div>
                  <p className="text-xs text-gray-400">Image preview will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {error && <div className="alert-error mb-4"><span>!</span><span>{error}</span></div>}

        <div className="relative mb-4">
          <input
            className="input pl-9"
            placeholder="Search by title or description..."
            value={searchQuery}
            onChange={function(e) { setSearchQuery(e.target.value); }}
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
            </svg>
          </span>
        </div>

        <div className="mb-4">
          <h2 className="text-sm font-bold text-gray-900">
            {filteredTemplates.length > 0
              ? (filteredTemplates.length + ' Template' + (filteredTemplates.length !== 1 ? 's' : ''))
              : 'Templates'}
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map(function(_, i) {
              return <div key={i} className="h-48 bg-white rounded-xl border border-gray-100 animate-pulse" />;
            })}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <p className="empty-icon">{'\uD83D\uDCF8'}</p>
              <p className="empty-title">No templates yet</p>
              <p className="empty-desc">Upload a template above. Businesses will see it as a custom design option on their QR page.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredTemplates.map(function(t) {
              return (
                <div key={t._id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden group">
                  <div className="relative">
                    <img
                      src={'data:' + t.mime_type + ';base64,' + t.image_data}
                      alt={t.title}
                      className="w-full h-36 object-cover"
                    />
                    <button
                      onClick={function() { setEditTarget(t); }}
                      className="absolute top-2 right-11 w-7 h-7 rounded-lg bg-white/90 hover:bg-white text-gray-600 flex items-center justify-center transition-colors shadow opacity-0 group-hover:opacity-100"
                    >
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={function() { setDeleteTarget(t); }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors shadow opacity-0 group-hover:opacity-100"
                    >
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-semibold text-gray-900 truncate">{t.title}</p>
                    {t.description && (
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">{t.description}</p>
                    )}
                    <p className="text-[10px] text-gray-300 mt-1">
                      {new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </DashboardLayout>
    </>
  );
}

export default withAuth(QrTemplatesPage);