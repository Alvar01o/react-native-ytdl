import { URL } from "./__REACT_NATIVE_YTDL_CUSTOM_MODULES__/url";
import querystring from "querystring";
import Cache from "./cache";
import utils from "./utils";
import * as Babel from "@babel/standalone";

export const cache = new Cache();

/**
 * Extract signature deciphering and n parameter transform functions from html5player file.
 *
 * @param {string} html5playerfile
 * @param {Object} options
 * @returns {Promise<Array.<string>>}
 */
export const getFunctions = (html5playerfile, options) => 
  cache.getOrSet(html5playerfile, async () => {
    const body = await utils.exposedMiniget(html5playerfile, options).text();
    const functions = extractFunctions(body);
    if (!functions || !functions.length) {
      throw Error("Could not extract functions");
    }
    cache.set(html5playerfile, functions);
    return functions;
  });

/**
 * Extracts the actions that should be taken to decipher a signature
 * and transform the n parameter.
 *
 * @param {string} body
 * @returns {Array.<string>}
 */
export const extractFunctions = (body) => {
  const functions = [];
  
  const extractManipulations = (caller) => {
    const functionName = utils.between(caller, `a=a.split("");`, `.`);
    if (!functionName) return '';
    const functionStart = `var ${functionName}={`;
    const ndx = body.indexOf(functionStart);
    if (ndx < 0) return '';
    const subBody = body.slice(ndx + functionStart.length - 1);
    return `var ${functionName}=${utils.cutAfterJS(subBody)}`;
  };

  const extractDecipher = () => {
    const functionName = utils.between(body, `a.set("alr","yes");c&&(c=`, `(decodeURIC`);
    if (functionName && functionName.length) {
      const functionStart = `${functionName}=function(a)`;
      const ndx = body.indexOf(functionStart);
      if (ndx >= 0) {
        const subBody = body.slice(ndx + functionStart.length);
        let functionBody = `var ${functionStart}${utils.cutAfterJS(subBody)}`;
        functionBody = `${extractManipulations(functionBody)};${functionBody};${functionName}(sig);`;
        functions.push(functionBody);
      }
    }
  };

  const extractNCode = () => {
    let functionName = utils.between(body, `&&(b=a.get("n"))&&(b=`, `(b)`);
    if (functionName.includes("[")) {
      functionName = utils.between(body, `var ${functionName.split("[")[0]}=[`, `]`);
    }
    if (functionName && functionName.length) {
      const functionStart = `${functionName}=function(a)`;
      const ndx = body.indexOf(functionStart);
      if (ndx >= 0) {
        const subBody = body.slice(ndx + functionStart.length);
        const functionBody = `var ${functionStart}${utils.cutAfterJS(subBody)};${functionName}(ncode);`;
        functions.push(functionBody);
      }
    }
  };

  extractDecipher();
  extractNCode();
  return functions;
};

/**
 * Compiles and executes JavaScript code using Babel.
 *
 * @param {string} code
 * @param {Object} context
 * @returns {any}
 */
const executeWithBabel = (code, context) => {
  const compiledCode = Babel.transform(code, { presets: ["env"] }).code;
  const func = new Function(...Object.keys(context), compiledCode);
  return func(...Object.values(context));
};

/**
 * Apply decipher and n-transform to individual format.
 *
 * @param {Object} format
 * @param {string} decipherCode
 * @param {string} nTransformCode
 */
export const setDownloadURL = (format, decipherCode, nTransformCode) => {
  const decipher = (url) => {
    const args = querystring.parse(url);
    if (!args.s || !decipherCode) return args.url;
    const components = new URL(decodeURIComponent(args.url));
    const sig = executeWithBabel(decipherCode, { sig: decodeURIComponent(args.s) });
    components.searchParams.set(args.sp ? args.sp : "signature", sig);
    return components.toString();
  };

  const ncode = (url) => {
    const components = new URL(decodeURIComponent(url));
    const n = components.searchParams.get("n");
    if (!n || !nTransformCode) return url;
    const transformedN = executeWithBabel(nTransformCode, { ncode: n });
    components.searchParams.set("n", transformedN);
    return components.toString();
  };

  const cipher = !format.url;
  const url = format.url || format.signatureCipher || format.cipher;
  format.url = cipher ? ncode(decipher(url)) : ncode(url);
  delete format.signatureCipher;
  delete format.cipher;
};

/**
 * Applies decipher and n parameter transforms to all format URLs.
 *
 * @param {Array.<Object>} formats
 * @param {string} html5player
 * @param {Object} options
 */
export const decipherFormats = async (formats, html5player, options) => {
  const decipheredFormats = {};
  const functions = await getFunctions(html5player, options);
  const decipherCode = functions.length ? functions[0] : null;
  const nTransformCode = functions.length > 1 ? functions[1] : null;
  formats.forEach((format) => {
    setDownloadURL(format, decipherCode, nTransformCode);
    decipheredFormats[format.url] = format;
  });
  return decipheredFormats;
};
