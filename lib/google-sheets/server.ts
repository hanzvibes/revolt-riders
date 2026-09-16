import "server-only";
import {JWT} from "google-auth-library";
import {z} from "zod";

const datasets={
 members:{spreadsheetEnv:"GOOGLE_MEMBERS_SPREADSHEET_ID",fallbackId:"1B3UF9Uov4D0R-ApJpfCE7muyki5iz682D3Bp7aUnJNk",rangeEnv:"GOOGLE_MEMBERS_RANGE",defaultRange:"Sheet1!A:I",headerRow:2},
 riding:{spreadsheetEnv:"GOOGLE_RIDING_SPREADSHEET_ID",fallbackId:"1B3UF9Uov4D0R-ApJpfCE7muyki5iz682D3Bp7aUnJNk",rangeEnv:"GOOGLE_RIDING_RANGE",defaultRange:"Sheet1!A:I",headerRow:2},
 finance:{spreadsheetEnv:"GOOGLE_FINANCE_SPREADSHEET_ID",fallbackId:"1hiX9lF74ys7OtISK4b5Xh1M0vPJN1AmafY2XfsGN7kI",rangeEnv:"GOOGLE_FINANCE_RANGE",defaultRange:"CASHFLOW 2026!A:L",headerRow:2},
} as const;
export type SheetDataset=keyof typeof datasets;
type Cell=string|number|boolean|null;
const rangeSchema=z.string().trim().min(3).max(250).regex(/^[^!]+![A-Z]+\d*:[A-Z]+\d*$/i,"Range Google Sheets tidak valid.");

export function getGoogleSheetsStatus(){
 const configured=Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL&&process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);
 return {configured,datasets:Object.fromEntries(Object.entries(datasets).map(([name,config])=>[name,Boolean(process.env[config.rangeEnv]||config.defaultRange)]))};
}

function normalizeHeaders(header:Cell[]){
 const used=new Map<string,number>();
 return header.map((value,index)=>{
  const base=String(value??"").trim()||`Kolom ${index+1}`;
  const occurrence=(used.get(base)??0)+1;
  used.set(base,occurrence);
  return occurrence===1?base:`${base} ${occurrence}`;
 });
}

export async function readSheetDataset(dataset:SheetDataset){
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
 const privateKey=process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g,"\n");
 const config=datasets[dataset];
 const rangeRaw=process.env[config.rangeEnv]||config.defaultRange;
 if(!email||!privateKey)throw new Error("Google Sheets server credentials belum dikonfigurasi.");
 const range=rangeSchema.parse(rangeRaw);
 const spreadsheetId=process.env[config.spreadsheetEnv]||config.fallbackId;
 const auth=new JWT({email,key:privateKey,scopes:["https://www.googleapis.com/auth/spreadsheets.readonly"]});
 const token=await auth.getAccessToken();
 if(!token.token)throw new Error("Tidak dapat membuat Google access token.");
 const endpoint=`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?majorDimension=ROWS`;
 const response=await fetch(endpoint,{headers:{Authorization:`Bearer ${token.token}`},cache:"no-store"});
 if(!response.ok)throw new Error(`Google Sheets API merespons ${response.status}.`);
 const payload=await response.json() as {values?:Cell[][]};
 const sheetValues=payload.values??[];
 const headerIndex=config.headerRow-1;
 const header=sheetValues[headerIndex]??[];
 const values=sheetValues.slice(config.headerRow);
 const headers=normalizeHeaders(header);
 const rows=values.slice(0,1000).map(row=>Object.fromEntries(headers.map((name,index)=>[name,row[index]??null])));
 return {dataset,range,rows,lastUpdated:new Date().toISOString()};
}
