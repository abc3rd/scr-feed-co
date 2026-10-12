import test from 'node:test';
import assert from 'node:assert/strict';
import { createCustomerHandler } from '../base44/functions/customerApi/handler.js';
function fixture(options = {}) {
  const events = [];
  const user = options.user === undefined ? { id: 'owner', role: 'user', email: 'owner@example.test' } : options.user;
  const entities = {};
  for (const name of ['CustomerProfile','Product','Order','TruckArrival','CustomerConsent','User']) {
    entities[name] = {
      filter: async (query) => { events.push([name,'filter',query]); return options[name] || []; },
      list: async () => { events.push([name,'list']); return options[name] || []; },
      get: async (id) => { events.push([name,'get',id]); return options.order || null; },
      create: async (data) => { events.push([name,'create',data]); return {id:'stored',...data}; },
      update: async (id,data) => { events.push([name,'update',id,data]); return {id,...data}; },
      deleteMany: async (query) => { events.push([name,'deleteMany',query]); },
      delete: async (id) => { events.push([name,'delete',id]); if (options.deleteError) throw options.deleteError; },
    };
  }
  const handler = createCustomerHandler({ createClient: () => ({
    auth: { me: async () => { if(options.authError)throw options.authError; return user; } },
    asServiceRole: { entities },
  }) });
  const call = (action,input={}) => handler(new Request('https://example.test/functions/customerApi',{
    method:'POST',body:JSON.stringify({action,input}),
  }));
  return {call,events};
}
test('anonymous callers cannot access any customer data or mutate it',async()=>{
  for(const action of ['me','dashboard','order','yard','updateProfile','deleteAccount','saveConsent','member','myQr','checkout']){
    const {call,events}=fixture({user:null});
    assert.equal((await call(action)).status,401);assert.equal(events.length,0);
  }
});
test('forged or expired credentials return 401 without database access',async()=>{
  const {call,events}=fixture({authError:{status:401}});
  assert.equal((await call('me',{user_id:'someone-else'})).status,401);assert.equal(events.length,0);
});
test('dashboard scope always uses verified user identity',async()=>{
  const {call,events}=fixture();
  const response=await call('dashboard',{location:'LaBelle',user_id:'someone-else'});
  assert.equal(response.status,200);
  const data=await response.json();assert.deepEqual(data.activeOrders,[]);assert.deepEqual(data.categories,[]);
  assert.deepEqual(events.find(e=>e[0]==='Order')[2],{user_id:'owner',location:'LaBelle'});
  assert.equal(data.checkout.enabled,false);
});
test('profile writes whitelist fields and cannot change owner or role',async()=>{
  const {call,events}=fixture();
  assert.equal((await call('updateProfile',{firstName:'Real',lastName:'Customer',email:'customer@example.test',preferredStore:'LaBelle',user_id:'victim',role:'admin'})).status,200);
  const data=events.find(e=>e[0]==='CustomerProfile'&&e[1]==='create')[2];
  assert.equal(data.user_id,'owner');assert.equal(data.role,undefined);
});
test('order detail does not disclose another customer order',async()=>{
  const {call}=fixture({order:{id:'private',user_id:'victim'}});
  const response=await call('order',{id:'private'});assert.equal(response.status,404);
  assert.doesNotMatch(await response.text(),/victim/);
});
test('yard access rejects customers before reading store orders',async()=>{
  const {call,events}=fixture();assert.equal((await call('yard')).status,403);assert.equal(events.length,0);
});
test('checkout cannot fabricate a card authorization or mutate inventory',async()=>{
  const {call,events}=fixture();assert.equal((await call('checkout',{lines:[{sku:'SKU',qty:1}]})).status,503);
  assert.equal(events.length,0);
});
test('member QR is stable for owner and never grants anonymous access',async()=>{
  const owner=fixture();const qr=await (await owner.call('myQr')).json();assert.match(qr.token,/^[a-f0-9]{64}$/);
  assert.equal((await owner.call('member',{token:qr.token})).status,200);
  const other=fixture({user:{id:'other',role:'user'}});
  assert.equal((await other.call('member',{token:qr.token})).status,404);
  assert.equal(other.events.some(e=>e[0]==='Order'),false);
});
test('deletion requires confirmation and blocks unsettled orders',async()=>{
  const {call,events}=fixture({Order:[{id:'active',status:'Picking',user_id:'owner'}]});
  assert.equal((await call('deleteAccount')).status,400);
  assert.equal((await call('deleteAccount',{confirm:true})).status,409);
  assert.equal(events.some(e=>['delete','deleteMany','update'].includes(e[1])),false);
});
test('deletion anonymizes completed orders and reports success only after user deletion',async()=>{
  const {call,events}=fixture({Order:[{id:'complete',status:'Done',user_id:'owner'}]});
  const response=await call('deleteAccount',{confirm:true});assert.equal(response.status,200);
  assert.deepEqual(events.find(e=>e[0]==='Order'&&e[1]==='update'),['Order','update','complete',{user_id:null}]);
  assert.deepEqual(events.at(-1),['User','delete','owner']);assert.equal((await response.json()).deleted,true);
});
test('failed platform user deletion never reports successful account deletion',async()=>{
  const {call}=fixture({deleteError:new Error('provider secret')});
  const response=await call('deleteAccount',{confirm:true});assert.equal(response.status,503);
  assert.doesNotMatch(await response.text(),/deleted|secret/);
});
test('consent accepts explicit preferences only and stores verified identity',async()=>{
  const {call,events}=fixture();
  assert.equal((await call('saveConsent',{smsConsent:'true',phone:'1234567890'})).status,400);
  const response=await call('saveConsent',{smsConsent:false,emailConsent:true,email:'member@example.test',user_id:'victim'});
  assert.equal(response.status,200);
  const data=events.find(e=>e[0]==='CustomerConsent'&&e[1]==='create')[2];
  assert.equal(data.user_id,'owner');assert.equal(data.sms_consent,false);assert.ok(data.recorded_at);
});
test('excessive input is rejected before database access',async()=>{
  const {events,call}=fixture();assert.equal((await call('updateProfile',{padding:'x'.repeat(33000)})).status,413);assert.equal(events.length,0);
});
