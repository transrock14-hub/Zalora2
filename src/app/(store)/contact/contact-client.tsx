'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useUIStore } from '@/lib/store'
import toast from 'react-hot-toast'

export function ContactPageClient() {
  const setChatOpen = useUIStore((s) => s.setChatOpen)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast.error('Please fill in all fields')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          subject: formData.subject,
          message: `From: ${formData.name}\n\n${formData.message}`,
          priority: 'MEDIUM',
        }),
      })

      if (response.ok) {
        toast.success('Message sent successfully! We\'ll get back to you soon.')
        setFormData({ name: '', email: '', subject: '', message: '' })
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Contact form error:', error)
      toast.error('An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 lg:pb-0">
      {/* Mobile Header */}
      <div className="bg-primary px-4 pt-4 pb-6 lg:hidden">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-white">
            <Icon icon="solar:arrow-left-linear" className="size-6" />
          </Link>
          <h1 className="text-white text-lg font-bold font-heading">Contact Us</h1>
          <div className="size-6" />
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block container mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            <Icon icon="solar:arrow-left-linear" className="size-6" />
          </Link>
          <h1 className="text-2xl font-bold font-heading">Contact Us</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 lg:container lg:mx-auto">
        <div className="max-w-4xl mx-auto py-8">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Contact Form */}
            <div className="bg-card rounded-xl p-6 lg:p-8 border border-border/50">
              <h2 className="text-2xl font-bold font-heading mb-6">Send us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your.email@example.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="What is this regarding?"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Tell us how we can help..."
                    rows={6}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </Button>
              </form>
            </div>

            {/* Contact Information */}
            <div className="space-y-6">
              <div className="bg-card rounded-xl p-6 lg:p-8 border border-border/50">
                <h2 className="text-2xl font-bold font-heading mb-6">Get in Touch</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon icon="solar:clock-circle-bold" className="size-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Business Hours</h3>
                      <p className="text-muted-foreground">
                        Monday - Friday: 9:00 AM - 6:00 PM<br />
                        Saturday: 10:00 AM - 4:00 PM<br />
                        Sunday: Closed
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon icon="solar:chat-round-dots-bold" className="size-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Live Chat</h3>
                      <p className="text-muted-foreground">
                        Click the Assistant button in the bottom right corner for instant help
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-primary to-primary/80 rounded-xl p-6 lg:p-8 text-white">
                <h3 className="text-xl font-bold mb-3">Need Immediate Help?</h3>
                <p className="mb-4 opacity-90">
                  Our AI Assistant is available 24/7 to answer your questions
                </p>
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  type="button"
                  onClick={() => setChatOpen(true)}
                >
                  <Icon icon="solar:chat-round-dots-bold" className="mr-2 size-5" />
                  Chat with Assistant
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
