import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
    subsets: ["arabic", "latin"],
      display: "swap",
      });

      export const metadata: Metadata = {
        title: "ApexAcademy Cloud",
          description: "Football Academy Management SaaS",
          };

          export default function RootLayout({
            children,
            }: Readonly<{
              children: React.ReactNode;
              }>) {
                return (
                    <html lang="ar" dir="rtl">
                          <body className={`${cairo.variable} antialiased`}>
                                  {children}
                                        </body>
                                            </html>
                                              );
                                              }
                                              
