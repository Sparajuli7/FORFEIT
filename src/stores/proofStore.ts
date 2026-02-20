import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Proof, ProofVote, ProofType, VoteChoice } from '@/lib/database.types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** File bundle passed to submitProof — mirrors ProofSubmission.tsx upload modes */
export interface ProofFiles {
  frontCameraFile?: File
  backCameraFile?: File
  screenshotFiles?: File[]
  videoFile?: File
  documentFile?: File
}

/** Vote tallies for a proof — UI uses this to render confirm/dispute counts */
export interface VoteCounts {
  confirm: number
  dispute: number
  total: number
  /** 0–100 — percentage of confirm votes */
  confirmPct: number
}

interface ProofState {
  /** All proofs fetched for the currently-viewed bet */
  proofs: Proof[]
  /** Votes fetched for the currently-viewed proof */
  votes: ProofVote[]
  isSubmitting: boolean
  isLoading: boolean
  error: string | null
}

interface ProofActions {
  submitProof: (
    betId: string,
    files: ProofFiles,
    proofType: ProofType,
    caption?: string,
  ) => Promise<Proof | null>
  fetchProofs: (betId: string) => Promise<void>
  voteOnProof: (proofId: string, vote: VoteChoice) => Promise<void>
  /** Update caption on an existing proof */
  updateCaption: (proofId: string, caption: string) => Promise<void>
  /** Derive vote counts from currently-loaded votes (no extra DB call) */
  getVoteCounts: (proofId: string) => VoteCounts
  clearError: () => void
}

export type ProofStore = ProofState & ProofActions

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

/**
 * Upload a single file to Supabase Storage and return its public URL.
 * Bucket must exist and have appropriate RLS policies.
 */
/** Get file extension from a File object */
function getExt(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName && fromName !== file.name) return `.${fromName}`
  const mimeMap: Record<string, string> = {
    'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp',
    'video/mp4': '.mp4', 'video/quicktime': '.mov', 'video/webm': '.webm',
    'application/pdf': '.pdf',
  }
  return mimeMap[file.type] ?? ''
}

async function uploadFile(
  bucket: string,
  path: string,
  file: File,
): Promise<string | null> {
  const fullPath = `${path}${getExt(file)}`
  const { error } = await supabase.storage.from(bucket).upload(fullPath, file, {
    upsert: true,
    contentType: file.type,
  })
  if (error) {
    console.warn(`[proofStore] Upload failed for ${file.name}:`, error.message)
    return null
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(fullPath)
  return publicUrl
}

/**
 * After a vote, check if a simple majority of bet participants has voted
 * the same way. If so, auto-resolve the outcome.
 * - confirm majority → claimant_succeeded
 * - dispute majority → claimant_failed
 */
async function autoResolveIfMajority(proofId: string): Promise<void> {
  // Get the proof to find the bet
  const { data: proof } = await supabase
    .from('proofs')
    .select('bet_id')
    .eq('id', proofId)
    .single()
  if (!proof) return

  // Check if outcome already exists
  const { data: existing } = await supabase
    .from('outcomes')
    .select('id')
    .eq('bet_id', proof.bet_id)
    .maybeSingle()
  if (existing) return

  // Count bet participants (riders + doubters)
  const { data: sides } = await supabase
    .from('bet_sides')
    .select('user_id')
    .eq('bet_id', proof.bet_id)
  const participantCount = sides?.length ?? 0
  if (participantCount < 2) return // Need at least 2 participants

  // Get all votes for this proof
  const { data: allVotes } = await supabase
    .from('proof_votes')
    .select('vote')
    .eq('proof_id', proofId)

  const confirms = (allVotes ?? []).filter((v) => v.vote === 'confirm').length
  const disputes = (allVotes ?? []).filter((v) => v.vote === 'dispute').length
  const majority = Math.floor(participantCount / 2) + 1

  let result: 'claimant_succeeded' | 'claimant_failed' | null = null
  if (confirms >= majority) result = 'claimant_succeeded'
  else if (disputes >= majority) result = 'claimant_failed'

  if (!result) return

  // Create outcome
  await supabase
    .from('outcomes')
    .insert({ bet_id: proof.bet_id, result } as never)

  // Update bet status
  await supabase
    .from('bets')
    .update({ status: 'completed' } as never)
    .eq('id', proof.bet_id)

  console.info(`[proofStore] Auto-resolved bet ${proof.bet_id} → ${result}`)
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const useProofStore = create<ProofStore>()((set, get) => ({
  // ---- state ----
  proofs: [],
  votes: [],
  isSubmitting: false,
  isLoading: false,
  error: null,

  // ---- actions ----

  submitProof: async (betId, files, proofType, caption) => {
    const userId = await getCurrentUserId()
    if (!userId) return null

    set({ isSubmitting: true, error: null })

    const timestamp = Date.now()
    const basePath = `proofs/${betId}/${userId}/${timestamp}`

    // Track which files were attempted vs succeeded
    const attempted: string[] = []
    const trackUpload = async (bucket: string, path: string, file: File): Promise<string | null> => {
      attempted.push(file.name)
      return uploadFile(bucket, path, file)
    }

    // Upload all provided files in parallel
    const [frontUrl, backUrl, videoUrl, documentUrl] = await Promise.all([
      files.frontCameraFile
        ? trackUpload('proofs', `${basePath}/front`, files.frontCameraFile)
        : null,
      files.backCameraFile
        ? trackUpload('proofs', `${basePath}/back`, files.backCameraFile)
        : null,
      files.videoFile
        ? trackUpload('proofs', `${basePath}/video`, files.videoFile)
        : null,
      files.documentFile
        ? trackUpload('proofs', `${basePath}/document`, files.documentFile)
        : null,
    ])

    // Screenshots are an array — upload each with an index suffix
    let screenshotUrls: string[] | null = null
    if (files.screenshotFiles?.length) {
      const results = await Promise.all(
        files.screenshotFiles.map((f, i) =>
          trackUpload('proofs', `${basePath}/screenshot_${i}`, f),
        ),
      )
      screenshotUrls = results.filter((u): u is string => u !== null)
    }

    // Check which uploads succeeded
    const succeeded = [frontUrl, backUrl, videoUrl, documentUrl, ...(screenshotUrls ?? [])].filter(Boolean)
    const hasAnyMedia = succeeded.length > 0
    const hasCaption = caption && caption.trim().length > 0

    // Abort if no media uploaded AND no text caption (text-only proof is OK)
    if (!hasAnyMedia && !hasCaption) {
      set({
        error: attempted.length > 0
          ? 'Upload failed. Please check your connection and try again.'
          : 'Please add proof media or a text description.',
        isSubmitting: false,
      })
      return null
    }

    const { data: proof, error } = await supabase
      .from('proofs')
      .insert({
        bet_id: betId,
        submitted_by: userId,
        proof_type: proofType,
        front_camera_url: frontUrl,
        back_camera_url: backUrl,
        video_url: videoUrl,
        document_url: documentUrl,
        screenshot_urls: screenshotUrls,
        caption: caption ?? null,
      })
      .select()
      .single()

    if (error || !proof) {
      set({ error: error?.message ?? 'Proof upload failed.', isSubmitting: false })
      return null
    }

    // Advance bet status to proof_submitted
    const { error: statusError } = await supabase
      .from('bets')
      .update({ status: 'proof_submitted' })
      .eq('id', betId)

    if (statusError) {
      console.warn('[proofStore] Proof saved but failed to update bet status:', statusError.message)
    }

    set((state) => ({
      proofs: [proof, ...state.proofs],
      isSubmitting: false,
    }))

    return proof
  },

  fetchProofs: async (betId) => {
    set({ isLoading: true, error: null })

    const { data, error } = await supabase
      .from('proofs')
      .select('*')
      .eq('bet_id', betId)
      .order('submitted_at', { ascending: false })

    if (error) {
      set({ error: error.message, isLoading: false })
      return
    }

    // Also fetch all votes for these proofs in one query
    const proofIds = (data ?? []).map((p) => p.id)
    const { data: votes } = proofIds.length
      ? await supabase.from('proof_votes').select('*').in('proof_id', proofIds)
      : { data: [] }

    set({
      proofs: data ?? [],
      votes: votes ?? [],
      isLoading: false,
    })
  },

  voteOnProof: async (proofId, vote) => {
    const userId = await getCurrentUserId()
    if (!userId) return

    set({ error: null })

    // Prevent double-voting (upsert on conflict)
    const { data: newVote, error } = await supabase
      .from('proof_votes')
      .upsert(
        { proof_id: proofId, user_id: userId, vote },
        { onConflict: 'proof_id,user_id' },
      )
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      return
    }

    if (newVote) {
      set((state) => {
        // Replace existing vote from this user on this proof, or append
        const others = state.votes.filter(
          (v) => !(v.proof_id === proofId && v.user_id === userId),
        )
        return { votes: [...others, newVote] }
      })

      // Auto-resolve: check if majority reached among bet participants
      await autoResolveIfMajority(proofId)
    }
  },

  getVoteCounts: (proofId) => {
    const { votes } = get()
    const forProof = votes.filter((v) => v.proof_id === proofId)
    const confirm = forProof.filter((v) => v.vote === 'confirm').length
    const dispute = forProof.filter((v) => v.vote === 'dispute').length
    const total = confirm + dispute
    return {
      confirm,
      dispute,
      total,
      confirmPct: total > 0 ? Math.round((confirm / total) * 100) : 0,
    }
  },

  updateCaption: async (proofId, caption) => {
    const { error } = await supabase
      .from('proofs')
      .update({ caption } as never)
      .eq('id', proofId)

    if (error) {
      set({ error: error.message })
      return
    }

    set((state) => ({
      proofs: state.proofs.map((p) =>
        p.id === proofId ? { ...p, caption } : p,
      ),
    }))
  },

  clearError: () => set({ error: null }),
}))

export default useProofStore
