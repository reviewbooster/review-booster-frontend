import SEO from '../components/SEO';

export default function Privacy() {
  return (
    <>
      <SEO
        title="Privacy Policy"
        description="How ReviewBooster collects, uses, and protects your data."
        path="/privacy"
      />
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-400 mb-8">Last updated: September 2026</p>

          <div className="prose prose-sm max-w-none text-gray-600 space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Information We Collect</h2>
              <p>We collect information you provide directly to us, such as your name, email address, business details, and customer review data, when you register for or use ReviewBooster.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">2. How We Use Your Information</h2>
              <p>We use the information we collect to provide, maintain, and improve our services, to communicate with you, and to comply with legal obligations.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">3. Data Sharing</h2>
              <p>We do not sell your personal data. We may share information with service providers who help us operate ReviewBooster, or when required by law.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">4. Data Security</h2>
              <p>We take reasonable measures to protect your information from unauthorized access, alteration, or disclosure.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Your Rights</h2>
              <p>You may request access to, correction of, or deletion of your personal data by contacting us using the details below.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Contact Us</h2>
              <p>If you have questions about this Privacy Policy, please contact us at:</p>
              <p className="mt-2">
                ReviewBooster<br />
                [Your Business Address]<br />
                Email: support@adcend.in
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
