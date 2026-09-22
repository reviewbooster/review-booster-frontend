/**
 * lib/reviewDraftPrompts.js
 * Zero-cost, client-side "AI assist" for the 4-5 star public review page.
 * No external API: the customer picks experience chips (and optionally adds
 * their own words), and this stitches together a short, editable draft from
 * static phrase banks.
 *
 * Variation matters here beyond just UX polish -- multiple customers posting
 * near-identical review text on the same Google Business Profile is a known
 * trigger for Google flagging a listing for fake/incentivized reviews. So
 * generation here is deliberately randomized every call (Math.random(), not
 * a seed), across four independent axes (opener, lead-in phrase, each
 * chip's own wording, closer), so two customers picking the exact same
 * chips still very rarely end up with the same sentence. The customer's own
 * typed words (verbatim, never altered) add a fifth axis of real variation
 * whenever they add any.
 */

var GENERIC_CHIPS = [
  { key: 'staff',   label: 'Staff', icon: '\uD83D\uDC9B', description: 'How did the team treat you?', phrases: ['friendly staff', 'the helpful team', 'attentive staff', 'the friendly team'] },
  { key: 'speed',   label: 'Service Speed', icon: '\u23F1\uFE0F', description: 'How was the wait?', phrases: ['quick service', 'fast turnaround', 'how quick everything was', 'prompt service'] },
  { key: 'clean',   label: 'Cleanliness', icon: '\u2728', description: 'How clean was it?', phrases: ['how clean everything was', 'the spotless space', 'how tidy the place was'] },
  { key: 'value',   label: 'Value', icon: '\uD83D\uDCB0', description: 'Was it worth it?', phrases: ['fair pricing', 'great value for money', 'reasonable prices'] },
  { key: 'overall', label: 'Overall Experience', icon: '\u2B50', description: 'How was it overall?', phrases: ['the overall experience', 'how smooth everything was', 'the whole experience'] },
];

var VERTICAL_CHIPS = {
  salon: [
    { key: 'stylist', label: 'Stylist', icon: '\uD83D\uDC87', description: 'How was your stylist?', phrases: ['my stylist\u2019s work', 'how my hair turned out', 'the stylist\u2019s attention to detail'] },
    { key: 'result',  label: 'The Result', icon: '\u2728', description: 'How did it turn out?', phrases: ['exactly the look I wanted', 'how the results turned out', 'the finished look'] },
  ],
  barbershop: [
    { key: 'barber', label: 'Barber', icon: '\uD83D\uDC88', description: 'How was your barber?', phrases: ['my barber\u2019s work', 'the haircut', 'how sharp the cut looked'] },
  ],
  gym: [
    { key: 'trainer',   label: 'Trainer', icon: '\uD83C\uDFCB\uFE0F', description: 'How was your trainer?', phrases: ['my trainer\u2019s guidance', 'the coaching', 'how supportive the trainer was'] },
    { key: 'equipment', label: 'Equipment', icon: '\u2699\uFE0F', description: 'How was the equipment?', phrases: ['the equipment', 'how well-maintained the machines were'] },
  ],
  dental: [
    { key: 'care', label: 'Care & Explanation', icon: '\uD83E\uDE7A', description: 'Was it explained clearly?', phrases: ['how well everything was explained', 'the gentle care', 'how thorough the checkup was'] },
  ],
  clinic: [
    { key: 'care', label: 'Care & Explanation', icon: '\uD83E\uDE7A', description: 'Was it explained clearly?', phrases: ['how well everything was explained', 'the gentle care', 'how thorough the visit was'] },
  ],
  restaurant: [
    { key: 'food',     label: 'Food Quality', icon: '\uD83C\uDF7D\uFE0F', description: 'How was the food?', phrases: ['how good the food was', 'the delicious food', 'the food quality'] },
    { key: 'ambience', label: 'Ambience', icon: '\uD83D\uDD6F\uFE0F', description: 'How was the atmosphere?', phrases: ['the cozy atmosphere', 'the nice ambience', 'how pleasant the place felt'] },
  ],
  retail: [
    { key: 'product', label: 'Product Quality', icon: '\uD83D\uDECD\uFE0F', description: 'How was the product?', phrases: ['the product quality', 'how good the products were'] },
  ],
  auto: [
    { key: 'service_quality', label: 'Service Quality', icon: '\uD83D\uDD27', description: 'How was the service?', phrases: ['how well the car was serviced', 'the quality of the repair work'] },
  ],
  real_estate: [
    { key: 'communication', label: 'Communication', icon: '\uD83D\uDCAC', description: 'How was communication?', phrases: ['how responsive the agent was', 'the clear communication throughout'] },
  ],
  education: [
    { key: 'teaching', label: 'Teaching Quality', icon: '\uD83D\uDCDA', description: 'How was the class?', phrases: ['the quality of teaching', 'how well the class was run'] },
  ],
  pet_care: [
    { key: 'pet_handling', label: 'Pet Care', icon: '\uD83D\uDC3E', description: 'How was your pet treated?', phrases: ['how well my pet was looked after', 'the gentle care for my pet'] },
  ],
};

var OPENERS_WITH_NAME = [
  'Had a great experience at {business}.',
  'Really happy with my visit to {business}.',
  '{business} exceeded my expectations.',
  'Great time at {business} today.',
  'Loved my visit to {business}.',
];
var OPENERS_NO_NAME = [
  'Had a great experience overall.',
  'Really happy with how everything went.',
  'This exceeded my expectations.',
  'Had a wonderful time.',
];
var LIST_LEAD_INS = [
  'I really appreciated ',
  'What stood out was ',
  'I particularly liked ',
  'I was impressed by ',
];
var CLOSERS = [
  'Overall a good experience.',
  'Glad I came in.',
  'Would come back.',
  'Happy with how it went.',
];

// -- 1-3 star issue selection (two-screen flow) -----------------------------
// Screen A: pick one issue from grouped chips. Screen B: an optional,
// issue-specific follow-up -- either a short set of quick-reply options
// (e.g. wait-time buckets) or just a plain "tell us more" box when there's
// nothing sensible to offer as discrete choices.
var ISSUE_GROUPS = [
  {
    group: 'Service',
    issues: [
      { key: 'staff', label: 'Staff service', phrase: 'Staff was rude', followUp: { question: 'What could have been better?', options: ['Attitude', 'Response time', 'Knowledge'] } },
      { key: 'wait',  label: 'Waiting time',  phrase: 'Had to wait too long', followUp: { question: 'How long did you wait?', options: ['Under 10 min', '10\u201330 min', '30\u201360 min', 'Over 60 min'] } },
      { key: 'comm',  label: 'Communication', phrase: 'Communication could\u2019ve been better', followUp: { question: 'What kind of issue?', options: ['Unclear info', 'Slow replies', 'Rude tone'] } },
      { key: 'appt',  label: 'Appointment',   phrase: 'Appointment wasn\u2019t handled well', followUp: { question: 'Booking, timing, or changes?', options: ['Booking issue', 'Timing issue', 'Changed without notice'] } },
    ],
  },
  {
    group: 'Experience',
    issues: [
      { key: 'quality',     label: 'Quality',     phrase: 'Quality was poor', followUp: { question: 'What part of the service?', options: ['Result', 'Attention to detail', 'Consistency'] } },
      { key: 'pricing',     label: 'Pricing',      phrase: 'Felt overpriced', followUp: { question: 'What was unclear?', options: ['Final cost', 'Extra charges', 'Payment process'] } },
      { key: 'cleanliness', label: 'Cleanliness',  phrase: "Place wasn't clean", followUp: { question: 'Which area?', options: ['Waiting area', 'Restroom', 'Work area'] } },
      { key: 'other',       label: 'Other',        phrase: 'Something else was off', followUp: null },
    ],
  },
];

// Business-type-specific issues, appended to the Service group so every
// business still gets the same familiar universal set plus a couple that
// are actually relevant to what they do.
var VERTICAL_ISSUE_EXTRAS = {
  salon:       [{ key: 'stylist', label: 'Stylist', phrase: 'Not happy with the stylist', followUp: { question: 'What was the issue?', options: ['Result', 'Communication', 'Attitude'] } }],
  barbershop:  [{ key: 'barber', label: 'Barber', phrase: 'Not happy with the haircut', followUp: { question: 'What was the issue?', options: ['Haircut result', 'Communication', 'Attitude'] } }],
  gym:         [{ key: 'equipment', label: 'Equipment', phrase: 'Equipment was in poor condition', followUp: { question: 'What was wrong?', options: ['Broken', 'Outdated', 'Not enough available'] } },
                { key: 'trainer', label: 'Trainer', phrase: 'Trainer wasn\u2019t helpful', followUp: { question: 'What was the issue?', options: ['Guidance', 'Attitude', 'Availability'] } }],
  dental:      [{ key: 'treatment', label: 'Treatment', phrase: 'Not happy with the treatment', followUp: { question: 'What was the issue?', options: ['Explanation', 'Discomfort', 'Result'] } }],
  clinic:      [{ key: 'treatment', label: 'Treatment', phrase: 'Not happy with the treatment', followUp: { question: 'What was the issue?', options: ['Explanation', 'Discomfort', 'Result'] } }],
  restaurant:  [{ key: 'food', label: 'Food Quality', phrase: 'Food wasn\u2019t good', followUp: { question: 'What was wrong?', options: ['Taste', 'Temperature', 'Portion'] } },
                { key: 'reservation', label: 'Reservation', phrase: 'Reservation wasn\u2019t handled well', followUp: { question: 'What went wrong?', options: ['Not honored', 'Wrong time', 'Seating'] } }],
  retail:      [{ key: 'product', label: 'Product Quality', phrase: 'Product wasn\u2019t as expected', followUp: { question: 'What was wrong?', options: ['Quality', 'Not as described', 'Damaged'] } },
                { key: 'delivery', label: 'Delivery', phrase: 'Delivery was a problem', followUp: { question: 'What went wrong?', options: ['Late', 'Damaged', 'Wrong item'] } }],
  auto:        [{ key: 'vehicle_service', label: 'Vehicle Service', phrase: 'Not happy with the service on my vehicle', followUp: { question: 'What was the issue?', options: ['Not fixed properly', 'New issue after', 'Explanation'] } },
                { key: 'timeliness', label: 'Timeliness', phrase: 'Vehicle wasn\u2019t ready on time', followUp: { question: 'How late?', options: ['A little late', 'Very late', 'Not ready as promised'] } }],
  real_estate: [{ key: 're_comm', label: 'Communication', phrase: 'Communication could\u2019ve been better', followUp: { question: 'What was the issue?', options: ['Slow replies', 'Unclear info', 'Follow-up'] } },
                { key: 'paperwork', label: 'Paperwork', phrase: 'Paperwork process was frustrating', followUp: { question: 'What was the issue?', options: ['Too slow', 'Confusing', 'Errors'] } }],
  education:   [{ key: 'teaching', label: 'Teaching Quality', phrase: 'Not happy with the class', followUp: { question: 'What was the issue?', options: ['Content', 'Pace', 'Clarity'] } }],
  pet_care:    [{ key: 'pet_handling', label: 'Pet Handling', phrase: 'Not happy with how my pet was handled', followUp: { question: 'What was the issue?', options: ['Gentleness', 'Communication', 'Result'] } }],
};

function getIssueGroups(businessType) {
  var extras = VERTICAL_ISSUE_EXTRAS[businessType] || [];
  if (extras.length === 0) return ISSUE_GROUPS;
  return ISSUE_GROUPS.map(function (g, i) {
    return i === 0 ? { group: g.group, issues: g.issues.concat(extras) } : g;
  });
}

function findIssue(businessType, key) {
  var groups = getIssueGroups(businessType);
  for (var i = 0; i < groups.length; i++) {
    for (var j = 0; j < groups[i].issues.length; j++) {
      if (groups[i].issues[j].key === key) return groups[i].issues[j];
    }
  }
  return null;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function joinList(items) {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return items[0] + ' and ' + items[1];
  return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1];
}

// Generic chips always show; vertical ones (if any for this business type)
// are appended on top, same layering pattern as feedbackTagger.js.
function getExperienceChips(businessType) {
  var vertical = VERTICAL_CHIPS[businessType] || [];
  return GENERIC_CHIPS.concat(vertical);
}

// selectedChipKeys: array of chip keys the customer tapped.
// customerWords: their own optional free text, included verbatim.
function generateReviewDraft({ businessName, businessType, selectedChipKeys, customerWords }) {
  var allChips = getExperienceChips(businessType);
  var selectedPhrases = (selectedChipKeys || []).map(function (key) {
    var chip = allChips.filter(function (c) { return c.key === key; })[0];
    return chip ? pickRandom(chip.phrases) : null;
  }).filter(Boolean);

  var openerBank = businessName ? OPENERS_WITH_NAME : OPENERS_NO_NAME;
  var opener = pickRandom(openerBank).replace('{business}', businessName || '');
  var parts = [opener];

  if (selectedPhrases.length > 0) {
    parts.push(pickRandom(LIST_LEAD_INS) + joinList(selectedPhrases) + '.');
  }

  if (customerWords && customerWords.trim()) {
    parts.push(customerWords.trim());
  }

  parts.push(pickRandom(CLOSERS));

  return parts.join(' ');
}

export { getExperienceChips, generateReviewDraft, getIssueGroups, findIssue };