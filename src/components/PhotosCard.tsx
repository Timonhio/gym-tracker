import { useEffect, useMemo, useRef, useState } from 'react'
import { deletePhoto, savePhoto } from '../db/actions'
import { useData } from '../db/DataProvider'
import { formatDate, todayISO } from '../lib/dates'
import { plural, uid } from '../lib/format'
import { useObjectUrl } from '../lib/hooks'
import { resizeToJpeg } from '../lib/image'
import { groupPhotosByDay } from '../lib/photos'
import type { ProgressPhoto } from '../lib/types'
import { CameraIcon, ChevronRightIcon, TrashIcon } from './icons'
import { Modal } from './Modal'
import { useToast } from './Toast'

interface Processed {
  full: Blob
  thumb: Blob
}

function PhotoImg({ blob, alt, className = '' }: { blob: Blob; alt: string; className?: string }) {
  const url = useObjectUrl(blob)
  return url ? <img src={url} alt={alt} className={className} draggable={false} /> : <div className={`${className} bg-slate-200 dark:bg-slate-800`} />
}

/** Choose the day, then save one or more freshly processed photos to it. */
function AddPhotosModal({ items, onClose }: { items: Processed[]; onClose: () => void }) {
  const toast = useToast()
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const base = Date.now()
      for (const [i, it] of items.entries()) {
        await savePhoto({
          id: uid(),
          date,
          createdAt: base + i,
          ...(note.trim() ? { note: note.trim() } : {}),
          full: it.full,
          thumb: it.thumb,
        })
      }
      toast(`${plural(items.length, 'photo', 'photos')} saved.`)
      onClose()
    } catch {
      toast('Could not save the photos (storage full?).', 'error')
      setSaving(false)
    }
  }

  return (
    <Modal
      title={items.length === 1 ? 'Add photo' : `Add ${items.length} photos`}
      onClose={onClose}
      footer={
        <button className="btn-primary w-full" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : items.length === 1 ? 'Save photo' : 'Save photos'}
        </button>
      }
    >
      <div className="space-y-5">
        <ul className={`grid gap-2 ${items.length === 1 ? 'grid-cols-1' : 'grid-cols-3'}`}>
          {items.map((it, i) => (
            <li key={i}>
              <PhotoImg
                blob={items.length === 1 ? it.full : it.thumb}
                alt={`Preview ${i + 1}`}
                className={items.length === 1 ? 'mx-auto max-h-[42dvh] rounded-2xl object-contain' : 'aspect-[3/4] w-full rounded-2xl object-cover'}
              />
            </li>
          ))}
        </ul>
        <div>
          <label className="label" htmlFor="photo-date">Day</label>
          <input id="photo-date" type="date" className="field" value={date} max={todayISO()} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="photo-note">Note (optional)</label>
          <input id="photo-note" className="field" value={note} maxLength={200} placeholder="e.g. front, relaxed" onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}

/**
 * One gallery for all photos: swipe sideways (scroll-snap), newest first.
 * A thumbnail strip underneath jumps to any photo.
 */
function Gallery({ photos }: { photos: ProgressPhoto[] }) {
  const toast = useToast()
  const scroller = useRef<HTMLUListElement>(null)
  const thumbs = useRef<(HTMLButtonElement | null)[]>([])
  const [index, setIndex] = useState(0)
  const current = photos[Math.min(index, photos.length - 1)]

  const goTo = (i: number, smooth = true) => {
    const el = scroller.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: smooth ? 'smooth' : 'auto' })
  }

  // After adding / deleting photos keep the index inside the list.
  useEffect(() => {
    if (index > photos.length - 1) {
      setIndex(photos.length - 1)
      goTo(photos.length - 1, false)
    }
  }, [photos.length, index])

  // Keep the active thumbnail visible in its own strip (without moving the page).
  useEffect(() => {
    thumbs.current[index]?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [index])

  return (
    <div className="space-y-3" role="region" aria-label="Photo gallery">
      <div className="relative">
        <ul
          ref={scroller}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-2xl"
          onScroll={(e) => {
            const el = e.currentTarget
            setIndex(Math.max(0, Math.min(photos.length - 1, Math.round(el.scrollLeft / el.clientWidth))))
          }}
        >
          {photos.map((p, i) => (
            <li key={p.id} className="relative aspect-[3/4] w-full shrink-0 snap-center snap-always bg-slate-200 dark:bg-slate-950" aria-label={`Photo ${i + 1} of ${photos.length}`}>
              <PhotoImg blob={p.full} alt={`Progress photo from ${formatDate(p.date)}`} className="h-full w-full object-contain" />
            </li>
          ))}
        </ul>

        {/* caption over the photo */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-2xl bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12 text-white">
          <p className="font-semibold">{formatDate(current.date)}</p>
          {current.note && <p className="text-sm text-white/80">{current.note}</p>}
        </div>
        <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white tabular-nums">
          {index + 1} / {photos.length}
        </span>

        {/* arrows (mostly useful with a mouse; on a phone you just swipe) */}
        {index > 0 && (
          <button className="btn-icon absolute top-1/2 left-2 -translate-y-1/2 !bg-black/50 !text-white backdrop-blur" aria-label="Newer photo" onClick={() => goTo(index - 1)}>
            <ChevronRightIcon className="h-5 w-5 rotate-180" />
          </button>
        )}
        {index < photos.length - 1 && (
          <button className="btn-icon absolute top-1/2 right-2 -translate-y-1/2 !bg-black/50 !text-white backdrop-blur" aria-label="Older photo" onClick={() => goTo(index + 1)}>
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {photos.length > 1 && (
        <ul className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1" aria-label="Thumbnails">
          {photos.map((p, i) => (
            <li key={p.id} className="shrink-0">
              <button
                ref={(el) => {
                  thumbs.current[i] = el
                }}
                onClick={() => goTo(i)}
                aria-label={`Show photo from ${formatDate(p.date)}`}
                aria-current={i === index}
                className={`block overflow-hidden rounded-xl ring-2 transition ${i === index ? 'ring-[var(--accent-solid)]' : 'opacity-60 ring-transparent'}`}
              >
                <PhotoImg blob={p.thumb} alt="" className="h-16 w-12 object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        className="btn-ghost w-full !text-red-500"
        onClick={async () => {
          if (!confirm('Delete this photo?')) return
          await deletePhoto(current.id)
          toast('Photo deleted.')
        }}
      >
        <TrashIcon className="h-5 w-5" /> Delete this photo
      </button>
    </div>
  )
}

/** Progress photos: add photos to a day, then swipe through all of them in one gallery. Images stay on the device. */
export function PhotosCard() {
  const { photos } = useData()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<Processed[] | null>(null)

  const days = useMemo(() => groupPhotosByDay(photos), [photos])
  const flat = useMemo(() => days.flatMap((d) => d.photos), [days])

  async function onFiles(files: File[]) {
    setBusy(true)
    try {
      const items: Processed[] = []
      for (const f of files) {
        items.push({ full: await resizeToJpeg(f, 1280, 0.82), thumb: await resizeToJpeg(f, 360, 0.78) })
      }
      setPending(items)
    } catch {
      toast('That image could not be read.', 'error')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <section className="card space-y-4" aria-label="Progress photos">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">Progress photos</p>
          <p className="text-slate-500">
            {photos.length === 0 ? 'Nothing here yet.' : `${plural(photos.length, 'photo', 'photos')} on ${plural(days.length, 'day', 'days')}`}
          </p>
        </div>
        <button className="btn-secondary shrink-0" onClick={() => fileRef.current?.click()} disabled={busy}>
          <CameraIcon className="h-5 w-5" /> {busy ? 'Processing…' : 'Add photos'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files?.length && void onFiles([...e.target.files])}
        />
      </div>

      {flat.length === 0 ? (
        <p className="text-sm text-slate-500">Take or choose photos and pick the day they belong to. They all end up in one gallery you can swipe through.</p>
      ) : (
        <Gallery photos={flat} />
      )}

      {pending && <AddPhotosModal items={pending} onClose={() => setPending(null)} />}
    </section>
  )
}
