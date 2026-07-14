import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

// Bucket name for Supabase Storage. Created automatically if missing.
const UPLOAD_BUCKET = 'uploads'

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])
const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'])

/**
 * Sniff the file's magic bytes so we don't trust the client-supplied MIME type.
 * Returns true if the buffer starts with a known image signature.
 */
function isRealImage(buffer: Buffer): boolean {
  if (buffer.length < 12) return false
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) return true
  // GIF: "GIF8"
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return true
  // WEBP: "RIFF"...."WEBP"
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) return true
  // AVIF / HEIF: bytes 4-7 == "ftyp"
  if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) return true
  return false
}

async function ensureUploadBucketExists() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets()
  const exists = buckets?.some((b) => b.name === UPLOAD_BUCKET)
  if (exists) return
  const { error } = await supabaseAdmin.storage.createBucket(UPLOAD_BUCKET, {
    public: true,
  })
  if (error) {
    console.error('Failed to create uploads bucket:', error)
    throw error
  }
}

export async function POST(req: NextRequest) {
  try {
    // Require an authenticated user — no anonymous uploads.
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const rawFolder = (formData.get('folder') as string) || 'general'
    // Sanitize folder to a safe path segment (prevents traversal / unexpected paths).
    const folder = rawFolder.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'general'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, WEBP, GIF or AVIF images are allowed' }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Verify actual file content, not the client-declared type.
    if (!isRealImage(buffer)) {
      return NextResponse.json({ error: 'File is not a valid image' }, { status: 400 })
    }

    const timestamp = Date.now()
    const baseName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const ext = baseName.includes('.') ? baseName.split('.').pop()!.toLowerCase() : ''
    if (!ALLOWED_EXT.has(ext)) {
      return NextResponse.json({ error: 'Unsupported file extension' }, { status: 400 })
    }
    const filename = `${timestamp}-${baseName}`
    const storagePath = `${folder}/${filename}`

    // Prefer Supabase Storage (works on Netlify/serverless; filesystem is read-only there)
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      let uploadData: { path: string } | null = null
      let uploadError: { message: string } | null = null

      const doUpload = () =>
        supabaseAdmin.storage
          .from(UPLOAD_BUCKET)
          .upload(storagePath, buffer, {
            contentType: file.type,
            upsert: false,
          })

      const result = await doUpload()
      uploadData = result.data
      uploadError = result.error

      // If bucket missing, create it and retry once
      if (uploadError && (uploadError.message?.toLowerCase().includes('bucket') || uploadError.message?.toLowerCase().includes('not found'))) {
        await ensureUploadBucketExists()
        const retry = await doUpload()
        uploadData = retry.data
        uploadError = retry.error
      }

      if (uploadError || !uploadData) {
        console.error('Supabase storage upload error:', uploadError)
        return NextResponse.json(
          { error: uploadError?.message || 'Storage upload failed. Create an "uploads" bucket in Supabase Dashboard → Storage (public).' },
          { status: 500 }
        )
      }

      const { data: urlData } = supabaseAdmin.storage
        .from(UPLOAD_BUCKET)
        .getPublicUrl(uploadData.path)

      return NextResponse.json({
        success: true,
        url: urlData.publicUrl,
        filename,
      })
    }

    // Fallback: local filesystem (only works in dev; Netlify/serverless is read-only)
    const uploadDir = join(process.cwd(), 'public', 'uploads', folder)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }
    const filepath = join(uploadDir, filename)
    await writeFile(filepath, buffer)
    const url = `/uploads/${folder}/${filename}`

    return NextResponse.json({ success: true, url, filename })
  } catch (error: unknown) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload file' },
      { status: 500 }
    )
  }
}
