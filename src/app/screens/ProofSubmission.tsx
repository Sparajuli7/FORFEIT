import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { Image, Video, FileText, X } from 'lucide-react'
import { useBetStore } from '@/stores'
import { useProofStore } from '@/stores'
import type { ProofType } from '@/lib/database.types'
import { PrimaryButton } from '../components/PrimaryButton'

const PROOF_TYPES: { type: ProofType; icon: string; label: string }[] = [
  { type: 'camera', icon: '📸', label: 'Photo' },
  { type: 'screenshot', icon: '🖼️', label: 'Screenshot' },
  { type: 'video', icon: '🎥', label: 'Video' },
  { type: 'document', icon: '📄', label: 'Document' },
]

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
  const error = useProofStore((s) => s.error)

  const [mode, setMode] = useState<'camera' | 'upload'>('camera')
  const [countdown, setCountdown] = useState<number | null>(null)
  const [proofType, setProofType] = useState<ProofType>('camera')
  const [caption, setCaption] = useState('')
  const [frontBlob, setFrontBlob] = useState<Blob | null>(null)
  const [backBlob, setBackBlob] = useState<Blob | null>(null)
  const [uploadFiles, setUploadFiles] = useState<{ file: File; type: 'front' | 'back' | 'screenshot' | 'video' | 'document' }[]>([])
  const [submitted, setSubmitted] = useState(false)

  const frontVideoRef = useRef<HTMLVideoElement>(null)
  const backVideoRef = useRef<HTMLVideoElement>(null)
  const frontStreamRef = useRef<MediaStream | null>(null)
  const backStreamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (id) fetchBetDetail(id)
  }, [id, fetchBetDetail])

  useEffect(() => {
    if (mode === 'camera') startCamera()
    return () => stopCamera()
  }, [mode])

  useEffect(() => {
    if (countdown === null) return
    if (countdown <= 0) {
      captureBoth()
      return
    }
    const t = setTimeout(() => setCountdown(countdown - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  async function startCamera() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter((d) => d.kind === 'videoinput')
      const back = videoDevices.find((d) => d.label.toLowerCase().includes('back') || d.label.includes('1')) ?? videoDevices[0]
      const front = videoDevices.find((d) => d.label.toLowerCase().includes('front') || d.label.includes('0')) ?? videoDevices[1] ?? videoDevices[0]

      const backStream = back ? await navigator.mediaDevices.getUserMedia({ video: { deviceId: back.deviceId } }) : null
      const frontStream = front && front.deviceId !== back?.deviceId ? await navigator.mediaDevices.getUserMedia({ video: { deviceId: front.deviceId } }) : backStream

      if (backStream) {
        backStreamRef.current = backStream
        if (backVideoRef.current) backVideoRef.current.srcObject = backStream
      }
      if (frontStream) {
        frontStreamRef.current = frontStream
        if (frontVideoRef.current) frontVideoRef.current.srcObject = frontStream
      }
    } catch (e) {
      console.warn('Camera access failed:', e)
      setMode('upload')
    }
  }

  function stopCamera() {
    frontStreamRef.current?.getTracks().forEach((t) => t.stop())
    backStreamRef.current?.getTracks().forEach((t) => t.stop())
    frontStreamRef.current = null
    backStreamRef.current = null
  }

  async function captureBoth() {
    if (!backVideoRef.current && !frontVideoRef.current) {
      setCountdown(null)
      setMode('upload')
      return
    }
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const blobs: { front?: Blob; back?: Blob } = {}
    if (backVideoRef.current?.videoWidth) {
      canvas.width = backVideoRef.current.videoWidth
      canvas.height = backVideoRef.current.videoHeight
      ctx.drawImage(backVideoRef.current, 0, 0)
      blobs.back = await new Promise<Blob | undefined>((r) => canvas.toBlob((b) => r(b ?? undefined), 'image/jpeg'))
    }
    if (frontVideoRef.current?.videoWidth && frontStreamRef.current !== backStreamRef.current) {
      canvas.width = frontVideoRef.current.videoWidth
      canvas.height = frontVideoRef.current.videoHeight
      ctx.drawImage(frontVideoRef.current, 0, 0)
      blobs.front = await new Promise<Blob | undefined>((r) => canvas.toBlob((b) => r(b ?? undefined), 'image/jpeg'))
    }
    stopCamera()
    if (blobs.back) setBackBlob(blobs.back)
    if (blobs.front) setFrontBlob(blobs.front)
    setCountdown(null)
    setMode('upload')
  }

  const handleCaptureClick = () => {
    setCountdown(3)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back' | 'screenshot' | 'video' | 'document') => {
    const files = e.target.files
    if (!files?.length) return
    for (let i = 0; i < files.length; i++) {
      setUploadFiles((prev) => [...prev, { file: files[i], type }])
    }
    e.target.value = ''
  }

  const removeFile = (idx: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async () => {
    if (!id) return

    const files: {
      frontCameraFile?: File
      backCameraFile?: File
      screenshotFiles?: File[]
      videoFile?: File
      documentFile?: File
    } = {}

    if (frontBlob) files.frontCameraFile = new File([frontBlob], 'front.jpg', { type: 'image/jpeg' })
    if (backBlob) files.backCameraFile = new File([backBlob], 'back.jpg', { type: 'image/jpeg' })

    const screenshots = uploadFiles.filter((u) => u.type === 'screenshot').map((u) => u.file)
    const video = uploadFiles.find((u) => u.type === 'video')?.file
    const doc = uploadFiles.find((u) => u.type === 'document')?.file
    if (screenshots.length) files.screenshotFiles = screenshots
    if (video) files.videoFile = video
    if (doc) files.documentFile = doc

    if (!files.frontCameraFile && !files.backCameraFile && !files.screenshotFiles?.length && !files.videoFile && !files.documentFile) {
      return
    }

    const proof = await submitProof(id, files, proofType, caption || undefined)
    if (proof) {
      setSubmitted(true)
      setTimeout(() => navigate(`/bet/${id}`), 800)
    }
  }

  const handleBack = () => (onBack ? onBack() : navigate(-1))

  const hasProof = frontBlob || backBlob || uploadFiles.length > 0

  if (submitted) {
    return (
      <div className="h-full bg-bg-primary flex flex-col items-center justify-center">
        <div className="text-6xl mb-4">✓</div>
        <p className="text-accent-green font-bold text-xl">Proof submitted!</p>
      </div>
    )
  }

  if (mode === 'camera') {
    return (
      <div className="h-full bg-black relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <video
            ref={backVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
          <div className="absolute top-8 right-6 w-24 h-32 bg-gray-800 rounded-2xl border-2 border-white/30 overflow-hidden">
            <video
              ref={frontVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
          </div>
        </div>

        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent pt-safe px-6 py-6">
          <button onClick={handleBack} className="text-white font-bold mb-2">
            ← Back
          </button>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/60 mb-1">SUBMIT YOUR PROOF</p>
          <p className="text-sm font-semibold text-white line-clamp-1">{activeBet?.title ?? 'Bet'}</p>
        </div>

        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="text-9xl font-black text-accent-green tabular-nums">{countdown}</div>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/95 to-transparent pt-20 pb-12 px-6">
          <div className="text-center mb-8">
            <h2 className="text-white font-black text-2xl mb-2">Drop your proof.</h2>
            <p className="text-white/60 text-sm">Front and back fire at once. No staging.</p>
          </div>
          <div className="flex flex-col items-center mb-6">
            <button
              onClick={handleCaptureClick}
              className="w-20 h-20 rounded-full border-4 border-white bg-transparent flex items-center justify-center btn-pressed mb-3"
            >
              <div className="w-16 h-16 rounded-full bg-accent-green" />
            </button>
            <p className="text-white/40 text-xs font-medium">3 seconds after you tap</p>
          </div>
          <button onClick={() => { stopCamera(); setMode('upload') }} className="w-full text-center text-sm font-bold text-white/60 uppercase tracking-wide">
            Or Upload Evidence →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-bg-primary overflow-y-auto pb-8">
      <div className="px-6 pt-12 pb-6 border-b border-border-subtle">
        <button onClick={handleBack} className="text-text-primary font-bold mb-4">
          ← Back
        </button>
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-2">SUBMIT YOUR PROOF</p>
        <h2 className="text-2xl font-black text-text-primary">Upload Evidence</h2>
      </div>

      <div className="px-6 py-6 space-y-4">
        {(frontBlob || backBlob) && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            {frontBlob && (
              <div className="aspect-[3/4] rounded-xl overflow-hidden border-2 border-border-subtle relative">
                <img src={URL.createObjectURL(frontBlob)} alt="Front" className="w-full h-full object-cover" />
                <button onClick={() => setFrontBlob(null)} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            )}
            {backBlob && (
              <div className="aspect-[3/4] rounded-xl overflow-hidden border-2 border-border-subtle relative">
                <img src={URL.createObjectURL(backBlob)} alt="Back" className="w-full h-full object-cover" />
                <button onClick={() => setBackBlob(null)} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            )}
          </div>
        )}

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-3">UPLOAD EVIDENCE</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="bg-bg-card border border-border-subtle rounded-xl p-4 flex flex-col items-center gap-2 hover:border-accent-green transition-colors cursor-pointer">
              <Image className="w-8 h-8 text-accent-green" />
              <span className="text-xs font-bold text-text-primary">📸 Gallery</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'screenshot')} />
            </label>
            <label className="bg-bg-card border border-border-subtle rounded-xl p-4 flex flex-col items-center gap-2 hover:border-accent-green transition-colors cursor-pointer">
              <Video className="w-8 h-8 text-accent-green" />
              <span className="text-xs font-bold text-text-primary">🎥 Video</span>
              <input type="file" accept="video/*" className="hidden" onChange={(e) => handleFileChange(e, 'video')} />
            </label>
            <label className="bg-bg-card border border-border-subtle rounded-xl p-4 flex flex-col items-center gap-2 hover:border-accent-green transition-colors cursor-pointer">
              <FileText className="w-8 h-8 text-accent-green" />
              <span className="text-xs font-bold text-text-primary">📄 Document</span>
              <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => handleFileChange(e, 'document')} />
            </label>
          </div>
        </div>

        {uploadFiles.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {uploadFiles.map((u, i) => (
              <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border-subtle">
                {u.file.type.startsWith('image/') ? (
                  <img src={URL.createObjectURL(u.file)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-bg-elevated text-text-muted text-xs">
                    {u.type}
                  </div>
                )}
                <button onClick={() => removeFile(i)} className="absolute top-0 right-0 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div>
          <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-2 block">ADD CONTEXT (OPTIONAL)</label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add context..."
            className="w-full h-24 bg-bg-card border border-border-subtle rounded-xl p-3 text-text-primary placeholder:text-text-muted resize-none"
          />
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-3">PROOF TYPE</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {PROOF_TYPES.map((t) => (
              <button
                key={t.type}
                onClick={() => setProofType(t.type)}
                className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold ${
                  proofType === t.type ? 'bg-accent-green/20 text-accent-green border border-accent-green/40' : 'bg-bg-elevated text-text-muted'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="px-6 text-destructive text-sm">{error}</p>}

      <div className="px-6 pt-4 pb-safe">
        <PrimaryButton onClick={handleSubmit} disabled={!hasProof || isSubmitting} variant="danger">
          {isSubmitting ? 'Submitting...' : 'SUBMIT PROOF'}
        </PrimaryButton>
      </div>
    </div>
  )
}
