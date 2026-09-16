import {getGoogleSheetsStatus,readSheetDataset,type SheetDataset} from "@/lib/google-sheets/server";
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
  const {data:account,error:accountError}=await supabase.from("member_accounts").select("role,status").eq("user_id",data.claims.sub).maybeSingle();
  if(accountError||account?.status!=="active")return NextResponse.json({error:"Akun member aktif diperlukan."},{status:403});
  if(dataset==="finance"&&!['treasurer','admin','superadmin'].includes(account.role))return NextResponse.json({error:"Rincian keuangan hanya tersedia untuk Treasurer dan Admin."},{status:403});
  const result=await readSheetDataset(dataset as SheetDataset);
  return NextResponse.json(result,{headers:{"Cache-Control":"private, max-age=0, s-maxage=15, stale-while-revalidate=30"}});
 }catch(cause){return NextResponse.json({error:cause instanceof Error?cause.message:"Sinkronisasi gagal."},{status:503})}
}

export async function HEAD(){
 const status=getGoogleSheetsStatus();
 return new NextResponse(null,{status:status.configured?204:503,headers:{"X-Revolt-Sheets-Configured":String(status.configured)}});
}
