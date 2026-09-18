import type { Metadata } from "next";
import { Cairo, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const cairo = Cairo({
  variable: "--font-cairo",
    subsets: ["arabic", "latin"],
      display: "swap",
      });

      export const metadata: Metadata = {
        title: "Campo",
          description: "Football Academy Management SaaS",
          };

          export default function RootLayout({
            children,
            }: Readonly<{
              children: React.ReactNode;
              }>) {
                return (
                    <html lang="ar" dir="rtl" className={cn("font-sans", geist.variable)}>
                          <body className={`${cairo.variable} antialiased`}>
                                  {children}
                                        </body>
                                            </html>
                                              );
                                              }
                                              
