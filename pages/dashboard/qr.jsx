import { useState, useEffect, useRef, Fragment } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import QRCode from 'react-qr-code';
import DashboardLayout from '../../components/DashboardLayout';
import withAuth from '../../components/withAuth';
import api from '../../lib/api';

// -- Business-type-aware placement guidance --------------------------------
// Same generic + specific layering pattern used everywhere else in this app.
var PLACEMENT_GUIDE = {
  restaurant:  'Table tent or bill counter \u2014 right where guests finish paying.',
  salon:       'Billing counter, or hand it over right after the service.',
  barbershop:  'Billing counter, or hand it over right after the cut.',
  dental:      'Reception desk, or the exit after an appointment.',
  clinic:      'Reception desk, or the exit after an appointment.',
  retail:      'Checkout counter, or printed on the receipt.',
  gym:         'Front desk or near the exit.',
  auto:        'Service counter, where customers pick up their vehicle.',
  real_estate: 'Handed over at the end of a viewing or closing.',
  education:   'Front desk, or handed out after a class.',
  pet_care:    'Checkout counter, or given at pickup.',
  other:       'Somewhere customers naturally pause \u2014 a counter, a table, or right as they\u2019re leaving.',
};

function getGreeting() {
  var h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

var TEMPLATES = ['Table Tent', 'Poster', 'Sticker', 'Counter Card'];
var TEMPLATE_SLUGS = {
  'Table Tent':   'table_tent',
  'Poster':       'poster',
  'Sticker':      'sticker',
  'Counter Card': 'counter_card',
};
var PLACEMENT_TEMPLATE_MAP = { counter: 'Counter Card', table: 'Table Tent' };

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

function TemplateCard({ name, qrSvgId, businessName, onDownload, recommended }) {
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
    <div className="flex flex-col items-center gap-1.5">
      <div className="w-full overflow-hidden rounded-xl relative shadow-sm">
        <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
        {recommended && (
          <span className="absolute top-1.5 left-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: '#7C3AED' }}>
            Recommended
          </span>
        )}
      </div>
      <p className="text-[9px] md:text-[11px] text-gray-500 font-medium text-center leading-tight">{name}</p>
      <button
        type="button"
        onClick={function() { onDownload(name); }}
        className="text-[10px] font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-0.5"
      >
        <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download
      </button>
    </div>
  );
}

function CustomTemplateCard({ template, onDownload }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="w-full overflow-hidden rounded-xl relative shadow-sm" style={{ aspectRatio: '1/1' }}>
        <img
          src={'data:' + template.mime_type + ';base64,' + template.image_data}
          alt={template.title}
          className="w-full h-full object-cover"
        />
      </div>
      <p className="text-[9px] md:text-[11px] text-gray-500 font-medium text-center leading-tight">{template.title}</p>
      <button
        type="button"
        onClick={function() { onDownload(template); }}
        className="text-[10px] font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-0.5"
      >
        <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download
      </button>
    </div>
  );
}

function AllTemplatesModal({ businessName, onDownload, onCustomDownload, customTemplates, recommendedTemplate, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-4 animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h2 className="text-[15px] font-bold text-gray-900">All Templates</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Tap Download on any template</p>
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
                  qrSvgId={'qr-svg-' + TEMPLATE_SLUGS[t]}
                  businessName={businessName}
                  onDownload={onDownload}
                  recommended={t === recommendedTemplate}
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
  const router = useRouter();
  const [qrData,           setQrData]           = useState(null);
  const [stats,            setStats]            = useState(null);
  const [statsDays,        setStatsDays]        = useState(30);
  const [customTemplates,  setCustomTemplates]  = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [copied,           setCopied]           = useState(false);
  const [error,            setError]            = useState(null);
  const [showAllTemplates, setShowAllTemplates] = useState(false);
  const [sharePanelOpen,   setSharePanelOpen]   = useState(false);
  const [shareMessage,     setShareMessage]     = useState('');
  const [placement,        setPlacement]        = useState(null); // null | 'counter' | 'table' | 'staff'
  const [placementSectionOpen,  setPlacementSectionOpenState]  = useState(false);
  const [infoModalOpen,    setInfoModalOpen]    = useState(false);

  useEffect(function() {
    localStorage.setItem('rb_visited_qr', '1');
  }, []);

  useEffect(function() {
    try {
      if (localStorage.getItem('rb_deep_dive_seen_qr') !== '1') {
        setTimeout(function() {
          if (window.__rbStartDeepDive) window.__rbStartDeepDive('qr');
        }, 50);
      }
    } catch (e) {}
  }, []);

  // Toggle state persists across visits via localStorage -- reading it back
  // on mount so the section doesn't silently reset to closed on reload.
  useEffect(function() {
    try {
      if (localStorage.getItem('rb_qr_placement_open') === '1') setPlacementSectionOpenState(true);
    } catch (e) {}
  }, []);

  function setPlacementSectionOpen(next) {
    setPlacementSectionOpenState(next);
    try { localStorage.setItem('rb_qr_placement_open', next ? '1' : '0'); } catch (e) {}
  }

  const qrUrl = qrData && typeof window !== 'undefined'
    ? window.location.origin + '/qr/' + qrData.qr_token
    : '';

  useEffect(function() {
    Promise.all([
      api.get('/business/my-qr'),
      api.get('/qr-templates'),
    ]).then(function(results) {
      setQrData(results[0].data.data);
      setCustomTemplates(results[1].data.data || []);
      setShareMessage('Thank you for visiting ' + results[0].data.data.business_name + '! \uD83D\uDE0A Your feedback means a lot to us \u2014 please scan the QR code and share your experience.');
    }).catch(function() {
      setError('Failed to load QR data. Please refresh the page.');
    }).finally(function() {
      setLoading(false);
    });
  }, []);

  useEffect(function() {
    api.get('/analytics/qr-stats?days=' + statsDays)
      .then(function(res) { setStats(res.data.data); })
      .catch(function() {});
  }, [statsDays]);

  var period       = (stats && stats.period)        || { scans: 0, feedback: 0, reviews: 0, conversion_rate: 0 };
  var periodChange = (stats && stats.period_change)  || { scans: 0, feedback: 0, reviews: 0, conversion_rate: 0 };

  function handleCopy() {
    try { localStorage.setItem('rb_qr_shared', '1'); } catch (e) {}
    navigator.clipboard.writeText(qrUrl).then(function() {
      setCopied(true);
      setTimeout(function() { setCopied(false); }, 2000);
    }).catch(function() {});
  }

  function handleDownloadPNG() {
    try { localStorage.setItem('rb_qr_shared', '1'); } catch (e) {}
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

  function handleWhatsAppShare() {
    try { localStorage.setItem('rb_qr_shared', '1'); } catch (e) {}
    var text = shareMessage + '\n\n' + qrUrl;
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener,noreferrer');
  }

  function handleTestQr() {
    window.open(qrUrl, '_blank', 'noopener,noreferrer');
  }

  function handlePlacementSelect(key) {
    setPlacement(key);
    if (key === 'staff') {
      router.push('/dashboard/team');
    }
  }

  async function handleTemplateDownload(templateName) {
    try { localStorage.setItem('rb_qr_shared', '1'); } catch (e) {}
    var svgEl = document.getElementById('qr-svg-' + TEMPLATE_SLUGS[templateName]);
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
    try { localStorage.setItem('rb_qr_shared', '1'); } catch (e) {}
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

  var recommendedTemplate = placement ? PLACEMENT_TEMPLATE_MAP[placement] : null;
  var placementText = qrData ? (PLACEMENT_GUIDE[qrData.business_type] || PLACEMENT_GUIDE.other) : '';

  return (
    <>
      <Head><title>QR Code | ReviewBooster</title></Head>
      <DashboardLayout>

        {showAllTemplates && qrData && (
          <AllTemplatesModal
            businessName={qrData.business_name}
            onDownload={handleTemplateDownload}
            onCustomDownload={handleCustomTemplateDownload}
            customTemplates={customTemplates}
            recommendedTemplate={recommendedTemplate}
            onClose={function() { setShowAllTemplates(false); }}
          />
        )}

        {infoModalOpen && qrData && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm my-8 animate-slide-up">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h2 className="text-[15px] font-bold text-gray-900">How it works</h2>
                <button
                  onClick={function() { setInfoModalOpen(false); }}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-5">
                <div className="flex items-center mb-6">
                  {[
                    { label: 'Scan QR', icon: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="3" width="7" height="7" rx="1" fill="#7C3AED" />
                        <rect x="14" y="3" width="7" height="7" rx="1" fill="#7C3AED" />
                        <rect x="3" y="14" width="7" height="7" rx="1" fill="#7C3AED" />
                        <rect x="15" y="15" width="3" height="3" fill="#7C3AED" />
                        <rect x="19" y="15" width="2" height="2" fill="#7C3AED" />
                        <rect x="15" y="19" width="2" height="2" fill="#7C3AED" />
                      </svg>
                    ) },
                    { label: 'Share feedback', icon: (
                      <svg width="16" height="16" fill="none" stroke="#7C3AED" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    ) },
                    { label: 'Leave a public review', icon: (
                      <span style={{ color: '#7C3AED', fontSize: '16px', lineHeight: 1 }}>{'\u2605'}</span>
                    ) },
                  ].map(function(step, i) {
                    return (
                      <Fragment key={step.label}>
                        {i > 0 && <div className="flex-1 h-px bg-gray-200 mx-1" />}
                        <div className="flex flex-col items-center gap-1.5 shrink-0" style={{ width: '68px' }}>
                          <div className="w-9 h-9 rounded-full flex items-center justify-center relative" style={{ backgroundColor: '#F3E8FF' }}>
                            {step.icon}
                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center" style={{ backgroundColor: '#7C3AED' }}>
                              {i + 1}
                            </span>
                          </div>
                          <p className="text-[9px] text-gray-500 font-medium text-center leading-tight">{step.label}</p>
                        </div>
                      </Fragment>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleTestQr}
                  className="w-full flex items-center gap-3 text-left p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors mb-4"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#F3E8FF' }}>
                    <svg width="14" height="14" fill="none" stroke="#7C3AED" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">Test QR code</p>
                    <p className="text-[10px] text-gray-400">Opens exactly what your customers will see when they scan.</p>
                  </div>
                </button>

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-bold text-gray-800 mb-1.5">Where should I place my QR?</p>
                  <p className="text-xs text-gray-600 bg-amber-50 rounded-xl p-3 leading-relaxed">{placementText}</p>
                </div>
              </div>
            </div>
          </div>
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
          <div className="max-w-sm md:max-w-lg mx-auto space-y-4">

            {/* Greeting */}
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                {getGreeting() + ', ' + qrData.business_name}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Let customers scan, share feedback, and leave a review.
              </p>
            </div>

            {/* Your Review QR Code */}
            <div id="tour-qr-card" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[13px] font-bold text-gray-800">Your Review QR Code</h2>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Active
                  </span>
                  <button
                    type="button"
                    onClick={function() { setInfoModalOpen(true); }}
                    aria-label="How it works and where to place your QR"
                    className="w-5 h-5 rounded-full flex items-center justify-center text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors border border-gray-200"
                  >
                    <span className="text-[10px] font-bold italic" style={{ fontFamily: 'Georgia, serif' }}>i</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-center mb-4">
                <div className="relative p-3 rounded-2xl border-2 border-gray-100">
                  <QRCode
                    id="business-qr-svg"
                    value={qrUrl}
                    size={175}
                    level="H"
                    fgColor="#111827"
                    bgColor="#ffffff"
                  />
                  <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
                    {TEMPLATES.map(function(t) {
                      return (
                        <QRCode
                          key={t}
                          id={'qr-svg-' + TEMPLATE_SLUGS[t]}
                          value={qrUrl + '?t=' + TEMPLATE_SLUGS[t]}
                          size={190}
                          level="H"
                          fgColor="#111827"
                          bgColor="#ffffff"
                        />
                      );
                    })}
                  </div>
                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center shadow-md"
                    style={{ width: '40px', height: '40px', backgroundColor: '#7C3AED' }}
                  >
                    <span style={{ color: '#fff', fontSize: '20px', lineHeight: 1 }}>{'\u2605'}</span>
                  </div>
                </div>
              </div>

              <p className="text-sm font-bold text-gray-900 text-center mb-1">{qrData.business_name}</p>
              <p className="text-xs text-gray-400 text-center mb-4">Scan to share your feedback and leave a review.</p>

              <div id="tour-qr-actions" className="grid grid-cols-3 gap-2 mb-2">
                <button
                  onClick={handleDownloadPNG}
                  className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl text-white text-[11px] font-semibold transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#7C3AED' }}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
                <button
                  onClick={function() { setSharePanelOpen(!sharePanelOpen); }}
                  className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl text-[11px] font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share
                </button>
                <button
                  onClick={function() { setShowAllTemplates(true); }}
                  className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl text-[11px] font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a1 1 0 001-1v-4a1 1 0 00-1-1H9a1 1 0 00-1 1v4a1 1 0 001 1zm8-14V4a1 1 0 00-1-1H8a1 1 0 00-1 1v3h10z" />
                  </svg>
                  Print
                </button>
              </div>

              {sharePanelOpen && (
                <div className="mt-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-500 mb-1.5">Message (edit if you\u2019d like)</p>
                  <textarea
                    value={shareMessage}
                    onChange={function(e) { setShareMessage(e.target.value); }}
                    rows={3}
                    className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-purple-200 mb-2 text-base sm:text-xs"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={handleWhatsAppShare}
                      className="py-2 rounded-lg text-[10px] font-semibold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: '#25D366' }}>
                      WhatsApp
                    </button>
                    <button onClick={handleDownloadPNG}
                      className="py-2 rounded-lg text-[10px] font-semibold border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors">
                      Download Image
                    </button>
                    <button onClick={handleCopy}
                      className="py-2 rounded-lg text-[10px] font-semibold border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors">
                      {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Where will you use it? */}
            <div id="tour-qr-placement" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h2 className="text-[13px] font-bold text-gray-800 mb-3">Where will you use it?</h2>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'counter', label: 'Counter' },
                  { key: 'table',   label: 'Table' },
                  { key: 'staff',   label: 'Staff' },
                ].map(function(opt) {
                  var isSel = placement === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={function() { handlePlacementSelect(opt.key); }}
                      className={'py-2.5 rounded-xl text-xs font-semibold border transition-colors ' + (isSel ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-purple-300')}
                      style={isSel ? { backgroundColor: '#7C3AED' } : {}}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {recommendedTemplate && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-[11px] text-gray-400 mb-2">Recommended for {placement === 'counter' ? 'a counter' : 'a table'}:</p>
                  <div style={{ width: '110px' }} className="mx-auto">
                    <TemplateCard
                      name={recommendedTemplate}
                      qrSvgId={'qr-svg-' + TEMPLATE_SLUGS[recommendedTemplate]}
                      businessName={qrData.business_name}
                      onDownload={handleTemplateDownload}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={function() { setShowAllTemplates(true); }}
                className="w-full mt-4 pt-3 border-t border-gray-100 text-[11px] font-semibold text-purple-600 hover:underline text-center"
              >
                View all print materials{customTemplates.length > 0 ? ' (' + (TEMPLATES.length + customTemplates.length) + ')' : ''}
              </button>
            </div>

            {/* Review Performance */}
            <div id="tour-qr-performance" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[13px] font-bold text-gray-800">Review Performance</h2>
                <select
                  value={statsDays}
                  onChange={function(e) { setStatsDays(parseInt(e.target.value, 10)); }}
                  className="text-[11px] font-semibold text-gray-600 border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-purple-200 bg-white"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Scans',      value: period.scans,           delta: periodChange.scans },
                  { label: 'Feedback',   value: period.feedback,        delta: periodChange.feedback },
                  { label: 'Reviews',    value: period.reviews,         delta: periodChange.reviews },
                  { label: 'Conversion', value: Math.round(period.conversion_rate * 100) + '%', delta: periodChange.conversion_rate },
                ].map(function(m) {
                  return (
                    <div key={m.label}>
                      <p className="text-[10px] text-gray-400 mb-0.5">{m.label}</p>
                      <p className="text-lg font-bold text-gray-900 leading-none tabular-nums">{m.value}</p>
                      <p className={'text-[10px] font-semibold mt-0.5 ' + (m.delta > 0 ? 'text-emerald-500' : m.delta < 0 ? 'text-red-400' : 'text-gray-300')}>
                        {m.delta > 0 ? ('\u2191 ' + m.delta + '%') : m.delta < 0 ? ('\u2193 ' + Math.abs(m.delta) + '%') : 'No change'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Staff QR Codes -- lives on Team now, alongside staff management */}
            <Link href="/dashboard/team" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between hover:border-purple-200 transition-colors">
              <div>
                <p className="text-xs font-bold text-gray-800">Manage staff QR codes</p>
                <p className="text-[10px] text-gray-400">See which staff member gets the most reviews.</p>
              </div>
              <span className="text-purple-600 text-sm font-semibold shrink-0">{'Team \u2192'}</span>
            </Link>

            {/* Results by Placement */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={function() { setPlacementSectionOpen(!placementSectionOpen); }}
                className="w-full p-4 flex items-center justify-between text-left"
              >
                <div>
                  <p className="text-xs font-bold text-gray-800">Results by Placement</p>
                  <p className="text-[10px] text-gray-400">Which physical placement drives the most scans.</p>
                </div>
                <div
                  className="w-9 h-5 rounded-full flex items-center px-0.5 shrink-0 transition-colors"
                  style={{ backgroundColor: placementSectionOpen ? '#7C3AED' : '#E5E7EB' }}
                >
                  <div
                    className="w-4 h-4 rounded-full bg-white shadow transition-transform"
                    style={{ transform: placementSectionOpen ? 'translateX(16px)' : 'translateX(0)' }}
                  />
                </div>
              </button>
              {placementSectionOpen && (
                <div className="px-4 pb-4">
                  {stats && stats.by_template && stats.by_template.length > 0 ? (
                    <div className="space-y-2">
                      {stats.by_template.map(function(row) {
                        return (
                          <div key={row.key} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-gray-50">
                            <p className="text-xs font-semibold text-gray-700 shrink-0">{row.label}</p>
                            <div className="flex items-center gap-3 text-[10px] text-gray-500 shrink-0">
                              <span>{row.scans + (row.scans === 1 ? ' scan' : ' scans')}</span>
                              <span>{row.reviews + (row.reviews === 1 ? ' review' : ' reviews')}</span>
                              <span className="font-semibold text-gray-700">{Math.round(row.conversion_rate * 100) + '%'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">No placement data yet.</p>
                  )}
                </div>
              )}
            </div>

          </div>
        )}

      </DashboardLayout>
    </>
  );
}

export default withAuth(QrPage);