import React, { useState } from 'react';
import { buildCloudinaryUrl } from '../api/client.js';
import { sentence } from '../lib/story.js';
import { timeAgo } from '../utils/datetime.js';
import { Icon, cx } from '../ui';

/**
 * The most recent camera photo, as a window into the room, with the AI's one-line reading of
 * it laid over the bottom. Photos are only there if the camera actually sent one.
 */
export default function CameraWindow({ entries, now }) {
  const [broken, setBroken] = useState(false);
  const latest = [...(entries || [])]
    .filter((e) => e.entryType === 'frame' && e.imagePublicId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
  const url = latest && buildCloudinaryUrl(latest.imagePublicId);

  if (!latest || !url || broken) {
    return (
      <div className="panel flex aspect-[16/10] flex-col items-center justify-center gap-2 bg-[repeating-linear-gradient(135deg,#F6F2EC_0_10px,#F0EBE3_10px_20px)] text-center">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-surface text-ink-3 shadow-sm">
          <Icon name="camera" size={19} />
        </span>
        <p className="text-sm font-semibold text-ink-2">No camera photo yet</p>
        <p className="max-w-[240px] text-xs text-ink-3">Photos appear here as soon as the home camera is connected.</p>
      </div>
    );
  }

  const mins = (now - new Date(latest.timestamp).getTime()) / 60000;
  const live = mins < 10;
  const sized = url.replace('/upload/', '/upload/c_fill,w_800,h_500,q_auto/');

  return (
    <figure className="group relative aspect-[16/10] overflow-hidden rounded-md border border-line bg-ink">
      <img
        src={sized}
        alt={latest.payload?.activity || 'Latest camera photo'}
        onError={() => setBroken(true)}
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
      />
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
        <span className="flex items-center gap-1.5 rounded bg-black/55 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur">
          <span className={cx('h-1.5 w-1.5 rounded-full', live ? 'animate-pulse bg-act' : 'bg-white/60')} />
          {live ? 'Live' : 'Last photo'} · Living room
        </span>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="rounded bg-black/55 p-1.5 text-white opacity-0 backdrop-blur transition group-hover:opacity-100"
          aria-label="Open full photo"
        >
          <Icon name="image" size={14} />
        </a>
      </div>
      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent px-4 pb-3 pt-10 text-white">
        <p className="font-semibold">{sentence(latest.payload?.activity)}</p>
        <p className="text-xs text-white/70">
          {timeAgo(latest.timestamp, now)}
          {latest.payload?.objects_of_note?.length > 0 && ` · ${latest.payload.objects_of_note.slice(0, 3).join(', ')}`}
        </p>
      </figcaption>
    </figure>
  );
}
