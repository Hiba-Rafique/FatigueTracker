import { Open_Sans } from "next/font/google";
import "./globals.css";

const openSans = Open_Sans({ 
  subsets: ["latin"],
  weight: ['300', '400', '500', '600', '700', '800']
});

export const metadata = {
  title: "Fatigue Tracker | Counselor Dashboard",
  description: "Advanced student mental fatigue and adaptive workload monitoring.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={openSans.className}>{children}</body>
    </html>
  );
}
