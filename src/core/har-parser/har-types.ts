/**
 * HAR (HTTP Archive) format types
 * Based on HAR 1.2 specification
 */

export interface HAR {
  log: HARLog;
}

export interface HARLog {
  version: string;
  creator: HARCreator;
  entries: HAREntry[];
  pages?: HARPage[];
  comment?: string;
}

export interface HARCreator {
  name: string;
  version: string;
  comment?: string;
}

export interface HARPage {
  startedDateTime: string;
  id: string;
  title: string;
  pageTimings: HARPageTimings;
  comment?: string;
}

export interface HARPageTimings {
  onContentLoad: number;
  onLoad: number;
  comment?: string;
}

export interface HAREntry {
  pageref?: string;
  startedDateTime: string;
  time: number;
  request: HARRequest;
  response: HARResponse;
  cache: HARCache;
  timings: HARTimings;
  serverIPAddress?: string;
  connection?: string;
  comment?: string;
}

export interface HARRequest {
  method: string;
  url: string;
  httpVersion: string;
  headers: HARHeader[];
  queryString: HARQueryParam[];
  postData?: HARPostData;
  headersSize: number;
  bodySize: number;
  comment?: string;
}

export interface HARResponse {
  status: number;
  statusText: string;
  httpVersion: string;
  headers: HARHeader[];
  cookies: HARCookie[];
  content: HARContent;
  redirectURL: string;
  headersSize: number;
  bodySize: number;
  comment?: string;
}

export interface HARHeader {
  name: string;
  value: string;
  comment?: string;
}

export interface HARQueryParam {
  name: string;
  value: string;
  comment?: string;
}

export interface HARPostData {
  mimeType: string;
  params: HARPostParam[];
  text?: string;
  comment?: string;
}

export interface HARPostParam {
  name: string;
  value?: string;
  fileName?: string;
  contentType?: string;
  comment?: string;
}

export interface HARCookie {
  name: string;
  value: string;
  path?: string;
  domain?: string;
  expires?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
  comment?: string;
}

export interface HARCache {
  beforeRequest: HARCacheDetails | null;
  afterRequest: HARCacheDetails | null;
  comment?: string;
}

export interface HARCacheDetails {
  expires?: string;
  lastAccess: string;
  eTag: string;
  hitCount: number;
  comment?: string;
}

export interface HARContent {
  size: number;
  compression?: number;
  mimeType: string;
  text?: string;
  encoding?: string;
  comment?: string;
}

export interface HARTimings {
  blocked?: number;
  dns?: number;
  connect?: number;
  send: number;
  wait: number;
  receive: number;
  ssl?: number;
  comment?: string;
}
