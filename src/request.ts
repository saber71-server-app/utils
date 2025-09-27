import axios from "axios";

export interface Request {
  get: typeof axios.get;
  post: typeof axios.post;
  postForm: typeof axios.postForm;
  delete: typeof axios.delete;
  put: typeof axios.put;
  putForm: typeof axios.putForm;
  patch: typeof axios.patch;
  patchForm: typeof axios.patchForm;
  request: typeof axios.request;
}

export function request(baseURL: Promise<string> | string): Request {
  async function doRequest(methodName: string, ...args: any) {
    let url = baseURL;
    if (typeof url !== "string") url = await url;
    return (axios.create({ baseURL: url }) as any)[methodName](...args);
  }

  return {
    get(...args) {
      return doRequest("get", ...args);
    },
    post(...args) {
      return doRequest("post", ...args);
    },
    postForm(...args) {
      return doRequest("postForm", ...args);
    },
    delete(...args) {
      return doRequest("delete", ...args);
    },
    put(...args) {
      return doRequest("put", ...args);
    },
    putForm(...args) {
      return doRequest("putForm", ...args);
    },
    patch(...args) {
      return doRequest("patch", ...args);
    },
    patchForm(...args) {
      return doRequest("patchForm", ...args);
    },
    request(...args) {
      return doRequest("request", ...args);
    },
  };
}
