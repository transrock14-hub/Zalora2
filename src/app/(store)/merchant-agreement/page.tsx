import { supabaseAdmin } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { sanitizeHtml } from '@/lib/sanitize-html'
import { MerchantAgreementClient } from './merchant-agreement-client'

// Avoid prerender-time DB access on deploy/build environments.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Merchant Agreement - ZALORA',
  description: 'Merchant agreement and terms for sellers on ZALORA',
}

async function getMerchantAgreementPage() {
  // Try to get from CMS pages first
  const { data: page, error } = await supabaseAdmin
    .from('pages')
    .select('*')
    .eq('slug', 'merchant-agreement')
    .single()

  // If not found, return default content
  if (error || !page || !page.isActive) {
    return {
      title: 'Merchant Agreement',
      content: `
        <h1>Merchant Agreement</h1>
        <p>Welcome to ZALORA Fashion's Merchant Program. By becoming a merchant on our platform, you agree to the following terms and conditions.</p>
        
        <h2>1. Merchant Eligibility</h2>
        <p>To become a merchant, you must:</p>
        <ul>
          <li>Be at least 18 years old</li>
          <li>Have a valid business license (if applicable)</li>
          <li>Provide accurate business information</li>
          <li>Comply with all applicable laws and regulations</li>
        </ul>
        
        <h2>2. Product Listing Requirements</h2>
        <p>All products must:</p>
        <ul>
          <li>Be accurately described with clear images</li>
          <li>Comply with our product guidelines</li>
          <li>Not infringe on intellectual property rights</li>
          <li>Meet quality standards</li>
        </ul>
        
        <h2>3. Commission and Fees</h2>
        <p>ZALORA charges a commission on each sale. Commission rates vary by product category and merchant level.</p>
        
        <h2>4. Payment Terms</h2>
        <p>Payments are processed according to our payment schedule. Merchants are responsible for providing accurate payment information.</p>
        
        <h2>5. Prohibited Activities</h2>
        <p>Merchants may not:</p>
        <ul>
          <li>Engage in fraudulent activities</li>
          <li>Manipulate reviews or ratings</li>
          <li>Violate intellectual property rights</li>
          <li>List prohibited items</li>
        </ul>
        
        <h2>6. Termination</h2>
        <p>ZALORA reserves the right to suspend or terminate merchant accounts that violate these terms.</p>
        
        <p>For questions, please contact our support team.</p>
      `,
      isActive: true,
    }
  }

  return page
}

export default async function MerchantAgreementPage() {
  const page = await getMerchantAgreementPage()

  return (
    <MerchantAgreementClient
      page={{ title: page.title, content: sanitizeHtml(page.content) }}
    />
  )
}
