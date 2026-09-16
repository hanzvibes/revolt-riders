import type {Metadata} from "next";import "./globals.css";
export const metadata:Metadata={title:"Revolt Riders",description:"Sistem digital internal Revolt Riders",manifest:"/manifest.webmanifest",themeColor:"#151617",icons:{icon:"/revolt-riders-logo.jpg",apple:"/revolt-riders-logo.jpg"}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="id"><body>{children}</body></html>}
