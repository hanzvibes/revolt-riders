import {readSheetDataset,type SheetDataset} from "@/lib/google-sheets/server";
import {getSupabaseServerClient} from "@/lib/supabase/server";
import {NextResponse} from "next/server";
const valid=new Set<SheetDataset>(["members","riding","finance"]);
export async function GET(_request:Request,{params}:{params:Promise<{dataset:string}>}){
 try{
  const supabase=await getSupabaseServerClient();
  const{data,error}=await supabase.auth.getClaims();
  if(error||!data?.claims?.sub)return NextResponse.json({error:"Autentikasi diperlukan."},{status:401});
  const{dataset}=await params;
  if(!valid.has(dataset as SheetDataset))return NextResponse.json({error:"Dataset tidak dikenal."},{status:404});
  const result=await readSheetDataset(dataset as SheetDataset);
  return NextResponse.json(result,{headers:{"Cache-Control":"private, max-age=0, s-maxage=15, stale-while-revalidate=30"}});
 }catch(cause){return NextResponse.json({error:cause instanceof Error?cause.message:"Sinkronisasi gagal."},{status:503})}
}
