import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router'
import { Camera, Image, Video, FileText, X, CheckCircle } from 'lucide-react'
import { getOutcome } from '@/lib/api/outcomes'
import { submitShameProof } from '@/lib/api/shame'
import { supabase } from '@/lib/supabase'
import { PrimaryButton } from '../components/PrimaryButton'

interface UploadEntry {
  file: File
  type: 'front' | 'back' | 'screenshot' | 'video' | 'document'
  previewUrl?: string
}

export function ShameProofSubmission() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [outcomeId, setOutcomeId] = useState<string | null>(null)
  const [betTitle, setBetTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploadFiles, setUploadFiles] = useState<UploadEntry[]>([])
  const [caption, setCaption] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const photoInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!id) return
    getOutcome(id).then((outcome) => {
      if (outcome) {
        setOutcomeId(outcome.id)
        supabase
          .from('bets')
          .select('title')
          .eq('id', id)
          .single()
          .then(({ data }) => setBetTitle(data?.title ?? 'Bet'))
      }
      setLoading(false)
    })
  }, [id])

  useEffect(() => {
    return () => {
      uploadFiles.forEach((u) => {
        if (u.previewUrl) URL.revokeObjectURL(u.previewUrl)
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const addFiles = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: UploadEntry['type']) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return

    const newEntries: UploadEntry[] = Array.from(fileList).map((file) => {
      const entry: UploadEntry = { file, type }
      if (file.type.startsWith('image/')) {
        entry.previewUrl = URL.createObjectURL(file)
      }
      return entry
    })

    setUploadFiles((prev) => [...prev, ...newEntries])
    setError(null)
    e.target.value = ''
  }, [])

  const removeFile = useCallback((idx: number) => {
    setUploadFiles((prev) => {
      const removed = prev[idx]
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((_, i) => i !== idx)
    })
  }, [])

  const handleSubmit = async () => {
    if (!id || !outcomeId) return

    const hasFiles = uploadFiles.length > 0
    const hasCaption = caption.trim().length > 0

    if (!hasFiles && !hasCaption) {
      setError('Add proof media or a text description.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const frontFile = uploadFiles.find((u) => u.type === 'front')?.file
      const backFile = uploadFiles.find((u) => u.type === 'back')?.file
      const videoFile = uploadFiles.find((u) => u.type === 'video')?.file
      const documentFile = uploadFiles.find((u) => u.type === 'document')?.file
      const screenshotFiles = uploadFiles.filter((u) => u.type === 'screenshot').map((u) => u.file)

      await submitShameProof(id, outcomeId, {
        frontFile,
        backFile,
        videoFile,
        documentFile,
        screenshotFiles: screenshotFiles.length > 0 ? screenshotFiles : undefined,
        caption: caption.trim() || undefined,
      })
      setSubmitted(true)
      setTimeout(() => navigate('/shame'), 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleBack = () => navigate(-1)
  const hasProof = uploadFiles.length > 0 || caption.trim().length > 0

  const photoCount = uploadFiles.filter((u) => u.type === 'screenshot' || u.type === 'front' || u.type === 'back').length
  const videoCount = uploadFiles.filter((u) => u.type === 'video').length
  const docCount = uploadFiles.filter((u) => u.type === 'document').length

  if (loading) {
    return (
      <div className="h-full bg-bg-primary flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!outcomeId) {
    return (
      <div className="h-full bg-bg-primary flex flex-col items-center justify-center px-6">
        <p className="text-text-muted mb-4">Outcome not found</p>
        <PrimaryButton onClick={() => navigate(-1)}>Go Back</PrimaryButton>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="h-full bg-bg-primary flex flex-col items-center justify-center">
        <CheckCircle className="w-16 h-16 text-accent-green mb-4" />
        <p className="text-accent-green font-bold text-xl">Punishment proof submitted!</p>
      </div>
    )
  }

  return (
    <div className="h-full bg-bg-primary overflow-y-auto pb-8">
      <div className="px-6 pt-12 pb-6 border-b border-border-subtle">
        <button onClick={handleBack} className="text-text-primary font-bold mb-4">
          &larr; Back
        </button>
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-2">
          SUBMIT PUNISHMENT PROOF
        </p>
        <h2 className="text-2xl font-black text-text-primary">{betTitle}</h2>
      </div>

      <div className="px-6 py-6 space-y-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-3">UPLOAD EVIDENCE</p>
          <div className="grid grid-cols-2 gap-3">
            <UploadCard
              icon={<Image className="w-8 h-8 text-accent-green" />}
              label="Photos"
              count={photoCount}
              onClick={() => photoInputRef.current?.click()}
            />
            <UploadCard
              icon={<Video className="w-8 h-8 text-accent-green" />}
              label="Video"
              count={videoCount}
              onClick={() => videoInputRef.current?.click()}
            />
            <UploadCard
              icon={<FileText className="w-8 h-8 text-accent-green" />}
              label="Document"
              count={docCount}
              onClick={() => docInputRef.current?.click()}
            />
            <UploadCard
              icon={<Camera className="w-8 h-8 text-accent-green" />}
              label="Take Photo"
              count={0}
              onClick={() => cameraInputRef.current?.click()}
            />
          </div>

          {/* Hidden file inputs */}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e, 'screenshot')}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => addFiles(e, 'video')}
          />
          <input
            ref={docInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            className="hidden"
            onChange={(e) => addFiles(e, 'document')}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => addFiles(e, 'screenshot')}
          />
        </div>

        {/* File previews */}
        {uploadFiles.length > 0 && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-2">
              {uploadFiles.length} FILE{uploadFiles.length !== 1 ? 'S' : ''} SELECTED
            </p>
            <div className="flex gap-2 flex-wrap">
              {uploadFiles.map((u, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-accent-green/50 bg-bg-elevated">
                  {u.previewUrl ? (
                    <img src={u.previewUrl} alt="" className="w-full h-full object-cover" />
                  ) : u.file.type.startsWith('video/') ? (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <Video className="w-5 h-5 text-accent-green mb-1" />
                      <span className="text-[10px] text-text-muted truncate max-w-full px-1">{u.file.name}</span>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <FileText className="w-5 h-5 text-accent-green mb-1" />
                      <span className="text-[10px] text-text-muted truncate max-w-full px-1">{u.file.name}</span>
                    </div>
                  )}
                  <button
                    onClick={() => removeFile(i)}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent-coral text-white flex items-center justify-center z-10"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Caption / text proof */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-2 block">
            DESCRIPTION {uploadFiles.length === 0 ? '' : '(OPTIONAL)'}
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={uploadFiles.length === 0 ? 'Describe what happened as proof...' : 'Add context...'}
            className="w-full h-24 bg-bg-card border border-border-subtle rounded-xl p-3 text-text-primary placeholder:text-text-muted resize-none"
          />
          {uploadFiles.length === 0 && caption.trim().length > 0 && (
            <p className="text-xs text-text-muted mt-1">Text-only proof will be submitted</p>
          )}
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <PrimaryButton
          onClick={handleSubmit}
          disabled={!hasProof || submitting}
          className="w-full"
        >
          {submitting ? 'Submitting...' : 'Submit Proof'}
        </PrimaryButton>
      </div>
    </div>
  )
}

function UploadCard({
  icon,
  label,
  count,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative bg-bg-card border border-border-subtle rounded-xl p-4 flex flex-col items-center gap-2 hover:border-accent-green active:scale-95 transition-all cursor-pointer min-h-[100px]"
    >
      {icon}
      <span className="text-xs font-bold text-text-primary">{label}</span>
      {count > 0 && (
        <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-accent-green text-white text-[10px] font-bold flex items-center justify-center">
          {count}
        </span>
      )}
    </button>
  )
}
