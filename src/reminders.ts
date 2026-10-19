import { useEffect } from 'react'
import { fmt, isoDate, itemsOn, type Item } from './calendar'

export interface RemindCfg {
  enabled: boolean
  lead: number // minutos de antecedência
}

export const defaultRemind: RemindCfg = { enabled: false, lead: 10 }

const WINDOW = 5 // minutos de tolerância depois da hora do aviso
const KEY = 'tm.notified'

export const notificationsSupported = () => typeof Notification !== 'undefined'

export async function notify(title: string, body: string, tag?: string) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) {
      await reg.showNotification(title, { body, tag, icon: 'icon.svg' })
      return true
    }
  } catch {
    /* cai para a Notification comum */
  }
  try {
    new Notification(title, { body, tag })
    return true
  } catch {
    return false
  }
}

/** Itens com horário cujo aviso está na janela [início - antecedência, + tolerância]. */
export function dueItems(items: Item[], now: Date, lead: number): Item[] {
  const nowMin = now.getHours() * 60 + now.getMinutes()
  return itemsOn(items, isoDate(now)).filter((i) => {
    if (i.start === undefined || i.doneOn.includes(isoDate(now))) return false
    const fireAt = i.start - lead
    return nowMin >= fireAt && nowMin < fireAt + WINDOW
  })
}

const readSent = (): Record<string, true> => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

/** Confere a cada 20 s e avisa uma vez por item/horário/dia. Só roda com o app aberto. */
export function useReminders(items: Item[], cfg: RemindCfg) {
  useEffect(() => {
    if (!cfg.enabled || !notificationsSupported()) return
    const tick = () => {
      const now = new Date()
      const today = isoDate(now)
      const sent = readSent()
      const fresh: Record<string, true> = {}
      for (const k of Object.keys(sent)) if (k.startsWith(today)) fresh[k] = true // descarta dias antigos
      for (const i of dueItems(items, now, cfg.lead)) {
        const key = `${today}|${i.id}|${i.start}`
        if (fresh[key]) continue
        fresh[key] = true
        notify(
          i.title,
          cfg.lead > 0 ? `Começa em ${cfg.lead} min, às ${fmt(i.start as number)}` : `Começa agora, às ${fmt(i.start as number)}`,
          key
        )
      }
      try {
        localStorage.setItem(KEY, JSON.stringify(fresh))
      } catch {
        /* sem armazenamento */
      }
    }
    tick()
    const t = setInterval(tick, 20_000)
    return () => clearInterval(t)
  }, [items, cfg.enabled, cfg.lead])
}
