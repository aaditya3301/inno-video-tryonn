import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

/**
 * An address like //billing is read by the browser-side router as a link to another
 * site called "billing", and the page crashes. This runs before any other script and
 * sends the visitor to the same address with single slashes.
 */
const FIX_DOUBLE_SLASH = `(function(){var p=location.pathname,f=p.replace(/\\/{2,}/g,"/");if(f!==p)location.replace(f+location.search+location.hash)})()`;

export const metadata: Metadata = {
  title: "Live Try-On",
  description: "Try garments on in real time with your camera.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0c10",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Script id="fix-double-slash" strategy="beforeInteractive">
          {FIX_DOUBLE_SLASH}
        </Script>
        {children}
      </body>
    </html>
  );
}
