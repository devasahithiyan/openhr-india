import "@fontsource/dm-serif-text/latin-400.css";
import "@fontsource/mukta/400.css";
import "@fontsource/mukta/600.css";
import "@fontsource/mukta/700.css";
import "./globals.css";
import "./workspace.css";
import { SessionProvider } from "../components/session";
export const metadata = {
  title: "OpenHR India · People",
  description: "Company people management",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
