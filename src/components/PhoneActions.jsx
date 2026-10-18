import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, buildCloudinaryUrl } from '../api/client.js';
import { sentence } from '../lib/story.js';
import { Icon, cx } from '../ui';

// Everything the family can do on the patient's phone from the Assistant (backend: services/commandTypes.js).
// Every card is a confirmation: nothing reaches the person until "Send" is pressed.

export const PHONE_ACTIONS = {
  speak: { icon: 'speaker', title: (n) => `Say on ${n}’s phone`, send: 'Send to her phone', note: (n) => `Read aloud and kept on ${n}’s home screen.`, steps: ['Sent', 'On her phone', 'Spoken aloud'] },
  ask: { icon: 'spark', title: (n) => `Ask ${n}`, send: 'Ask her', note: (n) => `Spoken aloud; ${n} answers with a tap or her voice. Her answer appears here.`, steps: ['Sent', 'On her phone', 'Answered'] },
  voice: { icon: 'mic', title: (n) => `Voice note for ${n}`, send: 'Send voice note', note: (n) => `Plays in your own voice on ${n}’s phone.`, steps: ['Sent', 'On her phone', 'Played'] },
  reminder: { icon: 'clock', title: (n) => `Reminder for ${n}`, send: 'Set reminder', note: (n) => `${n}’s phone will say it at that time.`, steps: ['Sent', 'On her phone', 'Set'] },
  ring: { icon: 'bell', title: (n) => `Ring ${n}’s phone`, send: 'Ring now', note: () => 'Rings loudly for 20 seconds, even on silent.', steps: ['Sent', 'Ringing', 'Done'] },
  capture: { icon: 'camera', title: () => 'Take a photo now', send: 'Take photo', note: () => 'The home camera takes a fresh photo and describes it.', steps: ['Sent', 'Photo taken', 'Described'] },
  guide_home: { icon: 'pin', title: (n) => `Guide ${n} home`, send: 'Start guiding', note: (n) => `Tells ${n} gently to head home, opens the arrow on her phone, and sends her location every 15 seconds for 15 minutes.`, steps: ['Sent', 'On her phone', 'Guiding'] },
  quiz: { icon: 'brain', title: (n) => `Send ${n} today’s questions`, send: 'Send quiz', note: (n) => `A few easy questions about ${n}’s own day.`, steps: ['Sent', 'On her phone', 'Waiting for her'] },
  calm: { icon: 'heart', title: (n) => `Calm ${n} down`, send: 'Start calm-down', note: (n) => `A slow breathing moment on ${n}’s phone, then your latest voice note.`, steps: ['Sent', 'On her phone', 'Playing'] },
};

const STEP_OF = (type, c) => {
  if (!c) return 0;
  if (type === 'capture') return c.status === 'done' ? 3 : c.uploaded ? 2 : 1;
  if (c.status === 'done') return 3;
  if (c.status === 'delivered') return 2;
  return 1;
};

const SURFACE = {
  ask: 'bg-[linear-gradient(135deg,#E9F3FF_0%,#F1ECFB_100%)]',
  guide_home: 'bg-[linear-gradient(135deg,#FFE9DD_0%,#F6F0FF_100%)]',
  calm: 'bg-[linear-gradient(135deg,#E6F2FF_0%,#EBDCF6_100%)]',
};

/** Browser voice recorder for the voice-note card. */
function Recorder({ onReady, onTranscript }) {
  const [state, setState] = useState('idle'); // idle | recording | done | error
  const [secs, setSecs] = useState(0);
  const [url, setUrl] = useState(null);
  const rec = useRef(null);
  const timer = useRef(null);
  const stt = useRef(null);

  // Live speech-to-text alongside the recording (Chrome/Edge), so the words can be shown on her
  // screen under the play button and the journal knows what was said. Optional: no STT, no text.
  function startTranscript() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || !onTranscript) return;
    const r = new SR();
    r.lang = navigator.language || 'en-IN';
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => onTranscript(Array.from(e.results).map((x) => x[0].transcript).join(' ').replace(/\s+/g, ' ').trim());
    r.onerror = () => {};
    stt.current = r;
    try { r.start(); } catch { /* already running */ }
  }

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = [];
      const r = new MediaRecorder(stream);
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: r.mimeType || 'audio/webm' });
        setUrl(URL.createObjectURL(blob));
        const b64 = await new Promise((res) => {
          const fr = new FileReader();
          fr.onload = () => res(String(fr.result).split(',')[1]);
          fr.readAsDataURL(blob);
        });
        onReady({ audio: b64, mime: blob.type });
        setState('done');
      };
      rec.current = r;
      r.start();
      startTranscript();
      setSecs(0);
      timer.current = setInterval(() => setSecs((s) => (s >= 89 ? (stop(), s) : s + 1)), 1000);
      setState('recording');
    } catch {
      setState('error');
    }
  }
  function stop() {
    clearInterval(timer.current);
    try { stt.current?.stop(); } catch { /* not running */ }
    if (rec.current?.state === 'recording') rec.current.stop();
  }
  useEffect(() => () => clearInterval(timer.current), []);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      {state !== 'recording' ? (
        <button type="button" onClick={start} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] font-semibold ring-1 ring-black/10 hover:bg-white/80">
          <span className="h-2.5 w-2.5 rounded-full bg-[#E5533D]" /> {state === 'done' ? 'Record again' : 'Record'}
        </button>
      ) : (
        <button type="button" onClick={stop} className="ai-listen inline-flex items-center gap-2 rounded-full bg-[#F19A82] px-4 py-2 text-[13px] font-semibold">
          <span className="h-2.5 w-2.5 rounded-[2px] bg-ink" /> Stop · 0:{String(secs).padStart(2, '0')}
        </button>
      )}
      {url && state === 'done' && <audio src={url} controls className="h-9 max-w-full" />}
      {state === 'error' && <span className="text-[12px] text-act">Allow the microphone in your browser to record.</span>}
    </div>
  );
}

export function PhoneActionCard({ type, patientId, firstName, initial = {}, onSent }) {
  const meta = PHONE_ACTIONS[type];
  const [fields, setFields] = useState({ text: initial.text || '', question: initial.question || initial.text || '', at: initial.at || '', quick: initial.quick || ['Yes', 'No', 'Not yet'] });
  const [audio, setAudio] = useState(null);
  // "speak" can be sent as a recording of the family member's own voice instead of the phone's voice.
  const [inMyVoice, setInMyVoice] = useState(type === 'voice');
  const [transcript, setTranscript] = useState('');
  const sendType = type === 'speak' && inMyVoice ? 'voice' : type;
  const [editing, setEditing] = useState(!(initial.text || initial.question));
  const [state, setState] = useState({ phase: 'draft' }); // draft | sending | sent | dismissed | error
  const qc = useQueryClient();

  const live = useQuery({
    queryKey: ['command', state.id],
    queryFn: async () => (await apiClient.get(`/api/patients/${patientId}/commands`)).data.find((c) => c.id === state.id),
    enabled: state.phase === 'sent' && Boolean(state.id),
    refetchInterval: (q) => (['done', 'failed', 'expired'].includes(q.state.data?.status) && !(type === 'capture' && !q.state.data?.image_public_id && q.state.data?.status !== 'failed') ? false : 2000),
  });

  const ready =
    sendType === 'voice' ? audio : type === 'speak' ? fields.text.trim() : type === 'ask' ? fields.question.trim() : type === 'reminder' ? fields.text.trim() && /^\d{1,2}:\d{2}$/.test(fields.at) : true;

  async function send() {
    setState({ phase: 'sending' });
    try {
      let body = { type: sendType };
      if (sendType === 'speak') body.text = fields.text;
      if (type === 'ask') Object.assign(body, { question: fields.question, quick: fields.quick });
      if (type === 'reminder') Object.assign(body, { text: fields.text, at: fields.at });
      if (sendType === 'voice') {
        const up = await apiClient.post(`/api/patients/${patientId}/voice-notes`, audio, { timeout: 60000 });
        Object.assign(body, { url: up.data.url, seconds: up.data.seconds, text: (transcript || fields.text || '').slice(0, 140) });
      }
      const { data } = await apiClient.post(`/api/patients/${patientId}/commands`, body);
      setState({ phase: 'sent', id: data.id });
      qc.invalidateQueries({ queryKey: ['commands'] });
      onSent?.(data);
    } catch (e) {
      setState({ phase: 'error', error: e?.response?.data?.error || 'Could not send.' });
    }
  }

  if (state.phase === 'dismissed') return <p className="text-[12px] text-ink-3">Not sent.</p>;
  const c = live.data;
  const step = STEP_OF(sendType, c);
  const failed = c && ['failed', 'expired'].includes(c.status);

  return (
    <div className={cx('overflow-hidden rounded-[18px] p-4 ring-1 ring-black/[0.04]', SURFACE[type] || 'bg-[linear-gradient(135deg,#F3FBDF_0%,#EAF4FF_100%)]')}>
      <div className="flex items-center gap-2 text-[12px] font-semibold text-ink-2">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white"><Icon name={meta.icon} size={15} /></span>
        {meta.title(firstName)}
      </div>

      {/* what will be sent */}
      {type === 'speak' && !inMyVoice && (editing && state.phase === 'draft'
        ? <textarea value={fields.text} onChange={(e) => setFields({ ...fields, text: e.target.value.slice(0, 280) })} rows={3} autoFocus className="mt-3 w-full resize-none rounded-[14px] border border-black/10 bg-white p-3 text-[15px] outline-none focus:border-ink" />
        : <p className="mt-3 font-serif text-[20px] leading-snug">“{fields.text}”</p>)}
      {type === 'ask' && (
        <>
          {editing && state.phase === 'draft'
            ? <input value={fields.question} onChange={(e) => setFields({ ...fields, question: e.target.value.slice(0, 200) })} autoFocus className="mt-3 w-full rounded-[14px] border border-black/10 bg-white p-3 text-[15px] outline-none focus:border-ink" />
            : <p className="mt-3 font-serif text-[22px] leading-snug">{fields.question}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {fields.quick.map((q) => <span key={q} className="rounded-full bg-white/80 px-3 py-1 text-[12px] font-semibold">{q}</span>)}
            <span className="rounded-full bg-white/50 px-3 py-1 text-[12px] text-ink-3">or her own words</span>
          </div>
        </>
      )}
      {type === 'reminder' && (
        <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px]">
          <input value={fields.text} disabled={state.phase !== 'draft' && state.phase !== 'error'} onChange={(e) => setFields({ ...fields, text: e.target.value.slice(0, 140) })} placeholder="e.g. Drink a glass of water" className="rounded-[14px] border border-black/10 bg-white p-3 text-[15px] outline-none focus:border-ink" />
          <input type="time" value={fields.at} disabled={state.phase !== 'draft' && state.phase !== 'error'} onChange={(e) => setFields({ ...fields, at: e.target.value })} className="rounded-[14px] border border-black/10 bg-white p-3 text-[15px] outline-none focus:border-ink" />
        </div>
      )}
      {sendType === 'voice' && type === 'speak' && fields.text && state.phase === 'draft' && (
        <p className="mt-3 text-[13px] text-ink-2">Say something like: <span className="font-serif text-[16px] text-ink">“{fields.text}”</span></p>
      )}
      {sendType === 'voice' && (state.phase === 'draft' || state.phase === 'error') && <Recorder onReady={setAudio} onTranscript={setTranscript} />}
      {sendType === 'voice' && transcript && (
        <div className="mt-3 rounded-[14px] bg-white/80 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">Words shown on her screen</p>
          {state.phase === 'draft'
            ? <textarea value={transcript} onChange={(e) => setTranscript(e.target.value.slice(0, 140))} rows={2} className="mt-1 w-full resize-none bg-transparent text-[15px] outline-none" />
            : <p className="mt-1 text-[15px]">{transcript}</p>}
        </div>
      )}

      {state.phase !== 'sent' ? (
        <>
          <p className="mt-2 text-[12px] text-ink-3">{PHONE_ACTIONS[sendType].note(firstName)} Nothing is sent until you press the button.</p>
          {state.error && <p className="mt-2 text-[12px] text-act">{state.error}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={send} disabled={!ready || state.phase === 'sending'} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-black disabled:opacity-40">
              <Icon name={PHONE_ACTIONS[sendType].icon} size={14} /> {state.phase === 'sending' ? 'Sending…' : PHONE_ACTIONS[sendType].send}
            </button>
            {type === 'speak' && (
              <button type="button" onClick={() => { setInMyVoice((v) => !v); setAudio(null); setTranscript(''); }} className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-4 py-2 text-[13px] font-semibold hover:bg-white">
                <Icon name={inMyVoice ? 'speaker' : 'mic'} size={14} /> {inMyVoice ? 'Use the phone’s voice' : 'Record it in my voice'}
              </button>
            )}
            {((type === 'speak' && !inMyVoice) || type === 'ask') && (
              <button type="button" onClick={() => setEditing((x) => !x)} className="rounded-full bg-white/80 px-4 py-2 text-[13px] font-semibold hover:bg-white">{editing ? 'Done editing' : 'Edit'}</button>
            )}
            <button type="button" onClick={() => setState({ phase: 'dismissed' })} className="rounded-full px-3 py-2 text-[13px] text-ink-3 hover:text-ink">Not now</button>
          </div>
        </>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {failed ? (
              <span className="rounded-full bg-[#F8D9CF] px-3 py-1 text-[12px] font-semibold text-[#9A3B24]">
                {c.status === 'expired' ? 'Her phone didn’t pick it up in 10 minutes' : `Didn’t work${c.error ? `: ${c.error}` : ''}`}
              </span>
            ) : (
              PHONE_ACTIONS[sendType].steps.map((label, i) => (
                <span key={label} className="flex items-center gap-2">
                  <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold', i < step ? 'bg-[#D9F26B] text-ink' : 'bg-white/70 text-ink-3')}>
                    {i < step && <Icon name="check" size={12} />} {label}
                  </span>
                  {i < PHONE_ACTIONS[sendType].steps.length - 1 && <span className="h-px w-3 bg-black/15" />}
                </span>
              ))
            )}
          </div>
          {/* results */}
          {type === 'ask' && c?.reply && (
            <div className="mt-3 rounded-[14px] bg-white p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{firstName} answered</p>
              <p className="mt-1 font-serif text-[22px]">“{c.reply}”</p>
            </div>
          )}
          {type === 'capture' && c?.image_public_id && (
            <figure className="mt-3 overflow-hidden rounded-[14px] bg-white">
              <img src={buildCloudinaryUrl(c.image_public_id)} alt={c.activity || 'Photo'} className="h-auto max-w-full" />
              <figcaption className="px-3 py-2 text-[13px]"><b>{sentence(c.activity)}</b>{c.person_state && c.person_state !== 'not visible' ? ` · ${c.person_state}` : ''}</figcaption>
            </figure>
          )}
          {type === 'capture' && c && !c.image_public_id && !failed && <p className="ai-shimmer mt-2 text-[13px]">{c.uploaded ? 'Describing the photo…' : 'Asking the camera…'}</p>}
          {type === 'reminder' && c?.at && <p className="mt-2 text-[12px] text-ink-3">At {new Date(c.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}{new Date(c.at).getDate() !== new Date().getDate() ? ' tomorrow' : ''}.</p>}
        </>
      )}
    </div>
  );
}

/** "Tell the family": a note to everyone in the family circle (shows in their notifications). */
export function BroadcastCard({ patientId, initialText = '' }) {
  const [text, setText] = useState(initialText);
  const [state, setState] = useState({ phase: 'draft' });
  async function send() {
    setState({ phase: 'sending' });
    try {
      const { data } = await apiClient.post(`/api/patients/${patientId}/broadcasts`, { text });
      setState({ phase: 'sent', members: data.family_members });
    } catch (e) {
      setState({ phase: 'error', error: e?.response?.data?.error || 'Could not send.' });
    }
  }
  if (state.phase === 'dismissed') return <p className="text-[12px] text-ink-3">Not sent.</p>;
  return (
    <div className="overflow-hidden rounded-[18px] bg-[linear-gradient(135deg,#EEF8C4_0%,#EAF4FF_100%)] p-4 ring-1 ring-black/[0.04]">
      <div className="flex items-center gap-2 text-[12px] font-semibold text-ink-2">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white"><Icon name="people" size={15} /></span>
        Tell the family
      </div>
      {state.phase === 'sent' ? (
        <>
          <p className="mt-3 font-serif text-[20px] leading-snug">“{text}”</p>
          <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#D9F26B] px-2.5 py-1 text-[12px] font-semibold"><Icon name="check" size={12} /> Sent to the family circle{state.members > 1 ? ` (${state.members} people)` : ''}</span>
        </>
      ) : (
        <>
          <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 500))} rows={2} autoFocus={!initialText} placeholder="e.g. Just spoke to Ma — she's fine, had her dinner." className="mt-3 w-full resize-none rounded-[14px] border border-black/10 bg-white p-3 text-[15px] outline-none focus:border-ink" />
          <p className="mt-2 text-[12px] text-ink-3">Everyone in the family circle gets it as a notification on the website and in the app.</p>
          {state.error && <p className="mt-2 text-[12px] text-act">{state.error}</p>}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={send} disabled={!text.trim() || state.phase === 'sending'} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-white hover:bg-black disabled:opacity-40">
              <Icon name="people" size={14} /> {state.phase === 'sending' ? 'Sending…' : 'Send to everyone'}
            </button>
            <button type="button" onClick={() => setState({ phase: 'dismissed' })} className="rounded-full px-3 py-2 text-[13px] text-ink-3 hover:text-ink">Not now</button>
          </div>
        </>
      )}
    </div>
  );
}

/** One-tap shortcuts above the composer: each drops a confirm card into the chat, no AI involved. */
export const QUICK = [
  ['ask', 'Ask her', 'spark'],
  ['voice', 'Voice note', 'mic'],
  ['capture', 'Take photo', 'camera'],
  ['guide_home', 'Guide home', 'pin'],
  ['calm', 'Calm down', 'heart'],
  ['ring', 'Ring phone', 'bell'],
  ['reminder', 'Reminder', 'clock'],
  ['quiz', 'Send quiz', 'brain'],
  ['broadcast', 'Tell family', 'people'],
];
