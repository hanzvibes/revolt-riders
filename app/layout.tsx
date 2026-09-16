import type {Metadata, Viewport} from "next";import "./globals.css";
export const metadata:Metadata={title:"Revolt Riders",description:"Sistem digital internal Revolt Riders",manifest:"/manifest.webmanifest",icons:{icon:"/revolt-riders-logo.jpg",apple:"/revolt-riders-logo.jpg"}};
export const viewport:Viewport={themeColor:"#151617"};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="id"><body>{children}</body></html>}
