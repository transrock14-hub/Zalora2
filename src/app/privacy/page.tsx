import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy - ZALORA',
  description: 'Privacy Policy for ZALORA',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-white text-2xl leading-none" aria-label="Back">←</Link>
        <h1 className="text-lg font-semibold text-white">Privacy Policy</h1>
      </header>
      <main className="container max-w-3xl mx-auto px-4 py-8 prose prose-neutral dark:prose-invert">
        <h2>1. Information We Collect</h2>
        <p>
          We collect information you provide when you register, place orders, or contact us, such as name, email, address, and payment details where necessary.
        </p>
        <h2>2. How We Use It</h2>
        <p>
          We use your information to process orders, communicate with you, improve our service, and comply with legal obligations.
        </p>
        <h2>3. Sharing</h2>
        <p>
          We do not sell your personal data. We may share data with service providers who assist in operating our platform, under strict confidentiality.
        </p>
        <h2>4. Security</h2>
        <p>
          We take reasonable measures to protect your data. Account credentials and sensitive data are stored securely.
        </p>
        <h2>5. Your Rights</h2>
        <p>
          You may access, correct, or request deletion of your personal data by contacting us or using account settings where available.
        </p>
        <p className="mt-8">
          <Link href="/" className="text-primary hover:underline">
            Back to home
          </Link>
        </p>
      </main>
    </div>
  )
}
