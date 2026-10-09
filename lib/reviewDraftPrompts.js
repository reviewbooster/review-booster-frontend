/**
 * lib/reviewDraftPrompts.js
 * Zero-cost, client-side "AI assist" for the 4-5 star public review page.
 * Now language-aware: en / hi / mr. The `key` values stay identical across
 * languages so selection state and lookups work the same regardless of
 * which language the customer picked -- only label/phrase/description/
 * question/option text is localized.
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

var DEFAULT_LANG = 'en';

function resolveLang(lang) {
  return (lang === 'hi' || lang === 'mr') ? lang : DEFAULT_LANG;
}

var GENERIC_CHIPS = {
  en: [
    { key: 'staff',   label: 'Staff', icon: '\uD83D\uDC9B', description: 'How did the team treat you?', phrases: ['friendly staff', 'the helpful team', 'attentive staff', 'the friendly team'] },
    { key: 'speed',   label: 'Service Speed', icon: '\u23F1\uFE0F', description: 'How was the wait?', phrases: ['quick service', 'fast turnaround', 'how quick everything was', 'prompt service'] },
    { key: 'clean',   label: 'Cleanliness', icon: '\u2728', description: 'How clean was it?', phrases: ['how clean everything was', 'the spotless space', 'how tidy the place was'] },
    { key: 'value',   label: 'Value', icon: '\uD83D\uDCB0', description: 'Was it worth it?', phrases: ['fair pricing', 'great value for money', 'reasonable prices'] },
    { key: 'overall', label: 'Overall Experience', icon: '\u2B50', description: 'How was it overall?', phrases: ['the overall experience', 'how smooth everything was', 'the whole experience'] },
  ],
  hi: [
    { key: 'staff',   label: 'स्टाफ', icon: '\uD83D\uDC9B', description: 'टीम ने आपके साथ कैसा व्यवहार किया?', phrases: ['मिलनसार स्टाफ', 'मददगार टीम', 'चौकस स्टाफ', 'दोस्ताना टीम'] },
    { key: 'speed',   label: 'सेवा की गति', icon: '\u23F1\uFE0F', description: 'इंतज़ार कैसा रहा?', phrases: ['तेज़ सेवा', 'जल्दी काम होना', 'सब कुछ कितनी तेज़ी से हुआ', 'त्वरित सेवा'] },
    { key: 'clean',   label: 'सफ़ाई', icon: '\u2728', description: 'जगह कितनी साफ़ थी?', phrases: ['हर जगह की सफ़ाई', 'बेदाग जगह', 'जगह कितनी व्यवस्थित थी'] },
    { key: 'value',   label: 'वैल्यू फॉर मनी', icon: '\uD83D\uDCB0', description: 'क्या यह इसके लायक था?', phrases: ['उचित कीमत', 'पैसे के हिसाब से बढ़िया', 'वाजिब दाम'] },
    { key: 'overall', label: 'कुल अनुभव', icon: '\u2B50', description: 'कुल मिलाकर अनुभव कैसा रहा?', phrases: ['कुल अनुभव', 'सब कुछ कितनी आसानी से हुआ', 'पूरा अनुभव'] },
  ],
  mr: [
    { key: 'staff',   label: 'स्टाफ', icon: '\uD83D\uDC9B', description: 'टीमने तुमच्याशी कसं वागलं?', phrases: ['मैत्रीपूर्ण स्टाफ', 'मदत करणारी टीम', 'लक्षपूर्वक सेवा देणारा स्टाफ', 'आपुलकीची टीम'] },
    { key: 'speed',   label: 'सेवेचा वेग', icon: '\u23F1\uFE0F', description: 'वाट किती पाहावी लागली?', phrases: ['जलद सेवा', 'लवकर काम होणं', 'सगळं किती पटकन झालं', 'त्वरित सेवा'] },
    { key: 'clean',   label: 'स्वच्छता', icon: '\u2728', description: 'जागा किती स्वच्छ होती?', phrases: ['सगळीकडची स्वच्छता', 'नीटनेटकी जागा', 'जागा किती टापटीप होती'] },
    { key: 'value',   label: 'किंमतीचा मोबदला', icon: '\uD83D\uDCB0', description: 'पैसे वसूल वाटलं का?', phrases: ['योग्य किंमत', 'पैशांच्या तुलनेत उत्तम', 'वाजवी दर'] },
    { key: 'overall', label: 'एकूण अनुभव', icon: '\u2B50', description: 'एकूण अनुभव कसा होता?', phrases: ['एकूण अनुभव', 'सगळं किती सुरळीत झालं', 'संपूर्ण अनुभव'] },
  ],
};

var VERTICAL_CHIPS = {
  en: {
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
  },
  hi: {
    salon: [
      { key: 'stylist', label: 'स्टाइलिस्ट', icon: '\uD83D\uDC87', description: 'आपका स्टाइलिस्ट कैसा रहा?', phrases: ['मेरे स्टाइलिस्ट का काम', 'मेरे बाल कैसे बने', 'स्टाइलिस्ट का बारीकी पर ध्यान'] },
      { key: 'result',  label: 'नतीजा', icon: '\u2728', description: 'नतीजा कैसा रहा?', phrases: ['बिल्कुल वही लुक जो मैं चाहती थी', 'नतीजे कैसे आए', 'फाइनल लुक'] },
    ],
    barbershop: [
      { key: 'barber', label: 'बार्बर', icon: '\uD83D\uDC88', description: 'आपका बार्बर कैसा रहा?', phrases: ['मेरे बार्बर का काम', 'हेयरकट', 'कट कितना शार्प लगा'] },
    ],
    gym: [
      { key: 'trainer',   label: 'ट्रेनर', icon: '\uD83C\uDFCB\uFE0F', description: 'आपका ट्रेनर कैसा रहा?', phrases: ['मेरे ट्रेनर का मार्गदर्शन', 'कोचिंग', 'ट्रेनर कितना सहयोगी था'] },
      { key: 'equipment', label: 'इक्विपमेंट', icon: '\u2699\uFE0F', description: 'इक्विपमेंट कैसा था?', phrases: ['इक्विपमेंट', 'मशीनें कितनी अच्छी तरह मेंटेन थीं'] },
    ],
    dental: [
      { key: 'care', label: 'देखभाल और जानकारी', icon: '\uD83E\uDE7A', description: 'क्या सब कुछ साफ़ तौर पर समझाया गया?', phrases: ['सब कुछ कितनी अच्छी तरह समझाया गया', 'नरम देखभाल', 'चेकअप कितना बारीकी से हुआ'] },
    ],
    clinic: [
      { key: 'care', label: 'देखभाल और जानकारी', icon: '\uD83E\uDE7A', description: 'क्या सब कुछ साफ़ तौर पर समझाया गया?', phrases: ['सब कुछ कितनी अच्छी तरह समझाया गया', 'नरम देखभाल', 'विज़िट कितनी बारीकी से हुई'] },
    ],
    restaurant: [
      { key: 'food',     label: 'खाने की गुणवत्ता', icon: '\uD83C\uDF7D\uFE0F', description: 'खाना कैसा था?', phrases: ['खाना कितना अच्छा था', 'स्वादिष्ट खाना', 'खाने की गुणवत्ता'] },
      { key: 'ambience', label: 'माहौल', icon: '\uD83D\uDD6F\uFE0F', description: 'माहौल कैसा था?', phrases: ['आरामदायक माहौल', 'अच्छा माहौल', 'जगह कितनी सुखद लगी'] },
    ],
    retail: [
      { key: 'product', label: 'प्रोडक्ट क्वालिटी', icon: '\uD83D\uDECD\uFE0F', description: 'प्रोडक्ट कैसा था?', phrases: ['प्रोडक्ट की गुणवत्ता', 'प्रोडक्ट्स कितने अच्छे थे'] },
    ],
    auto: [
      { key: 'service_quality', label: 'सर्विस क्वालिटी', icon: '\uD83D\uDD27', description: 'सर्विस कैसी थी?', phrases: ['गाड़ी की सर्विस कितनी अच्छी हुई', 'रिपेयर के काम की गुणवत्ता'] },
    ],
    real_estate: [
      { key: 'communication', label: 'कम्युनिकेशन', icon: '\uD83D\uDCAC', description: 'संपर्क कैसा रहा?', phrases: ['एजेंट कितना रिस्पॉन्सिव था', 'पूरी प्रक्रिया में साफ़ संवाद'] },
    ],
    education: [
      { key: 'teaching', label: 'पढ़ाई की गुणवत्ता', icon: '\uD83D\uDCDA', description: 'क्लास कैसी थी?', phrases: ['पढ़ाई की गुणवत्ता', 'क्लास कितनी अच्छी तरह चलाई गई'] },
    ],
    pet_care: [
      { key: 'pet_handling', label: 'पेट केयर', icon: '\uD83D\uDC3E', description: 'आपके पालतू जानवर की देखभाल कैसी हुई?', phrases: ['मेरे पालतू जानवर की कितनी अच्छी देखभाल हुई', 'मेरे पालतू जानवर के लिए नरम देखभाल'] },
    ],
  },
  mr: {
    salon: [
      { key: 'stylist', label: 'स्टायलिस्ट', icon: '\uD83D\uDC87', description: 'तुमचा स्टायलिस्ट कसा होता?', phrases: ['माझ्या स्टायलिस्टचं काम', 'माझे केस कसे झाले', 'स्टायलिस्टचं बारकाव्यांकडे लक्ष'] },
      { key: 'result',  label: 'निकाल', icon: '\u2728', description: 'निकाल कसा लागला?', phrases: ['अगदी तसाच लूक जो मला हवा होता', 'निकाल कसे आले', 'अंतिम लूक'] },
    ],
    barbershop: [
      { key: 'barber', label: 'बार्बर', icon: '\uD83D\uDC88', description: 'तुमचा बार्बर कसा होता?', phrases: ['माझ्या बार्बरचं काम', 'हेअरकट', 'कट किती नीटनेटका दिसला'] },
    ],
    gym: [
      { key: 'trainer',   label: 'ट्रेनर', icon: '\uD83C\uDFCB\uFE0F', description: 'तुमचा ट्रेनर कसा होता?', phrases: ['माझ्या ट्रेनरचं मार्गदर्शन', 'कोचिंग', 'ट्रेनर किती सहकार्य करणारा होता'] },
      { key: 'equipment', label: 'उपकरणे', icon: '\u2699\uFE0F', description: 'उपकरणे कशी होती?', phrases: ['उपकरणे', 'मशीन्स किती चांगल्या स्थितीत होती'] },
    ],
    dental: [
      { key: 'care', label: 'काळजी आणि माहिती', icon: '\uD83E\uDE7A', description: 'सर्व काही व्यवस्थित समजावून सांगितलं का?', phrases: ['सर्व काही किती व्यवस्थित समजावून सांगितलं', 'सौम्य काळजी', 'तपासणी किती बारकाईने झाली'] },
    ],
    clinic: [
      { key: 'care', label: 'काळजी आणि माहिती', icon: '\uD83E\uDE7A', description: 'सर्व काही व्यवस्थित समजावून सांगितलं का?', phrases: ['सर्व काही किती व्यवस्थित समजावून सांगितलं', 'सौम्य काळजी', 'भेट किती बारकाईने झाली'] },
    ],
    restaurant: [
      { key: 'food',     label: 'खाद्यपदार्थांची गुणवत्ता', icon: '\uD83C\uDF7D\uFE0F', description: 'जेवण कसं होतं?', phrases: ['जेवण किती छान होतं', 'चविष्ट जेवण', 'जेवणाची गुणवत्ता'] },
      { key: 'ambience', label: 'वातावरण', icon: '\uD83D\uDD6F\uFE0F', description: 'वातावरण कसं होतं?', phrases: ['आरामदायक वातावरण', 'छान वातावरण', 'जागा किती प्रसन्न वाटली'] },
    ],
    retail: [
      { key: 'product', label: 'उत्पादनाची गुणवत्ता', icon: '\uD83D\uDECD\uFE0F', description: 'उत्पादन कसं होतं?', phrases: ['उत्पादनाची गुणवत्ता', 'उत्पादने किती चांगली होती'] },
    ],
    auto: [
      { key: 'service_quality', label: 'सेवेची गुणवत्ता', icon: '\uD83D\uDD27', description: 'सेवा कशी होती?', phrases: ['गाडीची सर्व्हिसिंग किती चांगली झाली', 'दुरुस्तीच्या कामाची गुणवत्ता'] },
    ],
    real_estate: [
      { key: 'communication', label: 'संवाद', icon: '\uD83D\uDCAC', description: 'संवाद कसा होता?', phrases: ['एजंट किती प्रतिसाद देणारा होता', 'संपूर्ण प्रक्रियेत स्पष्ट संवाद'] },
    ],
    education: [
      { key: 'teaching', label: 'शिकवण्याची गुणवत्ता', icon: '\uD83D\uDCDA', description: 'वर्ग कसा होता?', phrases: ['शिकवण्याची गुणवत्ता', 'वर्ग किती व्यवस्थित चालवला गेला'] },
    ],
    pet_care: [
      { key: 'pet_handling', label: 'पाळीव प्राण्याची काळजी', icon: '\uD83D\uDC3E', description: 'तुमच्या पाळीव प्राण्याची काळजी कशी घेतली?', phrases: ['माझ्या पाळीव प्राण्याची किती चांगली काळजी घेतली', 'माझ्या पाळीव प्राण्यासाठी सौम्य काळजी'] },
    ],
  },
};

var OPENERS_WITH_NAME = {
  en: ['Had a great experience at {business}.', 'Really happy with my visit to {business}.', '{business} exceeded my expectations.', 'Great time at {business} today.', 'Loved my visit to {business}.'],
  hi: ['{business} में बहुत अच्छा अनुभव रहा।', '{business} की विज़िट से मैं वाकई खुश हूं।', '{business} ने मेरी उम्मीदों से बढ़कर काम किया।', 'आज {business} में बहुत अच्छा समय बीता।', '{business} की विज़िट बहुत पसंद आई।'],
  mr: ['{business} मध्ये खूप छान अनुभव आला.', '{business} ला दिलेल्या भेटीने मी खरंच खूश आहे.', '{business} ने माझ्या अपेक्षांपेक्षा जास्त काम केलं.', 'आज {business} मध्ये खूप छान वेळ गेला.', '{business} ला दिलेली भेट खूप आवडली.'],
};
var OPENERS_NO_NAME = {
  en: ['Had a great experience overall.', 'Really happy with how everything went.', 'This exceeded my expectations.', 'Had a wonderful time.'],
  hi: ['कुल मिलाकर अनुभव बहुत अच्छा रहा।', 'सब कुछ जिस तरह से हुआ, उससे मैं वाकई खुश हूं।', 'यह मेरी उम्मीदों से कहीं बढ़कर रहा।', 'बहुत अच्छा समय बीता।'],
  mr: ['एकूणच अनुभव खूप छान होता.', 'सगळं ज्या पद्धतीने झालं, त्यामुळे मी खरंच खूश आहे.', 'हे माझ्या अपेक्षांपेक्षा जास्त चांगलं होतं.', 'खूप छान वेळ गेला.'],
};
var LIST_LEAD_INS = {
  en: ['I really appreciated ', 'What stood out was ', 'I particularly liked ', 'I was impressed by '],
  hi: ['मुझे सबसे अच्छा लगा ', 'जो चीज़ सबसे अलग लगी वो थी ', 'मुझे खासतौर पर पसंद आया ', 'जिस बात ने प्रभावित किया वो थी '],
  mr: ['मला सगळ्यात जास्त आवडलं ', 'जी गोष्ट सगळ्यात जास्त उठून दिसली ती म्हणजे ', 'मला खासकरून आवडलं ', 'ज्या गोष्टीने प्रभावित केलं ती म्हणजे '],
};
var CLOSERS = {
  en: ['Overall a good experience.', 'Glad I came in.', 'Would come back.', 'Happy with how it went.'],
  hi: ['कुल मिलाकर अच्छा अनुभव रहा।', 'आकर अच्छा लगा।', 'यहां दोबारा आने का मन है।', 'जिस तरह से यह हुआ, उससे खुश हूं।'],
  mr: ['एकूणच चांगला अनुभव होता.', 'आल्याचं बरं वाटलं.', 'पुन्हा इथे यावंसं वाटतं.', 'जे झालं त्यात मी खूश आहे.'],
};

// -- 1-3 star issue selection (two-screen flow) -----------------------------
var ISSUE_GROUPS = {
  en: [
    { group: 'Service', issues: [
      { key: 'staff', label: 'Staff service', phrase: 'Staff was rude', followUp: { question: 'What could have been better?', options: ['Attitude', 'Response time', 'Knowledge'] } },
      { key: 'wait',  label: 'Waiting time',  phrase: 'Had to wait too long', followUp: { question: 'How long did you wait?', options: ['Under 10 min', '10\u201330 min', '30\u201360 min', 'Over 60 min'] } },
      { key: 'comm',  label: 'Communication', phrase: 'Communication could\u2019ve been better', followUp: { question: 'What kind of issue?', options: ['Unclear info', 'Slow replies', 'Rude tone'] } },
      { key: 'appt',  label: 'Appointment',   phrase: 'Appointment wasn\u2019t handled well', followUp: { question: 'Booking, timing, or changes?', options: ['Booking issue', 'Timing issue', 'Changed without notice'] } },
    ] },
    { group: 'Experience', issues: [
      { key: 'quality',     label: 'Quality',     phrase: 'Quality was poor', followUp: { question: 'What part of the service?', options: ['Result', 'Attention to detail', 'Consistency'] } },
      { key: 'pricing',     label: 'Pricing',      phrase: 'Felt overpriced', followUp: { question: 'What was unclear?', options: ['Final cost', 'Extra charges', 'Payment process'] } },
      { key: 'cleanliness', label: 'Cleanliness',  phrase: "Place wasn't clean", followUp: { question: 'Which area?', options: ['Waiting area', 'Restroom', 'Work area'] } },
      { key: 'other',       label: 'Other',        phrase: 'Something else was off', followUp: null },
    ] },
  ],
  hi: [
    { group: 'सेवा', issues: [
      { key: 'staff', label: 'स्टाफ सेवा', phrase: 'स्टाफ का व्यवहार रूखा था', followUp: { question: 'क्या बेहतर हो सकता था?', options: ['रवैया', 'रिस्पॉन्स टाइम', 'जानकारी'] } },
      { key: 'wait',  label: 'इंतज़ार का समय', phrase: 'बहुत ज़्यादा इंतज़ार करना पड़ा', followUp: { question: 'आपको कितनी देर इंतज़ार करना पड़ा?', options: ['10 मिनट से कम', '10\u201330 मिनट', '30\u201360 मिनट', '60 मिनट से ज़्यादा'] } },
      { key: 'comm',  label: 'कम्युनिकेशन', phrase: 'कम्युनिकेशन बेहतर हो सकता था', followUp: { question: 'किस तरह की समस्या थी?', options: ['अस्पष्ट जानकारी', 'जवाब देर से मिला', 'रूखा लहजा'] } },
      { key: 'appt',  label: 'अपॉइंटमेंट', phrase: 'अपॉइंटमेंट ठीक से हैंडल नहीं हुई', followUp: { question: 'बुकिंग, समय, या बदलाव?', options: ['बुकिंग की समस्या', 'समय की समस्या', 'बिना बताए बदली गई'] } },
    ] },
    { group: 'अनुभव', issues: [
      { key: 'quality',     label: 'गुणवत्ता',     phrase: 'गुणवत्ता ठीक नहीं थी', followUp: { question: 'सेवा का कौन सा हिस्सा?', options: ['नतीजा', 'बारीकी पर ध्यान', 'निरंतरता'] } },
      { key: 'pricing',     label: 'कीमत',      phrase: 'कीमत ज़्यादा लगी', followUp: { question: 'क्या अस्पष्ट था?', options: ['फाइनल कीमत', 'अतिरिक्त चार्ज', 'पेमेंट प्रक्रिया'] } },
      { key: 'cleanliness', label: 'सफ़ाई',  phrase: 'जगह साफ़ नहीं थी', followUp: { question: 'कौन सा हिस्सा?', options: ['वेटिंग एरिया', 'वॉशरूम', 'काम की जगह'] } },
      { key: 'other',       label: 'अन्य',        phrase: 'कुछ और ठीक नहीं लगा', followUp: null },
    ] },
  ],
  mr: [
    { group: 'सेवा', issues: [
      { key: 'staff', label: 'स्टाफ सेवा', phrase: 'स्टाफचं वागणं उद्धट होतं', followUp: { question: 'काय चांगलं असू शकलं असतं?', options: ['वागणूक', 'प्रतिसादाचा वेळ', 'माहिती'] } },
      { key: 'wait',  label: 'वाट पाहण्याचा वेळ', phrase: 'खूप वेळ वाट पाहावी लागली', followUp: { question: 'किती वेळ वाट पाहावी लागली?', options: ['10 मिनिटांपेक्षा कमी', '10\u201330 मिनिटे', '30\u201360 मिनिटे', '60 मिनिटांपेक्षा जास्त'] } },
      { key: 'comm',  label: 'संवाद', phrase: 'संवाद अजून चांगला असायला हवा होता', followUp: { question: 'कोणत्या प्रकारची अडचण होती?', options: ['अस्पष्ट माहिती', 'उशिरा प्रतिसाद', 'उद्धट बोलणं'] } },
      { key: 'appt',  label: 'अपॉइंटमेंट', phrase: 'अपॉइंटमेंट नीट हाताळली गेली नाही', followUp: { question: 'बुकिंग, वेळ, की बदल?', options: ['बुकिंगची अडचण', 'वेळेची अडचण', 'न सांगता बदलली'] } },
    ] },
    { group: 'अनुभव', issues: [
      { key: 'quality',     label: 'गुणवत्ता',     phrase: 'गुणवत्ता चांगली नव्हती', followUp: { question: 'सेवेचा कोणता भाग?', options: ['निकाल', 'बारकाव्यांकडे लक्ष', 'सातत्य'] } },
      { key: 'pricing',     label: 'किंमत',      phrase: 'किंमत जास्त वाटली', followUp: { question: 'काय अस्पष्ट होतं?', options: ['अंतिम किंमत', 'अतिरिक्त शुल्क', 'पेमेंट प्रक्रिया'] } },
      { key: 'cleanliness', label: 'स्वच्छता',  phrase: 'जागा स्वच्छ नव्हती', followUp: { question: 'कोणता भाग?', options: ['वेटिंग एरिया', 'स्वच्छतागृह', 'कामाची जागा'] } },
      { key: 'other',       label: 'इतर',        phrase: 'आणखी काहीतरी खटकलं', followUp: null },
    ] },
  ],
};

// Business-type-specific issues, appended to the Service group.
var VERTICAL_ISSUE_EXTRAS = {
  en: {
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
  },
  hi: {
    salon:       [{ key: 'stylist', label: 'स्टाइलिस्ट', phrase: 'स्टाइलिस्ट से संतुष्ट नहीं हूं', followUp: { question: 'समस्या क्या थी?', options: ['नतीजा', 'कम्युनिकेशन', 'व्यवहार'] } }],
    barbershop:  [{ key: 'barber', label: 'बार्बर', phrase: 'हेयरकट से संतुष्ट नहीं हूं', followUp: { question: 'समस्या क्या थी?', options: ['हेयरकट का नतीजा', 'कम्युनिकेशन', 'व्यवहार'] } }],
    gym:         [{ key: 'equipment', label: 'इक्विपमेंट', phrase: 'इक्विपमेंट की हालत खराब थी', followUp: { question: 'क्या गड़बड़ थी?', options: ['टूटा हुआ', 'पुराना', 'पर्याप्त उपलब्ध नहीं'] } },
                  { key: 'trainer', label: 'ट्रेनर', phrase: 'ट्रेनर मददगार नहीं था', followUp: { question: 'समस्या क्या थी?', options: ['मार्गदर्शन', 'व्यवहार', 'उपलब्धता'] } }],
    dental:      [{ key: 'treatment', label: 'ट्रीटमेंट', phrase: 'ट्रीटमेंट से संतुष्ट नहीं हूं', followUp: { question: 'समस्या क्या थी?', options: ['जानकारी', 'असुविधा', 'नतीजा'] } }],
    clinic:      [{ key: 'treatment', label: 'ट्रीटमेंट', phrase: 'ट्रीटमेंट से संतुष्ट नहीं हूं', followUp: { question: 'समस्या क्या थी?', options: ['जानकारी', 'असुविधा', 'नतीजा'] } }],
    restaurant:  [{ key: 'food', label: 'खाने की गुणवत्ता', phrase: 'खाना अच्छा नहीं था', followUp: { question: 'क्या गड़बड़ थी?', options: ['स्वाद', 'तापमान', 'मात्रा'] } },
                  { key: 'reservation', label: 'रिज़र्वेशन', phrase: 'रिज़र्वेशन ठीक से हैंडल नहीं हुआ', followUp: { question: 'क्या गलत हुआ?', options: ['मान्य नहीं किया गया', 'गलत समय', 'सीटिंग'] } }],
    retail:      [{ key: 'product', label: 'प्रोडक्ट क्वालिटी', phrase: 'प्रोडक्ट उम्मीद के मुताबिक नहीं था', followUp: { question: 'क्या गड़बड़ थी?', options: ['गुणवत्ता', 'बताए अनुसार नहीं', 'क्षतिग्रस्त'] } },
                  { key: 'delivery', label: 'डिलीवरी', phrase: 'डिलीवरी में दिक्कत हुई', followUp: { question: 'क्या गलत हुआ?', options: ['देरी', 'क्षतिग्रस्त', 'गलत आइटम'] } }],
    auto:        [{ key: 'vehicle_service', label: 'वाहन सेवा', phrase: 'मेरी गाड़ी की सर्विस से संतुष्ट नहीं हूं', followUp: { question: 'समस्या क्या थी?', options: ['ठीक से ठीक नहीं हुआ', 'बाद में नई समस्या आई', 'जानकारी'] } },
                  { key: 'timeliness', label: 'समय पालन', phrase: 'गाड़ी समय पर तैयार नहीं थी', followUp: { question: 'कितनी देर हुई?', options: ['थोड़ी देर', 'बहुत देर', 'वादे के मुताबिक तैयार नहीं'] } }],
    real_estate: [{ key: 're_comm', label: 'कम्युनिकेशन', phrase: 'कम्युनिकेशन बेहतर हो सकता था', followUp: { question: 'समस्या क्या थी?', options: ['जवाब देर से मिला', 'अस्पष्ट जानकारी', 'फॉलो-अप'] } },
                  { key: 'paperwork', label: 'कागज़ी कार्रवाई', phrase: 'कागज़ी प्रक्रिया परेशान करने वाली थी', followUp: { question: 'समस्या क्या थी?', options: ['बहुत धीमी', 'उलझन भरी', 'गलतियां'] } }],
    education:   [{ key: 'teaching', label: 'पढ़ाई की गुणवत्ता', phrase: 'क्लास से संतुष्ट नहीं हूं', followUp: { question: 'समस्या क्या थी?', options: ['कंटेंट', 'गति', 'स्पष्टता'] } }],
    pet_care:    [{ key: 'pet_handling', label: 'पेट हैंडलिंग', phrase: 'मेरे पालतू जानवर को जिस तरह संभाला गया, उससे संतुष्ट नहीं हूं', followUp: { question: 'समस्या क्या थी?', options: ['नरमी', 'कम्युनिकेशन', 'नतीजा'] } }],
  },
  mr: {
    salon:       [{ key: 'stylist', label: 'स्टायलिस्ट', phrase: 'स्टायलिस्टबद्दल समाधानी नाही', followUp: { question: 'अडचण काय होती?', options: ['निकाल', 'संवाद', 'वागणूक'] } }],
    barbershop:  [{ key: 'barber', label: 'बार्बर', phrase: 'हेअरकटबद्दल समाधानी नाही', followUp: { question: 'अडचण काय होती?', options: ['हेअरकटचा निकाल', 'संवाद', 'वागणूक'] } }],
    gym:         [{ key: 'equipment', label: 'उपकरणे', phrase: 'उपकरणांची स्थिती खराब होती', followUp: { question: 'काय चुकीचं होतं?', options: ['तुटलेलं', 'जुनाट', 'पुरेशी उपलब्ध नाहीत'] } },
                  { key: 'trainer', label: 'ट्रेनर', phrase: 'ट्रेनर उपयुक्त ठरला नाही', followUp: { question: 'अडचण काय होती?', options: ['मार्गदर्शन', 'वागणूक', 'उपलब्धता'] } }],
    dental:      [{ key: 'treatment', label: 'उपचार', phrase: 'उपचाराबद्दल समाधानी नाही', followUp: { question: 'अडचण काय होती?', options: ['माहिती', 'त्रास', 'निकाल'] } }],
    clinic:      [{ key: 'treatment', label: 'उपचार', phrase: 'उपचाराबद्दल समाधानी नाही', followUp: { question: 'अडचण काय होती?', options: ['माहिती', 'त्रास', 'निकाल'] } }],
    restaurant:  [{ key: 'food', label: 'खाद्यपदार्थांची गुणवत्ता', phrase: 'जेवण चांगलं नव्हतं', followUp: { question: 'काय चुकीचं होतं?', options: ['चव', 'तापमान', 'प्रमाण'] } },
                  { key: 'reservation', label: 'रिझर्वेशन', phrase: 'रिझर्वेशन नीट हाताळलं गेलं नाही', followUp: { question: 'काय चुकलं?', options: ['मान्य केलं नाही', 'चुकीची वेळ', 'बैठक व्यवस्था'] } }],
    retail:      [{ key: 'product', label: 'उत्पादनाची गुणवत्ता', phrase: 'उत्पादन अपेक्षेप्रमाणे नव्हतं', followUp: { question: 'काय चुकीचं होतं?', options: ['गुणवत्ता', 'वर्णनाप्रमाणे नाही', 'खराब झालेलं'] } },
                  { key: 'delivery', label: 'डिलिव्हरी', phrase: 'डिलिव्हरीमध्ये अडचण आली', followUp: { question: 'काय चुकलं?', options: ['उशीर', 'खराब झालं', 'चुकीची वस्तू'] } }],
    auto:        [{ key: 'vehicle_service', label: 'वाहन सेवा', phrase: 'माझ्या गाडीच्या सर्व्हिसिंगबद्दल समाधानी नाही', followUp: { question: 'अडचण काय होती?', options: ['नीट दुरुस्त झालं नाही', 'नंतर नवीन समस्या आली', 'माहिती'] } },
                  { key: 'timeliness', label: 'वेळेचं पालन', phrase: 'गाडी वेळेवर तयार नव्हती', followUp: { question: 'किती उशीर झाला?', options: ['थोडा उशीर', 'खूप उशीर', 'सांगितल्याप्रमाणे तयार नव्हती'] } }],
    real_estate: [{ key: 're_comm', label: 'संवाद', phrase: 'संवाद अजून चांगला असायला हवा होता', followUp: { question: 'अडचण काय होती?', options: ['उशिरा प्रतिसाद', 'अस्पष्ट माहिती', 'पाठपुरावा'] } },
                  { key: 'paperwork', label: 'कागदपत्रे', phrase: 'कागदपत्रांची प्रक्रिया त्रासदायक होती', followUp: { question: 'अडचण काय होती?', options: ['खूप संथ', 'गोंधळात टाकणारी', 'चुका'] } }],
    education:   [{ key: 'teaching', label: 'शिकवण्याची गुणवत्ता', phrase: 'वर्गाबद्दल समाधानी नाही', followUp: { question: 'अडचण काय होती?', options: ['मजकूर', 'वेग', 'स्पष्टता'] } }],
    pet_care:    [{ key: 'pet_handling', label: 'पाळीव प्राण्याची हाताळणी', phrase: 'माझ्या पाळीव प्राण्याला ज्या पद्धतीने हाताळलं, त्याबद्दल समाधानी नाही', followUp: { question: 'अडचण काय होती?', options: ['सौम्यता', 'संवाद', 'निकाल'] } }],
  },
};

function getIssueGroups(businessType, lang) {
  var L = resolveLang(lang);
  var groups = ISSUE_GROUPS[L];
  var extras = VERTICAL_ISSUE_EXTRAS[L][businessType] || [];
  if (extras.length === 0) return groups;
  return groups.map(function (g, i) {
    return i === 0 ? { group: g.group, issues: g.issues.concat(extras) } : g;
  });
}

function findIssue(businessType, key, lang) {
  var groups = getIssueGroups(businessType, lang);
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

function joinListLang(items, lang) {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  var and = lang === 'hi' ? 'और' : (lang === 'mr' ? 'आणि' : 'and');
  if (items.length === 2) return items[0] + (lang === 'en' ? ' and ' : (' ' + and + ' ')) + items[1];
  if (lang === 'en') return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1];
  return items.slice(0, -1).join(', ') + ' ' + and + ' ' + items[items.length - 1];
}

function getExperienceChips(businessType, lang) {
  var L = resolveLang(lang);
  var vertical = VERTICAL_CHIPS[L][businessType] || [];
  return GENERIC_CHIPS[L].concat(vertical);
}

// selectedChipKeys: array of chip keys the customer tapped.
// customerWords: their own optional free text, included verbatim.
function generateReviewDraft({ businessName, businessType, selectedChipKeys, customerWords, lang }) {
  var L = resolveLang(lang);
  var allChips = getExperienceChips(businessType, L);
  var selectedPhrases = (selectedChipKeys || []).map(function (key) {
    var chip = allChips.filter(function (c) { return c.key === key; })[0];
    return chip ? pickRandom(chip.phrases) : null;
  }).filter(Boolean);

  var openerBank = businessName ? OPENERS_WITH_NAME[L] : OPENERS_NO_NAME[L];
  var opener = pickRandom(openerBank).replace('{business}', businessName || '');
  var parts = [opener];

  if (selectedPhrases.length > 0) {
    parts.push(pickRandom(LIST_LEAD_INS[L]) + joinListLang(selectedPhrases, L) + '.');
  }

  if (customerWords && customerWords.trim()) {
    parts.push(customerWords.trim());
  }

  parts.push(pickRandom(CLOSERS[L]));

  return parts.join(' ');
}

export { getExperienceChips, generateReviewDraft, getIssueGroups, findIssue };
