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
async function uploadFile(
  bucket: string,
  path: string,
  file: File,
): Promise<string | null> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
    contentType: file.type,
  })
  if (error) return null

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path)
  return publicUrl
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

    // Upload all provided files in parallel
    const [frontUrl, backUrl, videoUrl, documentUrl] = await Promise.all([
      files.frontCameraFile
        ? uploadFile('proofs', `${basePath}/front`, files.frontCameraFile)
        : null,
      files.backCameraFile
        ? uploadFile('proofs', `${basePath}/back`, files.backCameraFile)
        : null,
      files.videoFile
        ? uploadFile('proofs', `${basePath}/video`, files.videoFile)
        : null,
      files.documentFile
        ? uploadFile('proofs', `${basePath}/document`, files.documentFile)
        : null,
    ])

    // Screenshots are an array — upload each with an index suffix
    let screenshotUrls: string[] | null = null
    if (files.screenshotFiles?.length) {
      const results = await Promise.all(
        files.screenshotFiles.map((f, i) =>
          uploadFile('proofs', `${basePath}/screenshot_${i}`, f),
        ),
      )
      screenshotUrls = results.filter((u): u is string => u !== null)
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
    await supabase
      .from('bets')
      .update({ status: 'proof_submitted' })
      .eq('id', betId)

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

  clearError: () => set({ error: null }),
}))

export default useProofStore
