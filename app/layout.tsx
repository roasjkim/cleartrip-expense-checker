import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClearTrip — 출장·회의비 증빙 점검",
  description: "출장·회의비 증빙 누락을 확인하고 거리·유가·연비와 회차별 유류비를 계산하는 교육용 도구",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
