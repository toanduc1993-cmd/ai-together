import "./globals.css";
import { UserProvider } from "@/lib/UserContext";
import LayoutWrapper from "@/components/Layout";

export const metadata = {
  title: "Libe AI OS",
  description: "Nền tảng cộng tác team AI-native — Môi trường cạnh tranh, học AI cùng nhau, bùng nổ năng suất.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>
        <UserProvider>
          <LayoutWrapper>{children}</LayoutWrapper>
        </UserProvider>
      </body>
    </html>
  );
}
