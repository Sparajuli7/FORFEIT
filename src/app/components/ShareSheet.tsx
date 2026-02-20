import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import {
  getTwitterShareUrl,
  getFacebookShareUrl,
  copyToClipboard,
} from '@/lib/share'

export interface ShareSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  text: string
  url: string
  onCopied?: () => void
  /** Called when user completes any share action (X, Facebook, or copy). */
  onShared?: () => void
}

export function ShareSheet({
  open,
  onOpenChange,
  title = 'Share',
  text,
  url,
  onCopied,
  onShared,
}: ShareSheetProps) {
  const fullText = `${text} ${url}`.trim()

  const closeAndNotify = () => {
    onOpenChange(false)
    onShared?.()
  }

  const handleTwitter = () => {
    window.open(getTwitterShareUrl(text, url), '_blank', 'noopener,noreferrer')
    closeAndNotify()
  }

  const handleFacebook = () => {
    window.open(getFacebookShareUrl(url), '_blank', 'noopener,noreferrer')
    closeAndNotify()
  }

  const handleCopy = async () => {
    const ok = await copyToClipboard(fullText)
    if (ok) onCopied?.()
    closeAndNotify()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg-card border-border-subtle">
        <DialogHeader>
          <DialogTitle className="text-text-primary">{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 pt-2">
          <button
            type="button"
            onClick={handleTwitter}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-bg-elevated hover:bg-bg-elevated/80 border border-border-subtle text-text-primary font-semibold text-left transition-colors"
          >
            <span className="text-xl" aria-hidden>𝕏</span>
            Post to X (Twitter)
          </button>
          <button
            type="button"
            onClick={handleFacebook}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-bg-elevated hover:bg-bg-elevated/80 border border-border-subtle text-text-primary font-semibold text-left transition-colors"
          >
            <span className="text-xl" aria-hidden>f</span>
            Share on Facebook
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-bg-elevated hover:bg-bg-elevated/80 border border-border-subtle text-text-primary font-semibold text-left transition-colors"
          >
            <span className="text-xl" aria-hidden>🔗</span>
            Copy link
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
