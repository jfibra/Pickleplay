import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';
import useSEO from '../hooks/useSEO';

const PrivacyPolicy: React.FC = () => {
  useSEO({
    title: 'Privacy Policy – PicklePlay Philippines',
    description: 'Learn how PicklePlay Philippines collects, uses, and protects your personal information.',
    canonical: 'https://www.pickleplay.ph/policy',
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#EBEBE6' }}>
      {/* Header */}
      <div className="border-b border-slate-200/60 sticky top-0 z-10 backdrop-blur-xl" style={{ backgroundColor: 'rgba(235,235,230,0.85)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-bold">
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Back to PicklePlay</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <img src="/images/PicklePlayLogo.jpg" alt="PicklePlay" className="w-7 h-7 rounded-lg object-contain" />
            <div className="flex flex-col leading-none">
              <span className="text-sm font-black text-slate-900 tracking-tight uppercase">PicklePlay</span>
              <span className="text-[8px] font-bold tracking-widest text-blue-600 uppercase">Philippines</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Title Block */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Lock size={20} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Privacy Policy</h1>
            </div>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            Effective Date: November 6, 2026
          </p>
          <p className="mt-4 text-slate-600 leading-relaxed">
            PicklePlay Philippines ("we," "us," "our," or "Company") is committed to protecting your privacy.
            This Privacy Policy explains how we collect, use, disclose, and otherwise handle your information when
            you use our website and mobile applications, and how you can exercise your rights under the Data Privacy
            Act of 2012 (Republic Act No. 10173) and its Implementing Rules and Regulations.
          </p>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight mb-3">1. Information We Collect</h2>
            <p className="text-slate-600 leading-relaxed">We may collect information about you in a variety of ways, including:</p>
            <ul className="mt-3 space-y-2 pl-5">
              {[
                'Personal identification information (name, email, phone number, etc.) when you register or interact with our services',
                'Court booking information and payment details (such as the payment method and reference number you provide)',
                'Profile information including photos and preferences',
                'Usage data through cookies and analytics tools',
                'Basic profile information from sign-in providers such as Google, if you choose to sign in with them',
              ].map((item, i) => (
                <li key={i} className="text-slate-600 leading-relaxed flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight mb-3">2. How We Use Your Information</h2>
            <p className="text-slate-600 leading-relaxed">We use the information we collect for purposes including:</p>
            <ul className="mt-3 space-y-2 pl-5">
              {[
                'Providing and improving our services',
                'Processing bookings and payments',
                'Authenticating user accounts',
                'Sending notifications and updates',
                'Analyzing usage patterns to improve our platform',
                'Preventing fraud and enhancing security',
              ].map((item, i) => (
                <li key={i} className="text-slate-600 leading-relaxed flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight mb-3">3. Data Security</h2>
            <p className="text-slate-600 leading-relaxed">
              We implement appropriate technical and organizational measures to protect your personal information
              against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission
              over the internet or electronic storage is 100% secure.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight mb-3">4. Third-Party Services</h2>
            <p className="text-slate-600 leading-relaxed">
              Our platform uses third-party service providers, including Supabase for authentication and data storage,
              hosting and content-delivery providers, email delivery services, and map providers. When you book a court,
              your booking details are shared with that court's owner and staff, who receive payment directly (for example
              through GCash, Maya or cash at the venue). These parties process data under their own privacy policies and,
              where they act on our behalf, only as needed to provide the Service.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight mb-3">5. Your Rights as a Data Subject</h2>
            <p className="text-slate-600 leading-relaxed">
              Under the Data Privacy Act of 2012, you have the right to:
            </p>
            <ul className="mt-3 space-y-2 pl-5">
              {[
                'Be informed about how your personal data is collected and processed',
                'Access your personal data and obtain a copy of it',
                'Object to processing, including for direct marketing',
                'Have inaccurate or incomplete data corrected',
                'Have your data erased or blocked when it is no longer necessary or was processed unlawfully',
                'Receive your data in a commonly used electronic format (data portability)',
                'Be indemnified for damages caused by inaccurate, unlawfully obtained or unauthorized use of your data',
                'File a complaint with the National Privacy Commission (privacy.gov.ph)',
              ].map((item, i) => (
                <li key={i} className="text-slate-600 leading-relaxed flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-slate-600 leading-relaxed">
              You can update most information in your account settings. To exercise any other right, contact our
              Data Protection Officer using the details in section 8.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight mb-3">6. Data Retention</h2>
            <p className="text-slate-600 leading-relaxed">
              We keep your personal data only for as long as your account is active or as needed to provide the
              Service, resolve disputes, and meet legal, tax and accounting obligations. When it is no longer needed,
              we delete or anonymize it.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight mb-3">7. Cookies</h2>
            <p className="text-slate-600 leading-relaxed">
              We use cookies and similar tracking technologies to enhance your experience. Most web browsers
              allow you to control cookies through their settings.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight mb-3">8. Data Protection Officer &amp; Contact</h2>
            <p className="text-slate-600 leading-relaxed">
              For questions about this Privacy Policy, or to exercise your rights as a data subject, contact our
              Data Protection Officer at{' '}
              <a href="mailto:phpickleplay@gmail.com" className="font-bold text-slate-900 hover:text-blue-600">phpickleplay@gmail.com</a>.
              We will respond within the period required by law.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight mb-3">9. Policy Updates</h2>
            <p className="text-slate-600 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by
              updating the "Last Updated" date of this Privacy Policy.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
              Last Updated: November 6, 2026
            </p>
            <div className="flex items-center gap-4">
              <Link to="/terms" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
                Terms of Service
              </Link>
              <span className="text-slate-300">|</span>
              <Link to="/" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
                Back to Home
              </Link>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2.5">
            <img src="/images/PicklePlayLogo.jpg" alt="PicklePlay" className="w-6 h-6 rounded-lg object-contain" />
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
              © {new Date().getFullYear()} PicklePlay Philippines. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
