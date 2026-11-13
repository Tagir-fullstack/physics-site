import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sameRequestOrigin, readLimitedBody, readLimitedJson, RequestBodyError } from '../api/_lib/requestSecurity.js'
import teacher from '../api/teacher-platform.js'
import student from '../api/student-platform.js'
import upload from '../api/test-upload.js'
import ktpUpload from '../api/ktp/upload.js'
import ktp from '../api/ktp/[id].js'

const request = (body: unknown, headers: Record<string, string> = {}) => ({ body, headers: { host: 'localhost:5173', ...headers } }) as VercelRequest
assert.ok(sameRequestOrigin(request(null, { origin: 'http://localhost:5173' })))
assert.ok(sameRequestOrigin(request(null)))
for (const origin of ['null', 'https://other.example', 'http://localhost:5173.evil.example', 'http://localhost:5173/path', 'https://localhost:5173', 'http://localhost:5173@other.example']) assert.equal(sameRequestOrigin(request(null, { origin })), false)
assert.equal(sameRequestOrigin(request(null, { origin: 'http://localhost:5173', 'sec-fetch-site': 'cross-site' })), false)
assert.deepEqual(await readLimitedJson(request('{"action":"start"}')), { action: 'start' })
for (const body of ['[1]', 'null', 'oops']) await assert.rejects(readLimitedJson(request(body)), RequestBodyError)
await assert.rejects(readLimitedBody(request('12345'), 4), error => error instanceof RequestBodyError && error.status === 413)
await assert.rejects(readLimitedBody(request('', { 'content-length': '100' }), 4), RequestBodyError)
const stream = Readable.from([Buffer.alloc(3), Buffer.alloc(3), Buffer.alloc(100)]) as unknown as VercelRequest
stream.headers = {}
await assert.rejects(readLimitedBody(stream, 4), RequestBodyError)
const small = Readable.from([Buffer.from('ab'), Buffer.from('cd')]) as unknown as VercelRequest; small.headers = {}
assert.equal((await readLimitedBody(small, 4)).toString(), 'abcd')
// Rejection happens before authentication, DB access or upload parsing.
for (const handler of [teacher, student, upload, ktpUpload, ktp]) {
  let status = 0
  const req = { method: 'POST', query: {}, headers: { host: 'localhost:5173', origin: 'https://other.example' }, cookies: {} } as unknown as VercelRequest
  const res = { setHeader() {}, status(code: number) { status = code; return res }, json() { return res } } as unknown as VercelResponse
  await handler(req, res)
  assert.equal(status, 403)
}
console.log('PASS: foreign/null/confused origins rejected before protected operations; local requests retained; invalid, declared and streamed oversized bodies rejected')
