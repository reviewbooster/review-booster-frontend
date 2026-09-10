/**
 * lib/defaultMessageTemplates.js
 * Business-type-specific starting templates for the Review Request and
 * Thank + Refer messages. These are only the DEFAULTS — the moment an
 * owner edits and saves their own version in Settings, that takes over
 * completely and these are never used again for that business.
 */

var TYPE_TEMPLATES = {
  salon: {
    review_request: 'Thank you for visiting us! We hope you loved your experience. If you have a moment, we\'d really appreciate you sharing your feedback. Your review means a lot to our team!',
    thank_refer:    'Thank you so much for your {{rating}}-star rating! We\'re so happy you enjoyed your experience. Know someone who would love to visit us? Feel free to share our referral link with them!',
  },
  barbershop: {
    review_request: 'Thank you for visiting us! We hope you loved your experience. If you have a moment, we\'d really appreciate you sharing your feedback. Your review means a lot to our team!',
    thank_refer:    'Thank you so much for your {{rating}}-star rating! We\'re so happy you enjoyed your experience. Know someone who would love to visit us? Feel free to share our referral link with them!',
  },
  gym: {
    review_request: 'Thanks for training with us! We hope you\'re feeling great progress. If you have a moment, we\'d love for you to share your experience \u2014 it really helps other members find us.',
    thank_refer:    'Thank you for your {{rating}}-star rating! We\'re glad you\'re enjoying your fitness journey with us. Know someone who\'d love to join? Share our referral link with them!',
  },
  dental: {
    review_request: 'Thank you for choosing us for your care. We hope your experience was comfortable and positive. If you have a moment, we\'d appreciate you sharing your feedback. Your review helps us continue improving our service.',
    thank_refer:    'Thank you for your {{rating}}-star rating! We truly appreciate your trust and support. If you know someone who may benefit from our services, you\'re welcome to share our referral link with them.',
  },
  clinic: {
    review_request: 'Thank you for choosing us for your care. We hope your experience was comfortable and positive. If you have a moment, we\'d appreciate you sharing your feedback. Your review helps us continue improving our service.',
    thank_refer:    'Thank you for your {{rating}}-star rating! We truly appreciate your trust and support. If you know someone who may benefit from our services, you\'re welcome to share our referral link with them.',
  },
  restaurant: {
    review_request: 'We hope you enjoyed your meal and had a wonderful experience with us! If you have a moment, we\'d love to hear your feedback. Your review helps us continue serving our customers better. Thank you!',
    thank_refer:    'Thank you for your {{rating}}-star rating! We\'re delighted you enjoyed your visit. Have friends or family who love great food? Share our referral link with them and invite them to experience us too!',
  },
  retail: {
    review_request: 'Thanks for shopping with us! We hope you found what you were looking for. If you have a moment, we\'d really appreciate your feedback \u2014 it helps other customers shop with confidence.',
    thank_refer:    'Thank you for your {{rating}}-star rating! We really appreciate your support. Know someone who\'d love our products? Share our referral link with them!',
  },
  auto: {
    review_request: 'Thank you for choosing our service! We hope you were happy with the work and service you received. If you have a moment, please share your experience with us. Your feedback helps us serve you better.',
    thank_refer:    'Thank you for your {{rating}}-star rating! We really appreciate your support. Know someone who needs reliable car service? Feel free to share our referral link with them!',
  },
  real_estate: {
    review_request: 'Thank you for choosing us! We hope we made your property journey a smooth and positive experience. We\'d really appreciate a quick review about your experience working with us.',
    thank_refer:    'Thank you for your {{rating}}-star rating! We truly appreciate your trust. If you know someone looking to buy, sell, or rent a property, feel free to share our referral link with them!',
  },
  education: {
    review_request: 'Thank you for learning with us! We hope you\'re enjoying your progress. If you have a moment, we\'d really appreciate you sharing your feedback \u2014 it helps other students choose us with confidence.',
    thank_refer:    'Thank you for your {{rating}}-star rating! We\'re so glad to have you with us. Know someone who\'d benefit from our courses? Share our referral link with them!',
  },
  pet_care: {
    review_request: 'Thank you for trusting us with your furry friend! We hope everything went great. If you have a moment, we\'d really appreciate your feedback \u2014 it helps other pet parents find us.',
    thank_refer:    'Thank you for your {{rating}}-star rating! We\'re so glad your pet had a great experience. Know another pet parent who\'d love our care? Share our referral link with them!',
  },
};

var UNIVERSAL_TEMPLATE = {
  review_request: 'We hope you had a great experience with us! We\'d really appreciate it if you could take a moment to share your feedback. Your review helps us improve and helps others choose us with confidence.',
  thank_refer:    'Thank you so much for your {{rating}}-star rating! We truly appreciate your support. If you know someone who could benefit from our services, feel free to share our referral link with them.',
};

export function getDefaultTemplates(businessType) {
  var t = TYPE_TEMPLATES[businessType] || UNIVERSAL_TEMPLATE;
  return {
    review_request: 'Hi {{name}}, ' + t.review_request + '\n\n{{link}}',
    thank_refer:    'Hi {{name}}, ' + t.thank_refer + '\n\n{{link}}',
  };
}