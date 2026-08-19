import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const startLon = Number(params.get("startLon"));
  const startLat = Number(params.get("startLat"));
  const endLon = Number(params.get("endLon"));
  const endLat = Number(params.get("endLat"));
  const values = [startLon, startLat, endLon, endLat];
  if (values.some((value) => !Number.isFinite(value))) {
    return NextResponse.json({ error: "출발지와 도착지 좌표가 필요합니다." }, { status: 400 });
  }

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=false&alternatives=false&steps=false`;
    const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "ClearTrip/1.0" } });
    if (!response.ok) throw new Error(`OSRM ${response.status}`);
    const data = await response.json() as { code?: string; routes?: { distance: number; duration: number }[] };
    const route = data.routes?.[0];
    if (!route || data.code !== "Ok") throw new Error("No route");
    return NextResponse.json({ distanceKm: Math.round(route.distance / 100) / 10, durationMin: Math.round(route.duration / 60), attribution: "© OpenStreetMap contributors · OSRM" });
  } catch {
    return NextResponse.json({ error: "자동 경로 계산에 실패했습니다. 공식 지도에서 확인한 편도 거리를 직접 입력하세요." }, { status: 502 });
  }
}
