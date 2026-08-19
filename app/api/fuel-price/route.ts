import { NextRequest, NextResponse } from "next/server";

type OilRow = { gb_nm?: string; B027?: number; D047?: number; K015?: number };

function compactDate(value: string) {
  return value.replace(/[^0-9]/g, "");
}

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") ?? "";
  const fuel = request.nextUrl.searchParams.get("fuel") ?? "gasoline";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "출장일을 먼저 선택하세요." }, { status: 400 });
  }
  const [year, month, day] = date.split("-");

  try {
    const body = new URLSearchParams({
      all_chk_cnt: "5", INIF_FLAG: "N", chk_cnt: "4", TERM: "D",
      STA_Y: year, STA_M: month, STA_D: day, END_Y: year, END_M: month, END_D: day,
      OIL_CD_B034: "Y", OIL_CD_B027: "Y", OIL_CD_D047: "Y", OIL_CD_C004: "Y", equal: "Y",
    });
    const response = await fetch("https://www.opinet.co.kr/user/dopospdrg/dopOsPdrgSelect.do", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Mozilla/5.0 ClearTrip/1.0" },
      body,
    });
    if (!response.ok) throw new Error(`Opinet ${response.status}`);
    const html = await response.text();
    const match = html.match(/chartData\s*=\s*(\[[\s\S]*?\]);/);
    if (!match) throw new Error("No public table data");
    const rows = JSON.parse(match[1]) as OilRow[];
    const target = compactDate(date);
    const row = rows.find((item) => compactDate(item.gb_nm ?? "") === target) ?? rows.at(-1);
    if (!row) throw new Error("No row");
    const field = fuel === "diesel" ? "D047" : fuel === "lpg" ? "K015" : "B027";
    const price = row[field];
    if (!Number.isFinite(price)) {
      return NextResponse.json({ error: fuel === "lpg" ? "공개 일간표에서 LPG 값을 찾지 못했습니다. 오피넷에서 확인 후 직접 입력하세요." : "선택한 유종의 가격을 찾지 못했습니다." }, { status: 404 });
    }
    return NextResponse.json({ price, sourceDate: compactDate(row.gb_nm ?? "").replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"), requestedDate: date, exact: compactDate(row.gb_nm ?? "") === target, source: "한국석유공사 오피넷 공개 일간 평균판매가격" });
  } catch {
    return NextResponse.json({ error: "오피넷 공개 일간표 자동조회에 실패했습니다. 공식 페이지에서 출장일 가격을 확인해 직접 입력하세요." }, { status: 502 });
  }
}
