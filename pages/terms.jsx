import SEO from '../components/SEO';

export default function Terms() {
  return (
    <>
      <SEO
        title="Terms & Conditions"
        description="Terms and conditions for using ReviewBooster."
        path="/terms"
      />
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms &amp; Conditions</h1>
          <p className="text-sm text-gray-400 mb-8">Last updated: September 2026</p>

          <div className="prose prose-sm max-w-none text-gray-600 space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Acceptance of Terms</h2>
              <p>By accessing or using ReviewBooster, you agree to be bound by these Terms &amp; Conditions.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">2. Use of Service</h2>
              <p>ReviewBooster is provided to help businesses collect customer reviews, manage feedback, and run referral programs. You agree to use the service only for lawful purposes.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">3. Account Responsibilities</h2>
              <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">4. Billing &amp; Plans</h2>
              <p>Subscription fees, where applicable, are billed in accordance with the plan you select. Fees are non-refundable except as required by law.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Limitation of Liability</h2>
              <p>ReviewBooster is provided "as is" without warranties of any kind. We are not liable for indirect or consequential damages arising from your use of the service.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Changes to These Terms</h2>
              <p>We may update these Terms from time to time. Continued use of ReviewBooster after changes constitutes acceptance of the revised Terms.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">7. Contact Us</h2>
              <p>If you have questions about these Terms, please contact us at:</p>
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
