const utils = exports;

utils.tryCatch = (fn, errMessage) => {
  let result;
  const throwErr = error => {
    throw new utils.Error(errMessage + '. ' + error.message)
    throw new Error(errMessage)
    error.message = errMessage + '. ' + error.message;
    error.stack = errMessage + '. ' + error.stack;
    throw error;
  }
  try {
    result = fn();
  } catch (error) {
    throwErr(error);
  }
  if (result && result.then) {
    return result.catch(throwErr);
  }
  return result;
};


utils.trunc = (str, length = 10) => {
  str = String(str);
  if (str.length <= length) return str;
  return `${str.substr(0, 4)}…${str.substr(-4)}(${str.length})`;
};

utils.Error = class extends Error {};

