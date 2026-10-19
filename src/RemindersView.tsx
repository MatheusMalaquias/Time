import { useState } from 'react'
import { downloadIcs, buildIcs } from './ics'
import { notificationsSupported, notify, type RemindCfg } from './reminders'
import type { Item } from './calendar'

interface Props {
  items: Item[]
  today: string
  cfg: RemindCfg
  setCfg: (c: RemindCfg) => void
}

const LEADS = [0, 5, 10, 15, 30, 60]

export default function RemindersView({ items, today, cfg, setCfg }: Props) {
  const supported = notificationsSupported()
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>(supported ? Notification.permission : 'unsupported')
  const [msg, setMsg] = useState('')

  const enable = async () => {
    if (!supported) return
    const p = await Notification.requestPermission()
    setPerm(p)
    setCfg({ ...cfg, enabled: p === 'granted' })
  }

  const test = async () => {
    const ok = await notify('Time', 'Se você viu isto, os lembretes funcionam neste aparelho.', 'teste')
    setMsg(ok ? 'Teste enviado.' : 'Não foi possível enviar. Verifique a permissão do navegador.')
  }

  const timed = items.filter((i) => i.start !== undefined).length
  const card = 'space-y-3 rounded-xl bg-slate-800 p-4'

  return (
    <div className="space-y-5">
      <section className={card}>
        <h2 className="font-semibold">Avisos neste aparelho</h2>
        <p className="text-sm text-slate-400">
          O app avisa quando está aberto (no computador, com a aba aberta; no celular, com o app aberto ou recém-usado). Com o celular bloqueado e o app fechado, o navegador não deixa um site avisar sozinho; para isso use o calendário abaixo.
        </p>

        {perm === 'unsupported' && (
          <p className="rounded bg-amber-950/40 p-3 text-sm text-amber-200">
            Este navegador não oferece notificações. No iPhone, instale o app na Tela de Início (iOS 16.4 ou mais novo) e abra por lá.
          </p>
        )}
        {perm === 'denied' && (
          <p className="rounded bg-amber-950/40 p-3 text-sm text-amber-200">
            As notificações estão bloqueadas. Libere nas configurações do navegador para este site e volte aqui.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {cfg.enabled && perm === 'granted' ? (
            <button onClick={() => setCfg({ ...cfg, enabled: false })} className="rounded-lg bg-slate-700 px-4 py-3 text-sm">
              ✓ Ativados · desligar
            </button>
          ) : (
            <button
              onClick={enable}
              disabled={perm === 'unsupported' || perm === 'denied'}
              className="rounded-lg bg-sky-500 px-4 py-3 text-sm font-medium text-slate-900 disabled:opacity-40"
            >
              Ativar avisos
            </button>
          )}
          <label className="flex items-center gap-2 text-sm text-slate-300">
            Avisar
            <select
              value={cfg.lead}
              onChange={(e) => setCfg({ ...cfg, lead: Number(e.target.value) })}
              className="rounded-lg bg-slate-700 px-3 py-2.5 text-sm"
            >
              {LEADS.map((m) => (
                <option key={m} value={m}>
                  {m === 0 ? 'na hora' : `${m} min antes`}
                </option>
              ))}
            </select>
          </label>
          <button onClick={test} disabled={perm !== 'granted'} className="py-2 text-sm text-sky-400 underline disabled:opacity-40">
            Enviar teste
          </button>
        </div>
        {msg && <p className="text-sm text-slate-300">{msg}</p>}
      </section>

      <section className={card}>
        <h2 className="font-semibold">Avisos garantidos: calendário do celular</h2>
        <p className="text-sm text-slate-400">
          Gera um arquivo com as suas {timed} atividades com horário, já com repetição semanal e alarme {cfg.lead === 0 ? 'na hora' : `${cfg.lead} min antes`}. O Calendário do celular avisa mesmo com tudo fechado.
        </p>
        <button
          onClick={() => downloadIcs(buildIcs(items, { lead: cfg.lead, today }))}
          disabled={timed === 0}
          className="rounded-lg bg-sky-500 px-4 py-3 text-sm font-medium text-slate-900 disabled:opacity-40"
        >
          Baixar calendário (.ics)
        </button>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-400">
          <li>
            <b className="text-slate-300">iPhone:</b> abra o arquivo baixado e toque em "Adicionar Todos". Ele cria os eventos no app Calendário.
          </li>
          <li>
            <b className="text-slate-300">Android / Google Agenda:</b> em calendar.google.com, Configurações, Importar e exportar, escolha o arquivo e um calendário só para isso.
          </li>
          <li>Se mudar a rotina, apague o calendário importado e importe de novo, para não duplicar.</li>
          <li>Atividades sem horário entram como evento de dia inteiro, sem alarme.</li>
        </ul>
      </section>
    </div>
  )
}
