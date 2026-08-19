import { NextRequest, NextResponse } from "next/server";

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: Record<string, string>;
};

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length < 2) {
    return NextResponse.json({ error: "장소 또는 주소를 2자 이상 입력하세요." }, { status: 400 });
  }

  try {
    const url = new URL("https://photon.komoot.io/api/");
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "6");
    url.searchParams.set("bbox", "124.5,33.0,132.0,39.5");
    const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "ClearTrip/1.0" } });
    if (!response.ok) throw new Error(`Photon ${response.status}`);
    const data = await response.json() as { features?: PhotonFeature[] };
    const places = (data.features ?? []).flatMap((feature) => {
      const coordinates = feature.geometry?.coordinates;
      if (!coordinates) return [];
      const props = feature.properties ?? {};
      const name = props.name || props.street || props.city || query;
      const detail = [props.street, props.district, props.city, props.county, props.state, props.country].filter(Boolean).filter((part, index, all) => all.indexOf(part) === index).join(" · ");
      return [{ id: `${coordinates[0]}-${coordinates[1]}-${name}`, name, detail, lon: coordinates[0], lat: coordinates[1] }];
    });
    return NextResponse.json({ places, attribution: "Photon · © OpenStreetMap contributors" });
  } catch {
    return NextResponse.json({ error: "장소 검색 서비스에 연결하지 못했습니다. 주소를 직접 적고 거리는 수동 입력할 수 있습니다." }, { status: 502 });
  }
}
