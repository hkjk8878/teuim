/* 0교시 시험 트래커 — Cloudflare Worker
   KV 네임스페이스를 KV 라는 이름으로 연결하세요.

   GET  /load?room=exam-tracker      → { rev, data }
   POST /sync  { room, rev, data }   → rev 가 더 큰 쪽만 저장
*/

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    const json = (o, s = 200) => new Response(JSON.stringify(o), {
      status: s, headers: { ...cors, 'Content-Type': 'application/json' }
    });

    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

    if (url.pathname === '/load') {
      const room = url.searchParams.get('room');
      if (!room) return json({ error: 'room 없음' }, 400);
      const raw = await env.KV.get('room:' + room);
      return json(raw ? JSON.parse(raw) : { rev: 0, data: null });
    }

    if (url.pathname === '/sync' && req.method === 'POST') {
      let body;
      try { body = await req.json(); } catch (e) { return json({ error: '본문 오류' }, 400); }
      const { room, rev, data } = body || {};
      if (!room) return json({ error: 'room 없음' }, 400);

      const raw = await env.KV.get('room:' + room);
      const cur = raw ? JSON.parse(raw) : { rev: 0, data: null };

      // rev 가 더 큰 쪽만 저장 — 오래된 화면이 최신 기록을 덮어쓰는 사고를 막음
      if ((rev || 0) > (cur.rev || 0)) {
        await env.KV.put('room:' + room, JSON.stringify({ rev, data }));
        return json({ ok: true, rev });
      }
      return json({ ok: false, rev: cur.rev, data: cur.data });
    }

    return json({ ok: true, msg: '0교시 시험 트래커 worker' });
  }
};
