const appId = '4207484715258766727';
const appSecret = 'nyVBuXh6JU97bXDD2SSG';

async function test1() {
  console.log('Testing exactly user URL (POST) ...');
  const url = `https://oauth.zaloapp.com/v4/oa/access_token?app_id=${appId}&app_secret=${appSecret}&grant_type=client_credentials`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  console.log('User URL POST:', await res.json());
}

async function test2() {
  console.log('Testing header secret_key ...');
  const url = `https://oauth.zaloapp.com/v4/oa/access_token`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/x-www-form-urlencoded',
      'secret_key': appSecret 
    },
    body: new URLSearchParams({
      app_id: appId,
      grant_type: 'client_credentials'
    }).toString()
  });
  console.log('Header POST:', await res.json());
}

async function run() {
  await test1();
  await test2();
}

run();
