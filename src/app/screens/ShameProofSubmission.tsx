import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { Image, X } from 'lucide-react'
import { getOutcome } from '@/lib/api/outcomes'
import { submitShameProof } from '@/lib/api/shame'
import { PrimaryButton } from '../components/PrimaryButton'

export function ShameProofSubmission() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [outcomeId, setOutcomeId] = useState<string | null>(null)
  const [betTitle, setBetTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [frontBlob, setFrontBlob] = useState<Blob | null>(null)
  const [backBlob, setBackBlob] = useState<Blob | null>(null)
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [caption, setCaption] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const frontVideoRef = useRef<HTMLVideoElement>(null)
  const backVideoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!id) return
    getOutcome(id).then((outcome) => {
      if (outcome) {
        setOutcomeId(outcome.id)
        import('@/lib/supabase').then(({ supabase }) =>
          supabase
            .from('bets')
            .select('title')
            .eq('id', id)
            .single()
            .then(({ data }) => setBetTitle(data?.title ?? 'Bet')),
        )
      }
      setLoading(false)
    })
  }, [id])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    setUploadFiles((prev) => [...prev, ...Array.from(files)])
    e.target.value = ''
  }

  const removeFile = (idx: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async () => {
    if (!id || !outcomeId) return

    const frontFile = frontBlob ? new File([frontBlob], 'front.jpg', { type: 'image/jpeg' }) : undefined
    const backFile = backBlob ? new File([backBlob], 'back.jpg', { type: 'image/jpeg' }) : undefined

    if (!frontFile && !backFile && uploadFiles.length === 0) return

    setSubmitting(true)
    try {
      await submitShameProof(id, outcomeId, {
        frontFile,
        backFile,
        screenshotFiles: uploadFiles.length > 0 ? uploadFiles : undefined,
        caption: caption.trim() || undefined,
      })
      setSubmitted(true)
      setTimeout(() => navigate('/shame'), 1200)
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleBack = () => navigate(-1)
  const hasProof = frontBlob || backBlob || uploadFiles.length > 0

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
        <div className="text-6xl mb-4">✓</div>
        <p className="text-accent-green font-bold text-xl">Punishment proof submitted!</p>
      </div>
    )
  }

  return (
    <div className="h-full bg-bg-primary overflow-y-auto pb-8">
      <div className="px-6 pt-12 pb-6 border-b border-border-subtle">
        <button onClick={handleBack} className="text-text-primary font-bold mb-4">
          ← Back
        </button>
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-2">
          SUBMIT PUNISHMENT PROOF
        </p>
        <h2 className="text-2xl font-black text-text-primary">{betTitle}</h2>
      </div>

      <div className="px-6 py-6 space-y-4">
        <div>
          <label className="block text-xs font-bold text-text-muted mb-2">Front photo</label>
          <label className="block aspect-[3/4] rounded-xl border-2 border-dashed border-border-subtle flex flex-col items-center justify-center cursor-pointer hover:border-accent-green/50 transition-colors overflow-hidden">
            {frontBlob ? (
              <img
                src={URL.createObjectURL(frontBlob)}
                alt="Front"
                className="w-full h-full object-cover"
              />
            ) : (
              <>
                <Image className="w-12 h-12 text-text-muted mb-2" />
                <span className="text-sm text-text-muted">Tap to add</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) setFrontBlob(f)
              }}
            />
          </label>
        </div>

        <div>
          <label className="block text-xs font-bold text-text-muted mb-2">Back photo</label>
          <label className="block aspect-[3/4] rounded-xl border-2 border-dashed border-border-subtle flex flex-col items-center justify-center cursor-pointer hover:border-accent-green/50 transition-colors overflow-hidden">
            {backBlob ? (
              <img
                src={URL.createObjectURL(backBlob)}
                alt="Back"
                className="w-full h-full object-cover"
              />
            ) : (
              <>
                <Image className="w-12 h-12 text-text-muted mb-2" />
                <span className="text-sm text-text-muted">Tap to add</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) setBackBlob(f)
              }}
            />
          </label>
        </div>

        <div>
          <label className="block text-xs font-bold text-text-muted mb-2">Screenshots (optional)</label>
          <label className="block rounded-xl border-2 border-dashed border-border-subtle p-6 flex flex-col items-center justify-center cursor-pointer hover:border-accent-green/50 transition-colors">
            <Image className="w-8 h-8 text-text-muted mb-2" />
            <span className="text-sm text-text-muted">Add screenshots</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
          {uploadFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {uploadFiles.map((f, i) => (
                <div key={i} className="relative">
                  <img
                    src={URL.createObjectURL(f)}
                    alt=""
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removeFile(i)}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent-coral text-white flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-text-muted mb-2">Caption (optional)</label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption..."
            className="w-full h-12 rounded-xl bg-bg-elevated border border-border-subtle px-4 text-text-primary"
          />
        </div>

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
