import React, { useState } from 'react';
import { buildCloudinaryUrl } from '../api/client';

export default function LogEntryImage({ imagePublicId, alt }) {
  const [failed, setFailed] = useState(false);
  const url = buildCloudinaryUrl(imagePublicId);

  if (!url || failed) {
    return (
      <div className="flex h-40 w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-100 text-xs text-slate-400">
        {url ? 'Image unavailable' : 'No image'}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      onError={() => setFailed(true)}
      className="h-40 w-full rounded-md object-cover border border-slate-200"
    />
  );
}
