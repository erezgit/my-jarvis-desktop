"use strict";
const electron = require("electron");
const utils = require("@electron-toolkit/utils");
const path = require("path");
const fs = require("fs/promises");
const os = require("os");
const node_fs = require("node:fs");
const node_os = require("node:os");
const node_path = require("node:path");
const process$1 = require("node:process");
const logtape = require("@logtape/logtape");
const pretty = require("@logtape/pretty");
const claudeCode = require("@anthropic-ai/claude-code");
const node_child_process = require("node:child_process");
const http = require("http");
const http2 = require("http2");
const stream = require("stream");
const crypto = require("crypto");
const fs$1 = require("fs");
const express = require("express");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const os__namespace = /* @__PURE__ */ _interopNamespaceDefault(os);
const crypto__namespace = /* @__PURE__ */ _interopNamespaceDefault(crypto);
const fs__namespace$1 = /* @__PURE__ */ _interopNamespaceDefault(fs$1);
let handlersRegistered = false;
const registerFileHandlers = (mainWindow) => {
  if (handlersRegistered) {
    return;
  }
  electron.ipcMain.handle("get-home-dir", () => {
    return os__namespace.homedir();
  });
  electron.ipcMain.handle("select-directory", async () => {
    const result = await electron.dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
      title: "Select Directory",
      buttonLabel: "Select Folder"
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });
  electron.ipcMain.handle("read-directory", async (event, dirPath) => {
    try {
      const items = await fs__namespace.readdir(dirPath, { withFileTypes: true });
      const filteredItems = items.filter((item) => item.name !== ".DS_Store");
      const results = await Promise.all(filteredItems.map(async (item) => {
        const fullPath = path__namespace.join(dirPath, item.name);
        const stats = await fs__namespace.stat(fullPath);
        return {
          name: item.name,
          path: fullPath,
          isDirectory: item.isDirectory(),
          size: stats.size,
          modified: stats.mtime.toISOString(),
          // Convert Date to string
          extension: item.isDirectory() ? "" : path__namespace.extname(item.name)
        };
      }));
      results.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
      return results;
    } catch (error) {
      return [];
    }
  });
  electron.ipcMain.handle("read-file", async (event, filePath) => {
    try {
      const content = await fs__namespace.readFile(filePath, "utf-8");
      const stats = await fs__namespace.stat(filePath);
      return {
        content,
        path: filePath,
        name: path__namespace.basename(filePath),
        size: stats.size,
        modified: stats.mtime.toISOString(),
        // Convert Date to string
        extension: path__namespace.extname(filePath)
      };
    } catch (error) {
      return null;
    }
  });
  handlersRegistered = true;
};
async function createAppWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    center: true,
    minimizable: true,
    maximizable: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
      // Allow local file access for audio files
    }
  });
  mainWindow.on("ready-to-show", () => {
    console.log("Window ready to show, attempting to display...");
    try {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.setAlwaysOnTop(true);
      mainWindow.setAlwaysOnTop(false);
      console.log("Window should now be visible");
    } catch (error) {
      console.error("Error showing window:", error);
    }
  });
  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
    console.error("Window failed to load:", errorCode, errorDescription);
  });
  mainWindow.webContents.on("crashed", () => {
    console.error("Window crashed!");
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  registerFileHandlers(mainWindow);
  const devPort = process.env.JARVIS_DEV_PORT || "8081";
  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL(`http://127.0.0.1:${devPort}`);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL("http://127.0.0.1:8081");
  }
  return mainWindow;
}
var compose = (middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
  };
};
var GET_MATCH_RESULT = Symbol();
var parseBody = async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
};
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
var handleParsingAllValues = (form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
};
var handleParsingNestedValues = (form, key, value) => {
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
};
var splitPath = (path2) => {
  const paths = path2.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
};
var splitRoutingPath = (routePath) => {
  const { groups, path: path2 } = extractGroupsFromPath(routePath);
  const paths = splitPath(path2);
  return replaceGroupMarks(paths, groups);
};
var extractGroupsFromPath = (path2) => {
  const groups = [];
  path2 = path2.replace(/\{[^}]+\}/g, (match, index) => {
    const mark = `@${index}`;
    groups.push([mark, match]);
    return mark;
  });
  return { groups, path: path2 };
};
var replaceGroupMarks = (paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
};
var patternCache = {};
var getPattern = (label, next) => {
  if (label === "*") {
    return "*";
  }
  const match = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match) {
    const cacheKey2 = `${label}#${next}`;
    if (!patternCache[cacheKey2]) {
      if (match[2]) {
        patternCache[cacheKey2] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey2, match[1], new RegExp(`^${match[2]}(?=/${next})`)] : [label, match[1], new RegExp(`^${match[2]}$`)];
      } else {
        patternCache[cacheKey2] = [label, match[1], true];
      }
    }
    return patternCache[cacheKey2];
  }
  return null;
};
var tryDecode = (str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match) => {
      try {
        return decoder(match);
      } catch {
        return match;
      }
    });
  }
};
var tryDecodeURI = (str) => tryDecode(str, decodeURI);
var getPath = (request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const path2 = url.slice(start, queryIndex === -1 ? void 0 : queryIndex);
      return tryDecodeURI(path2.includes("%25") ? path2.replace(/%25/g, "%2525") : path2);
    } else if (charCode === 63) {
      break;
    }
  }
  return url.slice(start, i);
};
var getPathNoStrict = (request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
};
var mergePath = (base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
};
var checkOptionalParameter = (path2) => {
  if (path2.charCodeAt(path2.length - 1) !== 63 || !path2.includes(":")) {
    return null;
  }
  const segments = path2.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
};
var _decodeURI = (value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
};
var _getQueryParam = (url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf(`?${key}`, 8);
    if (keyIndex2 === -1) {
      keyIndex2 = url.indexOf(`&${key}`, 8);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
};
var getQueryParam = _getQueryParam;
var getQueryParams = (url, key) => {
  return _getQueryParam(url, key, true);
};
var decodeURIComponent_ = decodeURIComponent;
var tryDecodeURIComponent = (str) => tryDecode(str, decodeURIComponent_);
var HonoRequest = class {
  raw;
  #validatedData;
  #matchResult;
  routeIndex = 0;
  path;
  bodyCache = {};
  constructor(request, path2 = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path2;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return this.bodyCache.parsedBody ??= await parseBody(this, options);
  }
  #cachedBody = (key) => {
    const { bodyCache, raw } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw[key]();
  };
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  text() {
    return this.#cachedBody("text");
  }
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  blob() {
    return this.#cachedBody("blob");
  }
  formData() {
    return this.#cachedBody("formData");
  }
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  get url() {
    return this.raw.url;
  }
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};
var HtmlEscapedCallbackPhase = {
  Stringify: 1
};
var resolveCallback = async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  {
    return resStr;
  }
};
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = (contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
};
var Context = class {
  #rawRequest;
  #req;
  env = {};
  #var;
  finalized = false;
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  get res() {
    return this.#res ||= new Response(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  set res(_res) {
    if (this.#res && _res) {
      _res = new Response(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  render = (...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  };
  setLayout = (layout) => this.#layout = layout;
  getLayout = () => this.#layout;
  setRenderer = (renderer) => {
    this.#renderer = renderer;
  };
  header = (name, value, options) => {
    if (this.finalized) {
      this.#res = new Response(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  };
  status = (status) => {
    this.#status = status;
  };
  set = (key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  };
  get = (key) => {
    return this.#var ? this.#var.get(key) : void 0;
  };
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return new Response(data, { status, headers: responseHeaders });
  }
  newResponse = (...args) => this.#newResponse(...args);
  body = (data, arg, headers) => this.#newResponse(data, arg, headers);
  text = (text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  };
  json = (object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  };
  html = (html, arg, headers) => {
    const res = (html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers));
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  };
  redirect = (location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  };
  notFound = () => {
    this.#notFoundHandler ??= () => new Response();
    return this.#notFoundHandler(this);
  };
};
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
};
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";
var notFoundHandler = (c) => {
  return c.text("404 Not Found", 404);
};
var errorHandler = (err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
};
var Hono$1 = class Hono {
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  router;
  getPath;
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path2, ...handlers) => {
      for (const p of [path2].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new Hono$1({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  errorHandler = errorHandler;
  route(path2, app) {
    const subApp = this.basePath(path2);
    app.routes.map((r) => {
      let handler;
      if (app.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = async (c, next) => (await compose([], app.errorHandler)(c, () => r.handler(c, next))).res;
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler);
    });
    return this;
  }
  basePath(path2) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path2);
    return subApp;
  }
  onError = (handler) => {
    this.errorHandler = handler;
    return this;
  };
  notFound = (handler) => {
    this.#notFoundHandler = handler;
    return this;
  };
  mount(path2, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = (request) => request;
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path2);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = url.pathname.slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    };
    this.#addRoute(METHOD_NAME_ALL, mergePath(path2, "*"), handler);
    return this;
  }
  #addRoute(method, path2, handler) {
    method = method.toUpperCase();
    path2 = mergePath(this._basePath, path2);
    const r = { basePath: this._basePath, path: path2, method, handler };
    this.router.add(method, path2, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path2 = this.getPath(request, { env });
    const matchResult = this.router.match(method, path2);
    const c = new Context(request, {
      path: path2,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  fetch = (request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  };
  request = (input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  };
  fire = () => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  };
};
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
var Node$1 = class Node {
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new Node$1();
        if (name !== "") {
          node.#varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new Node$1();
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};
var Trie = class {
  #context = { varIndex: 0 };
  #root = new Node$1();
  insert(path2, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path2 = path2.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path2.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};
var emptyParam = [];
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path2) {
  return wildcardRegExpCache[path2] ??= new RegExp(
    path2 === "*" ? "" : `^${path2.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path2, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path2] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path2, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path2) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
function findMiddleware(middleware, path2) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path2)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
var RegExpRouter = class {
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path2, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path2 === "/*") {
      path2 = "*";
    }
    const paramCount = (path2.match(/\/:/g) || []).length;
    if (/\*$/.test(path2)) {
      const re = buildWildcardRegExp(path2);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path2] ||= findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || [];
        });
      } else {
        middleware[method][path2] ||= findMiddleware(middleware[method], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path2) || [path2];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path22 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path22] ||= [
            ...findMiddleware(middleware[m], path22) || findMiddleware(middleware[METHOD_NAME_ALL], path22) || []
          ];
          routes[m][path22].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match(method, path2) {
    clearWildcardRegExpCache();
    const matchers = this.#buildAllMatchers();
    this.match = (method2, path22) => {
      const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
      const staticMatch = matcher[2][path22];
      if (staticMatch) {
        return staticMatch;
      }
      const match = path22.match(matcher[0]);
      if (!match) {
        return [[], emptyParam];
      }
      const index = match.indexOf("", 1);
      return [matcher[1][index], match];
    };
    return this.match(method, path2);
  }
  #buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path2) => [path2, r[method][path2]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path2) => [path2, r[METHOD_NAME_ALL][path2]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};
var SmartRouter = class {
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path2, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path2, handler]);
  }
  match(method, path2) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path2);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};
var emptyParams = /* @__PURE__ */ Object.create(null);
var Node2 = class {
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path2, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path2);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #getHandlerSets(node, method, nodeParams, params) {
    const handlerSets = [];
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
    return handlerSets;
  }
  search(method, path2) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path2);
    const curNodesQueue = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              handlerSets.push(
                ...this.#getHandlerSets(nextNode.#children["*"], method, node.#params)
              );
            }
            handlerSets.push(...this.#getHandlerSets(nextNode, method, node.#params));
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              handlerSets.push(...this.#getHandlerSets(astNode, method, node.#params));
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          const restPathString = parts.slice(i).join("/");
          if (matcher instanceof RegExp) {
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              handlerSets.push(...this.#getHandlerSets(child, method, node.#params, params));
              if (Object.keys(child.#children).length) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              handlerSets.push(...this.#getHandlerSets(child, method, params, node.#params));
              if (child.#children["*"]) {
                handlerSets.push(
                  ...this.#getHandlerSets(child.#children["*"], method, params, node.#params)
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      curNodes = tempNodes.concat(curNodesQueue.shift() ?? []);
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};
var TrieRouter = class {
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path2, handler) {
    const results = checkOptionalParameter(path2);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path2, handler);
  }
  match(method, path2) {
    return this.#node.search(method, path2);
  }
};
var Hono2 = class extends Hono$1 {
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};
var cors = (options) => {
  const defaults = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    allowHeaders: [],
    exposeHeaders: []
  };
  const opts = {
    ...defaults,
    ...options
  };
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return optsAllowMethods;
    } else if (Array.isArray(optsAllowMethods)) {
      return () => optsAllowMethods;
    } else {
      return () => [];
    }
  })(opts.allowMethods);
  return async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.origin !== "*") {
      const existingVary = c.req.header("Vary");
      if (existingVary) {
        set("Vary", existingVary);
      } else {
        set("Vary", "Origin");
      }
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (opts.exposeHeaders?.length) {
      set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
    }
    if (c.req.method === "OPTIONS") {
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods.length) {
        set("Access-Control-Allow-Methods", allowMethods.join(","));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set("Access-Control-Allow-Headers", headers.join(","));
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
  };
};
var createMiddleware = (middleware) => middleware;
function createConfigMiddleware(options) {
  return createMiddleware(async (c, next) => {
    c.set("config", options);
    await next();
  });
}
async function readTextFile(path2) {
  return await node_fs.promises.readFile(path2, "utf8");
}
async function readBinaryFile(path2) {
  const buffer = await node_fs.promises.readFile(path2);
  return new Uint8Array(buffer);
}
async function writeTextFile(path2, content, options) {
  await node_fs.promises.writeFile(path2, content, "utf8");
  if (options?.mode !== void 0) {
    await node_fs.promises.chmod(path2, options.mode);
  }
}
async function exists(path2) {
  try {
    await node_fs.promises.access(path2, node_fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
async function stat(path2) {
  const stats = await node_fs.promises.stat(path2);
  return {
    isFile: stats.isFile(),
    isDirectory: stats.isDirectory(),
    isSymlink: stats.isSymbolicLink(),
    size: stats.size,
    mtime: stats.mtime
  };
}
async function* readDir(path2) {
  const entries = await node_fs.promises.readdir(path2, { withFileTypes: true });
  for (const entry of entries) {
    yield {
      name: entry.name,
      isFile: entry.isFile(),
      isDirectory: entry.isDirectory(),
      isSymlink: entry.isSymbolicLink()
    };
  }
}
async function withTempDir(callback) {
  const tempDir = await node_fs.promises.mkdtemp(node_path.join(node_os.tmpdir(), "claude-code-webui-temp-"));
  try {
    return await callback(tempDir);
  } finally {
    try {
      await node_fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch {
    }
  }
}
function getEnv(key) {
  return process$1.env[key];
}
function getPlatform() {
  switch (process$1.platform) {
    case "win32":
      return "windows";
    case "darwin":
      return "darwin";
    case "linux":
      return "linux";
    default:
      return "linux";
  }
}
function getHomeDir() {
  try {
    return node_os.homedir();
  } catch {
    return void 0;
  }
}
function exit(code) {
  process$1.exit(code);
}
async function getEncodedProjectName(projectPath) {
  const homeDir = getHomeDir();
  if (!homeDir) {
    return null;
  }
  const projectsDir = `${homeDir}/.claude/projects`;
  try {
    const entries = [];
    for await (const entry of readDir(projectsDir)) {
      if (entry.isDirectory) {
        entries.push(entry.name);
      }
    }
    const normalizedPath = projectPath.replace(/\/$/, "");
    const expectedEncoded = normalizedPath.replace(/[/\\:.]/g, "-");
    if (entries.includes(expectedEncoded)) {
      return expectedEncoded;
    }
    return null;
  } catch {
    return null;
  }
}
function validateEncodedProjectName(encodedName) {
  if (!encodedName) {
    return false;
  }
  const dangerousChars = /[<>:"|?*\x00-\x1f\/\\]/;
  if (dangerousChars.test(encodedName)) {
    return false;
  }
  return true;
}
let isConfigured = false;
async function setupLogger(debugMode) {
  if (isConfigured) {
    return;
  }
  const lowestLevel = "debug";
  await logtape.configure({
    sinks: {
      console: logtape.getConsoleSink({
        formatter: pretty.getPrettyFormatter({
          icons: false,
          // Remove emoji icons
          align: false,
          // Disable column alignment for cleaner output
          inspectOptions: {
            depth: Infinity,
            // Unlimited depth for complex objects
            colors: true,
            // Keep syntax highlighting
            compact: false
            // Use readable formatting
          }
        })
      })
    },
    loggers: [
      {
        category: [],
        lowestLevel,
        sinks: ["console"]
      },
      // Suppress LogTape meta logger info messages
      {
        category: ["logtape", "meta"],
        lowestLevel: "warning",
        sinks: ["console"]
      }
    ]
  });
  isConfigured = true;
}
const logger = {
  // CLI and startup logging
  cli: logtape.getLogger(["cli"]),
  // Chat handling and streaming
  chat: logtape.getLogger(["chat"]),
  // History and conversation management
  history: logtape.getLogger(["history"]),
  // API handlers
  api: logtape.getLogger(["api"]),
  // General application logging
  app: logtape.getLogger(["app"])
};
async function handleProjectsRequest(c) {
  try {
    const homeDir = getHomeDir();
    if (!homeDir) {
      return c.json({ error: "Home directory not found" }, 500);
    }
    const claudeConfigPath = `${homeDir}/.claude.json`;
    try {
      const configContent = await readTextFile(claudeConfigPath);
      const config = JSON.parse(configContent);
      if (config.projects && typeof config.projects === "object") {
        const projectPaths = Object.keys(config.projects);
        const projects = [];
        for (const path2 of projectPaths) {
          const encodedName = await getEncodedProjectName(path2);
          if (encodedName) {
            projects.push({
              path: path2,
              encodedName
            });
          }
        }
        const response = { projects };
        return c.json(response);
      } else {
        const response = { projects: [] };
        return c.json(response);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("No such file")) {
        const response = { projects: [] };
        return c.json(response);
      }
      throw error;
    }
  } catch (error) {
    logger.api.error("Error reading projects: {error}", { error });
    return c.json({ error: "Failed to read projects" }, 500);
  }
}
async function parseHistoryFile(filePath) {
  try {
    const content = await readTextFile(filePath);
    const lines = content.trim().split("\n").filter((line) => line.trim());
    if (lines.length === 0) {
      return null;
    }
    const messages = [];
    const messageIds = /* @__PURE__ */ new Set();
    let startTime = "";
    let lastTime = "";
    let lastMessagePreview = "";
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        messages.push(parsed);
        if (parsed.message?.role === "assistant" && parsed.message?.id) {
          messageIds.add(parsed.message.id);
        }
        if (!startTime || parsed.timestamp < startTime) {
          startTime = parsed.timestamp;
        }
        if (!lastTime || parsed.timestamp > lastTime) {
          lastTime = parsed.timestamp;
        }
        if (parsed.message?.role === "assistant" && parsed.message?.content) {
          const content2 = parsed.message.content;
          if (Array.isArray(content2)) {
            for (const item of content2) {
              if (typeof item === "object" && item && "text" in item) {
                lastMessagePreview = String(item.text).substring(0, 100);
                break;
              }
            }
          } else if (typeof content2 === "string") {
            lastMessagePreview = content2.substring(0, 100);
          }
        }
      } catch (parseError) {
        logger.history.error(`Failed to parse line in ${filePath}: {error}`, {
          error: parseError
        });
      }
    }
    const fileName = filePath.split("/").pop() || "";
    const sessionId = fileName.replace(".jsonl", "");
    return {
      sessionId,
      filePath,
      messages,
      messageIds,
      startTime,
      lastTime,
      messageCount: messages.length,
      lastMessagePreview: lastMessagePreview || "No preview available"
    };
  } catch (error) {
    logger.history.error(`Failed to read history file ${filePath}: {error}`, {
      error
    });
    return null;
  }
}
async function getHistoryFiles(historyDir) {
  try {
    const files = [];
    for await (const entry of readDir(historyDir)) {
      if (entry.isFile && entry.name.endsWith(".jsonl")) {
        files.push(`${historyDir}/${entry.name}`);
      }
    }
    return files;
  } catch {
    return [];
  }
}
async function parseAllHistoryFiles(historyDir) {
  const filePaths = await getHistoryFiles(historyDir);
  const results = [];
  for (const filePath of filePaths) {
    const parsed = await parseHistoryFile(filePath);
    if (parsed) {
      results.push(parsed);
    }
  }
  return results;
}
function isSubset(subset, superset) {
  if (subset.size > superset.size) {
    return false;
  }
  for (const item of subset) {
    if (!superset.has(item)) {
      return false;
    }
  }
  return true;
}
function groupConversations(conversationFiles) {
  if (conversationFiles.length === 0) {
    return [];
  }
  const sortedConversations = [...conversationFiles].sort((a, b) => {
    return a.messageIds.size - b.messageIds.size;
  });
  const uniqueConversations = [];
  for (const currentConv of sortedConversations) {
    const isSubsetOfExisting = uniqueConversations.some(
      (existingConv) => isSubset(currentConv.messageIds, existingConv.messageIds)
    );
    if (!isSubsetOfExisting) {
      uniqueConversations.push(currentConv);
    }
  }
  const summaries = uniqueConversations.map(
    (conv) => createConversationSummary(conv)
  );
  summaries.sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );
  return summaries;
}
function createConversationSummary(conversationFile) {
  return {
    sessionId: conversationFile.sessionId,
    startTime: conversationFile.startTime,
    lastTime: conversationFile.lastTime,
    messageCount: conversationFile.messageCount,
    lastMessagePreview: conversationFile.lastMessagePreview
  };
}
async function handleHistoriesRequest(c) {
  try {
    const encodedProjectName = c.req.param("encodedProjectName");
    if (!encodedProjectName) {
      return c.json({ error: "Encoded project name is required" }, 400);
    }
    if (!validateEncodedProjectName(encodedProjectName)) {
      return c.json({ error: "Invalid encoded project name" }, 400);
    }
    logger.history.debug(
      `Fetching histories for encoded project: ${encodedProjectName}`
    );
    const homeDir = getHomeDir();
    if (!homeDir) {
      return c.json({ error: "Home directory not found" }, 500);
    }
    const historyDir = `${homeDir}/.claude/projects/${encodedProjectName}`;
    logger.history.debug(`History directory: ${historyDir}`);
    try {
      const dirInfo = await stat(historyDir);
      if (!dirInfo.isDirectory) {
        return c.json({ error: "Project not found" }, 404);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("No such file")) {
        return c.json({ error: "Project not found" }, 404);
      }
      throw error;
    }
    const conversationFiles = await parseAllHistoryFiles(historyDir);
    logger.history.debug(
      `Found ${conversationFiles.length} conversation files`
    );
    const conversations = groupConversations(conversationFiles);
    logger.history.debug(
      `After grouping: ${conversations.length} unique conversations`
    );
    const response = {
      conversations
    };
    return c.json(response);
  } catch (error) {
    logger.history.error("Error fetching conversation histories: {error}", {
      error
    });
    return c.json(
      {
        error: "Failed to fetch conversation histories",
        details: error instanceof Error ? error.message : String(error)
      },
      500
    );
  }
}
function restoreTimestamps(messages) {
  const timestampMap = /* @__PURE__ */ new Map();
  for (const msg of messages) {
    if (msg.type === "assistant" && msg.message?.id) {
      const messageId = msg.message.id;
      if (!timestampMap.has(messageId)) {
        timestampMap.set(messageId, msg.timestamp);
      } else {
        const existingTimestamp = timestampMap.get(messageId);
        if (msg.timestamp < existingTimestamp) {
          timestampMap.set(messageId, msg.timestamp);
        }
      }
    }
  }
  return messages.map((msg) => {
    if (msg.type === "assistant" && msg.message?.id) {
      const restoredTimestamp = timestampMap.get(msg.message.id);
      if (restoredTimestamp) {
        return {
          ...msg,
          timestamp: restoredTimestamp
        };
      }
    }
    return msg;
  });
}
function sortMessagesByTimestamp(messages) {
  return [...messages].sort((a, b) => {
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });
}
function calculateConversationMetadata(messages) {
  if (messages.length === 0) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    return {
      startTime: now,
      endTime: now,
      messageCount: 0
    };
  }
  const sortedMessages = sortMessagesByTimestamp(messages);
  const startTime = sortedMessages[0].timestamp;
  const endTime = sortedMessages[sortedMessages.length - 1].timestamp;
  return {
    startTime,
    endTime,
    messageCount: messages.length
  };
}
function processConversationMessages(messages, _sessionId) {
  const restoredMessages = restoreTimestamps(messages);
  const sortedMessages = sortMessagesByTimestamp(restoredMessages);
  const metadata = calculateConversationMetadata(sortedMessages);
  return {
    messages: sortedMessages,
    metadata
  };
}
async function loadConversation(encodedProjectName, sessionId) {
  if (!validateEncodedProjectName(encodedProjectName)) {
    throw new Error("Invalid encoded project name");
  }
  if (!validateSessionId(sessionId)) {
    throw new Error("Invalid session ID format");
  }
  const homeDir = getHomeDir();
  if (!homeDir) {
    throw new Error("Home directory not found");
  }
  const historyDir = `${homeDir}/.claude/projects/${encodedProjectName}`;
  const filePath = `${historyDir}/${sessionId}.jsonl`;
  if (!await exists(filePath)) {
    return null;
  }
  try {
    const conversationHistory = await parseConversationFile(
      filePath,
      sessionId
    );
    return conversationHistory;
  } catch (error) {
    throw error;
  }
}
async function parseConversationFile(filePath, sessionId) {
  const content = await readTextFile(filePath);
  const lines = content.trim().split("\n").filter((line) => line.trim());
  if (lines.length === 0) {
    throw new Error("Empty conversation file");
  }
  const rawLines = [];
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      rawLines.push(parsed);
    } catch (parseError) {
      logger.history.error(`Failed to parse line in ${filePath}: {error}`, {
        error: parseError
      });
    }
  }
  const { messages: processedMessages, metadata } = processConversationMessages(
    rawLines
  );
  return {
    sessionId,
    messages: processedMessages,
    metadata
  };
}
function validateSessionId(sessionId) {
  if (!sessionId) {
    return false;
  }
  const dangerousChars = /[<>:"|?*\x00-\x1f\/\\]/;
  if (dangerousChars.test(sessionId)) {
    return false;
  }
  if (sessionId.length > 255) {
    return false;
  }
  if (sessionId.startsWith(".")) {
    return false;
  }
  return true;
}
async function handleConversationRequest(c) {
  try {
    const encodedProjectName = c.req.param("encodedProjectName");
    const sessionId = c.req.param("sessionId");
    if (!encodedProjectName) {
      return c.json({ error: "Encoded project name is required" }, 400);
    }
    if (!sessionId) {
      return c.json({ error: "Session ID is required" }, 400);
    }
    if (!validateEncodedProjectName(encodedProjectName)) {
      return c.json({ error: "Invalid encoded project name" }, 400);
    }
    logger.history.debug(
      `Fetching conversation details for project: ${encodedProjectName}, session: ${sessionId}`
    );
    const conversationHistory = await loadConversation(
      encodedProjectName,
      sessionId
    );
    if (!conversationHistory) {
      return c.json(
        {
          error: "Conversation not found",
          sessionId
        },
        404
      );
    }
    logger.history.debug(
      `Loaded conversation with ${conversationHistory.messages.length} messages`
    );
    return c.json(conversationHistory);
  } catch (error) {
    logger.history.error("Error fetching conversation details: {error}", {
      error
    });
    if (error instanceof Error) {
      if (error.message.includes("Invalid session ID")) {
        return c.json(
          {
            error: "Invalid session ID format",
            details: error.message
          },
          400
        );
      }
      if (error.message.includes("Invalid encoded project name")) {
        return c.json(
          {
            error: "Invalid project name",
            details: error.message
          },
          400
        );
      }
    }
    return c.json(
      {
        error: "Failed to fetch conversation details",
        details: error instanceof Error ? error.message : String(error)
      },
      500
    );
  }
}
async function* executeClaudeCommand(message, requestId, requestAbortControllers, cliPath, sessionId, allowedTools, workingDirectory, permissionMode) {
  let abortController;
  try {
    let processedMessage = message;
    if (message.startsWith("/")) {
      processedMessage = message.substring(1);
    }
    abortController = new AbortController();
    requestAbortControllers.set(requestId, abortController);
    const queryOptions = {
      abortController,
      executable: "node",
      // Use "node" to let SDK find it in PATH (works for both Electron and Docker)
      executableArgs: [],
      pathToClaudeCodeExecutable: cliPath,
      cwd: workingDirectory,
      // Set working directory for Claude CLI process
      additionalDirectories: workingDirectory ? [workingDirectory] : [],
      // Also add to allowed directories
      ...sessionId ? { resume: sessionId } : {},
      ...allowedTools ? { allowedTools } : {},
      ...permissionMode ? { permissionMode } : {}
    };
    logger.chat.debug("SDK query options: {queryOptions}", { queryOptions });
    for await (const sdkMessage of claudeCode.query({
      prompt: processedMessage,
      options: queryOptions
    })) {
      logger.chat.debug("Claude SDK Message: {sdkMessage}", { sdkMessage });
      yield {
        type: "claude_json",
        data: sdkMessage
      };
    }
    yield { type: "done" };
  } catch (error) {
    {
      logger.chat.error("Claude Code execution failed: {error}", { error });
      yield {
        type: "error",
        error: error instanceof Error ? error.message : String(error)
      };
    }
  } finally {
    if (requestAbortControllers.has(requestId)) {
      requestAbortControllers.delete(requestId);
    }
  }
}
async function handleChatRequest(c, requestAbortControllers) {
  const chatRequest = await c.req.json();
  const { cliPath } = c.var.config;
  logger.chat.debug(
    "Received chat request {*}",
    chatRequest
  );
  const workingDirectory = chatRequest.workingDirectory || process.cwd();
  logger.chat.debug("Working directory for Claude CLI: {workingDirectory}", { workingDirectory });
  const stream2 = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of executeClaudeCommand(
          chatRequest.message,
          chatRequest.requestId,
          requestAbortControllers,
          cliPath,
          // Use detected CLI path from validateClaudeCli
          chatRequest.sessionId,
          chatRequest.allowedTools,
          workingDirectory,
          chatRequest.permissionMode
        )) {
          const data = JSON.stringify(chunk) + "\n";
          controller.enqueue(new TextEncoder().encode(data));
        }
        controller.close();
      } catch (error) {
        const errorResponse = {
          type: "error",
          error: error instanceof Error ? error.message : String(error)
        };
        controller.enqueue(
          new TextEncoder().encode(JSON.stringify(errorResponse) + "\n")
        );
        controller.close();
      }
    }
  });
  return new Response(stream2, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    }
  });
}
function handleAbortRequest(c, requestAbortControllers) {
  const requestId = c.req.param("requestId");
  if (!requestId) {
    return c.json({ error: "Request ID is required" }, 400);
  }
  logger.api.debug(`Abort attempt for request: ${requestId}`);
  logger.api.debug(
    `Active requests: ${Array.from(requestAbortControllers.keys())}`
  );
  const abortController = requestAbortControllers.get(requestId);
  if (abortController) {
    abortController.abort();
    requestAbortControllers.delete(requestId);
    logger.api.debug(`Aborted request: ${requestId}`);
    return c.json({ success: true, message: "Request aborted" });
  } else {
    return c.json({ error: "Request not found or already completed" }, 404);
  }
}
function createApp(runtime2, config) {
  const app = new Hono2();
  const requestAbortControllers = /* @__PURE__ */ new Map();
  app.use(
    "*",
    cors({
      origin: "*",
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type"]
    })
  );
  app.use(
    "*",
    createConfigMiddleware({
      debugMode: config.debugMode,
      runtime: runtime2,
      cliPath: config.cliPath
    })
  );
  app.get("/api/health", (c) => {
    return c.json({
      status: "ok",
      timestamp: Date.now(),
      uptime: process.uptime()
    });
  });
  app.get("/api/projects", (c) => handleProjectsRequest(c));
  app.get(
    "/api/projects/:encodedProjectName/histories",
    (c) => handleHistoriesRequest(c)
  );
  app.get(
    "/api/projects/:encodedProjectName/histories/:sessionId",
    (c) => handleConversationRequest(c)
  );
  app.post(
    "/api/abort/:requestId",
    (c) => handleAbortRequest(c, requestAbortControllers)
  );
  app.post("/api/chat", (c) => handleChatRequest(c, requestAbortControllers));
  app.post("/api/voice-generate", async (c) => {
    try {
      const { message } = await c.req.json();
      if (!message) {
        return c.json({ success: false, error: "Message is required" }, 400);
      }
      const voiceScript = "/Users/erezfern/Workspace/jarvis/spaces/my-jarvis-desktop/tickets/017-claude-code-sdk-chat-integration/example-projects/claude-code-webui/tools/jarvis_voice.sh";
      const result = await runtime2.runCommand(voiceScript, ["--voice", "echo", message]);
      const audioPathMatch = result.stdout.match(/Audio generated successfully at: (.+\.mp3)/);
      const audioPath = audioPathMatch ? audioPathMatch[1] : null;
      return c.json({
        success: true,
        message,
        audioPath,
        output: result.stdout
      });
    } catch (error) {
      logger.app.error("Voice generation error: {error}", { error });
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }, 500);
    }
  });
  const serveStatic2 = runtime2.createStaticFileMiddleware({
    root: config.staticPath
  });
  app.use("/assets/*", serveStatic2);
  app.get("*", async (c) => {
    const path2 = c.req.path;
    if (path2.startsWith("/api/")) {
      return c.text("Not found", 404);
    }
    try {
      const indexPath = `${config.staticPath}/index.html`;
      const indexFile = await readBinaryFile(indexPath);
      return c.html(new TextDecoder().decode(indexFile));
    } catch (error) {
      logger.app.error("Error serving index.html: {error}", { error });
      return c.text("Internal server error", 500);
    }
  });
  return app;
}
var RequestError = class extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "RequestError";
  }
};
var toRequestError = (e) => {
  if (e instanceof RequestError) {
    return e;
  }
  return new RequestError(e.message, { cause: e });
};
var GlobalRequest = global.Request;
var Request$1 = class Request2 extends GlobalRequest {
  constructor(input, options) {
    if (typeof input === "object" && getRequestCache in input) {
      input = input[getRequestCache]();
    }
    if (typeof options?.body?.getReader !== "undefined") {
      options.duplex ??= "half";
    }
    super(input, options);
  }
};
var newHeadersFromIncoming = (incoming) => {
  const headerRecord = [];
  const rawHeaders = incoming.rawHeaders;
  for (let i = 0; i < rawHeaders.length; i += 2) {
    const { [i]: key, [i + 1]: value } = rawHeaders;
    if (key.charCodeAt(0) !== /*:*/
    58) {
      headerRecord.push([key, value]);
    }
  }
  return new Headers(headerRecord);
};
var wrapBodyStream = Symbol("wrapBodyStream");
var newRequestFromIncoming = (method, url, headers, incoming, abortController) => {
  const init = {
    method,
    headers,
    signal: abortController.signal
  };
  if (method === "TRACE") {
    init.method = "GET";
    const req = new Request$1(url, init);
    Object.defineProperty(req, "method", {
      get() {
        return "TRACE";
      }
    });
    return req;
  }
  if (!(method === "GET" || method === "HEAD")) {
    if ("rawBody" in incoming && incoming.rawBody instanceof Buffer) {
      init.body = new ReadableStream({
        start(controller) {
          controller.enqueue(incoming.rawBody);
          controller.close();
        }
      });
    } else if (incoming[wrapBodyStream]) {
      let reader;
      init.body = new ReadableStream({
        async pull(controller) {
          try {
            reader ||= stream.Readable.toWeb(incoming).getReader();
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
            } else {
              controller.enqueue(value);
            }
          } catch (error) {
            controller.error(error);
          }
        }
      });
    } else {
      init.body = stream.Readable.toWeb(incoming);
    }
  }
  return new Request$1(url, init);
};
var getRequestCache = Symbol("getRequestCache");
var requestCache = Symbol("requestCache");
var incomingKey = Symbol("incomingKey");
var urlKey = Symbol("urlKey");
var headersKey = Symbol("headersKey");
var abortControllerKey = Symbol("abortControllerKey");
var getAbortController = Symbol("getAbortController");
var requestPrototype = {
  get method() {
    return this[incomingKey].method || "GET";
  },
  get url() {
    return this[urlKey];
  },
  get headers() {
    return this[headersKey] ||= newHeadersFromIncoming(this[incomingKey]);
  },
  [getAbortController]() {
    this[getRequestCache]();
    return this[abortControllerKey];
  },
  [getRequestCache]() {
    this[abortControllerKey] ||= new AbortController();
    return this[requestCache] ||= newRequestFromIncoming(
      this.method,
      this[urlKey],
      this.headers,
      this[incomingKey],
      this[abortControllerKey]
    );
  }
};
[
  "body",
  "bodyUsed",
  "cache",
  "credentials",
  "destination",
  "integrity",
  "mode",
  "redirect",
  "referrer",
  "referrerPolicy",
  "signal",
  "keepalive"
].forEach((k) => {
  Object.defineProperty(requestPrototype, k, {
    get() {
      return this[getRequestCache]()[k];
    }
  });
});
["arrayBuffer", "blob", "clone", "formData", "json", "text"].forEach((k) => {
  Object.defineProperty(requestPrototype, k, {
    value: function() {
      return this[getRequestCache]()[k]();
    }
  });
});
Object.setPrototypeOf(requestPrototype, Request$1.prototype);
var newRequest = (incoming, defaultHostname) => {
  const req = Object.create(requestPrototype);
  req[incomingKey] = incoming;
  const incomingUrl = incoming.url || "";
  if (incomingUrl[0] !== "/" && // short-circuit for performance. most requests are relative URL.
  (incomingUrl.startsWith("http://") || incomingUrl.startsWith("https://"))) {
    if (incoming instanceof http2.Http2ServerRequest) {
      throw new RequestError("Absolute URL for :path is not allowed in HTTP/2");
    }
    try {
      const url2 = new URL(incomingUrl);
      req[urlKey] = url2.href;
    } catch (e) {
      throw new RequestError("Invalid absolute URL", { cause: e });
    }
    return req;
  }
  const host = (incoming instanceof http2.Http2ServerRequest ? incoming.authority : incoming.headers.host) || defaultHostname;
  if (!host) {
    throw new RequestError("Missing host header");
  }
  let scheme;
  if (incoming instanceof http2.Http2ServerRequest) {
    scheme = incoming.scheme;
    if (!(scheme === "http" || scheme === "https")) {
      throw new RequestError("Unsupported scheme");
    }
  } else {
    scheme = incoming.socket && incoming.socket.encrypted ? "https" : "http";
  }
  const url = new URL(`${scheme}://${host}${incomingUrl}`);
  if (url.hostname.length !== host.length && url.hostname !== host.replace(/:\d+$/, "")) {
    throw new RequestError("Invalid host header");
  }
  req[urlKey] = url.href;
  return req;
};
var responseCache = Symbol("responseCache");
var getResponseCache = Symbol("getResponseCache");
var cacheKey = Symbol("cache");
var GlobalResponse = global.Response;
var Response2 = class _Response {
  #body;
  #init;
  [getResponseCache]() {
    delete this[cacheKey];
    return this[responseCache] ||= new GlobalResponse(this.#body, this.#init);
  }
  constructor(body, init) {
    let headers;
    this.#body = body;
    if (init instanceof _Response) {
      const cachedGlobalResponse = init[responseCache];
      if (cachedGlobalResponse) {
        this.#init = cachedGlobalResponse;
        this[getResponseCache]();
        return;
      } else {
        this.#init = init.#init;
        headers = new Headers(init.#init.headers);
      }
    } else {
      this.#init = init;
    }
    if (typeof body === "string" || typeof body?.getReader !== "undefined" || body instanceof Blob || body instanceof Uint8Array) {
      headers ||= init?.headers || { "content-type": "text/plain; charset=UTF-8" };
      this[cacheKey] = [init?.status || 200, body, headers];
    }
  }
  get headers() {
    const cache = this[cacheKey];
    if (cache) {
      if (!(cache[2] instanceof Headers)) {
        cache[2] = new Headers(cache[2]);
      }
      return cache[2];
    }
    return this[getResponseCache]().headers;
  }
  get status() {
    return this[cacheKey]?.[0] ?? this[getResponseCache]().status;
  }
  get ok() {
    const status = this.status;
    return status >= 200 && status < 300;
  }
};
["body", "bodyUsed", "redirected", "statusText", "trailers", "type", "url"].forEach((k) => {
  Object.defineProperty(Response2.prototype, k, {
    get() {
      return this[getResponseCache]()[k];
    }
  });
});
["arrayBuffer", "blob", "clone", "formData", "json", "text"].forEach((k) => {
  Object.defineProperty(Response2.prototype, k, {
    value: function() {
      return this[getResponseCache]()[k]();
    }
  });
});
Object.setPrototypeOf(Response2, GlobalResponse);
Object.setPrototypeOf(Response2.prototype, GlobalResponse.prototype);
async function readWithoutBlocking(readPromise) {
  return Promise.race([readPromise, Promise.resolve().then(() => Promise.resolve(void 0))]);
}
function writeFromReadableStreamDefaultReader(reader, writable, currentReadPromise) {
  const handleError = () => {
  };
  writable.on("error", handleError);
  (currentReadPromise ?? reader.read()).then(flow, handleStreamError);
  return reader.closed.finally(() => {
    writable.off("error", handleError);
  });
  function handleStreamError(error) {
    if (error) {
      writable.destroy(error);
    }
  }
  function onDrain() {
    reader.read().then(flow, handleStreamError);
  }
  function flow({ done, value }) {
    try {
      if (done) {
        writable.end();
      } else if (!writable.write(value)) {
        writable.once("drain", onDrain);
      } else {
        return reader.read().then(flow, handleStreamError);
      }
    } catch (e) {
      handleStreamError(e);
    }
  }
}
function writeFromReadableStream(stream2, writable) {
  if (stream2.locked) {
    throw new TypeError("ReadableStream is locked.");
  } else if (writable.destroyed) {
    return;
  }
  return writeFromReadableStreamDefaultReader(stream2.getReader(), writable);
}
var buildOutgoingHttpHeaders = (headers) => {
  const res = {};
  if (!(headers instanceof Headers)) {
    headers = new Headers(headers ?? void 0);
  }
  const cookies = [];
  for (const [k, v] of headers) {
    if (k === "set-cookie") {
      cookies.push(v);
    } else {
      res[k] = v;
    }
  }
  if (cookies.length > 0) {
    res["set-cookie"] = cookies;
  }
  res["content-type"] ??= "text/plain; charset=UTF-8";
  return res;
};
var X_ALREADY_SENT = "x-hono-already-sent";
var webFetch = global.fetch;
if (typeof global.crypto === "undefined") {
  global.crypto = crypto;
}
global.fetch = (info, init) => {
  init = {
    // Disable compression handling so people can return the result of a fetch
    // directly in the loader without messing with the Content-Encoding header.
    compress: false,
    ...init
  };
  return webFetch(info, init);
};
var outgoingEnded = Symbol("outgoingEnded");
var handleRequestError = () => new Response(null, {
  status: 400
});
var handleFetchError = (e) => new Response(null, {
  status: e instanceof Error && (e.name === "TimeoutError" || e.constructor.name === "TimeoutError") ? 504 : 500
});
var handleResponseError = (e, outgoing) => {
  const err = e instanceof Error ? e : new Error("unknown error", { cause: e });
  if (err.code === "ERR_STREAM_PREMATURE_CLOSE") {
    console.info("The user aborted a request.");
  } else {
    console.error(e);
    if (!outgoing.headersSent) {
      outgoing.writeHead(500, { "Content-Type": "text/plain" });
    }
    outgoing.end(`Error: ${err.message}`);
    outgoing.destroy(err);
  }
};
var flushHeaders = (outgoing) => {
  if ("flushHeaders" in outgoing && outgoing.writable) {
    outgoing.flushHeaders();
  }
};
var responseViaCache = async (res, outgoing) => {
  let [status, body, header] = res[cacheKey];
  if (header instanceof Headers) {
    header = buildOutgoingHttpHeaders(header);
  }
  if (typeof body === "string") {
    header["Content-Length"] = Buffer.byteLength(body);
  } else if (body instanceof Uint8Array) {
    header["Content-Length"] = body.byteLength;
  } else if (body instanceof Blob) {
    header["Content-Length"] = body.size;
  }
  outgoing.writeHead(status, header);
  if (typeof body === "string" || body instanceof Uint8Array) {
    outgoing.end(body);
  } else if (body instanceof Blob) {
    outgoing.end(new Uint8Array(await body.arrayBuffer()));
  } else {
    flushHeaders(outgoing);
    await writeFromReadableStream(body, outgoing)?.catch(
      (e) => handleResponseError(e, outgoing)
    );
  }
  outgoing[outgoingEnded]?.();
};
var isPromise = (res) => typeof res.then === "function";
var responseViaResponseObject = async (res, outgoing, options = {}) => {
  if (isPromise(res)) {
    if (options.errorHandler) {
      try {
        res = await res;
      } catch (err) {
        const errRes = await options.errorHandler(err);
        if (!errRes) {
          return;
        }
        res = errRes;
      }
    } else {
      res = await res.catch(handleFetchError);
    }
  }
  if (cacheKey in res) {
    return responseViaCache(res, outgoing);
  }
  const resHeaderRecord = buildOutgoingHttpHeaders(res.headers);
  if (res.body) {
    const reader = res.body.getReader();
    const values = [];
    let done = false;
    let currentReadPromise = void 0;
    if (resHeaderRecord["transfer-encoding"] !== "chunked") {
      let maxReadCount = 2;
      for (let i = 0; i < maxReadCount; i++) {
        currentReadPromise ||= reader.read();
        const chunk = await readWithoutBlocking(currentReadPromise).catch((e) => {
          console.error(e);
          done = true;
        });
        if (!chunk) {
          if (i === 1) {
            await new Promise((resolve) => setTimeout(resolve));
            maxReadCount = 3;
            continue;
          }
          break;
        }
        currentReadPromise = void 0;
        if (chunk.value) {
          values.push(chunk.value);
        }
        if (chunk.done) {
          done = true;
          break;
        }
      }
      if (done && !("content-length" in resHeaderRecord)) {
        resHeaderRecord["content-length"] = values.reduce((acc, value) => acc + value.length, 0);
      }
    }
    outgoing.writeHead(res.status, resHeaderRecord);
    values.forEach((value) => {
      outgoing.write(value);
    });
    if (done) {
      outgoing.end();
    } else {
      if (values.length === 0) {
        flushHeaders(outgoing);
      }
      await writeFromReadableStreamDefaultReader(reader, outgoing, currentReadPromise);
    }
  } else if (resHeaderRecord[X_ALREADY_SENT]) ;
  else {
    outgoing.writeHead(res.status, resHeaderRecord);
    outgoing.end();
  }
  outgoing[outgoingEnded]?.();
};
var getRequestListener = (fetchCallback, options = {}) => {
  const autoCleanupIncoming = options.autoCleanupIncoming ?? true;
  if (options.overrideGlobalObjects !== false && global.Request !== Request$1) {
    Object.defineProperty(global, "Request", {
      value: Request$1
    });
    Object.defineProperty(global, "Response", {
      value: Response2
    });
  }
  return async (incoming, outgoing) => {
    let res, req;
    try {
      req = newRequest(incoming, options.hostname);
      let incomingEnded = !autoCleanupIncoming || incoming.method === "GET" || incoming.method === "HEAD";
      if (!incomingEnded) {
        ;
        incoming[wrapBodyStream] = true;
        incoming.on("end", () => {
          incomingEnded = true;
        });
        if (incoming instanceof http2.Http2ServerRequest) {
          ;
          outgoing[outgoingEnded] = () => {
            if (!incomingEnded) {
              setTimeout(() => {
                if (!incomingEnded) {
                  setTimeout(() => {
                    incoming.destroy();
                    outgoing.destroy();
                  });
                }
              });
            }
          };
        }
      }
      outgoing.on("close", () => {
        const abortController = req[abortControllerKey];
        if (abortController) {
          if (incoming.errored) {
            req[abortControllerKey].abort(incoming.errored.toString());
          } else if (!outgoing.writableFinished) {
            req[abortControllerKey].abort("Client connection prematurely closed.");
          }
        }
        if (!incomingEnded) {
          setTimeout(() => {
            if (!incomingEnded) {
              setTimeout(() => {
                incoming.destroy();
              });
            }
          });
        }
      });
      res = fetchCallback(req, { incoming, outgoing });
      if (cacheKey in res) {
        return responseViaCache(res, outgoing);
      }
    } catch (e) {
      if (!res) {
        if (options.errorHandler) {
          res = await options.errorHandler(req ? e : toRequestError(e));
          if (!res) {
            return;
          }
        } else if (!req) {
          res = handleRequestError();
        } else {
          res = handleFetchError(e);
        }
      } else {
        return handleResponseError(e, outgoing);
      }
    }
    try {
      return await responseViaResponseObject(res, outgoing, options);
    } catch (e) {
      return handleResponseError(e, outgoing);
    }
  };
};
var createAdaptorServer = (options) => {
  const fetchCallback = options.fetch;
  const requestListener = getRequestListener(fetchCallback, {
    hostname: options.hostname,
    overrideGlobalObjects: options.overrideGlobalObjects,
    autoCleanupIncoming: options.autoCleanupIncoming
  });
  const createServer = options.createServer || http.createServer;
  const server = createServer(options.serverOptions || {}, requestListener);
  return server;
};
var serve = (options, listeningListener) => {
  const server = createAdaptorServer(options);
  server.listen(options?.port ?? 3e3, options.hostname, () => {
    server.address();
  });
  return server;
};
var getMimeType = (filename, mimes = baseMimes) => {
  const regexp = /\.([a-zA-Z0-9]+?)$/;
  const match = filename.match(regexp);
  if (!match) {
    return;
  }
  let mimeType = mimes[match[1]];
  if (mimeType && mimeType.startsWith("text")) {
    mimeType += "; charset=utf-8";
  }
  return mimeType;
};
var _baseMimes = {
  aac: "audio/aac",
  avi: "video/x-msvideo",
  avif: "image/avif",
  av1: "video/av1",
  bin: "application/octet-stream",
  bmp: "image/bmp",
  css: "text/css",
  csv: "text/csv",
  eot: "application/vnd.ms-fontobject",
  epub: "application/epub+zip",
  gif: "image/gif",
  gz: "application/gzip",
  htm: "text/html",
  html: "text/html",
  ico: "image/x-icon",
  ics: "text/calendar",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  js: "text/javascript",
  json: "application/json",
  jsonld: "application/ld+json",
  map: "application/json",
  mid: "audio/x-midi",
  midi: "audio/x-midi",
  mjs: "text/javascript",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  mpeg: "video/mpeg",
  oga: "audio/ogg",
  ogv: "video/ogg",
  ogx: "application/ogg",
  opus: "audio/opus",
  otf: "font/otf",
  pdf: "application/pdf",
  png: "image/png",
  rtf: "application/rtf",
  svg: "image/svg+xml",
  tif: "image/tiff",
  tiff: "image/tiff",
  ts: "video/mp2t",
  ttf: "font/ttf",
  txt: "text/plain",
  wasm: "application/wasm",
  webm: "video/webm",
  weba: "audio/webm",
  webmanifest: "application/manifest+json",
  webp: "image/webp",
  woff: "font/woff",
  woff2: "font/woff2",
  xhtml: "application/xhtml+xml",
  xml: "application/xml",
  zip: "application/zip",
  "3gp": "video/3gpp",
  "3g2": "video/3gpp2",
  gltf: "model/gltf+json",
  glb: "model/gltf-binary"
};
var baseMimes = _baseMimes;
var COMPRESSIBLE_CONTENT_TYPE_REGEX = /^\s*(?:text\/[^;\s]+|application\/(?:javascript|json|xml|xml-dtd|ecmascript|dart|postscript|rtf|tar|toml|vnd\.dart|vnd\.ms-fontobject|vnd\.ms-opentype|wasm|x-httpd-php|x-javascript|x-ns-proxy-autoconfig|x-sh|x-tar|x-virtualbox-hdd|x-virtualbox-ova|x-virtualbox-ovf|x-virtualbox-vbox|x-virtualbox-vdi|x-virtualbox-vhd|x-virtualbox-vmdk|x-www-form-urlencoded)|font\/(?:otf|ttf)|image\/(?:bmp|vnd\.adobe\.photoshop|vnd\.microsoft\.icon|vnd\.ms-dds|x-icon|x-ms-bmp)|message\/rfc822|model\/gltf-binary|x-shader\/x-fragment|x-shader\/x-vertex|[^;\s]+?\+(?:json|text|xml|yaml))(?:[;\s]|$)/i;
var ENCODINGS = {
  br: ".br",
  zstd: ".zst",
  gzip: ".gz"
};
var ENCODINGS_ORDERED_KEYS = Object.keys(ENCODINGS);
var createStreamBody = (stream2) => {
  const body = new ReadableStream({
    start(controller) {
      stream2.on("data", (chunk) => {
        controller.enqueue(chunk);
      });
      stream2.on("error", (err) => {
        controller.error(err);
      });
      stream2.on("end", () => {
        controller.close();
      });
    },
    cancel() {
      stream2.destroy();
    }
  });
  return body;
};
var getStats = (path2) => {
  let stats;
  try {
    stats = fs$1.lstatSync(path2);
  } catch {
  }
  return stats;
};
var serveStatic = (options = { root: "" }) => {
  const root = options.root || "";
  const optionPath = options.path;
  if (root !== "" && !fs$1.existsSync(root)) {
    console.error(`serveStatic: root path '${root}' is not found, are you sure it's correct?`);
  }
  return async (c, next) => {
    if (c.finalized) {
      return next();
    }
    let filename;
    if (optionPath) {
      filename = optionPath;
    } else {
      try {
        filename = decodeURIComponent(c.req.path);
        if (/(?:^|[\/\\])\.\.(?:$|[\/\\])/.test(filename)) {
          throw new Error();
        }
      } catch {
        await options.onNotFound?.(c.req.path, c);
        return next();
      }
    }
    let path$1 = path.join(
      root,
      !optionPath && options.rewriteRequestPath ? options.rewriteRequestPath(filename, c) : filename
    );
    let stats = getStats(path$1);
    if (stats && stats.isDirectory()) {
      const indexFile = options.index ?? "index.html";
      path$1 = path.join(path$1, indexFile);
      stats = getStats(path$1);
    }
    if (!stats) {
      await options.onNotFound?.(path$1, c);
      return next();
    }
    await options.onFound?.(path$1, c);
    const mimeType = getMimeType(path$1);
    c.header("Content-Type", mimeType || "application/octet-stream");
    if (options.precompressed && (!mimeType || COMPRESSIBLE_CONTENT_TYPE_REGEX.test(mimeType))) {
      const acceptEncodingSet = new Set(
        c.req.header("Accept-Encoding")?.split(",").map((encoding) => encoding.trim())
      );
      for (const encoding of ENCODINGS_ORDERED_KEYS) {
        if (!acceptEncodingSet.has(encoding)) {
          continue;
        }
        const precompressedStats = getStats(path$1 + ENCODINGS[encoding]);
        if (precompressedStats) {
          c.header("Content-Encoding", encoding);
          c.header("Vary", "Accept-Encoding", { append: true });
          stats = precompressedStats;
          path$1 = path$1 + ENCODINGS[encoding];
          break;
        }
      }
    }
    const size = stats.size;
    if (c.req.method == "HEAD" || c.req.method == "OPTIONS") {
      c.header("Content-Length", size.toString());
      c.status(200);
      return c.body(null);
    }
    const range = c.req.header("range") || "";
    if (!range) {
      c.header("Content-Length", size.toString());
      return c.body(createStreamBody(fs$1.createReadStream(path$1)), 200);
    }
    c.header("Accept-Ranges", "bytes");
    c.header("Date", stats.birthtime.toUTCString());
    const parts = range.replace(/bytes=/, "").split("-", 2);
    const start = parseInt(parts[0], 10) || 0;
    let end = parseInt(parts[1], 10) || size - 1;
    if (size < end - start + 1) {
      end = size - 1;
    }
    const chunksize = end - start + 1;
    const stream2 = fs$1.createReadStream(path$1, { start, end });
    c.header("Content-Length", chunksize.toString());
    c.header("Content-Range", `bytes ${start}-${end}/${stats.size}`);
    return c.body(createStreamBody(stream2), 206);
  };
};
class NodeRuntime {
  async findExecutable(name) {
    const platform = getPlatform();
    const candidates = [];
    if (platform === "windows") {
      const executableNames = [
        name,
        `${name}.exe`,
        `${name}.cmd`,
        `${name}.bat`
      ];
      for (const execName of executableNames) {
        const result = await this.runCommand("where", [execName]);
        if (result.success && result.stdout.trim()) {
          const paths = result.stdout.trim().split("\n").map((p) => p.trim()).filter((p) => p);
          candidates.push(...paths);
        }
      }
    } else {
      const result = await this.runCommand("which", [name]);
      if (result.success && result.stdout.trim()) {
        candidates.push(result.stdout.trim());
      }
    }
    return candidates;
  }
  runCommand(command, args, options) {
    return new Promise((resolve) => {
      const isWindows = getPlatform() === "windows";
      const spawnOptions = {
        stdio: ["ignore", "pipe", "pipe"],
        env: options?.env ? { ...process$1.env, ...options.env } : process$1.env
      };
      let actualCommand = command;
      let actualArgs = args;
      if (isWindows) {
        actualCommand = "cmd.exe";
        actualArgs = ["/c", command, ...args];
      }
      const child = node_child_process.spawn(actualCommand, actualArgs, spawnOptions);
      const textDecoder = new TextDecoder();
      let stdout = "";
      let stderr = "";
      child.stdout?.on("data", (data) => {
        stdout += textDecoder.decode(data, { stream: true });
      });
      child.stderr?.on("data", (data) => {
        stderr += textDecoder.decode(data, { stream: true });
      });
      child.on("close", (code) => {
        resolve({
          success: code === 0,
          code: code ?? 1,
          stdout,
          stderr
        });
      });
      child.on("error", (error) => {
        resolve({
          success: false,
          code: 1,
          stdout: "",
          stderr: error.message
        });
      });
    });
  }
  serve(port, hostname, handler) {
    const app = new Hono2();
    app.all("*", async (c) => {
      const response = await handler(c.req.raw);
      return response;
    });
    serve({
      fetch: app.fetch,
      port,
      hostname
    });
    console.log(`Listening on http://${hostname}:${port}/`);
  }
  createStaticFileMiddleware(options) {
    return serveStatic(options);
  }
}
const DOUBLE_BACKSLASH_REGEX = /\\\\/g;
async function parseCmdScript(cmdPath) {
  try {
    logger.cli.debug(`Parsing Windows .cmd script: ${cmdPath}`);
    const cmdContent = await readTextFile(cmdPath);
    const cmdDir = node_path.dirname(cmdPath);
    const execLineMatch = cmdContent.match(/"%_prog%"[^"]*"(%dp0%\\[^"]+)"/);
    if (execLineMatch) {
      const fullPath = execLineMatch[1];
      const pathMatch = fullPath.match(/%dp0%\\(.+)/);
      if (pathMatch) {
        const relativePath = pathMatch[1];
        const absolutePath = node_path.join(cmdDir, relativePath);
        logger.cli.debug(`Found CLI script reference: ${relativePath}`);
        logger.cli.debug(`Resolved absolute path: ${absolutePath}`);
        if (await exists(absolutePath)) {
          logger.cli.debug(`.cmd parsing successful: ${absolutePath}`);
          return absolutePath;
        } else {
          logger.cli.debug(`Resolved path does not exist: ${absolutePath}`);
        }
      } else {
        logger.cli.debug(`Could not extract relative path from: ${fullPath}`);
      }
    } else {
      logger.cli.debug(`No CLI script execution pattern found in .cmd content`);
    }
    return null;
  } catch (error) {
    logger.cli.debug(
      `Failed to parse .cmd script: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
}
function getWindowsWrapperScript(traceFile, nodePath) {
  return `@echo off
echo %~1 >> "${traceFile}"
"${nodePath}" %*`;
}
function getUnixWrapperScript(traceFile, nodePath) {
  return `#!/bin/bash
echo "$1" >> "${traceFile}"
exec "${nodePath}" "$@"`;
}
async function detectClaudeCliPath(runtime2, claudePath) {
  const platform = getPlatform();
  const isWindows = platform === "windows";
  let pathWrappingResult = null;
  try {
    pathWrappingResult = await withTempDir(async (tempDir) => {
      const traceFile = `${tempDir}/trace.log`;
      const nodeExecutables = await runtime2.findExecutable("node");
      if (nodeExecutables.length === 0) {
        return null;
      }
      const originalNodePath = nodeExecutables[0];
      const wrapperFileName = isWindows ? "node.bat" : "node";
      const wrapperScript = isWindows ? getWindowsWrapperScript(traceFile, originalNodePath) : getUnixWrapperScript(traceFile, originalNodePath);
      await writeTextFile(
        `${tempDir}/${wrapperFileName}`,
        wrapperScript,
        isWindows ? void 0 : { mode: 493 }
      );
      const currentPath = getEnv("PATH") || "";
      const modifiedPath = isWindows ? `${tempDir};${currentPath}` : `${tempDir}:${currentPath}`;
      const executionResult = await runtime2.runCommand(
        claudePath,
        ["--version"],
        {
          env: { PATH: modifiedPath }
        }
      );
      if (!executionResult.success) {
        return null;
      }
      const versionOutput = executionResult.stdout.trim();
      let traceContent;
      try {
        traceContent = await readTextFile(traceFile);
      } catch {
        return { scriptPath: "", versionOutput };
      }
      if (!traceContent.trim()) {
        return { scriptPath: "", versionOutput };
      }
      const traceLines = traceContent.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
      for (const traceLine of traceLines) {
        let scriptPath = traceLine.trim();
        if (scriptPath) {
          if (isWindows) {
            scriptPath = scriptPath.replace(DOUBLE_BACKSLASH_REGEX, "\\");
          }
        }
        if (scriptPath) {
          return { scriptPath, versionOutput };
        }
      }
      return { scriptPath: "", versionOutput };
    });
  } catch (error) {
    logger.cli.debug(
      `PATH wrapping detection failed: ${error instanceof Error ? error.message : String(error)}`
    );
    pathWrappingResult = null;
  }
  if (pathWrappingResult && pathWrappingResult.scriptPath) {
    return pathWrappingResult;
  }
  if (isWindows && claudePath.endsWith(".cmd")) {
    logger.cli.debug(
      "PATH wrapping method failed, trying .cmd parsing fallback..."
    );
    try {
      const cmdParsedPath = await parseCmdScript(claudePath);
      if (cmdParsedPath) {
        let versionOutput = pathWrappingResult?.versionOutput || "";
        if (!versionOutput) {
          try {
            const versionResult = await runtime2.runCommand(claudePath, [
              "--version"
            ]);
            if (versionResult.success) {
              versionOutput = versionResult.stdout.trim();
            }
          } catch {
          }
        }
        return { scriptPath: cmdParsedPath, versionOutput };
      }
    } catch (fallbackError) {
      logger.cli.debug(
        `.cmd parsing fallback failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`
      );
    }
  }
  return {
    scriptPath: "",
    versionOutput: pathWrappingResult?.versionOutput || ""
  };
}
async function validateClaudeCli(runtime2, customPath) {
  try {
    const platform = getPlatform();
    const isWindows = platform === "windows";
    let claudePath = "";
    if (customPath) ;
    else {
      logger.cli.info("🔍 Searching for Claude CLI in PATH...");
      const candidates = await runtime2.findExecutable("claude");
      if (candidates.length === 0) {
        logger.cli.error("❌ Claude CLI not found in PATH");
        logger.cli.error("   Please install claude-code globally:");
        logger.cli.error(
          "   Visit: https://claude.ai/code for installation instructions"
        );
        exit(1);
      }
      if (isWindows && candidates.length > 1) {
        const cmdCandidate = candidates.find((path2) => path2.endsWith(".cmd"));
        claudePath = cmdCandidate || candidates[0];
        logger.cli.debug(
          `Found Claude CLI candidates: ${candidates.join(", ")}`
        );
        logger.cli.debug(
          `Using Claude CLI path: ${claudePath} (Windows .cmd preferred)`
        );
      } else {
        claudePath = candidates[0];
        logger.cli.debug(
          `Found Claude CLI candidates: ${candidates.join(", ")}`
        );
        logger.cli.debug(`Using Claude CLI path: ${claudePath}`);
      }
    }
    const isCmdFile = claudePath.endsWith(".cmd");
    if (isWindows && isCmdFile) {
      logger.cli.debug(
        "Detected Windows .cmd file - fallback parsing available if needed"
      );
    }
    logger.cli.info("🔍 Detecting actual Claude CLI script path...");
    const detection = await detectClaudeCliPath(runtime2, claudePath);
    if (detection.scriptPath) {
      logger.cli.info(`✅ Claude CLI script detected: ${detection.scriptPath}`);
      if (detection.versionOutput) {
        logger.cli.info(`✅ Claude CLI found: ${detection.versionOutput}`);
      }
      return detection.scriptPath;
    } else {
      logger.cli.warn("⚠️  Claude CLI script path detection failed");
      logger.cli.warn(
        "   Falling back to using the claude executable directly."
      );
      logger.cli.warn("   This may not work properly, but continuing anyway.");
      logger.cli.warn("");
      logger.cli.warn(`   Using fallback path: ${claudePath}`);
      if (detection.versionOutput) {
        logger.cli.info(`✅ Claude CLI found: ${detection.versionOutput}`);
      }
      return claudePath;
    }
  } catch (error) {
    logger.cli.error("❌ Failed to validate Claude CLI");
    logger.cli.error(
      `   Error: ${error instanceof Error ? error.message : String(error)}`
    );
    exit(1);
  }
}
const AUTHORIZATION_URL = "https://claude.ai/oauth/authorize";
const TOKEN_URL = "https://console.anthropic.com/v1/oauth/token";
const CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
const SCOPES = ["org:create_api_key", "user:profile", "user:inference"];
let REDIRECT_URI = "";
let pendingAuth = null;
let currentSession = null;
function generateCodeVerifier() {
  return crypto__namespace.randomBytes(32).toString("base64url");
}
function generateCodeChallenge(codeVerifier) {
  return crypto__namespace.createHash("sha256").update(codeVerifier).digest("base64url");
}
function generateState() {
  return crypto__namespace.randomBytes(16).toString("hex");
}
async function startLocalServer() {
  const app = express();
  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      console.log(`[OAUTH] Local callback server running on http://localhost:${port}`);
      resolve({ port, server, app });
    });
    server.on("error", (error) => {
      console.error("[OAUTH] Failed to start server:", error);
      reject(error);
    });
  });
}
function stopLocalServer(server) {
  if (server) {
    server.close(() => {
      console.log("[OAUTH] Local callback server stopped");
    });
  }
}
function parseAuthorizationCode(codeInput) {
  const trimmedInput = codeInput.trim();
  if (!trimmedInput) {
    throw new Error("Authorization code cannot be empty");
  }
  if (trimmedInput.includes("#")) {
    const [code, state] = trimmedInput.split("#");
    if (!code || !state) {
      throw new Error("Invalid code#state format. Expected format: authorizationCode#stateValue");
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(code)) {
      throw new Error("Invalid authorization code format in code#state");
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(state)) {
      throw new Error("Invalid state format in code#state");
    }
    return { code, state };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmedInput)) {
    throw new Error(
      "Invalid authorization code format. Please copy the authorization code from the callback page."
    );
  }
  return { code: trimmedInput, state: null };
}
async function startOAuthFlow() {
  return new Promise(async (resolveOAuth, rejectOAuth) => {
    try {
      console.log("[OAUTH] Starting Claude OAuth flow with local server...");
      const { port, server, app } = await startLocalServer();
      REDIRECT_URI = `http://localhost:${port}/callback`;
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);
      const state = generateState();
      pendingAuth = {
        codeVerifier,
        state,
        codeChallenge,
        authUrl: "",
        server,
        port
      };
      const timeoutId = setTimeout(() => {
        console.log("[OAUTH] OAuth flow timed out after 5 minutes");
        stopLocalServer(server);
        resolveOAuth({
          success: false,
          error: "OAuth flow timed out. Please try again."
        });
      }, 5 * 60 * 1e3);
      app.get("/callback", async (req, res) => {
        try {
          const { code, state: receivedState } = req.query;
          if (!code) {
            res.status(400).send("<h1>Error</h1><p>No authorization code received</p>");
            clearTimeout(timeoutId);
            resolveOAuth({
              success: false,
              error: "No authorization code received"
            });
            return;
          }
          if (receivedState && receivedState !== pendingAuth?.state) {
            console.warn("[OAUTH] State mismatch - received:", receivedState, "expected:", pendingAuth?.state);
          }
          console.log("[OAUTH] Authorization code received automatically");
          const result = await completeOAuthFlowInternal(code, receivedState || pendingAuth?.state || "");
          if (result.success) {
            res.send(`
              <html>
                <head><title>Authentication Successful</title></head>
                <body style="font-family: system-ui; text-align: center; padding: 50px;">
                  <h1>✅ Authentication Successful!</h1>
                  <p>You can close this window and return to the app.</p>
                  <script>setTimeout(() => window.close(), 2000)<\/script>
                </body>
              </html>
            `);
            clearTimeout(timeoutId);
            setTimeout(() => stopLocalServer(server), 3e3);
            resolveOAuth({
              success: true,
              message: "Authentication completed successfully",
              session: result.session
            });
          } else {
            res.status(500).send(`
              <html>
                <head><title>Authentication Failed</title></head>
                <body style="font-family: system-ui; text-align: center; padding: 50px;">
                  <h1>❌ Authentication Failed</h1>
                  <p>${result.error || "Unknown error"}</p>
                </body>
              </html>
            `);
            clearTimeout(timeoutId);
            setTimeout(() => stopLocalServer(server), 3e3);
            resolveOAuth({
              success: false,
              error: result.error || "Authentication failed"
            });
          }
        } catch (error) {
          console.error("[OAUTH] Callback error:", error);
          res.status(500).send("<h1>Error</h1><p>Authentication failed</p>");
          stopLocalServer(server);
          clearTimeout(timeoutId);
          resolveOAuth({
            success: false,
            error: error instanceof Error ? error.message : "Callback processing failed"
          });
        }
      });
      const authParams = new URLSearchParams({
        client_id: CLIENT_ID,
        response_type: "code",
        redirect_uri: REDIRECT_URI,
        scope: SCOPES.join(" "),
        state,
        code_challenge: codeChallenge,
        code_challenge_method: "S256"
      });
      const authUrl = `${AUTHORIZATION_URL}?${authParams.toString()}`;
      pendingAuth.authUrl = authUrl;
      console.log("[OAUTH] Opening browser for authentication...");
      console.log("[OAUTH] Callback URL:", REDIRECT_URI);
      await electron.shell.openExternal(authUrl);
      console.log("[OAUTH] Waiting for user to complete authentication in browser...");
    } catch (error) {
      console.error("[OAUTH] Failed to start OAuth flow:", error);
      if (pendingAuth?.server) {
        stopLocalServer(pendingAuth.server);
      }
      resolveOAuth({
        success: false,
        error: error instanceof Error ? error.message : "Failed to start OAuth flow"
      });
    }
  });
}
async function completeOAuthFlowInternal(authCode, receivedState) {
  try {
    if (!pendingAuth) {
      throw new Error("No pending authentication flow");
    }
    console.log("[OAUTH] Completing OAuth flow with authorization code...");
    const payload = {
      grant_type: "authorization_code",
      code: authCode,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: pendingAuth.codeVerifier
    };
    if (receivedState) {
      payload.state = receivedState;
    }
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[OAUTH] Token exchange failed:", response.status, errorText);
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
    }
    const tokenData = await response.json();
    console.log("[OAUTH] Token exchange successful");
    const expiresAt = Date.now() + tokenData.expires_in * 1e3;
    const session = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt,
      scopes: SCOPES,
      userId: tokenData.account?.uuid || "unknown",
      subscriptionType: "unknown",
      account: {
        email_address: tokenData.account?.email_address || "unknown",
        uuid: tokenData.account?.uuid || "unknown"
      }
    };
    currentSession = session;
    process.env.ANTHROPIC_API_KEY = session.accessToken;
    console.log("[OAUTH] Set ANTHROPIC_API_KEY environment variable for backend");
    const credentialsPath = path__namespace.join(os__namespace.homedir(), ".claude-credentials.json");
    const credentials = {
      claudeAiOauth: session
    };
    fs__namespace$1.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2), { mode: 384 });
    const claudeAuthPath = path__namespace.join(os__namespace.homedir(), ".claude", "auth.json");
    const claudeAuthDir = path__namespace.dirname(claudeAuthPath);
    if (!fs__namespace$1.existsSync(claudeAuthDir)) {
      fs__namespace$1.mkdirSync(claudeAuthDir, { recursive: true });
    }
    const claudeAuth = {
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
      expires_at: new Date(session.expiresAt).toISOString(),
      user_email: session.account.email_address
    };
    fs__namespace$1.writeFileSync(claudeAuthPath, JSON.stringify(claudeAuth, null, 2), { mode: 384 });
    console.log("[OAUTH] Saved credentials to:", claudeAuthPath);
    console.log("[OAUTH] Authentication completed successfully");
    pendingAuth = null;
    return {
      success: true,
      session
    };
  } catch (error) {
    console.error("[OAUTH] Failed to complete OAuth flow:", error);
    pendingAuth = null;
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to complete OAuth flow"
    };
  }
}
async function completeOAuthFlow(authCodeInput) {
  try {
    if (!pendingAuth) {
      throw new Error("No pending authentication flow");
    }
    console.log("[OAUTH] Completing OAuth flow with authorization code...");
    const { code: authCode, state: receivedState } = parseAuthorizationCode(authCodeInput);
    console.log("[OAUTH] Code length:", authCode.length);
    console.log("[OAUTH] Code preview:", authCode.substring(0, 10) + "...");
    if (receivedState && receivedState !== pendingAuth.state) {
      throw new Error("State parameter mismatch - possible CSRF attack");
    }
    const payload = {
      grant_type: "authorization_code",
      code: authCode,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: pendingAuth.codeVerifier,
      state: receivedState || pendingAuth.state
    };
    console.log("[OAUTH] Token exchange payload:", {
      grant_type: payload.grant_type,
      redirect_uri: payload.redirect_uri,
      client_id: payload.client_id,
      code: payload.code.substring(0, 10) + "...",
      code_verifier: payload.code_verifier.substring(0, 10) + "...",
      state: payload.state
    });
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[OAUTH] Token exchange failed:", response.status, errorText);
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
    }
    const tokenData = await response.json();
    console.log("[OAUTH] Token exchange successful");
    const expiresAt = Date.now() + tokenData.expires_in * 1e3;
    const session = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt,
      scopes: SCOPES,
      userId: tokenData.account?.uuid || "unknown",
      subscriptionType: "unknown",
      // We'd need to fetch this from profile
      account: {
        email_address: tokenData.account?.email_address || "unknown",
        uuid: tokenData.account?.uuid || "unknown"
      }
    };
    currentSession = session;
    const credentialsPath = path__namespace.join(os__namespace.homedir(), ".claude-credentials.json");
    const credentials = {
      claudeAiOauth: session
    };
    fs__namespace$1.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2), { mode: 384 });
    const claudeAuthPath = path__namespace.join(os__namespace.homedir(), ".claude", "auth.json");
    const claudeAuthDir = path__namespace.dirname(claudeAuthPath);
    if (!fs__namespace$1.existsSync(claudeAuthDir)) {
      fs__namespace$1.mkdirSync(claudeAuthDir, { recursive: true });
    }
    const claudeAuth = {
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
      expires_at: new Date(session.expiresAt).toISOString(),
      user_email: session.account.email_address
    };
    fs__namespace$1.writeFileSync(claudeAuthPath, JSON.stringify(claudeAuth, null, 2), { mode: 384 });
    console.log("[OAUTH] Saved credentials in Claude CLI format to:", claudeAuthPath);
    console.log("[OAUTH] Authentication completed successfully");
    pendingAuth = null;
    return {
      success: true,
      session
    };
  } catch (error) {
    console.error("[OAUTH] Failed to complete OAuth flow:", error);
    pendingAuth = null;
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to complete OAuth flow"
    };
  }
}
async function restoreSession() {
  try {
    const credentialsPath = path__namespace.join(os__namespace.homedir(), ".claude-credentials.json");
    if (fs__namespace$1.existsSync(credentialsPath)) {
      const credentials = JSON.parse(fs__namespace$1.readFileSync(credentialsPath, "utf-8"));
      const session = credentials.claudeAiOauth;
      if (session && session.expiresAt > Date.now()) {
        currentSession = session;
        process.env.ANTHROPIC_API_KEY = session.accessToken;
        console.log("[AUTH] Restored session and API key from saved credentials");
      } else {
        console.log("[AUTH] Saved session expired, clearing credentials");
        fs__namespace$1.unlinkSync(credentialsPath);
      }
    }
  } catch (error) {
    console.error("[AUTH] Failed to restore session:", error);
  }
}
async function checkAuthStatus() {
  try {
    console.log("[AUTH] Checking authentication status...");
    if (currentSession) {
      const now = Date.now();
      const expiresAt = currentSession.expiresAt;
      console.log("[AUTH] Session expires at:", new Date(expiresAt).toISOString());
      console.log("[AUTH] Current time:", new Date(now).toISOString());
      console.log("[AUTH] Session valid:", expiresAt > now + 5 * 60 * 1e3);
      if (expiresAt > now + 5 * 60 * 1e3) {
        console.log("[AUTH] Returning authenticated session");
        return {
          success: true,
          isAuthenticated: true,
          session: currentSession
        };
      } else {
        console.log("[AUTH] Session expired");
        currentSession = null;
        delete process.env.ANTHROPIC_API_KEY;
        console.log("[AUTH] Cleared expired ANTHROPIC_API_KEY from environment");
      }
    } else {
      console.log("[AUTH] No stored authentication data found");
    }
    return {
      success: true,
      isAuthenticated: false,
      session: null
    };
  } catch (error) {
    console.error("Auth check failed:", error);
    return {
      success: false,
      isAuthenticated: false,
      error: error instanceof Error ? error.message : "Auth check failed"
    };
  }
}
async function signOut() {
  try {
    currentSession = null;
    delete process.env.ANTHROPIC_API_KEY;
    console.log("[AUTH] Cleared ANTHROPIC_API_KEY environment variable");
    console.log("User signed out");
    return { success: true };
  } catch (error) {
    console.error("Sign out failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Sign out failed"
    };
  }
}
function registerAuthHandlers() {
  electron.ipcMain.handle("auth:start-oauth", async (_event) => {
    return await startOAuthFlow();
  });
  electron.ipcMain.handle("auth:complete-oauth", async (_event, authCode) => {
    return await completeOAuthFlow(authCode);
  });
  electron.ipcMain.handle("auth:check-status", async (_event) => {
    return await checkAuthStatus();
  });
  electron.ipcMain.handle("auth:sign-out", async (_event) => {
    return await signOut();
  });
  console.log("[AUTH] IPC handlers registered");
}
function registerDialogHandlers() {
  electron.ipcMain.handle("dialog:select-directory", async (_event) => {
    try {
      const focusedWindow = electron.BrowserWindow.getFocusedWindow();
      if (!focusedWindow) {
        console.error("[DIALOG] No focused window found");
        return {
          canceled: true,
          filePaths: []
        };
      }
      const result = await electron.dialog.showOpenDialog(focusedWindow, {
        properties: ["openDirectory", "createDirectory"],
        title: "Select Workspace Directory",
        buttonLabel: "Select Workspace"
      });
      console.log("[DIALOG] Directory selection result:", result);
      return result;
    } catch (error) {
      console.error("[DIALOG] Failed to show directory dialog:", error);
      return {
        canceled: true,
        filePaths: [],
        error: error instanceof Error ? error.message : "Failed to show dialog"
      };
    }
  });
  console.log("[DIALOG] IPC handlers registered");
}
let runtime = null;
async function startServer() {
  console.log("Starting Claude WebUI server with jlongster cleanup pattern...");
  try {
    const currentPath = process.env.PATH || "";
    const commonPaths = [
      "/usr/local/bin",
      "/opt/homebrew/bin",
      "/usr/bin",
      "/bin",
      "/usr/local/share/npm/bin"
    ];
    const pathsToAdd = commonPaths.filter((path2) => !currentPath.includes(path2));
    if (pathsToAdd.length > 0) {
      process.env.PATH = pathsToAdd.join(":") + ":" + currentPath;
      console.log("Enhanced PATH for GUI launch:", process.env.PATH);
    }
    await setupLogger(true);
    console.log("My Jarvis Desktop starting up");
    runtime = new NodeRuntime();
    const cliPath = await validateClaudeCli(runtime);
    console.log("Claude CLI detected at:", cliPath);
    const serverApp = createApp(runtime, {
      debugMode: true,
      staticPath: path.join(__dirname, "../renderer"),
      cliPath
    });
    const serverPort = parseInt(process.env.JARVIS_DEV_PORT || "8081", 10);
    const serverHost = "127.0.0.1";
    runtime.serve(serverPort, serverHost, serverApp.fetch);
    console.log(`✅ Claude WebUI server ready on ${serverHost}:${serverPort}`);
  } catch (error) {
    console.error("Failed to start Claude WebUI server:", error);
  }
}
electron.app.whenReady().then(async () => {
  console.log("My Jarvis Desktop starting up");
  utils.electronApp.setAppUserModelId("com.electron");
  registerAuthHandlers();
  registerDialogHandlers();
  await restoreSession();
  await startServer();
  await new Promise((resolve) => setTimeout(resolve, 1e3));
  await createAppWindow();
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
  });
  electron.app.on("activate", async function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      await createAppWindow();
    }
  });
});
electron.app.on("before-quit", () => {
  if (runtime) {
    console.log("Cleaning up Claude WebUI server...");
    runtime = null;
  }
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
