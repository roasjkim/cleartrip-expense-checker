"use client";

import { ChangeEvent, useMemo, useState } from "react";

type ExpenseType = "domestic" | "meeting" | "overseas";
type CheckState = Record<string, boolean>;
type Place = { id: string; name: string; detail: string; lon: number; lat: number };
type TripProofKey = "activity" | "receipt" | "distance" | "fuel" | "mileage";
type TripRound = {
  id: number;
  date: string;
  startQuery: string;
  endQuery: string;
  startPlace?: Place;
  endPlace?: Place;
  distance: string;
  durationMin?: number;
  roundtrip: boolean;
  fuelType: "gasoline" | "diesel" | "lpg";
  fuelPrice: string;
  fuelSourceDate?: string;
  mileage: string;
  vehicleModel: string;
  proofs: Partial<Record<TripProofKey, string>>;
  message?: string;
  loading?: string;
};

const PROOF_LABELS: { key: TripProofKey; title: string; short: string }[] = [
  { key: "activity", title: "회차별 활동 증빙 사진", short: "활동 사진" },
  { key: "receipt", title: "주유·교통비 영수증", short: "영수증" },
  { key: "distance", title: "네이버 지도 거리 캡처", short: "거리 증빙" },
  { key: "fuel", title: "오피넷 출장일 유가 캡처", short: "유가 증빙" },
  { key: "mileage", title: "차종별 공인연비 조회 캡처", short: "연비 증빙" },
];

const newTrip = (id: number): TripRound => ({ id, date: "", startQuery: "", endQuery: "", distance: "", roundtrip: true, fuelType: "gasoline", fuelPrice: "", mileage: "", vehicleModel: "", proofs: {} });

const TYPES = {
  domestic: { icon: "↗", title: "국내 출장비", sub: "교통 · 숙박 · 일비" },
  meeting: { icon: "◎", title: "회의비", sub: "식사 · 다과 · 장소" },
  overseas: { icon: "◇", title: "국외 출장비", sub: "항공 · 체재 · 보험" },
};

const RULES: Record<ExpenseType, { id: string; title: string; desc: string; tag: string }[]> = {
  domestic: [
    { id: "approval", title: "출장 사전 승인", desc: "출장명령서 또는 내부결재에 기간·목적·출장자가 표시되어야 합니다.", tag: "필수" },
    { id: "transport", title: "교통비 증빙", desc: "승차권·카드전표·통행료 등 이용일과 금액을 확인할 수 있어야 합니다.", tag: "필수" },
    { id: "meetingList", title: "회의비 참석자 명단", desc: "회의비가 포함되면 참석자·소속·회의 목적을 함께 남겨야 합니다.", tag: "해당 시" },
    { id: "report", title: "출장 결과보고", desc: "방문지, 활동 내용과 후속 조치가 사전 승인 내용과 연결되어야 합니다.", tag: "필수" },
    { id: "date", title: "날짜 일치", desc: "승인 기간, 승차권, 영수증과 결과보고의 날짜가 일치합니다.", tag: "교차검증" },
    { id: "purpose", title: "목적·방문지 일치", desc: "사전 승인서와 결과보고, 회의 기록의 목적·방문지가 일치합니다.", tag: "교차검증" },
    { id: "amount", title: "금액 합계 일치", desc: "지급신청서 청구액과 개별 증빙 합계가 일치합니다.", tag: "교차검증" },
    { id: "signature", title: "신청일·서명", desc: "지급신청서에 작성일과 신청자 서명이 모두 있습니다.", tag: "필수" },
  ],
  meeting: [
    { id: "plan", title: "회의 계획·내부 승인", desc: "회의 목적, 일시, 장소와 예상 참석자가 승인 문서에 있습니다.", tag: "필수" },
    { id: "receipt", title: "적격 결제 증빙", desc: "카드전표 또는 현금영수증에 결제일·상호·금액이 표시됩니다.", tag: "필수" },
    { id: "meetingList", title: "참석자 명단", desc: "참석자 성명과 소속을 확인할 수 있습니다.", tag: "필수" },
    { id: "minutes", title: "회의 결과·회의록", desc: "논의 내용과 결정 사항이 회의 목적과 연결됩니다.", tag: "필수" },
    { id: "date", title: "날짜 일치", desc: "회의일과 결제일, 결과보고일의 흐름이 자연스럽습니다.", tag: "교차검증" },
    { id: "purpose", title: "목적 일치", desc: "승인·결제·결과 문서의 회의 목적이 일치합니다.", tag: "교차검증" },
    { id: "amount", title: "금액 합계 일치", desc: "신청 금액과 영수증 합계가 일치합니다.", tag: "교차검증" },
    { id: "signature", title: "작성일·서명", desc: "지급신청서에 작성일과 작성자 서명이 있습니다.", tag: "필수" },
  ],
  overseas: [
    { id: "approval", title: "국외출장 사전 승인", desc: "방문국·기간·목적·예산이 포함된 승인 문서가 있습니다.", tag: "필수" },
    { id: "flight", title: "항공권·탑승권", desc: "예약 내역과 실제 탑승 사실, 결제 금액을 확인할 수 있습니다.", tag: "필수" },
    { id: "hotel", title: "숙박비 증빙", desc: "숙박일, 투숙자, 결제 금액이 표시된 영수증이 있습니다.", tag: "필수" },
    { id: "fx", title: "환율 근거", desc: "외화 사용분에 적용한 환율의 기준일과 출처를 남겼습니다.", tag: "필수" },
    { id: "report", title: "국외출장 결과보고", desc: "방문 일정, 활동 내용과 성과를 확인할 수 있습니다.", tag: "필수" },
    { id: "date", title: "기간 일치", desc: "승인 기간과 항공·숙박·현지 영수증 날짜가 일치합니다.", tag: "교차검증" },
    { id: "amount", title: "원화 환산·합계 일치", desc: "증빙별 환산액 합계와 청구 금액이 일치합니다.", tag: "교차검증" },
    { id: "signature", title: "작성일·서명", desc: "지급신청서에 작성일과 작성자 서명이 있습니다.", tag: "필수" },
  ],
};

const ERROR_CHECKS: CheckState = { approval: true, transport: true, meetingList: true, report: true, date: true, purpose: true, amount: false, signature: false };
const ERROR_FILES = ["01_국내출장_사전승인서.pdf", "02_KTX_승차권_결제증빙.pdf", "03_협력회의_카드전표_참석자명단.pdf", "04_출장_결과보고서.pdf", "05_출장회의비_지급신청서.pdf"];

function money(value: string) {
  const num = Number(value.replace(/[^0-9]/g, ""));
  return Number.isFinite(num) ? `${num.toLocaleString("ko-KR")}원` : "0원";
}

export default function Home() {
  const [type, setType] = useState<ExpenseType>("domestic");
  const [checks, setChecks] = useState<CheckState>(ERROR_CHECKS);
  const [files, setFiles] = useState<string[]>(ERROR_FILES);
  const [title, setTitle] = useState("2026 산학협력 워크숍 참석 및 협력회의");
  const [date, setDate] = useState("2026-08-12");
  const [claim, setClaim] = useState("145600");
  const [evidence, setEvidence] = useState("147600");
  const [ran, setRan] = useState(true);
  const [bundle, setBundle] = useState<"error" | "fixed" | "custom">("error");
  const [trips, setTrips] = useState<TripRound[]>([newTrip(1)]);
  const [suggestions, setSuggestions] = useState<Record<string, Place[]>>({});
  const [calculatorOpen, setCalculatorOpen] = useState(true);

  const rules = RULES[type];
  const passed = rules.filter((rule) => checks[rule.id]).length;
  const issues = rules.filter((rule) => !checks[rule.id]);
  const score = Math.round((passed / rules.length) * 100);
  const scoreLabel = score === 100 ? "제출 준비 완료" : score >= 75 ? "보완 후 제출" : "추가 확인 필요";

  const crossChecks = useMemo(() => [
    { title: "날짜", value: checks.date, copy: date ? `${date.replaceAll("-", ".")} 기준 문서 간 일치` : "기준 날짜를 입력하세요" },
    { title: "목적", value: checks.purpose, copy: title || "출장·회의 건명을 입력하세요" },
    { title: "금액", value: checks.amount, copy: `${money(claim)} 청구 / ${money(evidence)} 증빙` },
  ], [checks, date, title, claim, evidence]);

  const chooseType = (next: ExpenseType) => {
    setType(next); setChecks({}); setFiles([]); setTitle(""); setDate(""); setClaim(""); setEvidence(""); setRan(false); setBundle("custom");
  };

  const loadDemo = () => {
    setType("domestic"); setChecks(ERROR_CHECKS); setFiles(ERROR_FILES); setTitle("2026 산학협력 워크숍 참석 및 협력회의"); setDate("2026-08-12"); setClaim("145600"); setEvidence("147600"); setRan(true); setBundle("error");
    requestAnimationFrame(() => document.querySelector("#result")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const applyFix = () => {
    setChecks(Object.fromEntries(RULES.domestic.map((r) => [r.id, true]))); setClaim("147600"); setEvidence("147600"); setRan(true); setBundle("fixed");
    requestAnimationFrame(() => document.querySelector("#result")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const reset = () => {
    setChecks({}); setFiles([]); setTitle(""); setDate(""); setClaim(""); setEvidence(""); setRan(false); setBundle("custom");
  };

  const onFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Array.from(event.target.files ?? []).map((file) => file.name);
    setFiles((current) => [...current, ...next]); setBundle("custom");
    event.target.value = "";
  };

  const runCheck = () => {
    const claimNum = Number(claim || 0); const evidenceNum = Number(evidence || 0);
    if (claimNum && evidenceNum) setChecks((current) => ({ ...current, amount: claimNum === evidenceNum }));
    setRan(true);
    requestAnimationFrame(() => document.querySelector("#result")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const updateTrip = (id: number, patch: Partial<TripRound>) => {
    setTrips((current) => current.map((trip) => trip.id === id ? { ...trip, ...patch } : trip));
  };

  const fetchPlaces = async (query: string) => {
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const data = await response.json() as { places?: Place[]; error?: string };
      if (response.ok && data.places?.length) return data.places;
    } catch { /* GitHub Pages fallback below */ }
    const directUrl = new URL("https://photon.komoot.io/api/");
    directUrl.searchParams.set("q", query); directUrl.searchParams.set("limit", "6"); directUrl.searchParams.set("bbox", "124.5,33.0,132.0,39.5");
    const directResponse = await fetch(directUrl.toString());
    const directData = await directResponse.json() as { features?: { geometry?: { coordinates?: [number, number] }; properties?: Record<string, string> }[] };
    const places = (directData.features ?? []).flatMap((feature) => {
      const coordinates = feature.geometry?.coordinates; if (!coordinates) return [];
      const props = feature.properties ?? {}; const name = props.name || props.street || props.city || query;
      const detail = [props.street, props.district, props.city, props.county, props.state, props.country].filter(Boolean).filter((part, index, all) => all.indexOf(part) === index).join(" · ");
      return [{ id: `${coordinates[0]}-${coordinates[1]}-${name}`, name, detail, lon: coordinates[0], lat: coordinates[1] }];
    });
    if (!places.length) throw new Error("검색 결과가 없습니다. 더 구체적인 도로명이나 장소명을 입력하세요.");
    return places;
  };

  const searchAddress = async (trip: TripRound, field: "start" | "end") => {
    const query = field === "start" ? trip.startQuery : trip.endQuery;
    if (query.trim().length < 2) { updateTrip(trip.id, { message: "장소 또는 주소를 2자 이상 입력하세요." }); return; }
    const key = `${trip.id}-${field}`;
    updateTrip(trip.id, { loading: field, message: "주소를 검색하고 있습니다…" });
    try {
      const places = await fetchPlaces(query);
      setSuggestions((current) => ({ ...current, [key]: places }));
      const first = places[0];
      updateTrip(trip.id, { [field === "start" ? "startPlace" : "endPlace"]: first, [field === "start" ? "startQuery" : "endQuery"]: first.name, loading: undefined, message: `${places.length}개 후보를 찾았습니다. 첫 번째 장소를 선택했습니다.` });
    } catch (error) {
      setSuggestions((current) => ({ ...current, [key]: [] }));
      updateTrip(trip.id, { loading: undefined, message: error instanceof Error ? error.message : "장소 검색에 실패했습니다." });
    }
  };

  const selectPlace = (tripId: number, field: "start" | "end", place: Place) => {
    updateTrip(tripId, { [field === "start" ? "startPlace" : "endPlace"]: place, [field === "start" ? "startQuery" : "endQuery"]: place.name, message: `${place.name} 선택됨` });
    setSuggestions((current) => ({ ...current, [`${tripId}-${field}`]: [] }));
  };

  const autoRoute = async (trip: TripRound) => {
    updateTrip(trip.id, { loading: "route", message: "장소와 자동차 경로를 확인하고 있습니다…" });
    try {
      const [startPlaces, endPlaces] = await Promise.all([
        trip.startPlace ? Promise.resolve([trip.startPlace]) : fetchPlaces(trip.startQuery),
        trip.endPlace ? Promise.resolve([trip.endPlace]) : fetchPlaces(trip.endQuery),
      ]);
      const start = startPlaces[0]; const end = endPlaces[0];
      const params = new URLSearchParams({ startLon: String(start.lon), startLat: String(start.lat), endLon: String(end.lon), endLat: String(end.lat) });
      let response = await fetch(`/api/route?${params}`);
      let data = await response.json() as { distanceKm?: number; durationMin?: number; error?: string };
      if (!response.ok || !data.distanceKm) {
        const directUrl = `https://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}?overview=false&alternatives=false&steps=false`;
        response = await fetch(directUrl);
        const direct = await response.json() as { code?: string; routes?: { distance: number; duration: number }[] };
        const route = direct.routes?.[0];
        data = route && direct.code === "Ok" ? { distanceKm: Math.round(route.distance / 100) / 10, durationMin: Math.round(route.duration / 60) } : {};
      }
      if (!data.distanceKm) throw new Error(data.error || "경로를 찾지 못했습니다.");
      updateTrip(trip.id, { startPlace: start, endPlace: end, startQuery: start.name, endQuery: end.name, distance: String(data.distanceKm), durationMin: data.durationMin, loading: undefined, message: `편도 ${data.distanceKm}km · 약 ${data.durationMin}분을 자동 입력했습니다.` });
    } catch (error) {
      updateTrip(trip.id, { loading: undefined, message: `${error instanceof Error ? error.message : "자동 계산 실패"} 아래 거리칸에 공식 지도에서 확인한 값을 직접 입력할 수 있습니다.` });
    }
  };

  const autoFuelPrice = async (trip: TripRound) => {
    if (!trip.date) { updateTrip(trip.id, { message: "출장일을 먼저 선택하세요." }); return; }
    updateTrip(trip.id, { loading: "fuel", message: "오피넷 공개 일간표를 확인하고 있습니다…" });
    try {
      const response = await fetch(`/api/fuel-price?date=${trip.date}&fuel=${trip.fuelType}`);
      const data = await response.json() as { price?: number; sourceDate?: string; exact?: boolean; error?: string };
      if (!response.ok || !data.price) throw new Error(data.error || "유가를 찾지 못했습니다.");
      updateTrip(trip.id, { fuelPrice: String(Math.round(data.price * 100) / 100), fuelSourceDate: data.sourceDate, loading: undefined, message: data.exact ? `${data.sourceDate} 오피넷 전국 평균가격을 입력했습니다.` : `${data.sourceDate} 공개값을 입력했습니다. 출장일과 다르면 공식 페이지에서 다시 확인하세요.` });
    } catch (error) {
      updateTrip(trip.id, { loading: undefined, message: error instanceof Error ? error.message : "유가 자동조회에 실패했습니다." });
    }
  };

  const onTripProof = (tripId: number, key: TripProofKey, event: ChangeEvent<HTMLInputElement>) => {
    const name = event.target.files?.[0]?.name;
    if (name) setTrips((current) => current.map((trip) => trip.id === tripId ? { ...trip, proofs: { ...trip.proofs, [key]: name } } : trip));
    event.target.value = "";
  };

  const tripCost = (trip: TripRound) => {
    const distanceKm = Number(trip.distance || 0) * (trip.roundtrip ? 2 : 1);
    const price = Number(trip.fuelPrice || 0); const efficiency = Number(trip.mileage || 0);
    return efficiency > 0 ? Math.round(distanceKm * price / efficiency) : 0;
  };
  const totalFuelCost = trips.reduce((sum, trip) => sum + tripCost(trip), 0);
  const proofCount = trips.reduce((sum, trip) => sum + Object.keys(trip.proofs).length, 0);

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="클리어트립 홈"><span className="brandMark">CT</span><span>ClearTrip</span></a>
        <nav aria-label="주요 메뉴"><a href="#calculator">유류비 계산</a><a href="#check">서류 점검</a><a href="#result">점검 결과</a><a href="#demo">가상 증빙</a></nav>
        <span className="statusPill"><i /> 파일 전송 없음</span>
      </header>

      <section className="hero" id="top">
        <div className="heroCopyWrap">
          <p className="eyebrow">EXPENSE EVIDENCE CHECKER</p>
          <h1>빠진 증빙은 찾고,<br /><em>반려 사유는 줄이고.</em></h1>
          <p className="heroCopy">출장비·회의비 서류의 필수 요건과 날짜·목적·금액 일치 여부를 제출 전에 한 화면에서 확인하세요.</p>
          <div className="heroActions"><a className="primaryCta" href="#check">내 서류 점검하기 <span>→</span></a><button className="textButton" onClick={loadDemo}>가상 사례 다시 보기</button></div>
        </div>
        <div className={`heroCard ${score === 100 ? "complete" : ""}`} aria-label="현재 점검 결과">
          <div className="heroCardTop"><span>{bundle === "custom" ? "MY CHECK" : "DEMO / 2026-08-12"}</span><b>{scoreLabel}</b></div>
          <div className="scoreRow"><strong>{score}</strong><span>/ 100<br />준비도</span></div>
          <div className="meter"><i style={{ width: `${score}%` }} /></div>
          <ul><li><span className="dot ok" /> 통과 {passed}개</li><li><span className={`dot ${issues.length ? "warn" : "ok"}`} /> 보완 {issues.length}개</li><li><span className="dot file" /> 첨부 목록 {files.length}개</li></ul>
        </div>
      </section>

      <section className="calculatorSection" id="calculator">
        <div className="calcIntro">
          <div><p className="eyebrow">ONE-STOP CAR EXPENSE</p><h2>거리·유가·연비를<br />한 번에 계산하세요.</h2></div>
          <p>장소 검색과 도로 경로는 인증키 없는 공개 도구로 계산하고, 출장일 유가는 오피넷 공개 일간표에서 가져옵니다. 제출용 캡처는 각 공식 사이트에서 별도로 저장하세요.</p>
        </div>
        <div className="sourceGrid" aria-label="공식 증빙 조회 사이트">
          <a href="https://map.naver.com/p/directions" target="_blank" rel="noreferrer"><span>01</span><div><b>네이버 지도</b><small>출발·도착 주소와 자동차 거리 캡처</small></div><em>지도 열기 ↗</em></a>
          <a href="https://www.opinet.co.kr/user/dopospdrg/dopOsPdrgSelect.do" target="_blank" rel="noreferrer"><span>02</span><div><b>오피넷 일간 유가</b><small>각 출장일의 해당 유종 평균판매가격</small></div><em>원문 열기 ↗</em></a>
          <a href="https://min24.energy.or.kr/trans_hp/AHP/HP_03/HP_03_01_010.do" target="_blank" rel="noreferrer"><span>03</span><div><b>자동차 표시연비</b><small>차량 모델과 복합연비가 보이는 화면</small></div><em>조회 열기 ↗</em></a>
        </div>
        <div className="keylessNote"><span>인증키 없는 빠른 계산</span><p>네이버 Directions API와 오피넷 Open API는 인증 정보가 필요합니다. 그래서 이 화면은 장소·경로에 Photon/OSRM을, 유가에는 오피넷 공개 일간표를 사용하며 언제든 직접 입력으로 대체할 수 있습니다.</p><button onClick={() => setCalculatorOpen((value) => !value)}>{calculatorOpen ? "계산기 접기" : "계산기 펼치기"}</button></div>

        {calculatorOpen && <div className="calculatorShell">
          {trips.map((trip, tripIndex) => {
            const distanceTotal = Number(trip.distance || 0) * (trip.roundtrip ? 2 : 1);
            const cost = tripCost(trip);
            return <article className="tripRound" key={trip.id}>
              <div className="tripHead"><div><span>{String(tripIndex + 1).padStart(2,"0")}</span><div><b>{tripIndex + 1}회차 출장</b><small>회차별 날짜·거리·유가와 증빙을 따로 확인합니다.</small></div></div>{trips.length > 1 && <button onClick={() => setTrips((current) => current.filter((item) => item.id !== trip.id))}>회차 삭제</button>}</div>
              <div className="tripFields">
                <label className="dateField">출장일<input type="date" value={trip.date} onChange={(e) => updateTrip(trip.id,{ date:e.target.value, fuelPrice:"", fuelSourceDate:undefined })} /></label>
                {(["start", "end"] as const).map((field) => {
                  const isStart = field === "start"; const key = `${trip.id}-${field}`; const list = suggestions[key] ?? [];
                  return <div className="addressField" key={field}><label>{isStart ? "출발지" : "도착지"}<div className="searchInput"><input value={isStart ? trip.startQuery : trip.endQuery} onChange={(e) => updateTrip(trip.id, isStart ? { startQuery:e.target.value, startPlace:undefined } : { endQuery:e.target.value, endPlace:undefined })} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); searchAddress(trip,field); } }} placeholder={isStart ? "예: 서울역 또는 서울 중구 한강대로 405" : "예: 대전역 또는 대전 동구 중앙로 215"} /><button onClick={() => searchAddress(trip,field)} disabled={trip.loading === field}>{trip.loading === field ? "검색 중" : "검색"}</button></div></label>{list.length > 0 && <div className="suggestionList">{list.map((place) => <button key={place.id} onClick={() => selectPlace(trip.id,field,place)}><b>{place.name}</b><small>{place.detail || "대한민국"}</small></button>)}</div>}</div>;
                })}
              </div>
              <div className="routeBar"><button className="autoRouteBtn" onClick={() => autoRoute(trip)} disabled={trip.loading === "route"}>{trip.loading === "route" ? "경로 계산 중…" : "거리 자동입력"}<span>→</span></button><label>편도 거리<div><input inputMode="decimal" value={trip.distance} onChange={(e) => updateTrip(trip.id,{ distance:e.target.value.replace(/[^0-9.]/g,"") })} placeholder="0" /><span>km</span></div></label><label className="toggleLabel"><input type="checkbox" checked={trip.roundtrip} onChange={(e) => updateTrip(trip.id,{ roundtrip:e.target.checked })} /><i />왕복 계산</label><div className="routeSummary"><b>{distanceTotal.toLocaleString("ko-KR")}km</b><small>{trip.durationMin ? `편도 약 ${trip.durationMin}분` : "직접 입력 가능"}</small></div></div>
              {trip.message && <p className={`tripMessage ${trip.message.includes("실패") || trip.message.includes("못했") ? "error" : ""}`}>{trip.message}</p>}
              <div className="fuelGrid">
                <div className="calcStep"><div className="calcStepHead"><span>1</span><b>출장일 유가</b><a href="https://www.opinet.co.kr/user/dopospdrg/dopOsPdrgSelect.do" target="_blank" rel="noreferrer">오피넷 ↗</a></div><div className="fuelInputs"><select aria-label="유종" value={trip.fuelType} onChange={(e) => updateTrip(trip.id,{ fuelType:e.target.value as TripRound["fuelType"], fuelPrice:"" })}><option value="gasoline">휘발유</option><option value="diesel">경유</option><option value="lpg">LPG</option></select><label><input inputMode="decimal" value={trip.fuelPrice} onChange={(e) => updateTrip(trip.id,{ fuelPrice:e.target.value.replace(/[^0-9.]/g,"") })} placeholder="0" /><span>원/L</span></label></div><button className="subAutoBtn" onClick={() => autoFuelPrice(trip)} disabled={trip.loading === "fuel"}>{trip.loading === "fuel" ? "조회 중…" : "오피넷 자동입력"}</button>{trip.fuelSourceDate && <small className="sourceDate">기준일 {trip.fuelSourceDate}</small>}</div>
                <div className="calcStep"><div className="calcStepHead"><span>2</span><b>차종별 연비</b><a href="https://min24.energy.or.kr/trans_hp/AHP/HP_03/HP_03_01_010.do" target="_blank" rel="noreferrer">공인연비 ↗</a></div><input className="modelInput" value={trip.vehicleModel} onChange={(e) => updateTrip(trip.id,{ vehicleModel:e.target.value })} placeholder="차량 모델 (예: 쏘나타 2.0)" /><div className="fuelInputs"><select aria-label="빠른 연비 기준값" defaultValue="" onChange={(e) => updateTrip(trip.id,{ mileage:e.target.value })}><option value="">차급 기준값</option><option value="14">경차 14.0</option><option value="13.5">준중형 가솔린 13.5</option><option value="12">중형 가솔린 12.0</option><option value="19">중형 하이브리드 19.0</option><option value="10.5">SUV 가솔린 10.5</option><option value="12.5">SUV 디젤 12.5</option></select><label><input inputMode="decimal" value={trip.mileage} onChange={(e) => updateTrip(trip.id,{ mileage:e.target.value.replace(/[^0-9.]/g,"") })} placeholder="0" /><span>km/L</span></label></div><small className="calcHint">기준값은 빠른 계산용이며 제출용 공인연비 증빙이 아닙니다.</small></div>
                <div className="roundCost"><span>회차 예상 유류비</span><strong>{cost.toLocaleString("ko-KR")}원</strong><p>{distanceTotal || 0}km × {Number(trip.fuelPrice || 0).toLocaleString("ko-KR")}원 ÷ {trip.mileage || 0}km/L</p></div>
              </div>
              <div className="proofBlock"><div><b>회차별 증빙 이미지</b><p>날짜·주소·차종과 수치가 보이게 캡처하세요. 파일은 전송되지 않습니다.</p></div><div className="proofGrid">{PROOF_LABELS.map((proof) => <label className={trip.proofs[proof.key] ? "hasProof" : ""} key={proof.key} title={proof.title}><input type="file" accept="image/*,.pdf" onChange={(event) => onTripProof(trip.id,proof.key,event)} /><span>{trip.proofs[proof.key] ? "✓" : "+"}</span><b>{proof.short}</b><small>{trip.proofs[proof.key] || "파일 선택"}</small></label>)}</div></div>
            </article>;
          })}
          <div className="calcFooter"><button onClick={() => setTrips((current) => [...current,newTrip(Math.max(...current.map((trip) => trip.id),0)+1)])}>＋ 출장 회차 추가</button><div><span>증빙 이미지 <b>{proofCount}</b>개</span><p>전체 회차 예상 유류비</p><strong>{totalFuelCost.toLocaleString("ko-KR")}원</strong></div></div>
          <p className="attribution">장소 검색: Photon · © OpenStreetMap contributors / 거리 자동값: © OpenStreetMap contributors · OSRM / 유가 자동값: 한국석유공사 오피넷 공개 일간표</p>
        </div>}
      </section>

      <section className="checkerSection" id="check">
        <div className="sectionIntro"><span className="sectionNo">01</span><div><p className="eyebrow">SET THE EXPENSE</p><h2>비용 유형과<br />기준 정보를 선택하세요.</h2></div><p>기관별 세부 내규가 다를 수 있습니다. 이 도구는 공통적인 증빙 누락과 문서 간 불일치를 찾는 사전 점검용입니다.</p></div>
        <div className="typeGrid">
          {(Object.keys(TYPES) as ExpenseType[]).map((key) => <button key={key} className={`typeCard ${type === key ? "active" : ""}`} onClick={() => chooseType(key)} aria-pressed={type === key}><span>{TYPES[key].icon}</span><b>{TYPES[key].title}</b><small>{TYPES[key].sub}</small>{type === key && <i>선택됨</i>}</button>)}
        </div>

        <div className="formGrid">
          <div className="formPanel">
            <div className="panelHead"><span>01-A</span><h3>기준 정보</h3><p>여러 문서에서 같아야 할 기준값</p></div>
            <label>출장·회의 건명<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 산학협력 세미나 참석" /></label>
            <div className="twoCol"><label>출장·회의 일자<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><label>신청 금액<input inputMode="numeric" value={claim} onChange={(e) => setClaim(e.target.value.replace(/[^0-9]/g, ""))} placeholder="0" /><span className="unit">원</span></label></div>
            <label>개별 증빙 합계<input inputMode="numeric" value={evidence} onChange={(e) => setEvidence(e.target.value.replace(/[^0-9]/g, ""))} placeholder="0" /><span className="unit">원</span></label>
          </div>
          <div className="formPanel evidencePanel">
            <div className="panelHead"><span>01-B</span><h3>증빙 파일 목록</h3><p>파일은 업로드되지 않고 이 화면의 목록에만 표시됩니다.</p></div>
            <label className="fileDrop"><input type="file" multiple onChange={onFiles} accept=".pdf,.png,.jpg,.jpeg,.hwpx,.xlsx" /><b>＋ 파일 선택하기</b><span>PDF · 이미지 · HWPX · XLSX / 여러 개 가능</span></label>
            <div className="fileList">{files.length ? files.map((file, i) => <div className="fileItem" key={`${file}-${i}`}><span>{String(i + 1).padStart(2,"0")}</span><b>{file}</b><button aria-label={`${file} 목록에서 제거`} onClick={() => setFiles((all) => all.filter((_, index) => index !== i))}>×</button></div>) : <p className="empty">아직 추가된 파일이 없습니다.</p>}</div>
          </div>
        </div>

        <div className="requirements">
          <div className="requirementsHead"><span className="sectionNo small">02</span><div><p className="eyebrow">REQUIREMENT CHECK</p><h2>확인되는 항목에 표시하세요.</h2></div><p><b>{passed}</b> / {rules.length}개 확인</p></div>
          <div className="checkList">{rules.map((rule, index) => <label className={`checkItem ${checks[rule.id] ? "checked" : ""}`} key={rule.id}><input type="checkbox" checked={Boolean(checks[rule.id])} onChange={(e) => { setChecks((current) => ({ ...current, [rule.id]: e.target.checked })); setBundle("custom"); }} /><span className="customCheck">{checks[rule.id] ? "✓" : String(index + 1).padStart(2,"0")}</span><span className="checkText"><b>{rule.title}</b><small>{rule.desc}</small></span><em>{rule.tag}</em></label>)}</div>
          <div className="actionBar"><div><strong>{passed}개 항목</strong> 확인 · <strong>{files.length}개 파일</strong> 목록</div><div><button className="ghostBtn" onClick={reset}>초기화</button><button className="primaryBtn" onClick={runCheck}>점검 결과 보기 <span>→</span></button></div></div>
        </div>
      </section>

      <section className={`resultSection ${score === 100 ? "allClear" : ""}`} id="result">
        <div className="resultHeader"><div><p className="eyebrow">CHECK RESULT / {ran ? "READY" : "NOT RUN"}</p><h2>{!ran ? "항목을 확인한 뒤 점검을 실행하세요." : score === 100 ? "좋습니다. 모든 기준을 통과했습니다." : `${issues.length}개 항목을 보완하면 제출 준비가 끝납니다.`}</h2></div><div className="scoreStamp"><strong>{score}</strong><span>/100<br />{scoreLabel}</span></div></div>
        <div className="crossGrid">{crossChecks.map((item, index) => <article className={item.value ? "pass" : "fail"} key={item.title}><span>0{index + 1}</span><i>{item.value ? "✓" : "!"}</i><b>{item.title}</b><p>{item.copy}</p><em>{item.value ? "일치" : "확인 필요"}</em></article>)}</div>
        {ran && <div className="issuePanel"><div className="issueTitle"><span>{issues.length ? "보완 목록" : "최종 확인"}</span><strong>{issues.length ? `${issues.length}건` : "ALL CLEAR"}</strong></div><div className="issueList">{issues.length ? issues.map((issue, i) => <article key={issue.id}><span>{String(i + 1).padStart(2,"0")}</span><div><b>{issue.title}</b><p>{issue.desc}</p><small>{issue.id === "amount" ? `현재 ${money(claim)} 청구 / ${money(evidence)} 증빙 — 차이 ${Math.abs(Number(claim || 0) - Number(evidence || 0)).toLocaleString("ko-KR")}원` : "해당 문서의 작성자 확인 후 보완하세요."}</small></div><em>보완</em></article>) : <article className="clearRow"><span>✓</span><div><b>누락·불일치 항목 없음</b><p>이 도구의 8개 사전 점검 기준을 모두 통과했습니다. 제출 전 소속 기관의 최신 내규와 한도를 마지막으로 확인하세요.</p></div><em>통과</em></article>}</div></div>}
        {bundle === "error" && <div className="fixCallout"><div><span>가상 사례 검증 완료</span><h3>오류 2건을 정확히 찾았습니다.</h3><p>청구액을 147,600원으로 맞추고 신청자 서명을 추가한 보완본으로 다시 검증해 보세요.</p></div><button onClick={applyFix}>보완본 적용하고 재점검 <span>→</span></button></div>}
        {bundle === "fixed" && <div className="fixCallout fixed"><div><span>보완 전후 비교 완료</span><h3>2건 보완 후 8개 기준 전체 통과</h3><p>금액 불일치와 서명 누락이 해소되었습니다. 아래에서 보완 완료 서류 묶음을 확인할 수 있습니다.</p></div><a href="/cleartrip_demo_corrected_pack.pdf" target="_blank" rel="noreferrer">보완본 PDF 열기 <span>↗</span></a></div>}
      </section>

      <section className="beforeSection"><div><p className="eyebrow">BEFORE SUBMISSION</p><h2>금액보다 먼저,<br />세 가지를 맞춰보세요.</h2></div><div className="beforeGrid"><article><span>01</span><b>날짜</b><p>승인 기간과 영수증·승차권의 이용일이 일치하는지 확인</p></article><article><span>02</span><b>목적</b><p>사전 승인과 결과보고의 출장 목적·방문지가 같은지 확인</p></article><article><span>03</span><b>금액</b><p>신청 총액과 개별 증빙 합계, 기관별 한도를 함께 확인</p></article></div></section>

      <section className="demoSection" id="demo">
        <div className="demoIntro"><p className="eyebrow">PRACTICE DOCUMENTS</p><h2>가상 서류로<br />직접 점검해 보세요.</h2><p>실제 개인정보가 없는 6페이지 교육용 PDF입니다. 오류 포함본을 점검하고, 보완 완료본과 비교할 수 있습니다.</p><button className="demoLoad" onClick={loadDemo}>가상 사례 화면에 불러오기 <span>→</span></button></div>
        <article className="docCard errorDoc"><div className="docTop"><span>DEMO 01</span><em>오류 2건 포함</em></div><div className="paperIcon">PDF</div><h3>점검용 증빙 묶음</h3><p>사전 승인서, 승차권, 회의비 전표·명단, 결과보고서, 지급신청서</p><ul><li>청구액 2,000원 불일치</li><li>신청자 서명 누락</li></ul><a href="/cleartrip_demo_error_pack.pdf" target="_blank" rel="noreferrer">오류 포함본 열기 <span>↗</span></a></article>
        <article className="docCard fixedDoc"><div className="docTop"><span>DEMO 02</span><em>8/8 통과</em></div><div className="paperIcon">PDF</div><h3>보완 완료 증빙 묶음</h3><p>금액과 서명을 보완한 비교용 문서</p><ul><li>청구·증빙 합계 147,600원</li><li>신청자 서명 포함</li></ul><a href="/cleartrip_demo_corrected_pack.pdf" target="_blank" rel="noreferrer">보완 완료본 열기 <span>↗</span></a></article>
      </section>

      <footer><a className="brand" href="#top"><span className="brandMark">CT</span><span>ClearTrip</span></a><p>이 도구는 교육용 사전 점검 서비스입니다.<br />최종 지급 가능 여부는 소속 기관의 최신 규정과 담당 부서에 확인하세요.</p><a href="#top">맨 위로 ↑</a></footer>
    </main>
  );
}
