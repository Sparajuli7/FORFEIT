import { useState, useRef, useCallback, useEffect } from 'react'
import { Send, Camera, X, Loader2 } from 'lucide-react'

interface ChatInputProps {
  onSend: (content: string) => void
  onSendImage: (file: File, caption: string) => void
  disabled?: boolean
  isUploading?: boolean
}

export function ChatInput({ onSend, onSendImage, disabled, isUploading }: ChatInputProps) {
  const [value, setValue] = useState('')
  const [imagePreview, setImagePreview] = useState<{ file: File; url: string } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }, [])

  useEffect(() => {
    adjustHeight()
  }, [value, adjustHeight])

  const handleSend = () => {
    if (isUploading || disabled) return

    if (imagePreview) {
      onSendImage(imagePreview.file, value.trim())
      URL.revokeObjectURL(imagePreview.url)
      setImagePreview(null)
      setValue('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
      return
    }

    const trimmed = value.trim()
    if (!trimmed) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Clean up previous preview
    if (imagePreview) URL.revokeObjectURL(imagePreview.url)
    setImagePreview({ file, url: URL.createObjectURL(file) })
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview.url)
    setImagePreview(null)
  }

  const canSend = (!disabled && !isUploading) && (value.trim().length > 0 || imagePreview !== null)

  return (
    <div className="border-t border-border-subtle bg-bg-primary px-4 py-3 pb-safe">
      {/* Image preview */}
      {imagePreview && (
        <div className="relative mb-2 inline-block">
          <img
            src={imagePreview.url}
            alt="Preview"
            className="h-20 w-20 rounded-xl object-cover border border-border-subtle"
          />
          {!isUploading && (
            <button
              onClick={clearImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-accent-coral text-white flex items-center justify-center"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
          )}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Camera / image picker button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-bg-elevated text-text-muted hover:text-accent-green transition-colors disabled:opacity-50"
          aria-label="Take photo or choose image"
        >
          <Camera className="w-5 h-5" />
        </button>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={imagePreview ? 'Add a caption...' : 'Type a message...'}
          rows={1}
          className="flex-1 resize-none bg-bg-elevated rounded-2xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-green/50 no-scrollbar"
          style={{ maxHeight: 120 }}
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            canSend
              ? 'bg-accent-green text-bg-primary glow-green'
              : 'bg-bg-elevated text-text-muted'
          }`}
          aria-label="Send message"
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  )
}
