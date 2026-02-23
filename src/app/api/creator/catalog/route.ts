import { NextResponse } from 'next/server';
import { CREATOR_BUNDLE_PRESETS, EXPORT_PACK_PRESETS, CHANNEL_METADATA_PRESETS, SAFE_ZONE_PRESETS } from '@/lib/creator/presets';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      bundles: CREATOR_BUNDLE_PRESETS,
      exportPacks: EXPORT_PACK_PRESETS,
      channelMetadataPresets: CHANNEL_METADATA_PRESETS,
      safeZonePresets: SAFE_ZONE_PRESETS,
    },
  });
}
