import "server-only";
import {JWT} from "google-auth-library";
import {z} from "zod";

const datasets={
 members:{spreadsheetEnv:"GOOGLE_MEMBERS_SPREADSHEET_ID",fallbackId:"1B3UF9Uov4D0R-ApJpfCE7muyki5iz682D3Bp7aUnJNk",rangeEnv:"GOOGLE_MEMBERS_RANGE"},
 riding:{spreadsheetEnv:"GOOGLE_RIDING_SPREADSHEET_ID",fallbackId:"1B3UF9Uov4D0R-ApJpfCE7muyki5iz682D3Bp7aUnJNk",rangeEnv:"GOOGLE_RIDING_RANGE"},
 finance:{spreadsheetEnv:"GOOGLE_FINANCE_SPREADSHEET_ID",fallbackId:"1hiX9lF74ys7OtISK4b5Xh1M0vPJN1AmafY2XfsGN7kI",rangeEnv:"GOOGLE_FINANCE_RANGE"},
} as const;
export type SheetDataset=keyof typeof datasets;
type Cell=string|number|boolean|null;
const rangeSchema=z.string().trim().min(3).max(250).regex(/^[^!]+![A-Z]+\d*:[A-Z]+\d*$/i,"Range Google Sheets tidak valid.");

export function getGoogleSheetsStatus(){
 const configured=Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL&&process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);
 return {configured,datasets:Object.fromEntries(Object.entries(datasets).map(([name,config])=>[name,Boolean(process.env[config.rangeEnv])]))};
}

export async function readSheetDataset(dataset:SheetDataset){
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
 const privateKey=process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g,"\n");
 const config=datasets[dataset];
 const range=rangeSchema.parse(process.env[config.rangeEnv]);
 const spreadsheetId=process.env[config.spreadsheetEnv]||config.fallbackId;
 if(!email||!privateKey||!range)throw new Error("Google Sheets server credentials atau range belum dikonfigurasi.");
 const auth=new JWT({email,key:privateKey,scopes:["https://www.googleapis.com/auth/spreadsheets.readonly"]});
 const token=await auth.getAccessToken();
 if(!token.token)throw new Error("Tidak dapat membuat Google access token.");
 const endpoint=`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?majorDimension=ROWS`;
 const response=await fetch(endpoint,{headers:{Authorization:`Bearer ${token.token}`},cache:"no-store"});
 if(!response.ok)throw new Error(`Google Sheets API merespons ${response.status}.`);
 const payload=await response.json() as {values?:Cell[][]};
 const [header=[], ...values]=payload.values??[];
 const headers=header.map((value,index)=>String(value??"").trim()||`Kolom ${index+1}`);
 const rows=values.slice(0,1000).map(row=>Object.fromEntries(headers.map((name,index)=>[name,row[index]??null])));
 return {dataset,range,rows,lastUpdated:new Date().toISOString()};
}
