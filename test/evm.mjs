import fs from 'node:fs';import assert from 'node:assert/strict';import {createVM} from '@ethereumjs/vm';import {Common,Mainnet,Hardfork} from '@ethereumjs/common';import {Account,createAddressFromString,hexToBytes,bytesToHex} from '@ethereumjs/util';import {createBlock} from '@ethereumjs/block';import {Interface,AbiCoder,id,zeroPadValue,toBeHex} from 'ethers';
export const compiled=JSON.parse(fs.readFileSync((process.env.STATE_DIRECTORY||'build')+'/contracts.json'));
export const abi=AbiCoder.defaultAbiCoder();export {id};
export const OWNER='0x1000000000000000000000000000000000000001',OTHER='0x2000000000000000000000000000000000000002',SYSTEM='0x8888888888888888888888888888888888888888',PROXY='0x476F44b11F5C942c58f4c8E3d0300E5710743585',CRON='0x0000000000000000000000000000000000fffFfF';
export async function chain(chainId){
 const common=new Common({chain:{...Mainnet,name:'local-simulation-'+chainId,chainId},hardfork:Hardfork.Shanghai});const vm=await createVM({common});
 await vm.stateManager.putAccount(createAddressFromString(OWNER),new Account(0n,10n**24n));return {vm,common,now:1000n};
}
function block(c){return createBlock({header:{number:100n,timestamp:c.now,gasLimit:30000000n,baseFeePerGas:1n}},{common:c.common,skipConsensusFormatValidation:true});}
export function artifact(name){return compiled.contracts[name];}
export function iface(name){return new Interface(artifact(name).abi);}
export async function deploy(c,name,args=[]){
 const data='0x'+artifact(name).evm.bytecode.object+iface(name).encodeDeploy(args).slice(2);
 const r=await c.vm.evm.runCall({caller:createAddressFromString(OWNER),origin:createAddressFromString(OWNER),data:hexToBytes(data),gasLimit:10000000n,block:block(c)});
 assert.equal(r.execResult.exceptionError,undefined,'deploy '+name+' '+bytesToHex(r.execResult.returnValue));return r.createdAddress.toString();
}
export async function invoke(c,address,name,method,args=[],sender=OWNER,allowFailure=false){
 const r=await c.vm.evm.runCall({caller:createAddressFromString(sender),origin:createAddressFromString(sender),to:createAddressFromString(address),data:hexToBytes(iface(name).encodeFunctionData(method,args)),gasLimit:900000n,block:block(c)});
 if(!allowFailure)assert.equal(r.execResult.exceptionError,undefined,'call '+name+'.'+method+' '+bytesToHex(r.execResult.returnValue));return r;
}
export async function read(c,address,name,method,args=[]){const r=await invoke(c,address,name,method,args);return iface(name).decodeFunctionResult(method,bytesToHex(r.execResult.returnValue));}

export const TOKEN='0x456569838f1d43009A91ebA4263147Afd7233483';
export async function setup(){const c=await chain(44005);await c.vm.stateManager.putAccount(createAddressFromString(TOKEN),new Account());await c.vm.stateManager.putCode(createAddressFromString(TOKEN),hexToBytes('0x'+artifact('MockToken').evm.deployedBytecode.object));await invoke(c,TOKEN,'MockToken','mint',[OTHER,20000000n]);const lock=await deploy(c,'PayeeLock');return {c,lock};}
export const terms=id('invoice terms v1'),ref=id('invoice 001');
export async function create(f,payer=OTHER,amount=1500000n,expiry=1100n){await invoke(f.c,f.lock,'PayeeLock','create',[ref,payer,amount,expiry,terms]);return (await read(f.c,f.lock,'PayeeLock','invoiceId',[OWNER,ref]))[0];}
export async function pay(f,invoice,max=1500000n,payee=OWNER,t=terms,sender=OTHER,fail=false){return invoke(f.c,f.lock,'PayeeLock','pay',[invoice,max,payee,t],sender,fail);}
export async function approve(f,amount=1500000n){return invoke(f.c,TOKEN,'MockToken','approve',[f.lock,amount],OTHER);}
