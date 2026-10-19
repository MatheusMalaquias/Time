/** Regras puras da conta (sem React), para poderem ser testadas. */

/** O que fazer com os dados locais quando alguém entra neste aparelho. */
export type OwnerAction = 'keep' | 'claim' | 'reset'

/**
 * `storedOwner` é quem usou este aparelho por último (vazio em aparelhos anteriores a esta regra).
 * Outra pessoa entrando => os dados locais são descartados, para nunca irem parar na conta dela.
 */
export function ownerAction(storedOwner: string | null, userId: string): OwnerAction {
  if (!storedOwner) return 'claim'
  return storedOwner === userId ? 'keep' : 'reset'
}

/** O endereço veio de um link de "esqueci a senha" do Supabase? */
export function isRecoveryUrl(hash: string, search: string): boolean {
  return /(^|[#&])type=recovery(&|$)/.test(hash) || /[?&]type=recovery(&|$)/.test(search)
}

export const DELETE_CONFIRM_WORD = 'EXCLUIR'

/** A exclusão só é liberada quando a pessoa digita a palavra de confirmação. */
export const canDelete = (typed: string) => typed.trim().toUpperCase() === DELETE_CONFIRM_WORD
