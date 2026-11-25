import fs from 'node:fs';import {Interface,getAddress} from 'ethers';import {fileURLToPath} from 'node:url';
export const TOKEN='0x456569838f1d43009A91ebA4263147Afd7233483';
export function units(s){if(typeof s!=='string'||! /^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,6})?$/.test(s))throw Error('Use a plain positive decimal with at most6 places');const [a,b='']=s.split('.');const n=BigInt(a)*1000000n+BigInt(b.padEnd(6,'0'));if(n<=0n||n>1000000000000n)throw Error('Amount outside invoice cap');return n;}
const address=s=>{const a=getAddress(s);if(/^0x0{40}$/i.test(a))throw Error('Zero address');return a;};
const hash=s=>{if(!/^0x[0-9a-fA-F]{64}$/.test(s)||/^0x0{64}$/i.test(s))throw Error('Need nonzero bytes32');return s;};
export function prepare(compiled,op,args){const abi=new Interface(compiled.contracts.PayeeLock.abi);let to=null,data,summary;
 if(op==='deploy'&&args.length===0){data='0x'+compiled.contracts.PayeeLock.evm.bytecode.object;summary={operation:'deploy'};}
 else if(op==='create'&&args.length===6){
 const[lock,ref,payer,amount,expiry,terms]=args;const ms=Date.parse(expiry);if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(expiry)||!Number.isFinite(ms)||new Date(ms).toISOString().replace('.000Z','Z')!==expiry||ms<=Date.now()||ms>Date.now()+30*86400000)throw Error('Future UTC expiry within30days required');
 to=address(lock);data=abi.encodeFunctionData('create',[hash(ref),address(payer),units(amount),Math.floor(ms/1000),hash(terms)]);summary={operation:op,payer:getAddress(payer),amount_base_units:String(units(amount)),expiry,terms};
 }else if(op==='approve'&&args.length===2){to=TOKEN;const[lock,amount]=args;const n=units(amount);data=new Interface(['function approve(address,uint256)']).encodeFunctionData('approve',[address(lock),n]);summary={operation:op,spender:getAddress(lock),exact_allowance:String(n)};}
 else if(op==='pay'&&args.length===5){const[lock,invoice,amount,payee,terms]=args;to=address(lock);data=abi.encodeFunctionData('pay',[hash(invoice),units(amount),address(payee),hash(terms)]);summary={operation:op,expected_payee:getAddress(payee),max_base_units:String(units(amount)),terms};}
 else throw Error('Usage: deploy | create LOCK REF PAYER AMOUNT UTC_EXPIRY TERMS | approve LOCK AMOUNT | pay LOCK INVOICE MAX PAYEE TERMS');
 return {chainId:44005,token:TOKEN,decimals:6,to,data,value:'0x0',signed:false,broadcast:false,summary,warning:'Unsigned review only. Verify actual contract code, invoice recipient/terms/expiry and exact allowance before personal testnet signing. No mainnet, funds or credentials accessed.'};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){try{const c=JSON.parse(fs.readFileSync((process.env.STATE_DIRECTORY||'build')+'/contracts.json'));const[op,...a]=process.argv.slice(2);console.log(JSON.stringify(prepare(c,op,a),null,2));}catch(e){console.error(e.message);process.exitCode=1;}}