/**
 * lib/successCards.js
 * Draws Success Story marketing cards (before/after, testimonial, sales proof)
 * onto a <canvas>, in the browser, so a super admin can preview and download
 * PNGs with no server-side image tooling.
 *
 * Nothing here decides what may be used -- buildCardData() does, and it only
 * lets through what the owner explicitly permitted in their consent record:
 *   results       -> before/after numbers
 *   testimonial   -> the quote (their words, or the admin's polished version of them)
 *   business_name -> the business name (otherwise "A ReviewBooster customer")
 *   logo          -> the business logo
 * Google numbers are always labelled as reported by the business, because
 * ReviewBooster cannot read Google and the owner typed them in.
 */

var FONT = '"Inter", "Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif';
var PURPLE = '#7C3AED';
var DARK = '#1F2937';
var GREY = '#6B7280';
var GREEN = '#059669';

export var CARD_LIBRARY = [
  { key: 'ba_square',      group: 'Before / After', label: 'Square post',    w: 1080, h: 1080, needs: ['results'] },
  { key: 'ba_story',       group: 'Before / After', label: 'Story',          w: 1080, h: 1920, needs: ['results'] },
  { key: 'ba_landscape',   group: 'Before / After', label: 'Landscape',      w: 1200, h: 630,  needs: ['results'] },
  { key: 't_square',       group: 'Testimonial',    label: 'Square post',    w: 1080, h: 1080, needs: ['quote'] },
  { key: 't_story',        group: 'Testimonial',    label: 'Story',          w: 1080, h: 1920, needs: ['quote'] },
  { key: 't_landscape',    group: 'Testimonial',    label: 'Landscape',      w: 1200, h: 630,  needs: ['quote'] },
  { key: 'proof_landscape', group: 'Sales proof',   label: 'Results + quote', w: 1200, h: 630, needs: ['results', 'quote'] },
];

/**
 * story = the object returned by GET /admin/success-stories/:id
 * Returns everything a card may show, already filtered by the owner's consent.
 * Cards are only produced for approved stories.
 */
export function buildCardData(story) {
  var empty = { ok: false, reason: '', results: null, quote: '', headline: '', name: 'A ReviewBooster customer', logoUrl: null };
  if (!story) return empty;
  if (story.status !== 'approved') {
    empty.reason = 'Cards are only made from approved stories.';
    return empty;
  }
  var perms = story.consent && story.consent.permissions ? story.consent.permissions : {};
  var biz = story.business_id && typeof story.business_id === 'object' ? story.business_id : {};
  var snap = story.results_snapshot || {};
  var g = snap.google || {};

  var results = null;
  if (perms.results === true && g.baseline && g.current) {
    var gain = g.current.review_count - g.baseline.review_count;
    var ratingGain = (g.baseline.rating != null && g.current.rating != null)
      ? Math.round((g.current.rating - g.baseline.rating) * 10) / 10 : null;
    results = {
      before: g.baseline.review_count,
      now: g.current.review_count,
      gain: gain,
      ratingBefore: g.baseline.rating,
      ratingNow: g.current.rating,
      ratingGain: ratingGain,
    };
  }

  var pres = story.presentation || {};
  var quote = '';
  if (perms.testimonial === true) {
    quote = String(pres.quote || story.testimonial || '').trim();
  }

  var headline = String(pres.headline || '').trim();
  if (!headline && results && results.gain > 0) {
    headline = '+' + results.gain.toLocaleString('en-IN') + ' Google reviews';
  }

  return {
    ok: true,
    reason: '',
    results: results,
    quote: quote,
    headline: headline,
    name: perms.business_name === true && biz.name ? biz.name : 'A ReviewBooster customer',
    namePermitted: perms.business_name === true && !!biz.name,
    logoUrl: perms.logo === true && biz.brand_logo_url ? biz.brand_logo_url : null,
  };
}

export function availableCards(data) {
  if (!data || !data.ok) return [];
  return CARD_LIBRARY.filter(function (c) {
    return c.needs.every(function (n) {
      return n === 'results' ? !!data.results : n === 'quote' ? !!data.quote : true;
    });
  });
}

// ---------------------------------------------------------------- drawing helpers

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapLines(ctx, text, maxW) {
  var out = [];
  String(text).split(/\n+/).forEach(function (para) {
    var words = para.split(/\s+/).filter(Boolean);
    var line = '';
    words.forEach(function (word) {
      var test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width <= maxW || !line) {
        line = test;
      } else {
        out.push(line);
        line = word;
      }
    });
    if (line) out.push(line);
  });
  return out;
}

// Largest font size (between min and max) at which the text fits the box.
function fitText(ctx, text, weight, maxW, maxH, maxSize, minSize, lineRatio) {
  var size = maxSize;
  var lines = [];
  while (size >= minSize) {
    ctx.font = weight + ' ' + size + 'px ' + FONT;
    lines = wrapLines(ctx, text, maxW);
    if (lines.length * size * lineRatio <= maxH) return { size: size, lines: lines, lh: size * lineRatio };
    size -= 2;
  }
  ctx.font = weight + ' ' + minSize + 'px ' + FONT;
  lines = wrapLines(ctx, text, maxW);
  var maxLines = Math.max(1, Math.floor(maxH / (minSize * lineRatio)));
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    var last = lines[maxLines - 1];
    while (last.length > 1 && ctx.measureText(last + '\u2026').width > maxW) last = last.slice(0, -1);
    lines[maxLines - 1] = last + '\u2026';
  }
  return { size: minSize, lines: lines, lh: minSize * lineRatio };
}

function loadImage(url, crossOrigin) {
  return new Promise(function (resolve) {
    var img = new Image();
    if (crossOrigin) img.crossOrigin = 'anonymous';
    img.onload = function () { resolve(img); };
    img.onerror = function () { resolve(null); };
    img.src = url;
  });
}

function drawFrame(ctx, w, h, u) {
  var g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#5B21B6');
  g.addColorStop(0.55, '#7C3AED');
  g.addColorStop(1, '#A855F7');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  var m = 52 * u;
  var panel = { x: m, y: m, w: w - 2 * m, h: h - 2 * m, r: 44 * u };
  ctx.save();
  ctx.shadowColor = 'rgba(30, 10, 80, 0.35)';
  ctx.shadowBlur = 40 * u;
  ctx.shadowOffsetY = 12 * u;
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, panel.x, panel.y, panel.w, panel.h, panel.r);
  ctx.fill();
  ctx.restore();
  return panel;
}

// Footer: brand logo (or a text wordmark) centred at the bottom of the panel.
function drawFooter(ctx, panel, u, logo, note) {
  var cx = panel.x + panel.w / 2;
  var bottom = panel.y + panel.h - 34 * u;
  if (logo) {
    var lh = 58 * u;
    var lw = logo.width * (lh / logo.height);
    ctx.drawImage(logo, cx - lw / 2, bottom - lh, lw, lh);
  } else {
    ctx.fillStyle = PURPLE;
    ctx.font = '800 ' + (38 * u) + 'px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('ReviewBooster', cx, bottom - 8 * u);
  }
  if (note) {
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '500 ' + (22 * u) + 'px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(note, cx, bottom - 58 * u - 16 * u);
  }
  return bottom - 58 * u - 16 * u - 22 * u - 20 * u;   // y where content must stop
}

// Business logo as a circle (only ever called when the owner permitted it).
function drawAvatar(ctx, img, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  var s = Math.max((2 * r) / img.width, (2 * r) / img.height);
  ctx.drawImage(img, cx - (img.width * s) / 2, cy - (img.height * s) / 2, img.width * s, img.height * s);
  ctx.restore();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#EDE9FE';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
}

function pill(ctx, text, cx, y, size, fg, bg) {
  ctx.font = '800 ' + size + 'px ' + FONT;
  var tw = ctx.measureText(text).width;
  var padX = size * 0.8;
  var ph = size * 1.9;
  ctx.fillStyle = bg;
  roundRect(ctx, cx - tw / 2 - padX, y, tw + 2 * padX, ph, ph / 2);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, y + ph / 2 + size * 0.04);
  return ph;
}

function num(n) { return Number(n).toLocaleString('en-IN'); }

// ---------------------------------------------------------------- the three card designs

function drawBeforeAfter(ctx, w, h, u, panel, data, logo, avatar) {
  var r = data.results;
  var isStory = h > w * 1.5;
  var isWide = w > h;
  // Landscape has the least vertical room, so its own block sizes are
  // tighter (smaller avatar/number/gap) rather than just centring blindly --
  // otherwise a logo + rating combination can run into the footer.
  var scale = isWide ? 0.72 : 1;
  var gap = (isStory ? 1.7 : 1) * u * (isWide ? 0.75 : 1);
  var cx = panel.x + panel.w / 2;
  var innerW = panel.w - 120 * u;

  var stopY = drawFooter(ctx, panel, u, logo, 'Google review count and rating as reported by the business');

  // measure the block first so it can be centred vertically
  var headlineFit = fitText(ctx, data.headline || '', '800', innerW, 150 * u * (isWide ? 0.75 : 1), 70 * u * scale, 36 * u, 1.15);
  var hasRating = r.ratingBefore != null && r.ratingNow != null;
  var avatarH = avatar ? 150 * u * scale : 0;
  var numH = 150 * u * scale;
  var blocks = [];
  if (avatar) blocks.push({ h: avatarH, gap: 22 * gap });
  blocks.push({ h: 34 * u * scale, gap: 26 * gap });                            // name
  if (data.headline) blocks.push({ h: headlineFit.lines.length * headlineFit.lh, gap: 44 * gap });
  blocks.push({ h: 26 * u + 10 * u + numH, gap: 34 * gap });                    // labels + numbers
  if (r.gain !== 0) blocks.push({ h: 34 * u * 1.9, gap: hasRating ? 46 * gap : 0 }); // delta pill
  if (hasRating) blocks.push({ h: 26 * u + 62 * u * scale, gap: 0 });           // rating row
  var total = blocks.reduce(function (s, b) { return s + b.h + b.gap; }, 0);
  var top = panel.y + 40 * u;
  var avail = stopY - top;
  // If it still doesn't fit (a very long headline, say), compress the gaps
  // further rather than let any block collide with the footer.
  if (total > avail && avail > 0) {
    var gapTotal = blocks.reduce(function (s, b) { return s + b.gap; }, 0);
    var fixedTotal = total - gapTotal;
    var neededGapTotal = Math.max(0, avail - fixedTotal);
    var shrink = gapTotal > 0 ? neededGapTotal / gapTotal : 0;
    blocks.forEach(function (b) { b.gap *= shrink; });
    total = blocks.reduce(function (s, b) { return s + b.h + b.gap; }, 0);
  }
  var y = top + Math.max(0, (avail - total) / 2);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  if (avatar) {
    drawAvatar(ctx, avatar, cx, y + avatarH / 2, avatarH / 2);
    y += avatarH + 22 * gap;
  }

  ctx.fillStyle = PURPLE;
  ctx.font = '700 ' + (32 * u) + 'px ' + FONT;
  var nm = data.name.toUpperCase();
  while (ctx.measureText(nm).width > innerW && nm.length > 4) nm = nm.slice(0, -2);
  ctx.fillText(nm === data.name.toUpperCase() ? nm : nm + '\u2026', cx, y + 30 * u);
  y += 34 * u + 26 * gap;

  if (data.headline) {
    ctx.fillStyle = DARK;
    ctx.font = '800 ' + headlineFit.size + 'px ' + FONT;
    ctx.textBaseline = 'top';
    headlineFit.lines.forEach(function (ln, i) { ctx.fillText(ln, cx, y + i * headlineFit.lh); });
    y += headlineFit.lines.length * headlineFit.lh + 44 * gap;
  }

  // BEFORE  ->  NOW
  var colOff = Math.min(panel.w * 0.27, 300 * u);
  var lx = cx - colOff;
  var rx = cx + colOff;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = GREY;
  ctx.font = '700 ' + (26 * u) + 'px ' + FONT;
  ctx.fillText('BEFORE', lx, y + 24 * u);
  ctx.fillStyle = PURPLE;
  ctx.fillText('NOW', rx, y + 24 * u);
  var ny = y + 26 * u + 10 * u + numH * 0.85;
  ctx.font = '800 ' + numH + 'px ' + FONT;
  ctx.fillStyle = '#9CA3AF';
  ctx.fillText(num(r.before), lx, ny);
  ctx.fillStyle = PURPLE;
  ctx.fillText(num(r.now), rx, ny);
  ctx.fillStyle = PURPLE;
  ctx.font = '700 ' + (76 * u * scale) + 'px ' + FONT;
  ctx.fillText('\u2192', cx, ny - 30 * u * scale);
  ctx.fillStyle = GREY;
  ctx.font = '600 ' + (26 * u) + 'px ' + FONT;
  ctx.fillText('Google reviews', cx, ny + 36 * u);
  y += 26 * u + 10 * u + numH + 34 * gap;

  if (r.gain !== 0) {
    var up = r.gain > 0;
    var ph = pill(ctx, (up ? '+' : '') + num(r.gain) + ' reviews', cx, y, 34 * u, up ? GREEN : '#B91C1C', up ? '#D1FAE5' : '#FEE2E2');
    y += ph + (hasRating ? 46 * gap : 0);
  }

  if (hasRating) {
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'center';
    ctx.fillStyle = GREY;
    ctx.font = '600 ' + (26 * u) + 'px ' + FONT;
    ctx.fillText('GOOGLE RATING', cx, y + 22 * u);
    ctx.fillStyle = DARK;
    ctx.font = '800 ' + (58 * u * scale) + 'px ' + FONT;
    var line = '\u2605 ' + r.ratingBefore + '  \u2192  \u2605 ' + r.ratingNow;
    ctx.fillText(line, cx, y + 26 * u + 54 * u * scale);
  }
}

function drawTestimonial(ctx, w, h, u, panel, data, logo, avatar) {
  var isStory = h > w * 1.5;
  var isWide = w > h;
  var cx = panel.x + panel.w / 2;
  var innerW = panel.w - (isWide ? 200 : 140) * u;

  var stopY = drawFooter(ctx, panel, u, logo, null);
  var top = panel.y + 34 * u;

  // quote mark
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#DDD6FE';
  ctx.font = '800 ' + (isWide ? 150 : 230) * u + 'px Georgia, serif';
  ctx.fillText('\u201C', cx, top + (isWide ? 120 : 190) * u);

  var attrH = (avatar ? 130 : 0) * u + 46 * u + 30 * u;
  var textTop = top + (isWide ? 100 : 170) * u;
  var maxH = stopY - textTop - attrH - 20 * u;
  var fit = fitText(ctx, data.quote, '600', innerW, maxH, (isStory ? 74 : isWide ? 46 : 64) * u, 26 * u, 1.35);

  var blockH = fit.lines.length * fit.lh;
  var y = textTop + Math.max(0, (maxH - blockH) / 2);
  ctx.fillStyle = DARK;
  ctx.font = '600 ' + fit.size + 'px ' + FONT;
  ctx.textBaseline = 'top';
  fit.lines.forEach(function (ln, i) { ctx.fillText(ln, cx, y + i * fit.lh); });
  y += blockH + 34 * u;

  if (avatar) {
    drawAvatar(ctx, avatar, cx, y + 50 * u, 50 * u);
    y += 116 * u;
  }
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = PURPLE;
  ctx.font = '800 ' + (36 * u) + 'px ' + FONT;
  var nm = data.name;
  while (ctx.measureText(nm).width > innerW && nm.length > 4) nm = nm.slice(0, -2);
  ctx.fillText('\u2014 ' + (nm === data.name ? nm : nm + '\u2026'), cx, y + 36 * u);
  if (!data.namePermitted) {
    ctx.fillStyle = GREY;
    ctx.font = '500 ' + (24 * u) + 'px ' + FONT;
    ctx.fillText('using ReviewBooster', cx, y + 36 * u + 34 * u);
  }
}

function drawProof(ctx, w, h, u, panel, data, logo, avatar) {
  var r = data.results;
  var stopY = drawFooter(ctx, panel, u, logo, 'Google review count as reported by the business');
  var pad = 64 * u;
  var top = panel.y + 42 * u;
  var midX = panel.x + panel.w * 0.42;

  // header line
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = PURPLE;
  ctx.font = '700 ' + (26 * u) + 'px ' + FONT;
  var nm = data.name.toUpperCase();
  while (ctx.measureText(nm).width > panel.w - 2 * pad - (avatar ? 90 * u : 0) && nm.length > 4) nm = nm.slice(0, -2);
  var nameX = panel.x + pad;
  if (avatar) {
    drawAvatar(ctx, avatar, panel.x + pad + 34 * u, top + 30 * u, 34 * u);
    nameX += 88 * u;
  }
  ctx.fillText(nm, nameX, top + 40 * u);

  var bodyTop = top + 96 * u;
  var bodyH = stopY - bodyTop;

  // left: numbers
  var lcx = panel.x + (midX - panel.x) / 2 + 10 * u;
  ctx.textAlign = 'center';
  ctx.fillStyle = GREY;
  ctx.font = '700 ' + (22 * u) + 'px ' + FONT;
  ctx.fillText('GOOGLE REVIEWS', lcx, bodyTop + 22 * u);
  ctx.font = '800 ' + (96 * u) + 'px ' + FONT;
  ctx.fillStyle = '#9CA3AF';
  var beforeTxt = num(r.before);
  var beforeW = ctx.measureText(beforeTxt).width;
  ctx.fillText(beforeTxt, lcx - 0, bodyTop + 118 * u);
  ctx.fillStyle = PURPLE;
  ctx.font = '700 ' + (48 * u) + 'px ' + FONT;
  ctx.fillText('\u2193', lcx, bodyTop + 176 * u);
  ctx.font = '800 ' + (120 * u) + 'px ' + FONT;
  ctx.fillText(num(r.now), lcx, bodyTop + 300 * u);
  if (r.gain > 0) {
    pill(ctx, '+' + num(r.gain) + ' reviews', lcx, bodyTop + 322 * u, 26 * u, GREEN, '#D1FAE5');
  }

  // divider
  ctx.strokeStyle = '#EDE9FE';
  ctx.lineWidth = 3 * u;
  ctx.beginPath();
  ctx.moveTo(midX + 20 * u, bodyTop);
  ctx.lineTo(midX + 20 * u, stopY - 10 * u);
  ctx.stroke();

  // right: quote
  var qx = midX + 60 * u;
  var qw = panel.x + panel.w - pad - qx;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#DDD6FE';
  ctx.font = '800 ' + (110 * u) + 'px Georgia, serif';
  ctx.fillText('\u201C', qx - 4 * u, bodyTop + 80 * u);
  var qTop = bodyTop + 70 * u;
  var fit = fitText(ctx, data.quote, '600', qw, stopY - qTop - 10 * u, 38 * u, 22 * u, 1.35);
  ctx.fillStyle = DARK;
  ctx.font = '600 ' + fit.size + 'px ' + FONT;
  ctx.textBaseline = 'top';
  fit.lines.forEach(function (ln, i) { ctx.fillText(ln, qx, qTop + i * fit.lh); });
}

/**
 * Renders one card onto the given canvas. Resolves when finished.
 * Only ever call with a key returned by availableCards(data).
 */
export async function renderCard(canvas, key, data) {
  var def = CARD_LIBRARY.filter(function (c) { return c.key === key; })[0];
  if (!def || !data || !data.ok) return false;
  canvas.width = def.w;
  canvas.height = def.h;
  var ctx = canvas.getContext('2d');

  var loaded = await Promise.all([
    loadImage('/logo-lockup.png', false),
    data.logoUrl ? loadImage(data.logoUrl, true) : Promise.resolve(null),
  ]);
  var logo = loaded[0];
  var avatar = loaded[1];

  var wide = def.w > def.h;
  var u = wide ? (def.h / 1080) * 1.08 : def.w / 1080;
  var panel = drawFrame(ctx, def.w, def.h, u);

  if (key.indexOf('ba_') === 0) drawBeforeAfter(ctx, def.w, def.h, u, panel, data, logo, avatar);
  else if (key.indexOf('t_') === 0) drawTestimonial(ctx, def.w, def.h, u, panel, data, logo, avatar);
  else drawProof(ctx, def.w, def.h, u, panel, data, logo, avatar);
  return true;
}