import { NextResponse, type NextRequest } from "next/server";
import { searchStreetsForCity } from "@/lib/geo/streets-server";
import {
  checkRateLimit,
  rateLimitResponse,
  resolveClientKey,
} from "@/lib/security/rate-limit";

/**
 * GET /api/geo/streets?city=...&q=... — StreetPicker's server-backed lookup
 * (/setup step 3). The full street dataset (63,563 rows, ~2.3MB) lives only
 * in streets-server.ts so it never ships to the client bundle; this route is
 * the sole way the browser reaches it. No auth/DB cost per request (in-memory
 * Map read), so only the cheap in-memory limiter applies — see
 * checkRateLimitDurable's own doc comment for why it's reserved for routes
 * that cost money per call.
 */
export async function GET(request: NextRequest) {
  const clientKey = resolveClientKey(request);
  const rl = checkRateLimit("geo-streets", clientKey, 120);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

  const city = request.nextUrl.searchParams.get("city") ?? "";
  const q = request.nextUrl.searchParams.get("q") ?? "";
  if (!city.trim()) return NextResponse.json([]);

  return NextResponse.json(searchStreetsForCity(city, q, 40));
}
