import Image from 'next/image'

export default function MaintenancePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 to-background p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Logo */}
        <div className="flex justify-center">
          <Image
            src="/images/logo.png"
            alt="ZALORA"
            width={200}
            height={70}
            className="object-contain"
            priority
          />
        </div>

        {/* Maintenance Icon */}
        <div className="flex justify-center">
          <div className="size-24 rounded-full bg-primary/10 flex items-center justify-center">
            <div className="size-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" style={{ animationDuration: '1s' }} />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold font-heading text-foreground">
            Under Maintenance
          </h1>
          <p className="text-lg text-muted-foreground">
            We're currently performing scheduled maintenance to improve your experience.
          </p>
          <p className="text-sm text-muted-foreground">
            We'll be back online shortly. Thank you for your patience!
          </p>
        </div>

        {/* Contact Info */}
        <div className="pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground mb-4">
            Need immediate assistance?
          </p>
          <div className="flex flex-col gap-2">
            <a
              href="mailto:support@zalora.com"
              className="flex items-center justify-center gap-2 text-primary hover:underline"
            >
              <span>support@zalora.com</span>
            </a>
          </div>
        </div>

        {/* Admin Access */}
        <div className="pt-4">
          <a
            href="/admin"
            className="text-xs text-muted-foreground hover:text-primary"
          >
            Admin Access →
          </a>
        </div>
      </div>
    </div>
  )
}
