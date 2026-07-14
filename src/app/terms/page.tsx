import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service - ZALORA',
  description: 'Terms of Service for ZALORA',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-white text-2xl leading-none" aria-label="Back">←</Link>
        <h1 className="text-lg font-semibold text-white">Terms of Service</h1>
      </header>
      <main className="container max-w-3xl mx-auto px-4 py-8 prose prose-neutral dark:prose-invert">
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using ZALORA, you agree to be bound by these Terms of Service and our Privacy Policy.
        </p>
        <h2>2. Use of the Service</h2>
        <p>
          You may use our platform to browse products, create an account, place orders, and (where applicable) sell as a merchant in accordance with our policies.
        </p>
        <h2>3. Account</h2>
        <p>
          You are responsible for keeping your account credentials secure and for all activity under your account.
        </p>
        <h2>4. Orders and Payment</h2>
        <p>
          Orders are subject to availability and acceptance. Payment terms are as displayed at checkout.
        </p>
        <h2>5. Changes</h2>
        <p>
          We may update these terms from time to time. Continued use of the service after changes constitutes acceptance.
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
