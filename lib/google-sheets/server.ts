import "server-only";
import {JWT} from "google-auth-library";

const datasets={
 members:{spreadsheetId:"1B3UF9Uov4D0R-ApJpfCE7muyki5iz682D3Bp7aUnJNk",rangeEnv:"GOOGLE_MEMBERS_RANGE"},
 riding:{spreadsheetId:"1B3UF9Uov4D0R-ApJpfCE7muyki5iz682D3Bp7aUnJNk",rangeEnv:"GOOGLE_RIDING_RANGE"},
 finance:{spreadsheetId:"1hiX9lF74ys7OtISK4b5Xh1M0vPJN1AmafY2XfsGN7kI",rangeEnv:"GOOGLE_FINANCE_RANGE"},
} as const;
export type SheetDataset=keyof typeof datasets;
type Cell=string|number|boolean|null;

export async function readSheetDataset(dataset:SheetDataset){
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
 const privateKey=process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g,"\n");
 const config=datasets[dataset];
 const range=process.env[config.rangeEnv];
 if(!email||!privateKey||!range)throw new Error("Google Sheets server credentials atau range belum dikonfigurasi.");
 const auth=new JWT({email,key:privateKey,scopes:["https://www.googleapis.com/auth/spreadsheets.readonly"]});
 const token=await auth.getAccessToken();
 if(!token.token)throw new Error("Tidak dapat membuat Google access token.");
 const endpoint=`https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${encodeURIComponent(range)}?majorDimension=ROWS`;
 const response=await fetch(endpoint,{headers:{Authorization:`Bearer ${token.token}`},cache:"no-store"});
 if(!response.ok)throw new Error(`Google Sheets API merespons ${response.status}.`);
 const payload=await response.json() as {values?:Cell[][]};
 const [header=[], ...values]=payload.values??[];
 const headers=header.map(value=>String(value??"").trim());
 const rows=values.map(row=>Object.fromEntries(headers.map((name,index)=>[name,row[index]??null])));
 return {dataset,range,rows,lastUpdated:new Date().toISOString()};
}
