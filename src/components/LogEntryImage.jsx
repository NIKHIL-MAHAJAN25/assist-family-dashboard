import React, { useState } from 'react';
import { buildCloudinaryUrl } from '../api/client';
import { Icon } from '../ui';

export default function LogEntryImage({ imagePublicId, alt }) {
  const [failed, setFailed] = useState(false);
  const url = buildCloudinaryUrl(imagePublicId);

  if (!url || failed) {
    return (
      <div className="flex h-44 w-full flex-col items-center justify-center gap-2 rounded-card border border-line bg-sage-50 px-3 text-center">
        <Icon name="image" size={22} className="text-sage-400" />
        <p className="text-[12.5px] text-ink-faint">{url ? 'Image unavailable' : 'No image'}</p>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      onError={() => setFailed(true)}
      className="h-44 w-full rounded-card border border-line object-cover"
    />
  );
}
