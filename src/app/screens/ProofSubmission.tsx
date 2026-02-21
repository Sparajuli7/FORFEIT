import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router'
import { Camera, Image, Video, FileText, X, CheckCircle } from 'lucide-react'
import { useBetStore } from '@/stores'
import { useProofStore } from '@/stores'
import type { ProofType } from '@/lib/database.types'
import { PrimaryButton } from '../components/PrimaryButton'

interface UploadEntry {
  file: File
  type: 'screenshot' | 'video' | 'document'
  /** Object URL for image previews — revoked on removal */
  previewUrl?: string
}

interface ProofSubmissionProps {
  onSubmit?: () => void
  onBack?: () => void
}

export function ProofSubmission({ onSubmit, onBack }: ProofSubmissionProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const activeBet = useBetStore((s) => s.activeBet)
  const fetchBetDetail = useBetStore((s) => s.fetchBetDetail)

  const submitProof = useProofStore((s) => s.submitProof)
  const isSubmitting = useProofStore((s) => s.isSubmitting)
  const storeError = useProofStore((s) => s.error)

  const [uploadFiles, setUploadFiles] = useState<UploadEntry[]>([])
  const [caption, setCaption] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  // Refs for file inputs — programmatic clicks are more reliable than label wrapping on mobile
  const photoInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (id) fetchBetDetail(id)
  }, [id, fetchBetDetail])

  useEffect(() => {
    useProofStore.getState().clearError()
  }, [])

  // Clean up object URLs on unmount
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
    setLocalError(null)

    // Reset input so the same file can be selected again if removed
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
    if (!id) return

    const hasFiles = uploadFiles.length > 0
    const hasCaption = caption.trim().length > 0

    if (!hasFiles && !hasCaption) {
      setLocalError('Add proof media or a text description.')
      return
    }

    setLocalError(null)

    const files: {
      frontCameraFile?: File
      backCameraFile?: File
      screenshotFiles?: File[]
      videoFile?: File
      documentFile?: File
    } = {}

    const screenshots = uploadFiles.filter((u) => u.type === 'screenshot').map((u) => u.file)
    const video = uploadFiles.find((u) => u.type === 'video')?.file
    const doc = uploadFiles.find((u) => u.type === 'document')?.file
    if (screenshots.length) files.screenshotFiles = screenshots
    if (video) files.videoFile = video
    if (doc) files.documentFile = doc

    // Determine proof type based on what was uploaded
    let proofType: ProofType = 'text'
    if (video) proofType = 'video'
    else if (doc) proofType = 'document'
    else if (screenshots.length) proofType = 'screenshot'

    const proof = await submitProof(id, files, proofType, caption.trim() || undefined)
    if (proof) {
      setSubmitted(true)
      if (onSubmit) {
        setTimeout(onSubmit, 800)
      } else {
        setTimeout(() => navigate(`/bet/${id}`), 800)
      }
    }
  }

  const handleBack = () => (onBack ? onBack() : navigate(-1))
  const hasProof = uploadFiles.length > 0 || caption.trim().length > 0
  const error = localError || storeError

  // Counts per type for badges
  const photoCount = uploadFiles.filter((u) => u.type === 'screenshot').length
  const videoCount = uploadFiles.filter((u) => u.type === 'video').length
  const docCount = uploadFiles.filter((u) => u.type === 'document').length

  if (submitted) {
    return (
      <div className="h-full bg-bg-primary flex flex-col items-center justify-center">
        <CheckCircle className="w-16 h-16 text-accent-green mb-4" />
        <p className="text-accent-green font-bold text-xl">Proof submitted!</p>
      </div>
    )
  }

  return (
    <div className="h-full bg-bg-primary overflow-y-auto pb-8">
      <div className="px-6 pt-12 pb-6 border-b border-border-subtle">
        <button onClick={handleBack} className="text-text-primary font-bold mb-4">
          &larr; Back
        </button>
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-2">SUBMIT YOUR PROOF</p>
        <h2 className="text-2xl font-black text-text-primary">{activeBet?.title ?? 'Upload Evidence'}</h2>
      </div>

      <div className="px-6 py-6 space-y-4">
        {/* Upload buttons — use programmatic clicks for reliable mobile behavior */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-3">UPLOAD EVIDENCE</p>
          <div className="grid grid-cols-2 gap-3">
            {/* Photos from gallery */}
            <UploadCard
              icon={<Image className="w-8 h-8 text-accent-green" />}
              label="Photos"
              count={photoCount}
              onClick={() => photoInputRef.current?.click()}
            />
            {/* Video */}
            <UploadCard
              icon={<Video className="w-8 h-8 text-accent-green" />}
              label="Video"
              count={videoCount}
              onClick={() => videoInputRef.current?.click()}
            />
            {/* Document */}
            <UploadCard
              icon={<FileText className="w-8 h-8 text-accent-green" />}
              label="Document"
              count={docCount}
              onClick={() => docInputRef.current?.click()}
            />
            {/* Take Photo — opens native camera on mobile */}
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
      </div>

      {error && <p className="px-6 text-destructive text-sm mb-2">{error}</p>}

      <div className="px-6 pt-4 pb-safe">
        <PrimaryButton onClick={handleSubmit} disabled={!hasProof || isSubmitting} variant="danger">
          {isSubmitting ? 'Submitting...' : 'SUBMIT PROOF'}
        </PrimaryButton>
      </div>
    </div>
  )
}

/** Tappable upload card with optional count badge */
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
