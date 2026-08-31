import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import QRCode from 'react-qr-code';
import DashboardLayout from '../../components/DashboardLayout';
import withAuth from '../../components/withAuth';
import api from '../../lib/api';

var TEMPLATES = ['Table Tent', 'Poster', 'Sticker', 'Counter Card'];

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawTemplate(ctx, W, H, name, qrImg, businessName) {
  var short = businessName.length > 18 ? businessName.substring(0, 18) + '...' : businessName;
  ctx.clearRect(0, 0, W, H);

  if (name === 'Sticker') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#7C3AED';
    ctx.lineWidth = Math.round(W * 0.04);
    roundRect(ctx, Math.round(W*0.05), Math.round(H*0.05), Math.round(W*0.9), Math.round(H*0.9), Math.round(W*0.1));
    ctx.stroke();
    var qrS = Math.round(W * 0.72);
    ctx.drawImage(qrImg, Math.round((W-qrS)/2), Math.round(H*0.08), qrS, qrS);
    ctx.fillStyle = '#7C3AED';
    ctx.font = 'bold ' + Math.round(W*0.07) + 'px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(short, W/2, Math.round(H*0.90));

  } else if (name === 'Counter Card') {
    var g1 = ctx.createLinearGradient(0, 0, W*0.5, 0);
    g1.addColorStop(0, '#7C3AED');
    g1.addColorStop(1, '#4F46E5');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(Math.round(W*0.48), 0, Math.round(W*0.52), H);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.arc(Math.round(W*0.05), Math.round(H*0.15), Math.round(W*0.18), 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(Math.round(W*0.38), Math.round(H*0.85), Math.round(W*0.12), 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold ' + Math.round(W*0.055) + 'px Arial';
    ctx.textAlign = 'center';
    var shortCC = businessName.length > 12 ? businessName.substring(0,12) + '...' : businessName;
    ctx.fillText(shortCC, Math.round(W*0.24), Math.round(H*0.38));
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.font = Math.round(W*0.031) + 'px Arial';
    ctx.fillText('Scan to leave a review', Math.round(W*0.24), Math.round(H*0.53));
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.font = Math.round(W*0.026) + 'px Arial';
    ctx.fillText('Powered by ReviewBooster', Math.round(W*0.24), Math.round(H*0.87));
    var qrCC = Math.round(H * 0.72);
    ctx.drawImage(qrImg, Math.round(W*0.5 + (W*0.5-qrCC)/2), Math.round((H-qrCC)/2), qrCC, qrCC);

  } else {
    var isDark = name === 'Poster';
    var g2 = ctx.createLinearGradient(0, 0, W*0.4, H);
    g2.addColorStop(0, isDark ? '#5B21B6' : '#7C3AED');
    g2.addColorStop(1, isDark ? '#1E1B4B' : '#4F46E5');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath(); ctx.arc(Math.round(W*0.85), Math.round(H*0.07), Math.round(W*0.28), 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(Math.round(W*0.12), Math.round(H*0.91), Math.round(W*0.18), 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold ' + Math.round(W*0.074) + 'px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(short, W/2, Math.round(H*0.13));
    ctx.fillStyle = 'rgba(255,255,255,0.68)';
    ctx.font = Math.round(W*0.042) + 'px Arial';
    ctx.fillText(isDark ? 'Share your experience' : 'Scan to leave a review', W/2, Math.round(H*0.20));
    var pad = Math.round(W*0.07);
    var cY  = Math.round(H*0.26);
    var cH  = Math.round(H*0.58);
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, pad, cY, W-pad*2, cH, Math.round(W*0.04));
    ctx.fill();
    var qrP = Math.round((W-pad*2)*0.84);
    ctx.drawImage(qrImg, Math.round((W-qrP)/2), cY + Math.round((cH-qrP)/2), qrP, qrP);
    if (isDark) {
      ctx.fillStyle = '#FCD34D';
      ctx.font = Math.round(W*0.06) + 'px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('\u2605\u2605\u2605\u2605\u2605', W/2, Math.round(H*0.88));
    }
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = Math.round(W*0.034) + 'px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Powered by ReviewBooster', W/2, Math.round(H*0.935));
  }
}

function TemplateCard({ name, qrSvgId, businessName, onDownload }) {
  const canvasRef = useRef(null);

  useEffect(function() {
    var canvas = canvasRef.current;
    if (!canvas) return;
    var svgEl = document.getElementById(qrSvgId);
    if (!svgEl) return;
    var dims = name === 'Counter Card'
      ? { W: 420, H: 294 }
      : name === 'Sticker'
        ? { W: 300, H: 300 }
        : { W: 300, H: 420 };
    canvas.width  = dims.W;
    canvas.height = dims.H;
    var svgData = new XMLSerializer().serializeToString(svgEl);
    var blob    = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    var burl    = URL.createObjectURL(blob);
    var img     = new Image();
    img.onload = function() {
      drawTemplate(canvas.getContext('2d'), dims.W, dims.H, name, img, businessName);
      URL.revokeObjectURL(burl);
    };
    img.src = burl;
  }, [name, qrSvgId, businessName]);

  return (
    <div
      className="flex flex-col items-center gap-1.5 cursor-pointer group"
      onClick={function() { onDownload(name); }}
    >
      <div className="w-full overflow-hidden rounded-xl relative shadow-sm">
        <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
          <div className="flex items-center gap-1 bg-white/20 rounded-lg px-2 py-1">
            <svg width="13" height="13" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="text-white text-[10px] font-bold">PDF</span>
          </div>
        </div>
      </div>
      <p className="text-[9px] md:text-[11px] text-gray-500 font-medium text-center leading-tight">{name}</p>
    </div>
  );
}

function CustomTemplateCard({ template, onDownload }) {
  return (
    <div
      className="flex flex-col items-center gap-1.5 cursor-pointer group"
      onClick={function() { onDownload(template); }}
    >
      <div className="w-full overflow-hidden rounded-xl relative shadow-sm" style={{ aspectRatio: '1/1' }}>
        <img
          src={'data:' + template.mime_type + ';base64,' + template.image_data}
          alt={template.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
          <div className="flex items-center gap-1 bg-white/20 rounded-lg px-2 py-1">
            <svg width="13" height="13" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="text-white text-[10px] font-bold">PNG</span>
          </div>
        </div>
      </div>
      <p className="text-[9px] md:text-[11px] text-gray-500 font-medium text-center leading-tight">{template.title}</p>
    </div>
  );
}

function AllTemplatesModal({ qrSvgId, businessName, onDownload, onCustomDownload, customTemplates, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-4 animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h2 className="text-[15px] font-bold text-gray-900">All Templates</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Click any template to download</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Built-in</p>
          <div className="grid grid-cols-2 gap-5">
            {TEMPLATES.map(function(t) {
              return (
                <TemplateCard
                  key={t}
                  name={t}
                  qrSvgId={qrSvgId}
                  businessName={businessName}
                  onDownload={onDownload}
                />
              );
            })}
          </div>
          {customTemplates && customTemplates.length > 0 && (
            <>
              <div className="border-t border-gray-100 my-5" />
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Custom</p>
              <div className="grid grid-cols-2 gap-5">
                {customTemplates.map(function(t) {
                  return (
                    <CustomTemplateCard
                      key={t._id}
                      template={t}
                      onDownload={onCustomDownload}
                    />
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function QrPage() {
  const [qrData,           setQrData]           = useState(null);
  const [stats,            setStats]            = useState(null);
  const [customTemplates,  setCustomTemplates]  = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [copied,           setCopied]           = useState(false);
  const [error,            setError]            = useState(null);
  const [showAllTemplates, setShowAllTemplates] = useState(false);

  const qrUrl = qrData && typeof window !== 'undefined'
    ? window.location.origin + '/qr/' + qrData.qr_token
    : '';

  useEffect(function() {
    Promise.all([
      api.get('/business/my-qr'),
      api.get('/analytics/qr-stats'),
      api.get('/qr-templates'),
    ]).then(function(results) {
      setQrData(results[0].data.data);
      setStats(results[1].data.data);
      setCustomTemplates(results[2].data.data || []);
    }).catch(function() {
      setError('Failed to load QR data. Please refresh the page.');
    }).finally(function() {
      setLoading(false);
    });
  }, []);

  var totalScans       = (stats && stats.total_scans)                                 ? stats.total_scans                  : 0;
  var reviewsGenerated = (stats && stats.total_public)                                ? stats.total_public                 : 0;
  var scansDelta       = (stats && stats.this_month && stats.this_month.total_scans)  ? stats.this_month.total_scans       : 0;
  var reviewsDelta     = (stats && stats.this_month && stats.this_month.total_public) ? stats.this_month.total_public      : 0;

  function handleCopy() {
    navigator.clipboard.writeText(qrUrl).then(function() {
      setCopied(true);
      setTimeout(function() { setCopied(false); }, 2000);
    }).catch(function() {});
  }

  function handleDownloadPNG() {
    var svgEl = document.getElementById('business-qr-svg');
    if (!svgEl) return;
    var svgData = new XMLSerializer().serializeToString(svgEl);
    var canvas  = document.createElement('canvas');
    canvas.width = 480; canvas.height = 480;
    var ctx  = canvas.getContext('2d');
    var img  = new Image();
    var blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    var burl = URL.createObjectURL(blob);
    img.onload = function() {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 480, 480);
      ctx.drawImage(img, 0, 0, 480, 480);
      URL.revokeObjectURL(burl);
      var link = document.createElement('a');
      link.href     = canvas.toDataURL('image/png');
      link.download = (qrData ? qrData.business_name.replace(/\s+/g, '-').toLowerCase() : 'review') + '-qr-code.png';
      link.click();
    };
    img.src = burl;
  }

  function handleDownloadSVG() {
    var svgEl = document.getElementById('business-qr-svg');
    if (!svgEl) return;
    var blob = new Blob([new XMLSerializer().serializeToString(svgEl)], { type: 'image/svg+xml;charset=utf-8' });
    var url  = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = (qrData ? qrData.business_name.replace(/\s+/g, '-').toLowerCase() : 'review') + '-qr-code.svg';
    link.click();
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
  }

  function handleShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title: ((qrData && qrData.business_name) || 'Review') + ' QR Code', url: qrUrl }).catch(function() {});
    } else {
      handleCopy();
    }
  }

  async function handleTemplateDownload(templateName) {
    var svgEl = document.getElementById('business-qr-svg');
    if (!svgEl || !qrData) return;
    var FULL = {
      'Table Tent':   { W: 630,  H: 892  },
      'Poster':       { W: 794,  H: 1123 },
      'Sticker':      { W: 600,  H: 600  },
      'Counter Card': { W: 1123, H: 794  },
    };
    var dims    = FULL[templateName] || { W: 630, H: 892 };
    var svgData = new XMLSerializer().serializeToString(svgEl);
    var blob    = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    var burl    = URL.createObjectURL(blob);
    var img     = new Image();
    img.onload = async function() {
      var canvas = document.createElement('canvas');
      canvas.width  = dims.W;
      canvas.height = dims.H;
      drawTemplate(canvas.getContext('2d'), dims.W, dims.H, templateName, img, qrData.business_name);
      URL.revokeObjectURL(burl);
      var imgData  = canvas.toDataURL('image/png');
      var jspdfMod = await import('jspdf');
      var jsPDF    = jspdfMod.jsPDF;
      var pdf;
      if (templateName === 'Sticker') {
        pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [100, 100] });
        pdf.addImage(imgData, 'PNG', 0, 0, 100, 100);
      } else if (templateName === 'Counter Card') {
        pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
      } else {
        pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      }
      var filename = qrData.business_name.replace(/\s+/g, '-').toLowerCase() + '-' + templateName.toLowerCase().replace(/\s+/g, '-') + '.pdf';
      pdf.save(filename);
    };
    img.src = burl;
  }

  function handleCustomTemplateDownload(template) {
    var svgEl = document.getElementById('business-qr-svg');
    if (!svgEl || !qrData) return;
    var W = 800, H = 800;
    var canvas = document.createElement('canvas');
    canvas.width  = W;
    canvas.height = H;
    var ctx   = canvas.getContext('2d');
    var bgImg = new Image();
    bgImg.onload = function() {
      ctx.drawImage(bgImg, 0, 0, W, H);
      var svgData = new XMLSerializer().serializeToString(svgEl);
      var svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      var svgUrl  = URL.createObjectURL(svgBlob);
      var qrImg   = new Image();
      qrImg.onload = function() {
        var qrSize = Math.round(W * 0.55);
        var qrX    = Math.round((W - qrSize) / 2);
        var qrY    = Math.round((H - qrSize) / 2);
        var pad    = 14;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(qrX - pad, qrY - pad, qrSize + pad * 2, qrSize + pad * 2);
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
        URL.revokeObjectURL(svgUrl);
        var link = document.createElement('a');
        link.href     = canvas.toDataURL('image/png');
        link.download = qrData.business_name.replace(/\s+/g, '-').toLowerCase() + '-' + template.title.toLowerCase().replace(/\s+/g, '-') + '.png';
        link.click();
      };
      qrImg.src = svgUrl;
    };
    bgImg.src = 'data:' + template.mime_type + ';base64,' + template.image_data;
  }

  return (
    <>
      <Head><title>QR Code | ReviewBooster</title></Head>
      <DashboardLayout>

        {showAllTemplates && qrData && (
          <AllTemplatesModal
            qrSvgId="business-qr-svg"
            businessName={qrData.business_name}
            onDownload={handleTemplateDownload}
            onCustomDownload={handleCustomTemplateDownload}
            customTemplates={customTemplates}
            onClose={function() { setShowAllTemplates(false); }}
          />
        )}

        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 rounded-full border-4 animate-spin"
              style={{ borderColor: '#E9D5FF', borderTopColor: '#7C3AED' }} />
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">{error}</div>
        )}

        {!loading && !error && qrData && (
          <div className="max-w-sm md:max-w-3xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-start">

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="text-[15px] font-bold text-gray-900 mb-0.5">In-Store QR Code</h2>
                <p className="text-[11px] text-gray-400 mb-5 leading-relaxed">
                  Display at your location. Every scan creates a separate tracked review request.
                </p>

                <div className="flex justify-center mb-4">
                  <div className="relative p-3 rounded-2xl border-2 border-gray-100">
                    <QRCode
                      id="business-qr-svg"
                      value={qrUrl}
                      size={190}
                      level="H"
                      fgColor="#111827"
                      bgColor="#ffffff"
                    />
                    <div
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center shadow-md"
                      style={{ width: '42px', height: '42px', backgroundColor: '#7C3AED' }}
                    >
                      <span style={{ color: '#fff', fontSize: '22px', lineHeight: 1 }}>{'\u2605'}</span>
                    </div>
                  </div>
                </div>

                <p className="text-sm font-bold text-gray-900 text-center mb-1">{qrData.business_name}</p>

                <div className="flex items-center justify-center gap-1.5 mb-5">
                  <p className="text-[10px] text-gray-400 truncate" style={{ maxWidth: '220px' }}>{qrUrl}</p>
                  <button onClick={handleCopy} className="shrink-0 text-gray-400 hover:text-purple-600 transition-colors p-0.5">
                    {copied ? (
                      <svg width="13" height="13" fill="none" stroke="#7C3AED" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path strokeLinecap="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                      </svg>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="rounded-xl p-3" style={{ backgroundColor: '#F0F9FF' }}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: '#BAE6FD' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="3" width="7" height="7" rx="1" fill="#0EA5E9" />
                          <rect x="4.5" y="4.5" width="4" height="4" fill="#F0F9FF" />
                          <rect x="5.5" y="5.5" width="2" height="2" fill="#0EA5E9" />
                          <rect x="14" y="3" width="7" height="7" rx="1" fill="#0EA5E9" />
                          <rect x="15.5" y="4.5" width="4" height="4" fill="#F0F9FF" />
                          <rect x="16.5" y="5.5" width="2" height="2" fill="#0EA5E9" />
                          <rect x="3" y="14" width="7" height="7" rx="1" fill="#0EA5E9" />
                          <rect x="4.5" y="15.5" width="4" height="4" fill="#F0F9FF" />
                          <rect x="5.5" y="16.5" width="2" height="2" fill="#0EA5E9" />
                          <rect x="14" y="14" width="3" height="3" fill="#0EA5E9" />
                          <rect x="18" y="14" width="3" height="3" fill="#0EA5E9" />
                          <rect x="18" y="18" width="3" height="3" fill="#0EA5E9" />
                          <rect x="14" y="18" width="3" height="3" fill="#0EA5E9" />
                        </svg>
                      </div>
                      <p className="text-[10px] font-medium text-gray-500">Total Scans</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 leading-none mb-1 tabular-nums">{totalScans}</p>
                    <p className={'text-[10px] font-semibold ' + (scansDelta > 0 ? 'text-emerald-500' : 'text-gray-300')}>
                      {scansDelta > 0 ? ('\u2191 ' + scansDelta + ' this month') : 'No change'}
                    </p>
                  </div>
                  <div className="rounded-xl p-3" style={{ backgroundColor: '#FFF7ED' }}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: '#FED7AA' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                          <rect x="2" y="2" width="9" height="9" rx="1" fill="#F97316" />
                          <rect x="13" y="2" width="9" height="9" rx="1" fill="#FBBF24" />
                          <rect x="2" y="13" width="9" height="9" rx="1" fill="#FBBF24" />
                          <rect x="13" y="13" width="9" height="9" rx="1" fill="#F97316" />
                        </svg>
                      </div>
                      <p className="text-[10px] font-medium text-gray-500">Reviews Generated</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 leading-none mb-1 tabular-nums">{reviewsGenerated}</p>
                    <p className={'text-[10px] font-semibold ' + (reviewsDelta > 0 ? 'text-emerald-500' : 'text-gray-300')}>
                      {reviewsDelta > 0 ? ('\u2191 ' + reviewsDelta + ' this month') : 'No change'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDownloadPNG}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold mb-3 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#7C3AED' }}
                >
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download PNG
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button onClick={handleDownloadSVG}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download SVG
                  </button>
                  <button onClick={handleShare}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share Link
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[13px] font-bold text-gray-800">Print Ready Templates</h2>
                  <button
                    onClick={function() { setShowAllTemplates(true); }}
                    className="text-[11px] font-semibold text-purple-600 hover:underline"
                  >
                    View all{customTemplates.length > 0 ? ' (' + (TEMPLATES.length + customTemplates.length) + ')' : ''}
                  </button>
                </div>
                <div className="grid grid-cols-4 md:grid-cols-2 gap-2 md:gap-4">
                  {TEMPLATES.map(function(t) {
                    return (
                      <TemplateCard
                        key={t}
                        name={t}
                        qrSvgId="business-qr-svg"
                        businessName={qrData.business_name}
                        onDownload={handleTemplateDownload}
                      />
                    );
                  })}
                </div>
                <p className="hidden md:block text-[11px] text-gray-400 text-center mt-4 leading-relaxed">
                  Click any template to download a print-ready PDF with your QR code embedded.
                </p>
              </div>

            </div>
          </div>
        )}

      </DashboardLayout>
    </>
  );
}

export default withAuth(QrPage);