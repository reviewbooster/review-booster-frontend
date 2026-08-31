export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
      <p className="text-7xl font-black text-gray-100 mb-4">404</p>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Page not found</h1>
      <p className="text-gray-500 text-sm mb-8">The page you're looking for doesn't exist.</p>
      <a href="/dashboard" className="btn-primary">← Back to Dashboard</a>
    </div>
  );
}
