export {default as toHTML} from './toHtml';
export {default as toCNXML} from './toCnxml';
export {default as findWidows} from './widows';

// Small helepr to wrap content string with <div>.
export function toDOM (content) {
  const wrap = document.createElement('div');
  wrap.innerHTML = content;
  return wrap;
};
