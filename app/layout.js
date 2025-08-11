import "./../styles/globals.css";

export const metadata = {
  title: "İnşaat AI",
  description: "WhatsApp-first inşaat finans & proje dashboardu",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
